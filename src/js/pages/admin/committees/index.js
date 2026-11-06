// Комисс, хуваарь: улирал тус бүрийн комиссын жагсаалт ба шинэ комисс үүсгэх.
import { h, pageHead } from '../../../core/dom.js';
import { formatDate } from '../../../core/format.js';
import { clearErrors, field, setFieldError, values, formRow, onSubmit } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { pickSemester } from '../../../core/labels.js';
import { listCommittees, listSemesters, saveCommittee } from '../../../data/admin-api.js';
import { emptyState } from '../../../components/empty-state.js';
import { semesterSelect } from '../../../components/filters.js';
import { rowCard, rowList } from '../../../components/list.js';
import { badge } from '../../../components/status-badge.js';

export const FORMATS = { onsite: 'Танхимаар', online: 'Онлайнаар' };

function createForm(semester, navigate) {
  const submit = h('button', { class: 'button', type: 'submit' }, icon('plus', 18), 'Үүсгэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Шинэ комисс' },
    formRow(field({ label: 'Комиссын нэр', name: 'name', placeholder: 'Комисс №2', required: true, maxlength: 60 }),
      field({ label: 'Хэлбэр', name: 'format', type: 'select', value: 'onsite', options: Object.entries(FORMATS).map(([value, label]) => ({ value, label })) })),
    h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    const v = values(form);
    if (!v.name.trim()) { setFieldError(form, 'name', 'Комиссын нэр бичнэ үү.'); form.elements.name.focus(); return; }
    clearErrors(form);
    const { id } = await saveCommittee({ semester_id: semester.id, name: v.name.trim(), defense_date: null, start_time: null, format: v.format, location: null, online_url: null, members: [] });
    navigate(`/admin/committees/${id}`);
  });
  return form;
}

export async function render({ query, navigate }) {
  const semesters = await listSemesters();
  const semester = pickSemester(semesters, query.get('semester'));
  if (!semester) return h('div', { class: 'stack' }, pageHead('Комисс, хуваарь'), emptyState('Улирал алга', null, { icon: 'calendar' }));
  const committees = await listCommittees(semester.id);

  const panel = h('section', { class: 'panel', hidden: true, 'aria-labelledby': 'h-new' }, h('h2', { id: 'h-new' }, 'Шинэ комисс'), createForm(semester, navigate));
  const toggle = h('button', { class: 'button', type: 'button', 'aria-expanded': 'false', on: { click: () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) panel.querySelector('input')?.focus();
  } } }, icon('plus', 18), 'Комисс үүсгэх');

  const rows = committees.map((c) => rowCard({
    lead: h('span', { class: ['org-avatar', `tile-${c.published_at ? 'green' : 'amber'}`], 'aria-hidden': 'true' }, icon('calendar', 22)),
    title: c.name, href: `/admin/committees/${c.id}`,
    lines: [[c.defense_date ? `${formatDate(c.defense_date)}${c.start_time ? `, ${c.start_time}` : ''}` : 'Өдөр тогтоогоогүй', FORMATS[c.format]].join(' · '), `${c.members.length} гишүүн · ${c.slots.length} оюутан`],
    side: badge(c.published_at ? 'Нийтэлсэн' : 'Нийтлээгүй', c.published_at ? 'done' : 'pending'),
  }));
  return h('div', { class: 'stack' },
    pageHead('Комисс, хуваарь', h('div', { class: 'actions' }, semesterSelect(semesters, semester, (id) => navigate(`/admin/committees?semester=${id}`)), semester.status === 'active' ? toggle : null)),
    panel, rows.length ? rowList('Комиссууд', rows) : emptyState('Комисс үүсгээгүй байна', null, { icon: 'calendar' }));
}
