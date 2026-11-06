// Дадлагын дэвтэр: бүх тэмдэглэл нэг дэвтэрт — долоо хоног бүр гарчигтай, шинэ нь дээрээ; өдөр бүр нэг карт.
// Өдрийг дарахад төлөвлөсөн ажил, гүйцэтгэсэн ажил, ажилласан цаг (0–24), хавсралтын маягт нээгдэнэ; хянагдсан бол засахгүй.
// Дизайн нь «Дадлагын байгууллага» хуудастай нэг хэлтэй.
import { h, pageHead, replace } from '../../core/dom.js';
import { fileButton } from '../../core/files.js';
import { formatDate, hoursText, mondayOf, shortDate } from '../../core/format.js';
import { busy, checkFile, clearErrors, field, formAlert, setFieldError } from '../../core/forms.js';
import { icon } from '../../core/icons.js';
import { getDashboard, getLogbook, saveLogEntry } from '../../data/student-api.js';
import { commentCard } from '../../components/comment-card.js';
import { dayCard as dayCardView, dayState, plannedNote } from '../../components/day-card.js';
import { emptyState } from '../../components/empty-state.js';
import { statTile } from '../../components/facts.js';
import { badge } from '../../components/status-badge.js';
import { toast } from '../../components/toast-region.js';
import { noInternship } from './shared.js';

