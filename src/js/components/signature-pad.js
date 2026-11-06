// Дэлгэцэнд (хуруу, стилус, хулгана) гарын үсэг зурах талбар. Дотоод нягтрал тогтмол (1120×400), CSS-ээр уян хатан.
// pad.isEmpty() — зураагүй эсэх; pad.toDataURL() — PNG (ил тод дэвсгэр); onChange(isEmpty) — зурах/арилгах бүрт.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

const W = 1120;
const H = 400;

export function signaturePad({ onChange = () => {} } = {}) {
  const canvas = h('canvas', { class: 'sig-canvas', width: W, height: H, role: 'img', 'aria-label': 'Гарын үсэг зурах талбар' });
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111';
  let drawing = false; let last = null; let dirty = false;

  const at = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault(); canvas.setPointerCapture(e.pointerId); drawing = true; last = at(e);
    ctx.beginPath(); ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill();
    if (!dirty) { dirty = true; onChange(false); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    for (const ev of e.getCoalescedEvents?.() ?? [e]) {
      const p = at(ev);
      const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p;
    }
  });
  const stop = () => { drawing = false; };
  canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointercancel', stop); canvas.addEventListener('pointerleave', stop);

  const clear = () => { ctx.clearRect(0, 0, W, H); if (dirty) { dirty = false; onChange(true); } };
  const el = h('div', { class: 'sig-pad' },
    h('div', { class: 'sig-surface' }, canvas, h('span', { class: 'sig-line', 'aria-hidden': 'true' })),
    h('button', { class: 'button secondary small', type: 'button', onclick: clear }, icon('trash', 16), 'Арилгах'));
  return { el, isEmpty: () => !dirty, toDataURL: () => canvas.toDataURL('image/png'), clear };
}
