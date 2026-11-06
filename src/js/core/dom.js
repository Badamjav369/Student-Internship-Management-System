// DOM туслах функцууд. Бүх текст text node хэлбэрээр орно (innerHTML ашиглахгүй) — итгэлгүй өгөгдөл аюулгүй.

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyAttr(node, key, value) {
  if (value === null || value === undefined || value === false) return;
  if (key === 'class') {
    const list = (Array.isArray(value) ? value : [value]).flat().filter(Boolean);
    if (list.length) node.setAttribute('class', list.join(' '));
  } else if (key === 'on') {
    for (const [type, handler] of Object.entries(value)) node.addEventListener(type, handler);
  } else if (key === 'dataset') {
    for (const [name, v] of Object.entries(value)) if (v !== null && v !== undefined) node.dataset[name] = String(v);
  } else if (key === 'style' && typeof value === 'object') {
    // camelCase (marginBottom) ба kebab/custom property (--x) хоёуланг дэмжинэ.
    for (const [name, v] of Object.entries(value)) {
      if (name.startsWith('--') || name.includes('-')) node.style.setProperty(name, String(v)); else node.style[name] = String(v);
    }
  } else if (key === 'value' || key === 'checked' || key === 'selected' || key === 'disabled' || key === 'hidden') {
    // property хэлбэрээр: input-ийн утга, төлөв зөв тохирно
    if (key === 'value') node.value = value; else node[key] = Boolean(value);
    if (key === 'value') node.setAttribute('value', value);
  } else if (value === true) {
    node.setAttribute(key, '');
  } else {
    node.setAttribute(key, String(value));
  }
}

function append(node, child) {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) { for (const c of child) append(node, c); return; }
  node.append(child instanceof Node ? child : document.createTextNode(String(child)));
}

/** h('div', { class: 'a', on: { click } }, 'текст', h('span')) */
export function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const [key, value] of Object.entries(attrs)) applyAttr(node, key, value);
  } else if (attrs !== undefined && attrs !== null) {
    children.unshift(attrs);
  }
  for (const child of children) append(node, child);
  return node;
}

/** Контейнерын агуулгыг бүхэлд нь солино. */
export function replace(container, ...children) {
  container.replaceChildren();
  for (const child of children) append(container, child);
  return container;
}

export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) if (value !== null && value !== undefined) node.setAttribute(key, String(value));
  for (const child of children) append(node, child);
  return node;
}

/** Хуудасны гарчигтай толгой (h1 нь router-аар фокуслагдана). */
export function pageHead(title, aside = null) {
  return h('header', { class: 'page-head' }, h('h1', { tabindex: '-1' }, title), aside ? h('div', { class: 'page-head-aside' }, aside) : null);
}

export const on = (target, type, handler, options) => {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
};
