// Дадлагын байгууллага: дөрвөн таб — Зар, Хүсэлт, Санал болгох газар, Дадлагын тухай.
// Табууд нэг хуудас дотор солигдоно: өгөгдлийг эхэнд нь нэг дор татаж, самбарыг шаардлагатай үедээ л (lazy) бүтээж
// хадгална. Таб солиход router дахин ажиллахгүй, скелетон гарахгүй, зөвхөн URL (replaceState) шинэчлэгдэнэ.
import { h, pageHead } from '../../../core/dom.js';
import { daysBetween, formatDate } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { getSession } from '../../../data/session-api.js';
import { getDashboard, listApplications, listPlacementRequests } from '../../../data/student-api.js';
import { sentApplications } from '../shared.js';
import { createAboutTab } from './about.js';
import { createApplicationsTab } from './applications.js';
import { createPostsTab } from './posts.js';
import { createProposalsTab } from './proposals.js';

const SEARCHING = ['searching', 'applied'];
const TABS = [
  { key: 'posts', label: 'Зар', icon: 'megaphone', create: createPostsTab },
  { key: 'mine', label: 'Хүсэлт', icon: 'send', create: createApplicationsTab },
  { key: 'own', label: 'Санал болгох газар', icon: 'pin', create: createProposalsTab },
  { key: 'about', label: 'Дадлагын тухай', icon: 'info', create: createAboutTab },
];
const tabUrl = (key) => (key === 'posts' ? '/student/postings' : `/student/postings?tab=${key}`);

// Толгойн баруун талд зөвхөн газар хайх шатанд бүртгэлийн хугацааг харуулна (бусад төлөв нүүр хуудсанд байгаа).
function headNote(i, today) {
  if (!i || !SEARCHING.includes(i.status)) return null;
  const left = daysBetween(today, i.info.register_to);
  const text = left < 0 ? 'Бүртгэл хаагдсан' : left === 0 ? 'Бүртгэл өнөөдөр дуусна' : `Бүртгэл ${formatDate(i.info.register_to)} хүртэл · ${left} хоног үлдсэн`;
  return h('span', { class: ['org-note', left >= 0 && left <= 3 && 'urgent'] }, icon('clock', 16), text);
}

