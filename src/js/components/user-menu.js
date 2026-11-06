// <user-menu> — хэрэглэгчийн нэр, зураг дээр дарахад нээгдэх цэс: Профайл, (хэд хэдэн дүртэй бол) дүр солих, Гарах.
import { h } from '../core/dom.js';
import { dropdown } from '../core/dropdown.js';
import { busy } from '../core/forms.js';
import { icon } from '../core/icons.js';
import { logout, setRole } from '../data/session-api.js';
import { ROLE_NAV } from '../nav.js';

class UserMenu extends HTMLElement {
  role = 'student';

  connectedCallback() {
    const { label: roleLabel } = ROLE_NAV[this.role];
    const user = this.user ?? { first_name: '', last_name: '' };
    const initials = `${user.last_name?.[0] ?? ''}${user.first_name?.[0] ?? ''}`;
    const name = `${user.last_name?.[0] ?? ''}. ${user.first_name}`;
    this.button = h('button', { class: 'user-button', type: 'button', 'aria-haspopup': 'true' },
      h('span', { class: 'avatar', 'aria-hidden': 'true' }, initials),
      h('span', { class: 'user-meta user-menu-name' }, h('strong', {}, name), h('span', {}, roleLabel)),
      icon('chevron', 16),
      h('span', { class: 'sr-only' }, `${user.last_name} ${user.first_name}, хэрэглэгчийн цэс`));
    const exit = h('button', { class: 'menu-item danger', type: 'button' }, icon('logout', 20), 'Гарах');
    exit.addEventListener('click', () => busy(exit, async () => { this.dd.close(); await logout(); }));
    const others = [...new Set((user.roles ?? []).map((r) => r.role ?? r))].filter((r) => r !== this.role && ROLE_NAV[r]);
    const switches = others.map((r) => h('button', { class: 'menu-item', type: 'button', on: { click: () => { this.dd.close(); setRole(r); } } }, icon('users', 20), ROLE_NAV[r].label));
    this.panel = h('div', { class: 'dropdown-panel user-panel', hidden: true },
      h('div', { class: 'menu-head' }, h('span', { class: 'avatar', 'aria-hidden': 'true' }, initials),
        h('span', { class: 'user-meta' }, h('strong', {}, `${user.last_name} ${user.first_name}`), h('span', {}, roleLabel))),
      h('a', { class: 'menu-item', href: `#/${this.role}/profile`, on: { click: () => this.dd.close() } }, icon('user', 20), 'Профайл'),
      ...switches, exit);
    this.append(h('div', { class: 'dropdown' }, this.button, this.panel));
    this.dd = dropdown(this.button, this.panel);
  }

  disconnectedCallback() { this.dd?.destroy(); this.replaceChildren(); }
}
customElements.define('user-menu', UserMenu);
