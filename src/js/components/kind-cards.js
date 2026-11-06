// Радио сонголт хавтан хэлбэрээр: дүрс, гарчиг, тайлбар.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

export function kindCards(legend, options, { name = 'kind', value = options[0]?.value } = {}) {
  return h('fieldset', { class: 'kind-cards' }, h('legend', {}, legend), options.map((o) => h('label', { class: 'kind-card' },
    h('input', { type: 'radio', name, value: o.value, checked: o.value === value, class: 'sr-only' }),
    h('span', { class: ['tile', `tile-${o.tone ?? 'violet'}`], 'aria-hidden': 'true' }, icon(o.icon, 22)),
    h('span', { class: 'kind-text' }, h('strong', {}, o.label), o.hint ? h('span', {}, o.hint) : null))));
}
