// Эрхийн сонголт: энгийн дүрүүд + улирал тус бүрийн комиссын гишүүн. user.js, user-new.js хоёр хуваалцана.
import { h } from '../../../core/dom.js';
import { ROLE_LABELS } from '../../../core/format.js';
import { semesterName } from '../../../core/labels.js';

const PLAIN = ['student', 'supervisor', 'mentor', 'org_rep', 'admin', 'head'];

/** roles: [{role, semester_id?}]. Буцаах элемент дээр value() → roles, onChange(fn). */
export function rolePicker(roles, semesters, { disabled = false } = {}) {
  const has = (role, semesterId = null) => roles.some((r) => r.role === role && (r.semester_id ?? null) === semesterId);
  const box = (label, role, semesterId = null) => {
    const input = h('input', { type: 'checkbox', value: role, checked: has(role, semesterId), disabled, dataset: { semester: semesterId ?? '' } });
    return h('label', { class: 'check role-check' }, input, h('span', {}, label));
  };
  const listeners = [];
  const root = h('fieldset', { class: 'role-picker' }, h('legend', {}, 'Эрх'),
    h('div', { class: 'role-grid' }, PLAIN.map((r) => box(ROLE_LABELS[r], r))),
    h('div', { class: 'role-committee' }, h('p', { class: 'fact-label' }, ROLE_LABELS.committee),
      h('div', { class: 'role-grid' }, semesters.map((s) => box(semesterName(s), 'committee', s.id)))));
  root.addEventListener('change', () => listeners.forEach((fn) => fn(root.value())));
  root.value = () => [...root.querySelectorAll('input:checked')].map((i) => (i.value === 'committee' ? { role: 'committee', semester_id: Number(i.dataset.semester) } : { role: i.value }));
  root.onChange = (fn) => listeners.push(fn);
  return root;
}
