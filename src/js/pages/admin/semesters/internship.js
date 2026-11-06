// Дадлагын дэлгэрэнгүй (админ): оюутны төлөв, баримт, санал болгосон газрын хүсэлт, тэнхмийн шийдвэр, өөрчлөлтийн түүх.
import { h, replace } from '../../../core/dom.js';
import { formatDateTime, formatRange, hoursText, num } from '../../../core/format.js';
import { checkFile, clearErrors, field, showErrors, values, onSubmit } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { DOC_TONES, REQUEST_KINDS, studentLine } from '../../../core/labels.js';
import { applyChange, getInternship, getSemester, listOrganizations, listSupervisors } from '../../../data/admin-api.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { kindCards } from '../../../components/kind-cards.js';
import { personAvatar } from '../../../components/person.js';
import { badge, statusBadge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';

const KINDS = {
  direct_placement: ['Газар шууд оноох', 'Тэнхмээс газар оноох', 'building', 'violet'],
  change_place: ['Газар солих', 'Өөр байгууллагад шилжүүлэх', 'pin', 'blue'],
  change_supervisor: ['Удирдагч солих', 'Өөр багш оноох', 'user', 'green'],
  extend: ['Хугацаа сунгах', 'Дуусах, тайлангийн хугацаа', 'clock', 'amber'],
  stop: ['Дадлага зогсоох', 'Дадлагыг дуусгавар болгох', 'circle-x', 'rose'],
};
const HISTORY_LABELS = { ...Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [k, v[0]])), expire: 'Тайлан хугацаа хэтэрсэн гэж тооцсон' };
const ALLOWED = {
  searching: ['direct_placement', 'change_supervisor', 'stop'], applied: ['direct_placement', 'change_supervisor', 'stop'],
  contracting: ['change_place', 'change_supervisor', 'stop'], planning: ['change_place', 'change_supervisor', 'stop'],
  in_progress: ['change_place', 'change_supervisor', 'extend', 'stop'], reporting: ['change_supervisor', 'extend', 'stop'],
  ready: ['change_supervisor'], evaluating: ['change_supervisor'],
};
const REQUEST_STATUS = { pending: ['Эрхлэгч шийдэж байна', 'pending'], approved: ['Зөвшөөрсөн', 'done'], rejected: ['Татгалзсан', 'attention'], registered: ['Бүртгэсэн', 'done'], cancelled: ['Цуцалсан', 'none'] };

const tile = (iconName, tone, label, ...value) => h('div', { class: 'fact-tile' },
  h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(iconName, 22)), h('div', {}, h('span', { class: 'fact-label' }, label), ...value));
const docTile = (iconName, label, state) => tile(iconName, state ? 'green' : 'violet', label, h('strong', {}, state ? '' : 'Бэлтгэгдээгүй'), state ? badge(state, DOC_TONES[state] ?? 'none') : null);

function summaryTiles(i) {
  const pct = i.planned_days ? Math.min(100, Math.round((i.days_done / i.planned_days) * 100)) : 0;
  const grade = i.grade ? (i.grade.total != null ? `${num(i.grade.total)} оноо` : i.grade.mark === 'W' ? 'W — хойшлогдсон' : '0 — хангалтгүй') : null;
  return h('div', { class: 'fact-grid' }, ...[
    tile('building', 'violet', 'Байгууллага', i.organization ? h('strong', {}, h('a', { href: `#/admin/organizations/${i.organization.id}` }, i.organization.name)) : h('strong', { class: 'muted' }, 'Газар тодорхойгүй')),
    tile('user', 'green', 'Удирдагч багш', h('strong', {}, i.supervisor ? `${i.supervisor.last_name} ${i.supervisor.first_name}` : 'Оноогоогүй')),
    tile('calendar', 'blue', 'Дадлагын хугацаа', h('strong', {}, i.start_date ? formatRange(i.start_date, i.end_date) : '—')),
    i.features?.logbook === false ? null : tile('clock', 'amber', 'Ирц', h('strong', {}, `${i.days_done}/${i.planned_days} өдөр · ${hoursText(i.hours_done)}`),
      h('div', { class: 'meter', role: 'img', 'aria-label': `${pct}%` }, h('span', { style: { width: `${pct}%` } })),
      i.missing_days ? h('span', { class: 'fact-label' }, `Тасалсан ${i.missing_days} өдөр`) : null),
    tile('award', 'rose', 'Дүн', h('strong', {}, grade ?? 'Гараагүй'))].filter(Boolean));
}

