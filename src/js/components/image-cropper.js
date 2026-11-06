// Зураг тайрах цонх: хэрэглэгч зургийн аль хэсгийг оруулахаа чирж, томруулж сонгоно. Гаралт — дөрвөлжин PNG/JPG.
// const file = await cropImage(file, { title, size })  → шинэ File, эсвэл «Болих» бол null. Зураг уншигдахгүй бол Error.
import { h } from '../core/dom.js';

const KEY_STEP = 12;

function load(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Зургийг уншиж чадсангүй. PNG эсвэл JPG сонгоно уу.')); };
    img.src = url;
  });
}

export async function cropImage(file, { title = 'Оруулах хэсгээ сонгоно уу', size = 512 } = {}) {
  const { img, url } = await load(file);
  const png = file.type === 'image/png';
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  let box = 0; // харагдах дөрвөлжингийн хэмжээ (px)
  let minScale = 1;
  let maxScale = 1;
  let scale = 1;
  let x = 0;
  let y = 0;

  const stage = h('div', { class: 'crop-stage', tabindex: '0', role: 'application', 'aria-label': 'Зураг. Сум товчоор зөөж, + / − товчоор томруулна.' },
    img, h('span', { class: 'crop-grid', 'aria-hidden': 'true' }));
  const zoom = h('input', { type: 'range', min: '0', max: '100', step: '1', value: '0', 'aria-label': 'Томруулах' });
  const hint = h('p', { class: 'hint' }, 'Зургийг чирж байрлуулна, гулсуураар томруулна.');

  const clamp = () => {
    const w = W * scale;
    const hh = H * scale;
    x = w >= box ? Math.min(0, Math.max(box - w, x)) : Math.min(box - w, Math.max(0, x));
    y = hh >= box ? Math.min(0, Math.max(box - hh, y)) : Math.min(box - hh, Math.max(0, y));
  };
  const draw = () => { clamp(); img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; };
  /** Томруулалтыг дөрвөлжингийн төвийг тогтмол барьж өөрчилнө. */
  const setScale = (next, cx = box / 2, cy = box / 2) => {
    const s = Math.min(maxScale, Math.max(minScale, next));
    x = cx - ((cx - x) / scale) * s;
    y = cy - ((cy - y) / scale) * s;
    scale = s;
    zoom.value = String(Math.round(((s - minScale) / (maxScale - minScale || 1)) * 100));
    draw();
  };
  const measure = () => {
    const first = box === 0;
    box = stage.clientWidth;
    minScale = Math.min(box / W, box / H); // зураг бүхлээрээ багтана
    maxScale = Math.max(minScale * 6, Math.max(box / W, box / H) * 3);
    if (first) { scale = minScale; x = (box - W * scale) / 2; y = (box - H * scale) / 2; }
    draw();
  };

  // Чирэх
  let drag = null;
  stage.addEventListener('pointerdown', (e) => { drag = { px: e.clientX, py: e.clientY, x, y }; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging'); });
  stage.addEventListener('pointermove', (e) => { if (!drag) return; x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; draw(); });
  const end = () => { drag = null; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    setScale(scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  stage.addEventListener('keydown', (e) => {
    const move = { ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0], ArrowUp: [0, -KEY_STEP], ArrowDown: [0, KEY_STEP] }[e.key];
    if (move) { x += move[0]; y += move[1]; draw(); e.preventDefault(); } else if (e.key === '+' || e.key === '=') setScale(scale * 1.15);
    else if (e.key === '-') setScale(scale / 1.15);
  });
  zoom.addEventListener('input', () => setScale(minScale + (maxScale - minScale) * (Number(zoom.value) / 100)));

  return new Promise((resolve) => {
    const dialog = h('dialog', { class: 'confirm cropper', 'aria-labelledby': 'crop-title' },
      h('form', { method: 'dialog' },
        h('h2', { id: 'crop-title' }, title), stage, h('label', { class: 'crop-zoom' }, h('span', {}, 'Томруулах'), zoom), hint,
        h('div', { class: 'actions' },
          h('button', { class: 'button quiet', type: 'submit', value: 'cancel', formnovalidate: true }, 'Болих'),
          h('button', { class: 'button', type: 'submit', value: 'ok' }, 'Хадгалах'))));
    dialog.addEventListener('close', async () => {
      let result = null;
      if (dialog.returnValue === 'ok') {
        const k = size / box;
        const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
        const ctx = canvas.getContext('2d');
        if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, x * k, y * k, W * scale * k, H * scale * k);
        const blob = await new Promise((done) => canvas.toBlob(done, png ? 'image/png' : 'image/jpeg', 0.92));
        if (blob) result = new File([blob], `logo.${png ? 'png' : 'jpg'}`, { type: blob.type });
      }
      URL.revokeObjectURL(url);
      dialog.remove();
      resolve(result);
    });
    document.body.append(dialog);
    dialog.showModal();
    measure();
    new ResizeObserver(() => { if (stage.clientWidth && stage.clientWidth !== box) { const r = box ? stage.clientWidth / box : 1; x *= r; y *= r; scale *= r; minScale *= r; maxScale *= r; box = stage.clientWidth; draw(); } }).observe(stage);
  });
}
