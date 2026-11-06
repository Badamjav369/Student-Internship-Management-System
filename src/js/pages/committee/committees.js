// Хамгаалалтын хуваарь: миний гишүүн болсон комисс бүрийн өдөр, байршил, бүрэлдэхүүн, оюутнуудын дараалал.
import { h, pageHead } from '../../core/dom.js';
import { formatDate, fullName } from '../../core/format.js';
import { nameOf } from '../../core/labels.js';
import { listMyCommittees } from '../../data/committee-api.js';
import { factTile } from '../../components/facts.js';
import { leadIcon, rowCard, rowList } from '../../components/list.js';
import { badge } from '../../components/status-badge.js';
import { noStudents, placeTile, stateBadge } from './shared.js';

const hm = (t) => (t ? String(t).slice(0, 5) : null);

function members(c) {
  return h('ul', { class: 'chips', 'aria-label': 'Комиссын гишүүд' }, c.members.map((m) => h('li', { class: 'chip' }, `${fullName(m)}${m.is_chair ? ' · дарга' : ''}${m.is_me ? ' · та' : ''}`)));
}

function committee(c) {
  const when = c.defense_date ? `${formatDate(c.defense_date)}${hm(c.start_time) ? ` ${hm(c.start_time)}` : ''}` : null;
  return h('section', { class: 'panel stack', 'aria-labelledby': `h-c-${c.id}` },
    h('div', { class: 'tab-summary' }, h('h2', { class: 'section-title', id: `h-c-${c.id}` }, c.name), c.is_chair ? badge('Та дарга', 'active') : null),
    h('div', { class: 'fact-grid' },
      factTile('calendar', 'blue', 'Хамгаалах өдөр', h('strong', {}, when ?? '—')),
      placeTile(c.format, c.place)),
    members(c),
    c.students.length ? rowList(`${c.name} — оюутнууд`, c.students.map((s) => rowCard({
      lead: leadIcon('user', 'amber'), title: nameOf(s.student), href: `/committee/students/${s.id}`,
      lines: [`${s.defense.order_no}-р ээлж · ${hm(s.defense.time) ?? '—'}`], side: stateBadge(s) }))) : h('p', { class: 'muted' }, 'Оюутан хуваарилагдаагүй байна.'));
}

export async function render() {
  const committees = await listMyCommittees();
  return h('div', { class: 'stack' }, pageHead('Хамгаалалтын хуваарь'), committees.length ? committees.map(committee) : noStudents());
}
