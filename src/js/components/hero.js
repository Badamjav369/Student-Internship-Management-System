// Нүүр хуудасны мэндчилгээний карт. aside — баруун талд гарах зүйл (зөвхөн оюутанд үе шатын зам).
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

export function hero({ date, name, sub = null, aside = null }) {
  return h('section', { class: 'hero', 'aria-labelledby': 'h-greet' },
    h('span', { class: 'hero-orb', 'aria-hidden': 'true' }),
    h('div', { class: 'hero-text' },
      h('p', { class: 'hero-chip' }, icon('calendar', 15), `Өнөөдөр ${date}`),
      h('h1', { id: 'h-greet', tabindex: '-1' }, `Сайн байна уу, ${name}`),
      sub ? h('p', { class: 'hero-sub' }, sub) : null),
    aside);
}
