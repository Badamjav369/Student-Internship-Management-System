// <notification-bell> — мэдэгдлийн хонх. Сүүлийн хэдэн мэдэгдлийг унжуулж, «Бүх мэдэгдэл» хуудас руу холбоно.
import { h, replace } from '../core/dom.js';
import { dropdown } from '../core/dropdown.js';
import { icon } from '../core/icons.js';
import { getRole, listNotifications, markNotificationsRead } from '../data/session-api.js';
import { noticeRow } from './notice-row.js';

const LIMIT = 5;

class NotificationBell extends HTMLElement {
  async connectedCallback() {
    this.button = h('button', { class: 'icon-button', type: 'button', 'aria-haspopup': 'true' });
    this.panel = h('div', { class: 'dropdown-panel notice-panel', hidden: true });
    this.append(h('div', { class: 'dropdown' }, this.button, this.panel));
    this.dd = dropdown(this.button, this.panel);
    this.refresh = () => this.#load();
    for (const type of ['data-changed', 'notifications-changed']) addEventListener(type, this.refresh);
    await this.#load();
  }

  disconnectedCallback() {
    for (const type of ['data-changed', 'notifications-changed']) removeEventListener(type, this.refresh);
    this.dd?.destroy();
    this.replaceChildren();
  }

  async #load() {
    const { items, unread, all } = await listNotifications({ limit: LIMIT });
    this.button.setAttribute('aria-label', unread ? `Мэдэгдэл, ${unread} уншаагүй` : 'Мэдэгдэл');
    replace(this.button, icon('bell'), unread ? h('span', { class: 'count-badge float', 'aria-hidden': 'true' }, unread > 9 ? '9+' : unread) : null);
    replace(this.panel,
      h('div', { class: 'notice-panel-head' }, h('h2', {}, 'Мэдэгдэл'),
        unread ? h('button', { class: 'button quiet small', type: 'button', on: { click: () => markNotificationsRead() } }, 'Бүгдийг уншсан болгох') : null),
      items.length === 0
        ? h('p', { class: 'muted notice-empty' }, 'Мэдэгдэл алга.')
        : h('ul', { class: 'notice-menu' }, items.map((n) => h('li', {}, noticeRow(n, { onOpen: () => this.dd.close() })))),
      all > 0 ? h('a', { class: 'notice-all', href: `#/${getRole()}/notifications`, on: { click: () => this.dd.close() } }, 'Бүх мэдэгдэл', icon('arrow', 16)) : null);
  }
}
customElements.define('notification-bell', NotificationBell);