const MAX_FILES = 5;
const FILE_TYPES = /\.(pdf|png|jpe?g)$/i;
export async function render() {
  const dash = await getDashboard();
  const i = dash.internship;
  if (!i) return noInternship('Дадлагын дэвтэр', 'book');
  if (['searching', 'applied', 'contracting', 'planning'].includes(i.status)) {
    return h('section', {}, pageHead('Дадлагын дэвтэр'), emptyState('Дэвтэр хараахан нээгдээгүй', null, { icon: 'book' }));
  }
  const today = dash.today;
  const { days } = await getLogbook();
  const mondays = [...new Set(days.map((d) => mondayOf(d.date)))].filter((m) => m <= today).sort().reverse();
  if (mondays.length === 0) return h('section', {}, pageHead('Дадлагын дэвтэр'), emptyState('Дэвтэр хараахан нээгдээгүй', null, { icon: 'book' }));
  const maxMb = i.info.max_file_mb;
  const mentor = i.info.mentor;
  const open = i.status === 'in_progress';
  const expanded = new Set();
  const todayDay = days.find((d) => d.date === today);
  if (open && todayDay?.writable && !todayDay.entry) expanded.add(today);

  const summary = h('div', { class: 'stat-row text' });
  const weeks = new Map(mondays.map((m) => [m, h('section', { class: 'week', 'aria-labelledby': `h-week-${m}` })]));
  const weekDays = (monday) => days.filter((d) => mondayOf(d.date) === monday);

  function attachments(entry, removing, editable) {
    if (!entry?.files?.length) return null;
    return h('ul', { class: 'files', 'aria-label': 'Хавсаргасан файл' }, entry.files.map((f) => {
      const item = h('li', { class: removing.has(f.id) && 'removing' }, fileButton(f));
      if (editable) {
        item.append(h('button', { class: 'icon-button flat', type: 'button', 'aria-pressed': String(removing.has(f.id)), 'aria-label': `${f.name}-г хасах`,
          on: { click: (event) => {
            if (removing.has(f.id)) removing.delete(f.id); else removing.add(f.id);
            item.classList.toggle('removing', removing.has(f.id));
            event.currentTarget.setAttribute('aria-pressed', String(removing.has(f.id)));
          } } }, icon('close', 16)));
      }
      return item;
    }));
  }

  function entryForm(day) {
    const entry = day.entry;
    const removing = new Set();
    const submit = h('button', { class: 'button', type: 'submit' }, 'Хадгалах');
    const form = h('form', { class: 'entry-form', novalidate: true },
      h('div', { class: 'entry-grid' },
        field({ label: 'Гүйцэтгэсэн ажил', name: 'work_done', type: 'textarea', rows: 8, value: entry?.work_done ?? '', maxlength: 5000, class: 'entry-work' }),
        h('div', { class: 'entry-side' },
          field({ label: 'Ажилласан цаг', name: 'hours', type: 'number', value: entry ? String(Number(entry.hours)) : '', min: 0, max: 24, step: 0.5, inputmode: 'decimal', placeholder: '0–24', unit: 'цаг' }),
          h('div', { class: 'entry-files' },
            attachments(entry, removing, true),
            field({ label: 'Хавсралт', name: 'files', type: 'file', multiple: true, accept: '.pdf,.png,.jpg,.jpeg', hint: `PDF, JPG, PNG · ${maxMb} МБ · ${MAX_FILES} хүртэл` })))),
      h('div', { class: 'form-submit' }, submit));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(form);
      const rawHours = form.elements.hours.value.trim().replace(',', '.');
      const work = form.elements.work_done.value.trim();
      const files = [...form.elements.files.files];
      const errors = {};
      if (!/^\d{1,2}(\.\d)?$/.test(rawHours) || Number(rawHours) > 24) errors.hours = 'Ажилласан цагийг 0–24 хооронд, нэг бутархай оронтой бичнэ үү.';
      if (!work) errors.work_done = 'Гүйцэтгэсэн ажлаа бичнэ үү.';
      if ((entry?.files?.length ?? 0) - removing.size + files.length > MAX_FILES) errors.files = `Нэг өдөрт ${MAX_FILES}-аас олон файл хавсаргахгүй.`;
      else {
        const bad = files.map((f) => checkFile(f, { test: FILE_TYPES, typeText: 'PDF, JPG, PNG', maxMb })).find(Boolean);
        if (bad) errors.files = bad;
      }
      if (Object.keys(errors).length) {
        for (const [name, message] of Object.entries(errors)) setFieldError(form, name, message);
        formAlert(form, 'Тэмдэглэсэн талбарыг засна уу.');
        form.querySelector('[data-invalid] input, [data-invalid] textarea')?.focus();
        return;
      }
      await busy(submit, async () => {
        try {
          const saved = await saveLogEntry(day.date, { hours: Number(rawHours), work_done: work, addFiles: files, removeIds: [...removing] });
          day.entry = saved;
          toast(`${shortDate(day.date)}-ны тэмдэглэл хадгалагдлаа.`);
          expanded.delete(day.date);
          redraw(day.date);
        } catch (error) { formAlert(form, error.message); }
      });
    });
    return form;
  }

  function readOnly(day, state) {
    const e = day.entry;
    if (!e) return day.planned_task ? null : h('p', { class: 'muted' }, 'Бичигдээгүй.');
    return [
      h('p', { class: 'prose entry-text' }, e.work_done),
      attachments(e, new Set(), false),
      state === 'reviewed' ? h('p', { class: 'reviewed-note' }, icon('lock', 16), `Хянасан ${formatDate(e.reviewed_at.slice(0, 10))}`) : null,
    ];
  }

  function dayCard(d) {
    const state = dayState(d, today);
    const isOpen = expanded.has(d.date);
    const editable = open && d.writable && state !== 'reviewed';
    const toggle = () => { if (isOpen) expanded.delete(d.date); else expanded.add(d.date); redraw(d.date, { focus: true }); };
    return dayCardView(d, state, { open: isOpen, onToggle: toggle, body: [
      plannedNote(d.planned_task),
      d.entry?.mentor_comment ? commentCard({ role: 'Дадлага удирдагчийн санал', name: mentor?.name, text: d.entry.mentor_comment }) : null,
      editable ? entryForm(d) : readOnly(d, state)] });
  }

  function weekContent(monday) {
    const wd = weekDays(monday);
    const past = wd.filter((d) => d.date <= today);
    const written = wd.filter((d) => d.entry);
    const hours = written.reduce((sum, d) => sum + Number(d.entry.hours), 0);
    const reviewed = written.length > 0 && written.every((d) => d.entry.reviewed_at);
    return [
      h('div', { class: 'tab-summary' },
        h('h2', { class: 'section-title', id: `h-week-${monday}` }, `${formatDate(wd[0].date)} – ${shortDate(wd.at(-1).date)}`),
        h('div', { class: 'chips' }, h('span', { class: 'chip' }, `${written.length} / ${past.length || wd.length} өдөр`), h('span', { class: 'chip' }, hoursText(hours)), reviewed ? badge('Хянагдсан', 'done') : null)),
      h('ul', { class: 'day-cards' }, wd.map(dayCard)),
    ];
  }

  function drawSummary() {
    const written = days.filter((d) => d.entry);
    const reviewed = written.filter((d) => d.entry.reviewed_at).length;
    const missing = days.filter((d) => dayState(d, today) === 'missing').length;
    replace(summary,
      statTile('Бичсэн', `${written.length} / ${days.length} өдөр`, 'violet', 'book'),
      statTile('Нийт цаг', hoursText(written.reduce((s, d) => s + Number(d.entry.hours), 0)), 'blue', 'clock'),
      statTile('Хянагдсан', `${reviewed} өдөр`, 'green', 'circle-check'),
      missing ? statTile('Бичигдээгүй', `${missing} өдөр`, 'rose', 'alert') : statTile('Бичигдээгүй', 'Байхгүй', 'green', 'check'));
  }

  // Нэг долоо хоногийг дахин зурна; хадгалсны дараа нийт тоог шинэчилнэ.
  function redraw(date, { focus = false } = {}) {
    const monday = mondayOf(date);
    replace(weeks.get(monday), weekContent(monday));
    drawSummary();
    if (focus) weeks.get(monday).querySelector(`[data-date="${date}"] .day-card-button`)?.focus();
  }

  drawSummary();
  for (const m of mondays) replace(weeks.get(m), weekContent(m));

  const closed = open ? null : h('div', { class: 'org-banner info' }, icon('info', 18),
    h('p', {}, ['reporting', 'ready', 'evaluating', 'completed'].includes(i.status) ? 'Дадлага дууссан. Зөвхөн харах боломжтой.' : `Бичих боломжгүй (${i.status_label}).`));
  return h('section', {}, pageHead('Дадлагын дэвтэр'), h('div', { class: 'stack' }, summary, closed, h('div', { class: 'weeks' }, [...weeks.values()])));
}
