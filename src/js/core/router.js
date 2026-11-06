// Hash router (#/student/home?tab=mine). Hash ашигласнаар ямар ч static hosting (Cloudflare Pages, python http.server)
// дээр refresh хийхэд 404 гарахгүй. Хуудас бүр render(ctx) → DOM Node буцаадаг модуль.
import { h, replace } from './dom.js';

const compile = (pattern) => {
  const keys = [];
  const source = pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; });
  return { regex: new RegExp(`^${source}$`), keys };
};

// Систем доторх шилжилтийн дугаар (history.state.idx): 0 — анх нээсэн хуудас. «Буцах» товч > 0 үед history.back() хийнэ.
let lastIdx = -1;
let replacing = false;
export const hasPrevious = () => (history.state?.idx ?? 0) > 0;
function track() {
  if (history.state?.idx == null) history.replaceState({ ...(history.state ?? {}), idx: replacing ? Math.max(lastIdx, 0) : lastIdx + 1 }, '');
  replacing = false;
  lastIdx = history.state.idx;
}
/** location.replace-ийн оронд: шинэ мөр үүсгэхгүй тул дугаар нэмэгдэхгүй. */
export function replaceHash(target) { replacing = true; location.replace(target); }

export function createRouter({ routes, outlet, fallback = '/student/home' }) {
  const table = routes.map((r) => ({ ...r, ...compile(r.path) }));
  let token = 0;
  let current = null;

  const parse = () => {
    const raw = location.hash.slice(1) || fallback;
    const [path, search = ''] = raw.split('?');
    return { path: path || fallback, query: new URLSearchParams(search) };
  };

  function navigate(to, { replace: shouldReplace = false } = {}) {
    const target = `#${to}`;
    if (location.hash === target) return render();
    if (shouldReplace) replaceHash(target); else location.hash = target;
    return undefined;
  }

  function skeleton() {
    return h('div', { class: 'skeleton-page', 'aria-hidden': 'true' },
      h('div', { class: 'skeleton', style: { height: '2rem', width: '14rem' } }),
      h('div', { class: 'skeleton', style: { height: '12rem' } }),
      h('div', { class: 'skeleton', style: { height: '16rem' } }));
  }

  async function render() {
    track();
    const mine = ++token;
    const { path, query } = parse();
    let match = null;
    let params = {};
    for (const route of table) {
      const m = route.regex.exec(path);
      if (m) { match = route; params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])); break; }
    }
    outlet.setAttribute('aria-busy', 'true');
    // Ижил хуудас дотор (query солигдох, refresh) хуучин агуулгыг үлдээнэ — скелетон нь хуудас солигдоход л гарна.
    const slow = path === current ? null : setTimeout(() => { if (mine === token) replace(outlet, skeleton()); }, 140);
    let node;
    let title = 'Хуудас олдсонгүй';
    try {
      if (!match) {
        node = h('section', { class: 'panel empty' }, h('h1', { tabindex: '-1' }, 'Хуудас олдсонгүй'),
          h('p', {}, 'Энэ хаяг байхгүй байна.'), h('a', { class: 'button', href: `#${fallback}` }, 'Нүүр хуудас руу'));
      } else {
        const page = await match.load();
        node = await page.render({ params, query, navigate, refresh: render });
        title = match.title;
      }
    } catch (error) {
      console.error(error);
      node = h('section', { class: 'panel empty', role: 'alert' }, h('h1', { tabindex: '-1' }, 'Алдаа гарлаа'),
        h('p', {}, error.message || 'Хуудсыг ачаалж чадсангүй.'),
        h('button', { class: 'button', type: 'button', on: { click: () => render() } }, 'Дахин оролдох'));
    }
    if (slow) clearTimeout(slow);
    if (mine !== token) return; // илүү шинэ навигаци эхэлсэн — хуучин хариуг ашиглахгүй
    replace(outlet, node);
    outlet.removeAttribute('aria-busy');
    document.title = `${title} · Дадлагын нэгдсэн удирдлага`;
    const changed = current !== path;
    current = path;
    if (changed) scrollTo({ top: 0 });
    node.querySelector?.('h1')?.focus({ preventScroll: true });
    dispatchEvent(new CustomEvent('route-changed', { detail: { path, nav: match?.nav ?? null } }));
  }

  addEventListener('hashchange', render);
  // Гарахад хуудасны бүрхүүлийг салгахдаа сонсогчийг арилгана; дуусаагүй ачаалалтын хариу ашиглагдахгүй.
  const destroy = () => { token += 1; removeEventListener('hashchange', render); };
  return { start: render, refresh: render, navigate, destroy };
}
