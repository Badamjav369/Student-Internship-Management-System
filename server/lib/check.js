// Талбарын шалгалт: шаардлага бүрт Монгол мессеж. rules: { field: [fn, ...] }; алдаатай бол VALIDATION_ERROR.
import { invalid } from './http.js';

export const required = (v) => (v === undefined || v === null || String(v).trim() === '' ? 'Заавал бөглөнө.' : null);
export const email = (v) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'И-мэйл буруу байна.' : null);
export const date = (v) => (v && !/^\d{4}-\d{2}-\d{2}$/.test(v) ? 'Огноо буруу байна.' : null);
export const time = (v) => (v && !/^\d{2}:\d{2}$/.test(v) ? 'Цаг буруу байна.' : null);
export const oneOf = (...list) => (v) => (v != null && v !== '' && !list.includes(v) ? 'Буруу утга.' : null);
/** true / false (өгөөгүй байж болно). */
export const flag = (v) => (v === undefined || typeof v === 'boolean' ? null : 'Буруу утга.');
export const maxLen = (n) => (v) => (v && String(v).length > n ? `${n} тэмдэгтээс ихгүй.` : null);
export const number = (min, max) => (v) => (v != null && v !== '' && !(Number(v) >= min && Number(v) <= max) ? `${min}–${max} хооронд байна.` : null);

export function check(data, rules) {
  const fields = {};
  for (const [key, list] of Object.entries(rules)) {
    for (const rule of list) { const message = rule(data[key], data); if (message) { fields[key] = message; break; } }
  }
  if (Object.keys(fields).length) throw invalid(fields);
  return data;
}
/** Хоосон мөрийг null болгоно, мөрийг тайрна. */
export const clean = (data, keys) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, typeof data[k] === 'string' ? (data[k].trim() || null) : data[k]]));
