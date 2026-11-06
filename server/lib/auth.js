// Нэвтрэлт: нууц үг (PBKDF2-SHA256, WebCrypto — Worker, Node хоёуланд), session cookie, эрх шалгах.
import { HttpError, json } from './http.js';
import { now } from './db.js';

// PBKDF2 давталт. Cloudflare Workers-ийн дээд хязгаар 100000. Workers Free (10 мс CPU)-д wrangler.toml-ийн
// PASSWORD_ITERATIONS-оор багасгана. Хадгалсан хэш өөрийн давталтын тоог агуулдаг тул өөрчлөхөд хуучин нууц үг ажилласаар байна.
const ITERATIONS = 100000;
export const iterationsOf = (env) => Math.min(100000, Math.max(10000, Number(env?.PASSWORD_ITERATIONS) || ITERATIONS));
export const iterationsIn = (stored) => Number(String(stored ?? '').split('$')[1]) || 0;
const SESSION_DAYS = 7;
const COOKIE = 'sid';
const enc = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (bytes) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}
export async function hashPassword(password, iterations = ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(await derive(password, salt, iterations))}`;
}
export async function verifyPassword(password, stored) {
  const [kind, iter, salt, hash] = String(stored ?? '').split('$');
  if (kind !== 'pbkdf2') return false;
  const a = new Uint8Array(await derive(password, unb64(salt), Number(iter)));
  const b = unb64(hash);
  let diff = a.length ^ b.length;
  for (let k = 0; k < a.length; k += 1) diff |= a[k] ^ (b[k] ?? 0);
  return diff === 0;
}
export const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
export const sha256 = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))].map((x) => x.toString(16).padStart(2, '0')).join('');

const cookieOf = (request) => Object.fromEntries((request.headers.get('cookie') ?? '').split(';').map((p) => p.trim().split('=')).filter(([k]) => k))[COOKIE];
const cookie = (request, value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;

export async function rolesOf(db, userId) {
  return (await db.all('SELECT role, semester_id FROM user_roles WHERE user_id = ? ORDER BY role', userId)).map((r) => (r.semester_id ? r : { role: r.role }));
}

/** Шинэ session: cookie тавьсан хариу. */
export async function startSession(db, request, user, role, data) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await db.run('INSERT INTO sessions (token_hash, user_id, role, expires_at) VALUES (?, ?, ?, ?)', await sha256(token), user.id, role, expires);
  return json(data, 200, { 'set-cookie': cookie(request, token, SESSION_DAYS * 86400) });
}
export async function endSession(db, request) {
  const token = cookieOf(request);
  if (token) await db.run('DELETE FROM sessions WHERE token_hash = ?', await sha256(token));
  return json(null, 204, { 'set-cookie': cookie(request, '', 0) });
}

/** Cookie-оос нэвтэрсэн хэрэглэгч (дүртэй нь), эсвэл null. */
export async function currentUser(db, request) {
  const token = cookieOf(request);
  if (!token) return null;
  const row = await db.one(`SELECT s.role AS active_role, s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`, await sha256(token));
  if (!row || row.expires_at < now() || row.status === 'disabled') return null;
  const { password_hash, failed_logins, locked_until, expires_at, ...user } = row;
  return user;
}

/** Маршрутын эрх: нэвтэрсэн байх, идэвхтэй дүр нь roles-д багтах, зөвшөөрөл (consent) өгсөн байх. */
export function authorize(user, roles) {
  if (!roles) return;
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Нэвтэрнэ үү.');
  if (roles !== 'any' && !roles.includes(user.active_role)) throw new HttpError(403, 'FORBIDDEN', 'Энэ үйлдлийг хийх эрхгүй байна.');
}
