// Програмын эхлэл: component-уудыг бүртгэж, төлвөөс хамаарч харуулна:
//   нэвтрээгүй → <auth-shell> (нэвтрэх, нууц үг сэргээх/тохируулах)   нэвтэрсэн, зөвшөөрөөгүй → зөвшөөрлийн хуудас
//   нэвтэрсэн, зөвшөөрсөн → <app-shell> + router. Хоёр router нэг хэзээ ч зэрэг ажиллахгүй.
import './components/app-shell.js';
import './components/auth-shell.js';
import './components/toast-region.js';
import { createRouter, replaceHash } from './core/router.js';
import { consentRequired, getRole, getSession, isSignedIn } from './data/session-api.js';
import { ROLE_NAV } from './nav.js';
import { authRoutes, routesOf } from './routes.js';

const PUBLIC = ['/login', '/register', '/forgot-password', '/password'];
const AUTH = [...PUBLIC, '/consent'];
const [pathOf, queryOf] = [() => location.hash.slice(1).split('?')[0], () => new URLSearchParams(location.hash.slice(1).split('?')[1] ?? '')];
const here = () => location.hash.slice(1);
// Нэвтрэхийн өмнө очих гэсэн хуудас руу буцаахдаа зөвхөн энэ сайтын дотоод хаягийг зөвшөөрнө.
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') && !AUTH.some((p) => next.startsWith(p)) ? next : null);
const withNext = (path, next) => `#${path}${next ? `?next=${encodeURIComponent(next)}` : ''}`;

let app = null; // { shell, router, role }
let auth = null; // { shell, router }

function unmountApp() {
  if (!app) return;
  app.router.destroy();
  app.shell.remove();
  app = null;
}

function unmountAuth() {
  if (!auth) return;
  auth.router.destroy();
  auth.shell.remove();
  auth = null;
}

function mountAuth() {
  if (auth) return;
  const shell = document.createElement('auth-shell');
  document.body.prepend(shell);
  const router = createRouter({ routes: authRoutes, outlet: shell.outlet, fallback: '/login' });
  auth = { shell, router };
  router.start();
}

async function mountApp() {
  if (app) return;
  const role = getRole();
  const { user } = await getSession();
  if (app || !isSignedIn()) return; // await-ийн хооронд төлөв өөрчлөгдсөн
  const shell = document.createElement('app-shell');
  shell.role = role;
  shell.user = user;
  document.body.prepend(shell);
  const router = createRouter({ routes: routesOf(role), outlet: shell.outlet, fallback: ROLE_NAV[role].home });
  app = { shell, router, role };
  router.start();
}

// reason === 'logout': хэрэглэгч өөрөө гарсан тул нэвтрэх хуудас руу буцах хаяг (next) нэмэхгүй.
async function render(reason = null) {
  document.getElementById('boot')?.remove();
  const path = pathOf();
  if (!isSignedIn()) {
    unmountApp();
    if (!PUBLIC.includes(path)) replaceHash(withNext('/login', reason === 'logout' ? null : safeNext(path && here())));
    mountAuth();
    return;
  }
  if (consentRequired()) {
    unmountApp();
    if (path !== '/consent') replaceHash(withNext('/consent', safeNext(queryOf().get('next')) ?? safeNext(path && here())));
    mountAuth();
    return;
  }
  unmountAuth();
  const role = getRole();
  const { home } = ROLE_NAV[role];
  if (app && app.role !== role) { unmountApp(); replaceHash(`#${home}`); }
  // Нэвтэрсэн дүрийн хуудас биш хаяг (өөр дүрийн хуудас, next) руу орохгүй — өөрийнхөө нүүр рүү буцна.
  const next = safeNext(queryOf().get('next'));
  const allowed = (p) => p?.startsWith(`/${role}/`);
  if (AUTH.includes(path)) replaceHash(`#${allowed(next) ? next : home}`);
  else if (!allowed(path)) replaceHash(`#${home}`);
  await mountApp();
}

document.body.append(document.createElement('toast-region'));
addEventListener('session-changed', (event) => render(event.detail?.reason));
// Хаягийг гараар сольсон ч төлөвт нийцэхгүй хуудас руу орохгүй (нэвтэрсэн хүн /login руу, нэвтрээгүй хүн дотоод хуудас руу).
addEventListener('hashchange', () => render());
await render();