export async function render({ query }) {
  const [{ user }, dash, apps, requests] = await Promise.all([getSession(), getDashboard(), listApplications(), listPlacementRequests()]);
  const start = TABS.some((t) => t.key === query.get('tab')) ? query.get('tab') : 'posts';
  const ctx = { user, today: dash.today, internship: dash.internship, apps: sentApplications(apps), requests, postsTotal: null, version: 0 };

  const built = new Map(); // key → { el, refresh, ready? }
  const seen = new Map(); // key → ctx.version, самбар хамгийн сүүлд хэдэн дугаартай өгөгдлөөр зурагдсан
  const buttons = new Map();
  const panels = new Map();
  const counts = new Map();
  let active = start;

  const head = pageHead('Дадлагын байгууллага', h('div', { class: 'org-aside' }, headNote(dash.internship, dash.today)));
  const header = head.querySelector('.org-aside');

  const tablist = h('div', { class: 'org-tabs', role: 'tablist', 'aria-label': 'Дадлагын байгууллагын хэсгүүд' });
  for (const t of TABS) {
    const count = h('span', { class: 'tab-count', hidden: true });
    counts.set(t.key, count);
    const button = h('button', { class: 'org-tab', type: 'button', role: 'tab', id: `tab-${t.key}`, 'aria-controls': `panel-${t.key}`, 'aria-selected': 'false', tabindex: '-1', on: { click: () => show(t.key) } },
      icon(t.icon, 18), h('span', { class: 'tab-label' }, t.label), count);
    buttons.set(t.key, button);
    tablist.append(button);
    panels.set(t.key, h('div', { class: 'tab-panel', role: 'tabpanel', id: `panel-${t.key}`, 'aria-labelledby': `tab-${t.key}`, tabindex: '0', hidden: true }));
  }

  function updateCounts() {
    const set = (key, value, tone = null) => {
      const node = counts.get(key);
      node.hidden = value === null || value === undefined || value === 0;
      node.textContent = node.hidden ? '' : String(value);
      node.dataset.tone = tone ?? '';
    };
    set('posts', ctx.postsTotal);
    set('mine', ctx.apps.length, ctx.apps.some((a) => a.status === 'pending') ? 'amber' : null);
    set('own', ctx.requests.filter((r) => r.status === 'pending').length, 'amber');
    if (root.isConnected) reveal(active, { onlyIfClipped: true }); // тоо нэмэгдэж таб өргөссөн бол сонгосон таб хамаарахгүй байх
  }

  function ensure(key) {
    if (built.has(key)) return built.get(key);
    const tab = TABS.find((t) => t.key === key).create(ctx);
    panels.get(key).append(tab.el);
    built.set(key, tab);
    seen.set(key, ctx.version);
    return tab;
  }

  // Нарийн дэлгэц дээр таб мөр гүйлгэгддэг тул сонгосон табыг харагдах хэсэгт авчирна (хуудсыг гүйлгэхгүй).
  function reveal(key, { onlyIfClipped = false } = {}) {
    const b = buttons.get(key);
    if (tablist.scrollWidth <= tablist.clientWidth) return;
    const box = b.getBoundingClientRect();
    const strip = tablist.getBoundingClientRect();
    if (onlyIfClipped && box.left >= strip.left && box.right <= strip.right) return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shift = b.getBoundingClientRect().left - tablist.getBoundingClientRect().left - (tablist.clientWidth - b.offsetWidth) / 2;
    tablist.scrollTo({ left: tablist.scrollLeft + shift, behavior: calm ? 'auto' : 'smooth' });
  }

  function show(key, { focus = false, sync = true } = {}) {
    if (!TABS.some((t) => t.key === key)) key = 'posts';
    const tab = ensure(key);
    if (seen.get(key) !== ctx.version) { tab.refresh(); seen.set(key, ctx.version); } // өгөгдөл өөрчлөгдсөн бол л дахин зурна
    active = key;
    for (const t of TABS) {
      const on = t.key === key;
      buttons.get(t.key).setAttribute('aria-selected', String(on));
      buttons.get(t.key).tabIndex = on ? 0 : -1;
      panels.get(t.key).hidden = !on;
    }
    // hashchange үүсгэхгүй тул router дахин ажиллахгүй; Буцах товчоор өмнөх URL руу очихгүй (replace).
    if (sync) history.replaceState(null, '', `#${tabUrl(key)}`);
    reveal(key);
    if (focus) buttons.get(key).focus({ preventScroll: true });
  }
  ctx.show = show;
  ctx.updateCounts = updateCounts;

  // Өгөгдөл өөрчлөгдсөний дараа (хүсэлт илгээх/цуцлах) нэг дор шинэчилнэ. Харагдаж буй самбар шууд, бусад нь дараа нь нээгдэхэд.
  ctx.reload = async () => {
    const [next, nextApps, nextRequests] = await Promise.all([getDashboard(), listApplications(), listPlacementRequests()]);
    Object.assign(ctx, { internship: next.internship, today: next.today, apps: sentApplications(nextApps), requests: nextRequests });
    ctx.version += 1;
    updateCounts();
    built.get(active)?.refresh();
    seen.set(active, ctx.version);
    header.replaceChildren(...[headNote(ctx.internship, ctx.today)].filter(Boolean));
  };

  // Сумыг зүүн/баруун, Home/End товчоор таб хооронд шилжинэ (ARIA tabs загвар: автомат идэвхжүүлэлт).
  tablist.addEventListener('keydown', (event) => {
    const keys = TABS.map((t) => t.key);
    const at = keys.indexOf(active);
    const next = { ArrowRight: (at + 1) % keys.length, ArrowLeft: (at - 1 + keys.length) % keys.length, Home: 0, End: keys.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    show(keys[next], { focus: true });
  });

  const root = h('section', { class: 'org-page' }, head, tablist, ...TABS.map((t) => panels.get(t.key)));
  updateCounts();
  show(start, { sync: false });
  requestAnimationFrame(() => reveal(active)); // DOM-д орсны дараа
  // Анхны таб Зар бол түүний эхний үр дүнг хүлээнэ (хоосон самбар цахилзахаас сэргийлнэ); бусад үед нөхцөлд нь дараа ачаална.
  const posts = ensure('posts');
  if (start === 'posts') await posts.ready;
  else posts.ready.then(updateCounts);
  return root;
}
