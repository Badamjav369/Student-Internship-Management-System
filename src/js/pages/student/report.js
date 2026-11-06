// Дадлагын тайлан: тэнхимийн шаардсан файл бүрийг ноорогт байршуулж (дахин байршуулбал солино), бүрдэл бүрэн бол хугацаанд нь илгээнэ.
// Илгээхэд дадлагын дэвтэр PDF болж хавсарна. Нэг үед нэг л тайлан байна: засвар шаардвал саналыг харуулж, өмнөх файлууд ноорогт үлдэнэ — оюутан солоод дахин илгээнэ; илгээсэн тайлан хянагдах үед зөвхөн харна.
// Дизайн нь «Дадлагын байгууллага» хуудастай нэг хэлтэй: тоон хавтан, файлын хавтан, саналын карт.
import { h, pageHead, replace } from '../../core/dom.js';
import { filePicker } from '../../core/file-picker.js';
import { downloadButton, fileButton } from '../../core/files.js';
import { daysBetween, daysLeftText, formatRange } from '../../core/format.js';
import { busy, checkFile, clearErrors, formAlert, setFieldError } from '../../core/forms.js';
import { icon } from '../../core/icons.js';
import { getDashboard, getReport, submitReport, uploadReportFile } from '../../data/student-api.js';
import { banner } from '../../components/banner.js';
import { commentCard } from '../../components/comment-card.js';
import { confirmAction } from '../../components/confirm-dialog.js';
import { emptyState } from '../../components/empty-state.js';
import { badge, toneOf } from '../../components/status-badge.js';
import { toast } from '../../components/toast-region.js';
import { docTile, fileDate, noInternship } from './shared.js';

const LABELS = { not_submitted: 'Илгээгдээгүй', submitted: 'Илгээсэн', in_review: 'Хянагдаж буй', revision: 'Засвар шаардсан', accepted: 'Хүлээн авсан', defended: 'Хамгаалагдсан', overdue: 'Хугацаа хэтэрсэн' };
const REPORT_STAGE = ['reporting', 'ready', 'evaluating', 'deferred', 'failed', 'completed'];
const EDITABLE = ['not_submitted', 'revision'];
const TYPES = {
  pdf: { label: 'PDF', accept: '.pdf,application/pdf', test: /\.pdf$/i },
  docx: { label: 'DOCX', accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', test: /\.docx$/i },
};

// Шаардлага бүр нэг хавтан: байршуулсан эсэх, файл, сонгогч. Файл сонгоход шууд ноорогт байршина.
function requirementTile(req, file, index, { maxMb, upload }) {
  const id = `req-${req.key}`;
  const name = `req.${req.key}`;
  const types = req.types.map((t) => TYPES[t]);
  const typeText = types.map((t) => t.label).join(' эсвэл ');
  const picker = filePicker({ id, name, accept: types.map((t) => t.accept).join(','), describedBy: `${id}-hint ${id}-error` });
  const input = picker.input;
  const tone = file ? 'green' : 'violet';
  const tile = h('div', { class: ['fact-tile', 'req-tile', !file && 'is-empty'], dataset: { state: file ? 'done' : 'missing' } },
    h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(file ? 'check' : index === 0 ? 'report' : 'paperclip', 22)),
    h('div', {},
      h('div', { class: 'req-head' }, h('label', { for: id }, req.label), badge(file ? 'Байршуулсан' : 'Байршуулаагүй', file ? 'done' : 'none')),
      file ? h('ul', { class: 'files', 'aria-label': `${req.label}: байршуулсан файл` }, h('li', {}, fileButton(file))) : null,
      file?.uploaded_at ? fileDate(file.uploaded_at) : null,
      h('p', { class: 'hint', id: `${id}-hint` }, `${typeText} · ${maxMb} МБ хүртэл`),
      h('div', { class: 'field field-file', dataset: { field: name } }, picker.root, h('p', { class: 'error', id: `${id}-error`, hidden: true }))));
  input.addEventListener('change', async () => {
    const chosen = input.files[0];
    setFieldError(input.form, name, null);
    if (!chosen) return;
    const error = checkFile(chosen, { test: types.length > 1 ? new RegExp(types.map((t) => t.test.source).join('|'), 'i') : types[0].test, typeText, maxMb });
    if (error) { picker.reset(); setFieldError(input.form, name, error); return; }
    tile.setAttribute('aria-busy', 'true');
    try { await upload(req, chosen); } catch (e) { tile.removeAttribute('aria-busy'); picker.reset(); setFieldError(input.form, name, e.message); }
  });
  return tile;
}

// ---------- Бүрдүүлэх горим ----------

