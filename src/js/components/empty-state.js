// <empty-state heading="Гарчиг" icon="inbox">Тайлбар, товч</empty-state>
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

class EmptyState extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = 'true';
    const kids = [...this.childNodes];
    this.replaceChildren(
      h('div', { class: 'empty-icon', 'aria-hidden': 'true' }, icon(this.getAttribute('icon') ?? 'inbox', 26)),
      h('h2', {}, this.getAttribute('heading') ?? ''),
      ...kids);
  }
}
customElements.define('empty-state', EmptyState);

export const emptyState = (heading, text, { icon: name = 'inbox', action = null } = {}) =>
  h('empty-state', { heading, icon: name }, text ? h('p', {}, text) : null, action);

/** Олдоогүй мөр: жагсаалт руу буцах холбоостой хоосон төлөв. */
export const missing = (title, href) => emptyState(title, null, { icon: 'inbox', action: h('a', { class: 'button secondary', href: `#${href}` }, 'Жагсаалт руу') });
