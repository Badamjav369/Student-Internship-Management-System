// Онооны шалгуур бүрийн оноо, түүний хэмжүүр: байгууллага, комиссын оноог харах хавтан. Удирдагч багш, дадлага удирдагч хоёр ашиглана.
import { h } from '../core/dom.js';
import { num } from '../core/format.js';

const sum = (list, key) => list.reduce((a, s) => a + s[key], 0);

export const criteriaPanel = (title, list) => (list.length ? h('section', { class: 'panel stack', 'aria-label': title },
  h('div', { class: 'tab-summary' }, h('h2', { class: 'section-title' }, title), h('span', { class: 'chip' }, `${num(sum(list, 'max_score'))} оноо`)),
  h('ul', { class: 'criteria' }, list.map((c) => h('li', { class: 'criterion' },
    h('div', { class: 'criterion-head' }, h('strong', {}, c.name), h('span', { class: 'criterion-score' }, `${num(c.value)} / ${num(c.max_score)}`)),
    h('div', { class: 'meter', 'aria-hidden': 'true' }, h('span', { style: { width: `${c.max_score ? Math.min(100, (c.value / c.max_score) * 100) : 0}%` } })))))) : null);