function requestPanel(r) {
  const [text, tone] = REQUEST_STATUS[r.status] ?? [r.status, 'none'];
  return h('section', { class: 'panel', 'aria-labelledby': 'h-req' }, h('div', { class: 'panel-head' }, h('h2', { id: 'h-req' }, 'Санал болгосон газар'), badge(text, tone)),
    h('div', { class: 'fact-grid' },
      tile('building', 'violet', REQUEST_KINDS[r.kind] ?? 'Санал', h('strong', {}, r.organization_name)),
      r.country ? tile('globe', 'blue', 'Улс', h('strong', {}, r.country)) : null,
      tile('calendar', 'amber', 'Хугацаа', h('strong', {}, formatRange(r.start_date, r.end_date)))));
}

// ---------- Шийдвэр ----------
function decisionPanel(i, semester, organizations, supervisors, refresh) {
  const kinds = ALLOWED[i.status] ?? [];
  if (!kinds.length) return null;
  const extra = h('div', { class: 'stack-tight' });
  const orgOptions = organizations.filter((o) => o.id !== i.organization?.id).map((o) => ({ value: String(o.id), label: o.name }));
  const supOptions = supervisors.filter((u) => u.id !== i.supervisor?.id).map((u) => ({ value: String(u.id), label: `${u.last_name} ${u.first_name}` }));
  const FIELDS = {
    direct_placement: () => [field({ label: 'Байгууллага', name: 'organization_id', type: 'select', options: orgOptions }),
      h('div', { class: 'form-row' }, field({ label: 'Эхлэх өдөр', name: 'start_date', type: 'date', value: semester.work_from ?? '' }), field({ label: 'Дуусах өдөр', name: 'end_date', type: 'date', value: semester.work_to ?? '' }))],
    change_place: () => [field({ label: 'Шинэ байгууллага', name: 'organization_id', type: 'select', options: orgOptions }),
      h('div', { class: 'form-row' }, field({ label: 'Эхлэх өдөр', name: 'start_date', type: 'date', value: i.start_date ?? '' }), field({ label: 'Дуусах өдөр', name: 'end_date', type: 'date', value: i.end_date ?? '' })),
      field({ label: 'Тооцох хоног', name: 'counted_days', type: 'number', min: 0, max: i.planned_days, value: String(i.days_done), unit: 'өдөр', hint: `Өмнөх газарт ${i.days_done} өдөр ажилласан.` })],
    change_supervisor: () => [field({ label: 'Шинэ удирдагч багш', name: 'supervisor_id', type: 'select', options: supOptions })],
    extend: () => [h('div', { class: 'form-row' }, field({ label: 'Шинэ дуусах өдөр', name: 'end_date', type: 'date', value: i.end_date ?? '' }),
      i.report ? field({ label: 'Тайлангийн шинэ хугацаа', name: 'report_due', type: 'date', value: i.report.deadline ?? '' }) : null)],
    stop: () => [],
  };
  const kindBox = kindCards('Шийдвэр', kinds.map((k) => ({ value: k, label: KINDS[k][0], hint: KINDS[k][1], icon: KINDS[k][2], tone: KINDS[k][3] })));
  const submit = h('button', { class: 'button', type: 'submit' }, icon('check', 18), 'Шийдвэр бүртгэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Тэнхмийн шийдвэр' }, kindBox, extra,
    field({ label: 'Шалтгаан', name: 'reason', type: 'textarea', rows: 3, required: true, maxlength: 500 }),
    field({ label: 'Баримт (заавал биш)', name: 'document', type: 'file', accept: '.pdf,.doc,.docx,.jpg,.png' }),
    h('div', { class: 'form-submit' }, submit));
  const draw = () => replace(extra, FIELDS[form.elements.kind.value]());
  form.addEventListener('change', (e) => { if (e.target.name === 'kind') draw(); });
  draw();

  onSubmit(form, submit, async () => {
    clearErrors(form);
    const v = values(form);
    const errors = {};
    if (v.reason.trim().length < 5) errors.reason = 'Шалтгаанаа 5-аас дээш тэмдэгтээр бичнэ үү.';
    const file = form.elements.document.files[0];
    const fileProblem = checkFile(file, { test: /\.(pdf|docx?|jpe?g|png)$/i, typeText: 'PDF, Word эсвэл зураг', maxMb: semester.max_file_mb });
    if (fileProblem) errors.document = fileProblem;
    const details = {};
    if (v.kind === 'direct_placement' || v.kind === 'change_place') {
      if (!v.organization_id) errors.organization_id = 'Байгууллага сонгоно уу.';
      if (!v.start_date) errors.start_date = 'Эхлэх өдрийг сонгоно уу.';
      if (!v.end_date) errors.end_date = 'Дуусах өдрийг сонгоно уу.';
      if (v.start_date && v.end_date && v.start_date > v.end_date) errors.end_date = 'Дуусах өдөр эхлэх өдрөөс өмнө байна.';
      Object.assign(details, { organization_id: Number(v.organization_id), start_date: v.start_date, end_date: v.end_date });
      if (v.kind === 'change_place') {
        const n = Number(v.counted_days);
        if (v.counted_days === '' || !Number.isInteger(n) || n < 0 || n > i.planned_days) errors.counted_days = `0–${i.planned_days} хооронд бүхэл тоо бичнэ үү.`;
        details.counted_days = n;
      }
    } else if (v.kind === 'change_supervisor') {
      if (!v.supervisor_id) errors.supervisor_id = 'Удирдагч багш сонгоно уу.';
      details.supervisor_id = Number(v.supervisor_id);
    } else if (v.kind === 'extend') {
      if (!v.end_date && !v.report_due) errors.end_date = 'Ядаж нэг хугацааг өөрчилнө үү.';
      if (v.end_date && i.start_date && v.end_date < i.start_date) errors.end_date = 'Дуусах өдөр эхлэх өдрөөс өмнө байна.';
      Object.assign(details, { end_date: v.end_date || null, report_due: v.report_due || null });
    }
    if (Object.keys(errors).length) { showErrors(form, errors); return; }
    await applyChange(i.id, { kind: v.kind, reason: v.reason.trim(), details, document: file ?? null });
    toast('Шийдвэр бүртгэгдлээ.');
    refresh();
  });
  return h('section', { class: 'panel', 'aria-labelledby': 'h-decide' }, h('h2', { id: 'h-decide' }, 'Тэнхмийн шийдвэр'), form);
}

