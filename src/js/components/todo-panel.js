// «Хийх ажил» самбар: нүүр хуудас бүрт (оюутан, удирдагч багш, админ) нэг хэлбэртэй.
// items: [{ icon, tone, text, href, action, extra? }] — extra: тайлбарын доор гарах нэмэлт зүйл (жишээ нь дуусах хугацаа).
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

export function todoPanel(items) {
  return h('section', { class: 'panel todo', 'aria-labelledby': 'h-todo' },
    h('h2', { id: 'h-todo' }, 'Хийх ажил'),
    items.length === 0
      ? h('p', { class: 'muted' }, 'Одоогоор хийх ажил алга.')
      : h('ul', { class: 'todo-list' }, items.map((item) => h('li', { class: 'todo-item' },
        h('span', { class: ['tile', `tile-${item.tone}`], 'aria-hidden': 'true' }, icon(item.icon, 22)),
        h('div', { class: 'todo-body' }, h('p', { class: 'todo-text' }, item.text), item.extra ?? null),
        item.href ? h('a', { class: 'button secondary', href: `#${item.href}` }, item.action) : null))));
}
