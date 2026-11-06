// <app-shell> — хуудасны бүтэц: зүүн цэс, дээд мөр, гол агуулга (outlet), утасны доод цэс.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { ROLE_NAV } from '../nav.js';
import './app-logo.js';
import './theme-toggle.js';
import './notification-bell.js';
import './user-menu.js';

class AppShell extends HTMLElement {
  outlet = null;
  #links = [];
  #moreButton = null;
  #sheet = null;

  set user(value) { this.#user = value; }
  #user = null;
  set role(value) { this.#role = value; }
  #role = 'student';

  connectedCallback() {
    addEventListener('route-changed', this.#onRoute); // дахин холбогдоход ч сонсогч сэргэнэ
    if (this.outlet) return;
    const link = (item, cls, content) => {
      const a = h('a', { class: cls, href: `#${item.href}`, dataset: { nav: item.key } }, ...content);
      this.#links.push(a);
      return a;
    };
    const { items: ALL_NAV, bottom: ALL_BOTTOM, home, label: roleLabel } = ROLE_NAV[this.#role];
    // Улирал ажлын төлөвлөгөө / дэвтэр шаардаагүй бол холбогдох цэс гарахгүй.
    const off = new Set([...(this.#user?.features?.plan === false ? ['plan', 'plans'] : []), ...(this.#user?.features?.logbook === false ? ['logbook'] : [])]);
    const NAV = ALL_NAV.filter((n) => !off.has(n.key));
    const BOTTOM_KEYS = ALL_BOTTOM.filter((k) => !off.has(k));
    this.#bottom = BOTTOM_KEYS;
    const userMenu = document.createElement('user-menu');
    userMenu.user = this.#user;
    userMenu.role = this.#role;
    this.outlet = h('main', { class: 'main', id: 'main', tabindex: '-1' });

    this.#sheet = h('dialog', { class: 'confirm', 'aria-labelledby': 'sheet-title' },
      h('h2', { id: 'sheet-title' }, 'Цэс'),
      h('ul', { class: 'nav-list' }, NAV.map((item) => h('li', {}, link(item, 'nav-link', [icon(item.icon), h('span', {}, item.label)])))),
      h('div', { class: 'actions' }, h('button', { class: 'button secondary', type: 'button', on: { click: () => this.#sheet.close() } }, 'Хаах')));
    this.#sheet.addEventListener('click', (event) => { if (event.target.closest('a')) this.#sheet.close(); });

    this.#moreButton = h('button', { class: 'bottom-link', type: 'button', on: { click: () => this.#sheet.showModal() } }, icon('menu', 22), 'Цэс');

    this.append(
      h('a', { class: 'skip-link sr-only', href: '#main', on: { click: (e) => { e.preventDefault(); this.outlet.focus(); } } }, 'Үндсэн агуулга руу шилжих'),
      h('div', { class: 'shell' },
        h('aside', { class: 'sidebar' },
          h('a', { class: 'brand', href: `#${home}` }, h('app-logo', { size: 42 }), h('span', {}, 'Дадлагын нэгдсэн удирдлага')),
          h('p', { class: 'role-pill' }, roleLabel),
          h('nav', { 'aria-label': 'Үндсэн цэс' }, h('ul', { class: 'nav-list' }, NAV.map((item) => h('li', {}, link(item, 'nav-link', [icon(item.icon), item.label])))))),
        h('div', { class: 'frame' },
          h('header', { class: 'topbar' },
            document.createElement('theme-toggle'), document.createElement('notification-bell'), userMenu),
          this.outlet)),
      h('nav', { class: 'bottom-nav', 'aria-label': 'Хурдан цэс' },
        ...BOTTOM_KEYS.map((key) => { const item = NAV.find((n) => n.key === key); return link(item, 'bottom-link', [icon(item.icon, 22), item.short]); }),
        this.#moreButton),
      this.#sheet);

  }

  disconnectedCallback() { removeEventListener('route-changed', this.#onRoute); }

  #bottom = [];
  #onRoute = (event) => this.#markActive(event.detail.nav);

  #markActive(key) {
    for (const a of this.#links) {
      if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    if (this.#moreButton) {
      if (key && !this.#bottom.includes(key)) this.#moreButton.setAttribute('aria-current', 'page'); else this.#moreButton.removeAttribute('aria-current');
    }
  }
}
customElements.define('app-shell', AppShell);