function historyPanel(changes) {
  if (!changes.length) return null;
  return h('section', { class: 'panel', 'aria-labelledby': 'h-hist' }, h('h2', { id: 'h-hist' }, 'Өөрчлөлтийн түүх'),
    h('ul', { class: 'history' }, changes.map((c) => h('li', { class: 'history-row' },
      h('span', { class: 'tile tile-gray', 'aria-hidden': 'true' }, icon('edit', 20)),
      h('div', {}, h('strong', {}, HISTORY_LABELS[c.kind] ?? c.kind), h('p', {}, c.reason),
        h('p', { class: 'muted small' }, formatDateTime(c.created_at), c.document_name ? ` · ${c.document_name}` : ''))))));
}

export async function render({ params, refresh }) {
  let i;
  try { i = await getInternship(params.id); } catch { return missing('Дадлага олдсонгүй', '/admin/semesters'); }
  const [semester, organizations, supervisors] = await Promise.all([getSemester(i.semester_id), listOrganizations(), listSupervisors()]);

  const head = h('section', { class: 'panel profile-head', 'aria-label': 'Оюутан' },
    personAvatar(i.student, 'lg'),
    h('div', { class: 'profile-text' }, h('h1', { tabindex: '-1' }, `${i.student.last_name} ${i.student.first_name}`), h('p', { class: 'muted' }, studentLine(i.student)), statusBadge(i.status)),
    i.report ? h('a', { class: 'button secondary', href: `#/admin/reports/${i.id}` }, icon('report', 18), 'Тайлан') : null);
  const docs = h('section', { class: 'panel', 'aria-labelledby': 'h-docs' }, h('h2', { id: 'h-docs' }, 'Баримт'),
    h('div', { class: 'fact-grid' }, i.features?.plan === false ? null : docTile('plan', 'Ажлын төлөвлөгөө', i.documents.work_plan), docTile('report', 'Тайлан', i.documents.report)));

  return h('div', { class: 'stack' },
    backLink(`/admin/semesters/${i.semester_id}?tab=students`, 'Улирлын оюутнууд'), head, summaryTiles(i),
    i.request ? requestPanel(i.request) : null, docs, decisionPanel(i, semester, organizations.items, supervisors, refresh), historyPanel(i.changes));
}
