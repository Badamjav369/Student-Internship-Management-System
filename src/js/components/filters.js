// Жагсаалтын хайлт, шүүлтүүр: хайлтын талбар, «chip» шүүлтүүр, шошготой select, улирал сонгогч.
import { h, replace } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { SEASONS } from '../core/labels.js';

export function searchBox({ label, placeholder, value = '', onSearch }) {
  const id = `q-${Math.random().toString(36).slice(2, 7)}`;
  let timer = 0;
  const input = h('input', { id, name: 'q', type: 'search', value, placeholder, autocomplete: 'off', 'aria-label': label });
  const fire = () => { clearTimeout(timer); onSearch(input.value.trim()); };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(fire, 250); });
  return h('form', { class: 'search-card', role: 'search', 'aria-label': label, on: { submit: (e) => { e.preventDefault(); fire(); } } },
    h('label', { class: 'search-input', for: id }, icon('search', 20), input),
    h('button', { class: 'button', type: 'submit' }, 'Хайх'));
}

/** Нэг сонголттой шүүлтүүрийн «chip»-үүд. options: [[value, label, count?]] */
export function chipRow(label, options, value, onPick) {
  const row = h('div', { class: 'chip-row', role: 'group', 'aria-label': label });
  const draw = () => replace(row, options.map(([v, text, count]) => h('button', {
    class: 'filter-chip', type: 'button', 'aria-pressed': String(v === value), on: { click: () => { if (v === value) return; value = v; draw(); onPick(v); } },
  }, text, count !== undefined ? h('span', { class: 'chip-count' }, count) : null)));
  draw();
  return row;
}

/** Улирал сонгогч (хуудасны толгойн баруун талд). */
export function semesterSelect(semesters, current, onPick) {
  const select = h('select', { id: 'semester-pick', on: { change: (e) => onPick(Number(e.target.value)) } },
    semesters.filter((s) => s.status !== 'draft').map((s) => h('option', { value: String(s.id), selected: s.id === current.id },
      `${s.academic_year} ${SEASONS[s.season].toLowerCase()}${s.status === 'active' ? '' : ' · архив'}`)));
  return h('label', { class: 'picker', for: 'semester-pick' }, h('span', {}, 'Улирал'), select);
}
/** Шүүлтүүрийн сонголт (шошготой select). */
export function filterSelect(label, options, value, onPick) {
  const id = `fs-${Math.random().toString(36).slice(2, 7)}`;
  return h('label', { class: 'picker', for: id }, h('span', {}, label),
    h('select', { id, on: { change: (e) => onPick(e.target.value) } }, options.map(([v, text]) => h('option', { value: v, selected: v === value }, text))));
}
