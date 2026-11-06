// Нэг мэдэгдлийн мөр: хонхны жагсаалт болон «Мэдэгдэл» хуудас хоёулаа ашиглана. Дарахад уншсан болгоод холбоос руу очно.
import { h } from '../core/dom.js';
import { formatDateTime } from '../core/format.js';
import { icon } from '../core/icons.js';
import { markNotificationRead } from '../data/session-api.js';

// Мэдэгдэл аль хэсгийнх болохыг холбоосоос нь таньж дүрс, өнгө өгнө.
const LOOKS = [
  ['/student/contract', ['contract', 'green']],
  ['/student/plan', ['plan', 'blue']],
  ['/student/logbook', ['book', 'amber']],
  ['/student/report', ['report', 'green']],
  ['/student/defense', ['calendar', 'blue']],
  ['/student/score', ['award', 'violet']],
  ['/student/postings?tab=mine', ['send', 'blue']],
  ['/student/postings', ['megaphone', 'violet']],
  ['/admin/semesters', ['users', 'blue']],
  ['/admin/internships', ['users', 'amber']],
  ['/admin/reports', ['report', 'rose']],
  ['/admin/committees', ['calendar', 'violet']],
  ['/admin/summary', ['chart', 'green']],
  ['/supervisor/students', ['users', 'amber']],
  ['/supervisor/plans', ['plan', 'blue']],
  ['/supervisor/reports', ['report', 'rose']],
  ['/supervisor/scores', ['award', 'violet']],
  ['/head/contracts', ['contract', 'green']],
  ['/head/requests', ['inbox', 'blue']],
  ['/org_rep/applications', ['inbox', 'blue']],
  ['/org_rep/postings', ['megaphone', 'violet']],
  ['/org_rep/interns', ['users', 'amber']],
  ['/committee/students', ['award', 'violet']],
  ['/committee/committees', ['calendar', 'blue']],
  ['/mentor/students', ['users', 'amber']],
  ['/mentor/plans', ['plan', 'blue']],
  ['/mentor/logbook', ['book', 'amber']],
  ['/mentor/scores', ['award', 'violet']],
];
export const noticeLook = (link) => LOOKS.find(([prefix]) => link?.startsWith(prefix))?.[1] ?? ['bell', 'violet'];

export function noticeRow(n, { onOpen = null } = {}) {
  const [name, tone] = noticeLook(n.link);
  return h('a', {
    class: 'notice-row', href: `#${n.link}`, dataset: { unread: String(!n.read) },
    on: { click: () => { if (!n.read) markNotificationRead(n.id); onOpen?.(n); } },
  },
  h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(name, 20)),
  h('span', { class: 'notice-body' }, h('span', { class: 'notice-text' }, n.text), h('time', { datetime: n.time }, formatDateTime(n.time))),
  n.read ? null : h('span', { class: 'notice-dot' }, h('span', { class: 'sr-only' }, 'Уншаагүй')));
}
