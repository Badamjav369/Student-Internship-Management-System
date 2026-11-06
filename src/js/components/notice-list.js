// <notice-list> — «Мэдэгдэл» хуудасны жагсаалт: Бүгд / Уншаагүй шүүлтүүр, «Бүгдийг уншсан болгох», «Цааш үзэх».
// Мэдэгдэл өөр газраас (хонх) уншсан болбол өөрөө шинэчлэгдэнэ.
import { h, replace } from '../core/dom.js';
import { busy } from '../core/forms.js';
import { icon } from '../core/icons.js';
import { listNotifications, markNotificationsRead } from '../data/session-api.js';
import { emptyState } from './empty-state.js';
import { noticeRow } from './notice-row.js';

const PAGE = 8;

class NoticeList extends HTMLElement {
  #filter = 'all';
  #shown = PAGE;
  #data = null;
  #reload = () => this.#load();

  /** Хуудас эхний өгөгдлийг урьдчилж өгвөл хоосон зураг цахилзахгүй. */
  set initial(data) { this.#data = data; }

  async connectedCallback() {
    this.filters = h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Шүүлтүүр' });
    this.list = h('div', { class: 'notice-host' });
    this.more = h('div', { class: 'notice-more' });
    this.bar = h('div', { class: 'notice-bar' });
    this.append(this.bar, this.list, this.more);
    addEventListener('notifications-changed', this.#reload);
    if (this.#data) this.#draw(); else await this.#load();
  }

  disconnectedCallback() {
    removeEventListener('notifications-changed', this.#reload);
    this.replaceChildren();
  }

  async #load() {
    this.#data = await listNotifications({ unreadOnly: this.#filter === 'unread', limit: this.#shown });
    if (this.isConnected) this.#draw();
  }

  #choose(filter) {
    if (filter === this.#filter) return;
    this.#filter = filter;
    this.#shown = PAGE;
    this.#load();
  }

  #draw() {
    const { items, total, unread, all } = this.#data;
    const chip = (key, label, count) => h('button', { class: 'filter-chip', type: 'button', 'aria-pressed': String(this.#filter === key), on: { click: () => this.#choose(key) } },
      label, h('span', { class: 'chip-count' }, count));
    replace(this.filters, chip('all', 'Бүгд', all), chip('unread', 'Уншаагүй', unread));
    // «Бүгдийг уншсан» товч гүйлгэдэг шүүлтүүрийн мөрөөс гадна байна — утсан дээр зүсэгдэхгүй.
    replace(this.bar, this.filters,
      unread ? h('button', { class: 'button quiet small notice-readall', type: 'button', on: { click: (event) => { const button = event.currentTarget; busy(button, () => markNotificationsRead()); } } }, icon('check', 16), 'Бүгдийг уншсан болгох') : null);

    replace(this.list, items.length === 0
      ? (this.#filter === 'unread' ? emptyState('Уншаагүй мэдэгдэл алга', null, { icon: 'circle-check' }) : emptyState('Мэдэгдэл алга', null, { icon: 'bell' }))
      : h('ul', { class: 'notice-list' }, items.map((n) => h('li', {}, noticeRow(n)))));

    const left = total - items.length;
    replace(this.more, left > 0 ? h('button', { class: 'button secondary', type: 'button', on: { click: () => { this.#shown += PAGE; this.#load(); } } }, `Цааш үзэх (${left})`) : null);
  }
}
customElements.define('notice-list', NoticeList);

export { PAGE as NOTICE_PAGE };