function draftPanel(report, i, reload, redraw) {
  const maxMb = i.info.max_file_mb;
  const files = new Map(report.draft.files.map((f) => [f.requirement, f]));
  const submit = h('button', { class: 'button', type: 'submit' }, icon('send', 18), 'Тайлан илгээх');
  const upload = async (req, file) => {
    const next = await uploadReportFile(req.key, file);
    toast(`«${req.label}» файл байршлаа.`);
    redraw(next, req.key);
  };
  const form = h('form', { class: 'stack', novalidate: true },
    h('section', { 'aria-labelledby': 'h-files' }, h('h2', { class: 'section-title', id: 'h-files' }, 'Файлууд'),
      h('div', { class: 'fact-grid' }, report.requirements.map((r, n) => requirementTile(r, files.get(r.key), n, { maxMb, upload })))),
    h('div', { class: 'form-submit' }, submit));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const missing = report.requirements.filter((r) => !files.has(r.key));
    if (missing.length) {
      for (const r of missing) setFieldError(form, `req.${r.key}`, `«${r.label}» файлаа байршуулна уу.`);
      formAlert(form, `Дутуу файл: ${missing.map((r) => r.label).join(', ')}. Байршуулаад дахин илгээнэ үү.`);
      return;
    }
    const ok = await confirmAction({ title: 'Тайлангаа илгээх үү?', body: ['Илгээсний дараа удирдагч багш хянаж дуустал файлаа солих боломжгүй.', 'Дадлагын дэвтэр PDF болж тайланд автоматаар хавсарна.'], confirmLabel: 'Илгээх' });
    if (!ok) return;
    await busy(submit, async () => {
      try { await submitReport(); toast('Тайлан илгээгдлээ. Удирдагч багш хянаад мэдэгдэл ирнэ.'); reload(); } catch (e) { formAlert(form, e.message); }
    });
  });
  return form;
}

// ---------- Харах горим ----------

function submissionPanel(v, report) {
  const labels = new Map(report.requirements.map((r) => [r.key, r.label]));
  const fileTiles = v.files.map((f, n) => docTile({
    iconName: n === 0 ? 'report' : 'paperclip', tone: n === 0 ? 'violet' : 'blue', label: labels.get(f.requirement) ?? f.requirement, name: f.name,
    date: f.uploaded_at ?? v.submitted_at, action: downloadButton('Татах', f.name, 'button secondary small', f.file_id),
  }));
  const logbook = docTile({
    iconName: 'book', tone: 'green', label: 'Дадлагын дэвтэр', name: v.logbook_file_id || v.logbook_url ? 'Нэгтгэсэн PDF' : null, empty: 'PDF болгон нэгтгэж байна',
    date: v.submitted_at, action: downloadButton('Татах', 'Дадлагын дэвтэр.pdf', 'button secondary small', v.logbook_url ?? null),
  });
  return h('section', { 'aria-labelledby': 'h-sent' }, h('h2', { class: 'section-title', id: 'h-sent' }, 'Файлууд'), h('div', { class: 'fact-grid' }, fileTiles, report.logbook_enabled === false ? null : logbook));
}

// ---------- Дээд хэсэг ----------

// Нэг мөр, хоёр хайрцаг: хүлээн авах хугацаа (эхлэх – дуусах) ба удирдагч багшийн санал.
function topRow(report, today, canSubmit, supervisor) {
  const editable = EDITABLE.includes(report.status);
  const days = daysBetween(today, report.deadline);
  const late = canSubmit ? days <= 2 : editable || report.status === 'overdue';
  const tone = late ? (canSubmit ? 'amber' : 'rose') : 'blue';
  const comment = report.submission?.teacher_comment;
  return h('div', { class: 'report-top' },
    h('div', { class: 'stat' }, h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon('calendar', 20)),
      h('div', {}, h('strong', {}, formatRange(report.opens, report.deadline)), h('span', {}, 'Хүлээн авах хугацаа'), canSubmit ? h('span', { class: 'muted small' }, daysLeftText(days)) : null)),
    comment ? commentCard({ role: 'Удирдагч багшийн санал', name: supervisor?.name, text: comment, attention: report.status === 'revision' }) : null);
}

export async function render({ refresh }) {
  const dash = await getDashboard();
  const i = dash.internship;
  if (!i) return noInternship('Дадлагын тайлан', 'report');
  const start = (content) => h('section', {}, pageHead('Дадлагын тайлан'), content);
  if (i.status === 'stopped') return start(emptyState('Дадлага зогссон', null, { icon: 'report' }));
  if (!REPORT_STAGE.includes(i.status)) return start(emptyState('Тайлангийн шат хараахан эхлээгүй', null, { icon: 'report' }));
  const first = await getReport();
  if (!first) return start(emptyState('Тайлан илгээгээгүй', null, { icon: 'report' }));

  const body = h('div', { class: 'stack' });
  const supervisor = i.info.supervisor;

  function draw(report, focusKey) {
    const editable = EDITABLE.includes(report.status);
    const canSubmit = editable && report.open && i.status === 'reporting';
    const closed = report.status === 'overdue' || (editable && !canSubmit);
    replace(body,
      topRow(report, dash.today, canSubmit, supervisor),
      closed ? banner('error', 'Хугацаа дууссан. Тэнхимийн админд хандана уу.') : null,
      canSubmit ? draftPanel(report, i, refresh, draw) : report.submission ? submissionPanel(report.submission, report) : null);
    if (focusKey) body.querySelector(`#req-${CSS.escape(focusKey)}`)?.focus();
  }
  draw(first);
  return h('section', {}, pageHead('Дадлагын тайлан', badge(LABELS[first.status], toneOf(first.status))), body);
}
