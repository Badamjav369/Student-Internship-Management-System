// Идэвхгүй хугацаа: 5 минут юу ч хийхгүй бол нэвтэрсэн хэрэглэгчийг системээс гаргана.
// Сүүлийн үйлдлийн цагийг localStorage-д хадгалдаг тул нэг табын үйлдэл бусад табд ч тооцогдоно.
import { safeStorage } from './store.js';

export const IDLE_MS = 5 * 60 * 1000;
const KEY = 'pm2.activity';
const EVENTS = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'];
let timer = null;
let lastWrite = 0;

const lastActivity = () => Number(safeStorage.get(KEY)) || 0;
const touch = () => { const t = Date.now(); if (t - lastWrite > 1000) { lastWrite = t; safeStorage.set(KEY, String(t)); } };

/** onIdle — 5 минут идэвхгүй болоход нэг удаа дуудагдана. Буцаах функц нь хяналтыг зогсооно. */
export function watchIdle(onIdle) {
  touch();
  const check = () => { if (Date.now() - lastActivity() >= IDLE_MS) { stop(); onIdle(); } };
  const stop = () => { clearInterval(timer); timer = null; EVENTS.forEach((e) => removeEventListener(e, touch, true)); removeEventListener('visibilitychange', onVisible); };
  const onVisible = () => { if (!document.hidden) check(); };
  EVENTS.forEach((e) => addEventListener(e, touch, { capture: true, passive: true }));
  addEventListener('visibilitychange', onVisible);
  clearInterval(timer);
  timer = setInterval(check, 10 * 1000);
  return stop;
}
