// Улирлын дэлгэрэнгүй: тохиргоо, шалгуур, загвар, оюутан. Төлөвийн үйлдэл (идэвхжүүлэх, архивлах, устгах) толгойд.
import { h, pageHead } from '../../../core/dom.js';
import { num } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { SEMESTER_LABELS, SEMESTER_TONES, semesterName } from '../../../core/labels.js';
import { tabs, rememberTab, tabStart } from '../../../core/tabs.js';
import { criteriaTotal, deleteSemester, getSemester, listInternships, setSemesterStatus } from '../../../data/admin-api.js';
import { actionButton } from '../../../components/action-button.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { badge } from '../../../components/status-badge.js';
import { criteriaPanel, settingsPanel, templatesPanel } from './settings.js';
import { studentsPanel } from './students.js';

const KEYS = ['settings', 'criteria', 'templates', 'students'];
const DATE_KEYS = ['register_from', 'register_to', 'work_from', 'work_to', 'report_from', 'report_to', 'defense_from', 'defense_to'];

/** Идэвхжүүлэхээс өмнө дутуу зүйлс (зөвхөн «Тохируулж буй» улирал дээр). */
function blockers(s) {
  const list = [];
  if (DATE_KEYS.some((k) => !s[k])) list.push('Хугацаа бүрэн бус');
  const total = criteriaTotal(s);
  if (Math.abs(total - 100) > 1e-9) list.push(`Шалгуурын нийлбэр ${num(total)}/100`);
  else if (!s.criteria.some((c) => c.component === 'org') || !s.criteria.some((c) => c.component === 'committee')) list.push('Байгууллага, комиссын шалгуур дутуу');
  return list;
}

export async function render({ params, query, navigate, refresh }) {
  let semester;
  try { semester = await getSemester(params.id); } catch { return missing('Улирал олдсонгүй', '/admin/semesters'); }
  const s = semester;
  const open = s.status !== 'archived';
  const draft = s.status === 'draft';
  const [students, panel] = await Promise.all([listInternships(s.id, { limit: 1 }), studentsPanel(s, { query, refresh, editable: open })]);
  const missingList = draft ? blockers(s) : [];

  const actions = h('div', { class: 'actions' },
    draft ? actionButton('Идэвхжүүлэх', { iconName: 'circle-check', variant: 'primary', confirm: { title: 'Улирлыг идэвхжүүлэх үү?', body: [semesterName(s)], confirmLabel: 'Идэвхжүүлэх' }, run: () => setSemesterStatus(s.id, 'activate'), done: 'Улирал идэвхжлээ.', after: refresh }) : null,
    s.status === 'active' ? actionButton('Архивлах', { iconName: 'inbox', confirm: { title: 'Улирлыг архивлах уу?', body: [semesterName(s)], confirmLabel: 'Архивлах' }, run: () => setSemesterStatus(s.id, 'archive'), done: 'Улирал архивлагдлаа.', after: refresh }) : null,
    draft ? actionButton('Устгах', { variant: 'danger', iconName: 'trash', confirm: { title: 'Улирлыг устгах уу?', body: [semesterName(s)], confirmLabel: 'Устгах' }, run: () => deleteSemester(s.id), done: 'Улирал устгагдлаа.', after: () => navigate('/admin/semesters') }) : null);

  const t = tabs([
    { label: 'Тохиргоо', icon: 'settings', panel: settingsPanel(s, { editable: open, onSaved: refresh }) },
    { label: 'Шалгуур', icon: 'sliders', panel: criteriaPanel(s, { editable: draft, refresh }), count: Math.abs(criteriaTotal(s) - 100) > 1e-9 && draft ? '!' : 0, countTone: 'attention' },
    { label: 'Загвар', icon: 'contract', panel: templatesPanel(s, { editable: open, refresh }), count: s.templates.length },
    { label: 'Оюутан', icon: 'users', panel, count: students.total },
  ], { label: 'Улирлын хэсгүүд', start: tabStart(KEYS, query) });
  rememberTab(t, KEYS, `/admin/semesters/${s.id}`);

  return h('div', { class: 'stack' },
    backLink('/admin/semesters', 'Улирлууд'),
    pageHead(semesterName(s), h('div', { class: 'head-actions' }, badge(SEMESTER_LABELS[s.status], SEMESTER_TONES[s.status]), actions)),
    missingList.length ? h('div', { class: 'org-banner warning' }, icon('alert', 18), h('p', {}, `Идэвхжүүлэхийн өмнө: ${missingList.join(' · ')}.`)) : null,
    t);
}
