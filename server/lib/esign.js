// Цахим гарын үсгийн туслахууд (Web Crypto — Workers болон Node хоёуланд ажиллана).
import { HttpError } from './http.js';
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export const sha256 = async (text) => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));

/** HMAC-SHA256: серверийн нууц түлхүүрээр гарын үсгийн бүртгэлийг лацдана (өгөгдлийн санд засвар хийвэл илэрнэ). */
export async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
/** Production-д `wrangler secret put SIGNING_SECRET` заавал (`npm run cf:setup` өөрөө тавина). Локал dev-server-т (LOCAL_DEV) хөгжүүлэлтийн түлхүүр. */
export function signingSecret(env) {
  if (env.SIGNING_SECRET) return env.SIGNING_SECRET;
  if (env.LOCAL_DEV) return 'dev-only-signing-secret';
  throw new HttpError(503, 'SIGNING_NOT_CONFIGURED', 'Гарын үсгийн түлхүүр (SIGNING_SECRET) тохируулаагүй байна. Системийн админд хандана уу.');
}

export const proofOf = (env, s) => hmac(signingSecret(env), [s.doc_hash, s.party, s.user_id, s.signed_at, s.method].join('|'));

export function code6() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

/** PNG data URL шалгах (зураг, хэмжээ). kb — дээд хэмжээ. */
export function pngDataUrl(value, { kb = 150, jpeg = false } = {}) {
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(value ?? ''));
  if (!m || (m[1] === 'jpeg' && !jpeg)) return null;
  if (m[2].length * 0.75 > kb * 1024) return null;
  const head = atob(m[2].slice(0, 12));
  const ok = m[1] === 'png' ? head.startsWith('\x89PNG') : head.startsWith('\xff\xd8');
  return ok ? value : null;
}
