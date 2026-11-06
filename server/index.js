// Cloudflare Worker-ийн эхлэл: /api/* → маршрут, бусад нь статик файл (env.ASSETS — index.html, src/).
// Холболт (wrangler.toml): DB — D1, FILES — R2 (файл), ASSETS — статик. Локалд мөн адил (dev-server.mjs --api).
import { createRouter } from './lib/router.js';
import { HttpError, errorResponse, json } from './lib/http.js';
import { database } from './lib/db.js';
import { authorize, currentUser } from './lib/auth.js';
import { routes as auth } from './modules/auth.js';
import { routes as notifications } from './modules/notifications.js';
import { routes as files } from './modules/files.js';
import { routes as admin } from './modules/admin/index.js';
import { routes as student } from './modules/student/index.js';
import { routes as supervisor } from './modules/supervisor/index.js';
import { routes as mentor } from './modules/mentor/index.js';
import { routes as orgRep } from './modules/org-rep/index.js';
import { routes as head } from './modules/head/index.js';
import { routes as committee } from './modules/committee/index.js';

const router = createRouter();
router.mount(auth, { roles: 'any' });
router.mount(notifications, { roles: 'any' });
router.mount(files, { roles: 'any' });
router.mount(admin, { roles: ['admin'] });
router.mount(student, { roles: ['student'] });
router.mount(supervisor, { roles: ['supervisor'] });
router.mount(mentor, { roles: ['mentor'] });
router.mount(orgRep, { roles: ['org_rep'] });
router.mount(head, { roles: ['head'] });
router.mount(committee, { roles: ['committee'] });
// Тохиргооны төлөв (утга биш, зөвхөн тохируулсан эсэх) — `npm run cf:smoke` шалгана.
router.add('GET', '/api/health', ({ env }) => json({ ok: true, signing: Boolean(env.SIGNING_SECRET || env.LOCAL_DEV), mail: Boolean(env.MAIL_API_KEY), captcha: Boolean(env.TURNSTILE_SECRET) }), { roles: null });

async function handle(request, env) {
  const url = new URL(request.url);
  const found = router.match(request.method, url.pathname);
  if (!found) throw new HttpError(404, 'NOT_FOUND', 'Ийм API алга.');
  if (found === 'METHOD') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Энэ үйлдлийг зөвшөөрөхгүй.');
  // CSRF: өөрчлөх хүсэлт бүр манай frontend-ийн толгойтой ирнэ (өөр сайтын form үүнийг тавьж чадахгүй).
  if (request.method !== 'GET' && request.headers.get('x-requested-with') !== 'pm2') throw new HttpError(403, 'FORBIDDEN', 'Хүсэлт зөвшөөрөгдөөгүй.');
  const db = database(env.DB);
  const user = found.route.roles ? await currentUser(db, request) : null;
  authorize(user, found.route.roles);
  if (user && !user.consent_at && !['/api/me', '/api/me/consent', '/api/auth/logout'].includes(url.pathname)) throw new HttpError(403, 'CONSENT_REQUIRED', 'Эхлээд зөвшөөрлөө баталгаажуулна уу.');
  return found.route.handler({ request, env, url, params: found.params, user, db });
}

export default {
  async fetch(request, env) {
    if (!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      const response = await handle(request, env);
      response.headers.set('cache-control', response.headers.get('cache-control') ?? 'no-store');
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  },
};
