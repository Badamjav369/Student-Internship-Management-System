// Backend-ийн хүсэлт: JSON эсвэл FormData, cookie-той session. Алдааг { code, message, fields } бүхий Error болгоно
// (маягтууд fields-ийг талбар бүрт харуулна). 401 ирвэл «session-expired» үүсгэж нэвтрэх хуудас руу буцаана.
import { config } from '../config.js';

export async function api(path, { method = 'GET', query = null, body, form = null } = {}) {
  const url = new URL(`${config.apiBase}${path}`, location.origin);
  for (const [k, v] of Object.entries(query ?? {})) if (v !== '' && v !== null && v !== undefined) url.searchParams.set(k, v);
  const headers = { 'x-requested-with': 'pm2' };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try { res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin' }); } catch {
    throw Object.assign(new Error('Сервертэй холбогдож чадсангүй. Интернэт холболтоо шалгана уу.'), { code: 'NETWORK' });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) dispatchEvent(new CustomEvent('session-expired'));
    throw Object.assign(new Error(data?.message ?? 'Алдаа гарлаа. Дахин оролдоно уу.'), { code: data?.code ?? 'ERROR', status: res.status, fields: data?.fields ?? null });
  }
  return data;
}

/** { key: File | string | object } → FormData (объектыг JSON болгоно, хоосныг алгасна). */
export function formData(fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue;
    fd.append(k, v instanceof Blob || typeof v === 'string' ? v : JSON.stringify(v));
  }
  return fd;
}
