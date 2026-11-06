// Нэг хуудсан дотор солигдох таб (ARIA tabs: сум, Home/End). Самбар бүр урьдчилан бүтэгдсэн тул солиход саатал гарахгүй.
// items: [{ label, icon, panel, count?, countTone?, tone?, status? }]
//   count — табын тоон шошго (0/null бол нуугдана); tone — төлөвийг заасан цэг (done|pending|attention), status — түүний бичвэр.
// Буцаах элемент дээр: show(k), setCount(k, value, tone) аргууд бий.
import { h } from './dom.js';
import { icon } from './icons.js';

let uid = 0;

export function tabs(items, { label, start = 0, className = '' } = {}) {
  const id = `tabs-${++uid}`;
  const tablist = h('div', { class: 'org-tabs', role: 'tablist', 'aria-label': label });
  const buttons = [];
  const panels = [];
  const counts = [];

  // Нарийн дэлгэц дээр таб мөр гүйлгэгддэг тул сонгосон табыг харагдах хэсэгт авчирна (хуудсыг гүйлгэхгүй).
  const reveal = (k) => {
    if (tablist.scrollWidth <= tablist.clientWidth) return;
    const b = buttons[k];
    tablist.scrollLeft = Math.max(0, b.offsetLeft - (tablist.clientWidth - b.offsetWidth) / 2);
  };
  const show = (k, focus = false) => {
    items.forEach((_, n) => {
      buttons[n].setAttribute('aria-selected', String(n === k));
      buttons[n].tabIndex = n === k ? 0 : -1;
      panels[n].hidden = n !== k;
    });
    reveal(k);
    if (focus) buttons[k].focus({ preventScroll: true });
  };
  const setCount = (k, value, tone = null) => {
    const node = counts[k];
    node.hidden = !value;
    node.textContent = value ? String(value) : '';
    node.dataset.tone = tone ?? '';
  };

  items.forEach((t, k) => {
    const count = h('span', { class: 'tab-count', hidden: true });
    counts.push(count);
    buttons.push(h('button', { class: 'org-tab', type: 'button', role: 'tab', id: `${id}-tab-${k}`, 'aria-controls': `${id}-panel-${k}`, 'aria-selected': 'false', tabindex: '-1', on: { click: () => show(k) } },
      t.icon ? icon(t.icon, 18) : null, h('span', { class: 'tab-label' }, t.label), count,
      t.tone ? h('span', { class: 'tab-dot', dataset: { tone: t.tone } }, h('span', { class: 'sr-only' }, t.status)) : null));
    panels.push(h('div', { class: 'tab-panel', role: 'tabpanel', id: `${id}-panel-${k}`, 'aria-labelledby': `${id}-tab-${k}`, tabindex: '0', hidden: true }, t.panel));
    tablist.append(buttons[k]);
    if (t.count) setCount(k, t.count, t.countTone);
  });
  tablist.addEventListener('keydown', (event) => {
    const at = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    const next = { ArrowRight: (at + 1) % items.length, ArrowLeft: (at - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    show(next, true);
  });

  const root = h('div', { class: ['tabs', className] }, tablist, ...panels);
  root.show = show;
  root.setCount = setCount;
  show(start);
  requestAnimationFrame(() => reveal(start)); // DOM-д орсны дараа өргөн мэдэгдэнэ
  return root;
}

/** URL-ийн `tab` параметрээс эхний табын индекс. */
export const tabStart = (keys, query) => Math.max(0, keys.indexOf(query.get('tab')));
/** Сонгосон табыг хаягт (hash) хадгална: refresh хийхэд ижил таб дээр үлдэнэ. */
export function rememberTab(root, keys, base, extra = '') {
  const list = root.querySelector('[role="tablist"]');
  const sync = (event) => {
    const k = [...list.querySelectorAll('[role="tab"]')].indexOf(event.target.closest('[role="tab"]'));
    if (k >= 0) history.replaceState(null, '', `#${base}?${extra}tab=${keys[k]}`);
  };
  list.addEventListener('click', sync);
  list.addEventListener('focusin', sync);
  return root;
}
