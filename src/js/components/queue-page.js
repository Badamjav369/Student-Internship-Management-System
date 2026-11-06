// Дараалал хуудас: хайлт, төлвийн «chip», мөрүүд. Жагсаалт жижиг тул хуудсан дээрээ шүүнэ. Удирдагч багш, дадлага удирдагч, тэнхмийн эрхлэгч, байгууллагын төлөөлөгч ашиглана.
import { h, pageHead, replace } from '../core/dom.js';
import { nameOf } from '../core/labels.js';
import { emptyState } from './empty-state.js';
import { chipRow, searchBox } from './filters.js';
import { rowList } from './list.js';

const matches = (i, q, extra) => !q || [nameOf(i.student), i.student.student_code, extra(i)].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase());

/**
 * groups: [[key, label, test(i)]] — эхний хоосон биш бүлгээс эхэлнэ. none — оюутан огт байхгүй үед гарах тайлбар.
 */
export function queuePage({ title, noun, interns, groups, row, emptyText, none, extra = (i) => i.organization?.name, placeholder = 'Нэр, код, байгууллага' }) {
  if (!interns.length) return h('div', { class: 'stack' }, pageHead(title), emptyState('Оюутан алга', none, { icon: 'users' }));
  let key = (groups.find(([, , test]) => interns.some(test)) ?? groups.at(-1))[0];
  let q = '';
  const count = h('p', { class: 'result-count', role: 'status' });
  const body = h('div', { class: 'live-list' });
  const draw = () => {
    const test = groups.find(([k]) => k === key)[2];
    const shown = interns.filter((i) => test(i) && matches(i, q, extra));
    count.textContent = `${shown.length} ${noun}`;
    replace(body, shown.length ? rowList(title, shown.map(row)) : emptyState('Тохирох оюутан алга', emptyText, { icon: 'search' }));
  };
  draw();
  const options = groups.map(([k, label, test]) => [k, label, interns.filter(test).length]);
  return h('div', { class: 'stack' }, pageHead(title),
    searchBox({ label: 'Оюутан хайх', placeholder, onSearch: (v) => { q = v; draw(); } }),
    chipRow('Төлөв', options, key, (v) => { key = v; draw(); }),
    count, body);
}
