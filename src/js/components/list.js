// Жагсаалт: мөрийн карт, мөрүүдийн жагсаалт, хайлт/шүүлтээс хамаарч дахин ачаалагддаг жагсаалт.
import { h, replace } from '../core/dom.js';
import { busy } from '../core/forms.js';
import { icon } from '../core/icons.js';
import { toast } from './toast-region.js';

/** Жагсаалтын нэг мөр (карт): өмнөх дүрс, гарчиг (холбоос), тайлбарууд, баруун талд төлөв, үйлдэл. */
export function rowCard({ lead, title, href, lines = [], chips = [], side = null, actions = null, extra = null }) {
  return h('li', { class: 'row-card' },
    lead,
    h('div', { class: 'row-main' },
      h('h2', {}, href ? h('a', { href: `#${href}` }, title) : title),
      lines.filter(Boolean).map((line, k) => h('p', { class: k ? 'row-line' : 'row-sub' }, line)),
      chips.length ? h('ul', { class: 'chips' }, chips.map((c) => h('li', { class: 'chip' }, c))) : null, extra),
    side || actions ? h('div', { class: 'row-side' }, side, actions) : null);
}
/** Мөрийн өмнөх өнгөт дүрс. */
export const leadIcon = (name, tone) => h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(name, 22));
export const rowList = (label, rows) => h('ul', { class: 'row-list', 'aria-label': label }, rows);

/**
 * Хайлт, шүүлтээс хамаарч дахин ачаалагддаг жагсаалт. Хуучин хүсэлтийн хариу шинэ шүүлтийг дарахгүй (seq).
 * load({ limit, offset }) → { items, total }; row(item) → Node.
 */
export function liveList({ label, load, row, empty, pageSize = 20, noun = 'мөр' }) {
  const count = h('p', { class: 'result-count', role: 'status' });
  const list = rowList(label, []);
  const more = h('button', { class: 'button secondary', type: 'button', hidden: true }, 'Цааш үзэх');
  const root = h('div', { class: 'live-list' }, count, list, h('div', { class: 'pager' }, more));
  let seq = 0;
  let items = [];
  let total = 0;
  const draw = () => {
    count.textContent = `${total} ${noun}`;
    if (!items.length) { replace(list); list.after(empty()); list.hidden = true; return; }
    root.querySelector(':scope > empty-state')?.remove();
    list.hidden = false;
    replace(list, items.map(row));
    more.hidden = items.length >= total;
    more.textContent = `Цааш үзэх (${total - items.length})`;
  };
  async function run(reset = true) {
    const mine = ++seq;
    root.dataset.loading = 'true';
    try {
      const r = await load({ limit: pageSize, offset: reset ? 0 : items.length });
      if (mine !== seq) return;
      items = reset ? r.items : items.concat(r.items);
      total = r.total;
      root.querySelector(':scope > empty-state')?.remove();
      draw();
      more.hidden = items.length >= total;
    } catch (error) {
      if (mine === seq) toast(error.message, 'error');
    } finally {
      if (mine === seq) delete root.dataset.loading;
    }
  }
  more.addEventListener('click', () => busy(more, () => run(false)));
  root.reload = run;
  root.ready = run();
  return root;
}
