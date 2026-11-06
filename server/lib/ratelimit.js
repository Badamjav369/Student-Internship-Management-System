// Давтамжийн хязгаар (D1): түлхүүр бүрт цонхонд max хүсэлт. IP нь Cloudflare-ийн cf-connecting-ip толгойноос.
// Толгойгүй (локал dev-server) үед хязгаарлахгүй — ингэснээр локал тест саадгүй. env.RATE_LIMIT = 'off' бол бүр унтраана.
import { HttpError } from './http.js';

export const ipOf = (request) => request.headers.get('cf-connecting-ip');

/** @param {{ip?: string|null, name: string, key?: string, max: number, windowSec: number}} o — key өгөөгүй бол IP-ээр. */
export async function rateLimit(db, env, request, { name, key, max, windowSec }) {
  if (env.RATE_LIMIT === 'off') return;
  const who = key ?? ipOf(request);
  if (!who) return;
  const at = new Date().toISOString();
  const row = await db.one(
    `INSERT INTO rate_limits (key, hits, reset_at) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET hits = CASE WHEN reset_at <= ? THEN 1 ELSE hits + 1 END, reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END
     RETURNING hits`, `${name}:${who}`, new Date(Date.now() + windowSec * 1000).toISOString(), at, at, new Date(Date.now() + windowSec * 1000).toISOString());
  if (Math.random() < 0.02) await db.run('DELETE FROM rate_limits WHERE reset_at <= ?', at);
  if (row.hits > max) throw new HttpError(429, 'RATE_LIMITED', 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.');
}

/** Cloudflare Turnstile (CAPTCHA). env.TURNSTILE_SECRET тохируулсан үед л шаардана. */
export async function checkCaptcha(env, request, token) {
  if (!env.TURNSTILE_SECRET) return;
  const bad = new HttpError(422, 'CAPTCHA', 'Робот биш гэдгээ баталгаажуулна уу.', { captcha: 'Робот биш гэдгээ баталгаажуулна уу.' });
  if (!token) throw bad;
  try {
    const res = await fetch(env.TURNSTILE_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(5000),
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ipOf(request) ?? undefined }),
    });
    if (!(await res.json()).success) throw bad;
  } catch (e) {
    if (e === bad) throw e;
    throw new HttpError(503, 'CAPTCHA_UNAVAILABLE', 'Баталгаажуулалт түр ажиллахгүй байна. Дахин оролдоно уу.');
  }
}
