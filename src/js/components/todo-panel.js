// «Хийх ажил» самбар: нүүр хуудас бүрт (оюутан, удирдагч багш, админ, ...) нэг хэлбэртэй.
// Эхний ажил (хамгийн чухал нь) том карт, үлдсэн нь жижиг карт болно.
// items: [{ icon, tone, text, href, action, extra?, badge?, progress?, count? }]
//   extra: тайлбарын доор гарах нэмэлт зүйл (жишээ нь дуусах хугацаа)
//   badge: { text, tone, live? } — «Өнөөдөр», «Хоцорсон» гэх мэт шошго
//   progress: { from, to, now } (YYYY-MM-DD) — хугацааны явцын зурвас
//   count: { n, unit } — том тоо (жишээ нь «15 хоног үлдсэн»)
import { h } from '../core/dom.js';
import { formatDate } from '../core/format.js';
import { icon } from '../core/icons.js';

const percent = ({ from, to, now }) => {
  const a = Date.parse(from), b = Date.parse(to), n = Date.parse(now);
  return b > a ? Math.min(100, Math.max(0, Math.round(((n - a) / (b - a)) * 100))) : 0;
};

function details(item) {
  const p = item.progress ? percent(item.progress) : null;
  return [
    item.extra ?? null,
    p === null ? null : h('div', { class: 'todo-progress' },
      h('div', { class: 'todo-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p, 'aria-label': 'Хугацааны явц' }, h('i', { style: { width: `${p}%` } })),
      h('p', { class: 'todo-bar-label' }, h('span', {}, formatDate(item.progress.from)), h('span', {}, formatDate(item.progress.to)))),
    item.count ? h('p', { class: 'todo-count-big' }, h('strong', {}, item.count.n), ` ${item.count.unit}`) : null,
  ];
}

const badge = (b) => (b ? h('span', { class: ['todo-badge', `todo-tone-${b.tone}`, b.live && 'live'] }, h('span', { class: 'todo-dot', 'aria-hidden': 'true' }), b.text) : null);
const action = (item, primary) => (item.href ? h('a', { class: ['button', !primary && 'secondary'], href: `#${item.href}` }, item.action, primary ? ' →' : null) : null);

function hero(item) {
  return h('li', { class: ['todo-hero', `todo-tone-${item.tone}`] },
    badge(item.badge),
    h('span', { class: ['tile', `tile-${item.tone}`], 'aria-hidden': 'true' }, icon(item.icon, 26)),
    h('div', { class: 'todo-body' }, h('p', { class: 'todo-hero-text' }, item.text), details(item)),
    action(item, true));
}

function card(item) {
  return h('li', { class: ['todo-item', `todo-tone-${item.tone}`] },
    h('span', { class: ['tile', `tile-${item.tone}`], 'aria-hidden': 'true' }, icon(item.icon, 22)),
    h('div', { class: 'todo-body' }, badge(item.badge), h('p', { class: 'todo-text' }, item.text), details(item)),
    action(item, false));
}

export function todoPanel(items) {
  const [first, ...rest] = items;
  return h('section', { class: 'panel todo', 'aria-labelledby': 'h-todo' },
    h('h2', { id: 'h-todo' }, 'Хийх ажил', items.length > 1 ? h('span', { class: 'todo-total' }, items.length) : null),
    items.length === 0
      ? h('p', { class: 'muted' }, 'Одоогоор хийх ажил алга.')
      : h('ul', { class: ['todo-board', rest.length === 0 && 'solo'] }, hero(first), rest.map(card)));
}
