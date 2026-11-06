// Улирлын тохиргоо: улирлын жагсаалт ба шинэ улирал үүсгэх.
import { h, pageHead } from '../../../core/dom.js';
import { formatRange } from '../../../core/format.js';
import { checkbox, field, setFieldError, clearErrors, values, formRow, onSubmit } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { SEASONS, SEMESTER_LABELS, SEMESTER_TONES, semesterName } from '../../../core/labels.js';
import { createSemester, listSemesters } from '../../../data/admin-api.js';
import { rowCard, rowList } from '../../../components/list.js';
import { badge } from '../../../components/status-badge.js';

const LEAD_TONE = { active: 'green', draft: 'amber', archived: 'gray' };

function createForm(navigate) {
  const submit = h('button', { class: 'button', type: 'submit' }, icon('plus', 18), 'Үүсгэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Шинэ улирал' },
    formRow(
      field({ label: 'Хичээлийн жил', name: 'academic_year', placeholder: '2027-2028', required: true, inputmode: 'numeric', maxlength: 9, autocomplete: 'off' }),
      field({ label: 'Улирал', name: 'season', type: 'select', value: 'summer', options: Object.entries(SEASONS).map(([value, label]) => ({ value, label })) })),
    h('fieldset', { class: 'form-section' }, h('legend', {}, 'Оюутнаас шаардах'),
      checkbox({ label: 'Ажлын төлөвлөгөө', name: 'plan_enabled', checked: true }), checkbox({ label: 'Дадлагын дэвтэр', name: 'logbook_enabled', checked: true })),
    h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    const v = values(form);
    const m = /^(\d{4})-(\d{4})$/.exec(v.academic_year.trim());
    if (!m || Number(m[2]) !== Number(m[1]) + 1) { setFieldError(form, 'academic_year', 'Жишээ нь 2027-2028 гэж бичнэ үү.'); form.querySelector('[name="academic_year"]').focus(); return; }
    clearErrors(form);
    const { id } = await createSemester({ academic_year: v.academic_year.trim(), season: v.season, plan_enabled: 'plan_enabled' in v, logbook_enabled: 'logbook_enabled' in v });
    navigate(`/admin/semesters/${id}`);
  });
  return form;
}

export async function render({ navigate }) {
  const semesters = await listSemesters();
  const panel = h('section', { class: 'panel', hidden: true, 'aria-labelledby': 'h-new' }, h('h2', { id: 'h-new' }, 'Шинэ улирал'), createForm(navigate));
  const toggle = h('button', { class: 'button', type: 'button', 'aria-expanded': 'false', on: { click: () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) panel.querySelector('input')?.focus();
  } } }, icon('plus', 18), 'Улирал нэмэх');
  const rows = semesters.map((s) => rowCard({
    lead: h('span', { class: ['org-avatar', `tile-${LEAD_TONE[s.status]}`], 'aria-hidden': 'true' }, icon('calendar', 22)),
    title: semesterName(s), href: `/admin/semesters/${s.id}`,
    lines: [s.work_from ? `Дадлага: ${formatRange(s.work_from, s.work_to)}` : 'Хугацаа тохируулаагүй'],
    side: badge(SEMESTER_LABELS[s.status], SEMESTER_TONES[s.status]),
  }));
  return h('div', { class: 'stack' }, pageHead('Улирлын тохиргоо', toggle), panel, rowList('Улирлууд', rows));
}
