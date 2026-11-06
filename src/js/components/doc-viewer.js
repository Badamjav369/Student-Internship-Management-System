// Баримт үзэгч: PDF-ийг ном шиг (хоёр хуудас зэрэг, хуудас эргэх хөдөлгөөнтэй) үзнэ; зургийг нэг дор харуулна.
// PDF.js (src/vendor/pdfjs) зөвхөн нээхэд ачаалагдаж, нэг дор зөвхөн харагдаж буй хуудас (болон хөрш хуудас)-ыг зурна.
// Боломж: хуудас эргүүлэх (товч, ←/→, хуудас дээр дарах, утсанд гулсуулах), хуудасны дугаараар очих, гулсуур,
// текстээр хайх (тохиролт тодрох), томруулах, кино шиг бүтэн дэлгэц (F).
import { config } from '../config.js';
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

const PDFJS = new URL('../../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
const WORKER = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
const ZOOMS = [1, 1.25, 1.5, 2, 3];
const FLIP_MS = 760;
const IDLE_MS = 2600;
const WIDE = 700; // энэ өргөнөөс дээр бол хоёр хуудас зэрэг
let lib = null;
const loadLib = () => (lib ??= import(PDFJS).then((m) => { m.GlobalWorkerOptions.workerSrc = WORKER; return m; }));

export const isViewable = (name) => /\.(pdf|png|jpe?g)$/i.test(String(name ?? ''));

/** id — файлын id (/api/files/:id); name — өргөтгөлөөр PDF/зураг эсэхийг ялгана. */
export async function openViewer({ id, name }) {
  const url = `${config.apiBase}/files/${id}`;
  const isPdf = /\.pdf$/i.test(name);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let task = null, pdf = null, Util = null, total = 1, bw = 595, bh = 842;
  let view = 0, cols = 2, zoom = 0, cellW = 300, cellH = 400, flipping = false, gen = 0;
  let full = false, apiFull = false, idleTimer = 0, layoutTimer = 0;
  let query = '', matches = [], at = -1, searchOpen = false, indexed = 0, indexDone = false, textChars = 0;
  const cache = new Map(); // `${n}:${cellW}` → { canvas, vp }
  const texts = new Map(); // n → [{ str, low, tr, w }]

  // ---------- DOM ----------
  const btn = (ic, text, onClick) => h('button', { class: 'viewer-btn', type: 'button', 'aria-label': text, title: text, on: { click: onClick } }, icon(ic, 20));
  const bSearch = btn('search', 'Хайх (Ctrl+F)', () => toggleSearch());
  const bPrev = btn('back', 'Өмнөх хуудас', () => step(-1));
  const bNext = btn('arrow', 'Дараагийн хуудас', () => step(1));
  const bOut = btn('minus', 'Жижигрүүлэх', () => setZoom(-1));
  const bIn = btn('plus', 'Томруулах', () => setZoom(1));
  bOut.classList.add('zoom'); bIn.classList.add('zoom');
  const bFull = btn('maximize', 'Бүтэн дэлгэц (F)', () => toggleFull());
  const bSave = h('a', { class: 'viewer-btn', href: url, download: name, 'aria-label': 'Татах', title: 'Татах' }, icon('download', 20));
  const bClose = btn('close', 'Хаах', () => dialog.close());
  const jump = h('input', { class: 'viewer-jump', type: 'text', inputmode: 'numeric', 'aria-label': 'Хуудасны дугаар', autocomplete: 'off', value: '' });
  const jumpTotal = h('span', { class: 'viewer-total' }, '');
  const jumpForm = h('form', { class: 'viewer-jumpform', on: { submit: (e) => { e.preventDefault(); const n = parseInt(jump.value, 10); if (n) goPage(n); jump.blur(); } } }, jump, jumpTotal);
  jump.addEventListener('focus', () => jump.select());

  const status = h('p', { class: 'viewer-status', role: 'status' }, 'Ачаалж байна…');
  const cellL = h('div', { class: 'pg pg-l' }), cellR = h('div', { class: 'pg pg-r' });
  const book = h('div', { class: 'book' }, cellL, cellR);
  const stage = h('div', { class: 'viewer-stage', tabindex: '0' }, status, book);

  const searchInput = h('input', { class: 'viewer-q', type: 'search', placeholder: 'Баримтаас хайх…', 'aria-label': 'Баримтаас хайх', autocomplete: 'off' });
  const searchInfo = h('span', { class: 'viewer-qinfo', 'aria-live': 'polite' }, '');
  const qPrev = btn('back', 'Өмнөх тохиролт', () => stepMatch(-1)), qNext = btn('arrow', 'Дараагийн тохиролт', () => stepMatch(1));
  const searchBar = h('form', { class: 'viewer-search', hidden: true, on: { submit: (e) => { e.preventDefault(); stepMatch(e.submitter ? 1 : 1); } } }, icon('search', 18), searchInput, searchInfo, qPrev, qNext, btn('close', 'Хайлт хаах', () => toggleSearch(false)));

  const slider = h('input', { class: 'viewer-slider', type: 'range', min: '1', max: '1', value: '1', 'aria-label': 'Хуудас сонгох' });
  const foot = h('footer', { class: 'viewer-foot' }, slider);
  const tools = isPdf ? [bSearch, h('span', { class: 'viewer-sep' }), bPrev, jumpForm, bNext, h('span', { class: 'viewer-sep' }), bOut, bIn, bFull, bSave, bClose] : [bFull, bSave, bClose];
  const dialog = h('dialog', { class: 'viewer', 'aria-label': name },
    h('header', { class: 'viewer-bar' }, h('strong', { class: 'viewer-name' }, name), h('div', { class: 'viewer-tools' }, ...tools), searchBar),
    stage, ...(isPdf ? [foot] : []));

  // ---------- Хуудасны бүтэц ----------
  const views = () => (cols === 2 ? Math.floor(total / 2) + 1 : total);
  const pagesOf = (v) => (cols === 2 ? [v * 2 || null, v * 2 + 1 <= total ? v * 2 + 1 : null] : [null, v + 1]);
  const viewOfPage = (p) => (cols === 2 ? Math.floor(p / 2) : p - 1);

  function measure() {
    const pad = full ? 20 : 44;
    const availW = Math.max(220, stage.clientWidth - pad), availH = Math.max(220, stage.clientHeight - pad);
    cols = isPdf && total > 1 && stage.clientWidth >= WIDE ? 2 : 1;
    const fit = Math.min(availW / (cols * bw), availH / bh);
    const s = fit * ZOOMS[zoom];
    cellW = Math.max(120, Math.floor(bw * s)); cellH = Math.max(160, Math.floor(bh * s));
    book.style.width = `${cellW * cols}px`; book.style.height = `${cellH}px`;
    for (const c of [cellL, cellR]) { c.style.width = `${cellW}px`; c.style.height = `${cellH}px`; }
    cellL.hidden = cols === 1; cellR.style.left = cols === 2 ? `${cellW}px` : '0';
    book.classList.toggle('single', cols === 1);
  }
  function offset(v) { // нүүр, ар талд ганц хуудас төвд байна
    if (cols !== 2) return book.style.setProperty('--shift', '0px');
    const [l, r] = pagesOf(v);
    book.style.setProperty('--shift', !l ? `${-cellW / 2}px` : !r ? `${cellW / 2}px` : '0px');
  }

  // ---------- Зурах ----------
  async function getCanvas(n) {
    const key = `${n}:${cellW}`;
    let hit = cache.get(key);
    if (!hit) {
      const page = await pdf.getPage(n);
      const v1 = page.getViewport({ scale: 1 });
      const s = Math.min(cellW / v1.width, cellH / v1.height);
      const vp = page.getViewport({ scale: s });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = h('canvas', { class: 'viewer-canvas' });
      canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = `${Math.floor(vp.width)}px`; canvas.style.height = `${Math.floor(vp.height)}px`;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: dpr === 1 ? null : [dpr, 0, 0, dpr, 0, 0] }).promise;
      hit = { canvas, vp }; cache.set(key, hit);
      if (cache.size > 12) cache.delete(cache.keys().next().value);
    }
    const copy = document.createElement('canvas'); // нэг canvas хоёр газар байж чадахгүй тул хуулбар өгнө
    copy.className = 'viewer-canvas'; copy.width = hit.canvas.width; copy.height = hit.canvas.height;
    copy.style.width = hit.canvas.style.width; copy.style.height = hit.canvas.style.height;
    copy.getContext('2d').drawImage(hit.canvas, 0, 0);
    return { canvas: copy, vp: hit.vp };
  }
  async function sheet(n) {
    if (!n) return null;
    const { canvas, vp } = await getCanvas(n);
    const el = h('div', { class: 'sheet', 'data-page': String(n) }, canvas);
    el.style.width = canvas.style.width; el.style.height = canvas.style.height; el._vp = vp;
    return el;
  }
  const setCell = (cell, el) => { cell.classList.toggle('has', !!el); cell.replaceChildren(...(el ? [el] : [])); };

  async function paint(v) {
    const my = ++gen;
    const [l, r] = pagesOf(v);
    const [a, b] = await Promise.all([sheet(l), sheet(r)]);
    if (my !== gen) return;
    setCell(cellL, a); setCell(cellR, b); offset(v);
    view = v; sync(); markHits(); prefetch(v);
  }
  function prefetch(v) {
    for (const d of [1, -1]) { const w = v + d; if (w >= 0 && w < views()) pagesOf(w).forEach((n) => n && getCanvas(n).catch(() => {})); }
  }

  // ---------- Хуудас эргэх ----------
  const shade = (cls) => h('div', { class: `shade ${cls}` });
  const face = (cls, el) => h('div', { class: `leaf-face ${cls}` }, ...(el ? [el] : []));

  async function flipTo(to) {
    if (flipping || to < 0 || to >= views() || to === view) return;
    const near = Math.abs(to - view) === 1 && !reduced;
    if (!near) { flipping = true; try { await paint(to); } finally { flipping = false; } return; }
    flipping = true;
    const dir = to > view ? 1 : -1;
    const [cl, cr] = pagesOf(view), [nl, nr] = pagesOf(to);
    try {
      const my = ++gen;
      const [sCl, sCr, sNl, sNr] = await Promise.all([sheet(cl), sheet(cr), sheet(nl), sheet(nr)]);
      if (my !== gen) return;
      // Хуудас эргэх үед харагдах бүх зүйл: хуучин хуудас (leaf-ийн нүүр), шинэ хуудас (leaf-ийн ар), доор нь нээгдэх хуудас
      const two = cols === 2;
      let leaf, anim;
      if (two) {
        const forward = dir > 0;
        leaf = h('div', { class: `leaf ${forward ? 'r' : 'l'}` }, face('front', forward ? sCr : sCl), face('back', forward ? sNl : sNr));
        leaf.append(shade('s-front'), shade('s-back'));
        leaf.style.width = `${cellW}px`; leaf.style.height = `${cellH}px`; leaf.style.left = forward ? `${cellW}px` : '0';
        leaf.style.transformOrigin = forward ? 'left center' : 'right center';
        if (forward) setCell(cellR, sNr); else setCell(cellL, sNl); // доор нээгдэх хуудас
        book.append(leaf); offset(to);
        const deg = forward ? -180 : 180;
        anim = leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${deg}deg)` }], { duration: FLIP_MS, easing: 'cubic-bezier(.55,.08,.25,1)', fill: 'forwards' });
        leaf.querySelector('.s-front').animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0.55 }], { duration: FLIP_MS, fill: 'forwards' });
        leaf.querySelector('.s-back').animate([{ opacity: 0.55 }, { opacity: 0.55, offset: 0.5 }, { opacity: 0 }], { duration: FLIP_MS, fill: 'forwards' });
      } else { // нэг хуудастай горим: хуудас зүүн ирмэгээрээ эргэнэ
        const forward = dir > 0;
        leaf = h('div', { class: 'leaf r' }, face('front', forward ? sCr : sNr), shade('s-front'));
        leaf.style.width = `${cellW}px`; leaf.style.height = `${cellH}px`; leaf.style.left = '0'; leaf.style.transformOrigin = 'left center';
        if (forward) setCell(cellR, sNr);
        book.append(leaf);
        const frames = [{ transform: 'rotateY(0deg)', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: 0 }];
        anim = leaf.animate(forward ? frames : frames.reverse(), { duration: FLIP_MS * 0.8, easing: 'cubic-bezier(.55,.08,.25,1)', fill: 'forwards' });
      }
      await anim.finished.catch(() => {});
      setCell(cellL, sNl); setCell(cellR, sNr); // эцсийн төлөв (шинэ хуулбар)
      if (!two) setCell(cellR, sNr);
      leaf.remove(); view = to; sync(); markHits(); prefetch(to);
    } finally { flipping = false; }
  }
  const step = (d) => flipTo(view + d);
  const goPage = (n) => { n = Math.min(total, Math.max(1, n)); flipTo(viewOfPage(n)); };

  function sync() {
    const [l, r] = pagesOf(view);
    const shown = cols === 2 ? [l, r].filter(Boolean) : [r];
    jump.value = shown.length === 2 ? `${shown[0]}–${shown[1]}` : String(shown[0]);
    jumpTotal.textContent = `/ ${total}`;
    bPrev.disabled = view <= 0; bNext.disabled = view >= views() - 1;
    bOut.disabled = zoom <= 0; bIn.disabled = zoom >= ZOOMS.length - 1;
    slider.max = String(total); slider.value = String(shown[0] ?? 1);
    slider.style.setProperty('--p', total > 1 ? `${((shown[0] - 1) / (total - 1)) * 100}%` : '0%');
  }

  async function relayout() {
    if (!pdf || flipping) return;
    cache.clear(); measure(); view = Math.min(view, views() - 1); await paint(view);
  }
  function setZoom(d) { zoom = Math.min(ZOOMS.length - 1, Math.max(0, zoom + d)); relayout(); }

  // ---------- Бүтэн дэлгэц ----------
  function setFull(on) {
    full = on; dialog.classList.toggle('full', on);
    bFull.replaceChildren(icon(on ? 'minimize' : 'maximize', 20));
    bFull.title = on ? 'Бүтэн дэлгэцээс гарах (F)' : 'Бүтэн дэлгэц (F)';
    wake(); queueLayout();
  }
  async function toggleFull() {
    const on = !full;
    if (on) { try { await dialog.requestFullscreen?.(); apiFull = !!document.fullscreenElement; } catch { apiFull = false; } }
    else if (document.fullscreenElement) { apiFull = false; await document.exitFullscreen().catch(() => {}); }
    setFull(on);
  }
  const onFsChange = () => { if (!document.fullscreenElement && apiFull && full) { apiFull = false; setFull(false); } };
  function wake() { // бүтэн дэлгэцэд хэсэг хугацаанд хөдөлгөөнгүй бол товчнууд алга болно (кино шиг)
    dialog.classList.remove('idle'); clearTimeout(idleTimer);
    if (full) idleTimer = setTimeout(() => { if (!searchInput.matches(':focus') && !jump.matches(':focus')) dialog.classList.add('idle'); }, IDLE_MS);
  }
  const queueLayout = () => { clearTimeout(layoutTimer); layoutTimer = setTimeout(() => (pdf ? relayout() : fitImage()), 120); };
  const fitImage = () => {};

  // ---------- Хайлт ----------
  async function textOf(n) {
    if (texts.has(n)) return texts.get(n);
    const page = await pdf.getPage(n);
    const tc = await page.getTextContent();
    const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ str: i.str, low: i.str.toLowerCase(), tr: i.transform, w: i.width }));
    texts.set(n, items); textChars += items.reduce((s, i) => s + i.str.length, 0);
    return items;
  }
  async function buildIndex() {
    for (let n = 1; n <= total; n++) {
      if (!dialog.isConnected) return;
      await textOf(n); indexed = n;
      if (query && n % 4 === 0) runSearch({ keep: true });
      if (n % 8 === 0) await new Promise((r) => setTimeout(r));
    }
    indexDone = true; if (query) runSearch({ keep: true });
  }
  function runSearch({ keep = false } = {}) {
    const q = query.trim().toLowerCase();
    const prevAt = keep && at >= 0 ? matches[at] : null;
    matches = [];
    if (q) for (let n = 1; n <= indexed; n++) for (const it of texts.get(n) ?? []) {
      let i = it.low.indexOf(q);
      while (i !== -1) { matches.push({ p: n, it, start: i, len: q.length }); i = it.low.indexOf(q, i + q.length); }
    }
    at = prevAt ? Math.max(0, matches.findIndex((m) => m.it === prevAt.it && m.start === prevAt.start)) : (matches.length ? 0 : -1);
    info(); if (!keep && at >= 0) showMatch(); else markHits();
  }
  function info() {
    const busy = !indexDone;
    searchInfo.textContent = !query.trim() ? '' : matches.length ? `${at + 1} / ${matches.length}${busy ? '+' : ''}`
      : busy ? `Хайж байна… ${indexed}/${total}` : textChars === 0 ? 'Скан зураг тул хайх боломжгүй' : 'Олдсонгүй';
    qPrev.disabled = qNext.disabled = !matches.length;
  }
  function showMatch() { const m = matches[at]; if (!m) return; info(); const v = viewOfPage(m.p); return v === view ? markHits() : flipTo(v); }
  function stepMatch(d) { if (!matches.length) return runSearch(); at = (at + d + matches.length) % matches.length; showMatch(); }
  function markHits() {
    for (const e of book.querySelectorAll('.hit')) e.remove();
    if (!query.trim() || !matches.length) return;
    for (const s of book.querySelectorAll('.pg .sheet')) {
      const n = Number(s.dataset.page), vp = s._vp; if (!vp) continue;
      matches.forEach((m, i) => {
        if (m.p !== n) return;
        const t = Util.transform(vp.transform, m.it.tr);
        const fh = Math.hypot(t[2], t[3]), tw = m.it.w * vp.scale, len = m.it.str.length;
        const el = h('i', { class: `hit${i === at ? ' now' : ''}`, 'aria-hidden': 'true' });
        el.style.cssText = `left:${t[4] + tw * (m.start / len) - 1}px;top:${t[5] - fh * 0.92}px;width:${Math.max(4, tw * (m.len / len)) + 2}px;height:${fh * 1.15}px`;
        s.append(el);
      });
    }
  }
  function toggleSearch(on = !searchOpen) {
    if (!isPdf) return;
    searchOpen = on; searchBar.hidden = !on; bSearch.classList.toggle('on', on);
    if (on) { searchInput.focus(); searchInput.select(); wake(); } else { query = ''; searchInput.value = ''; matches = []; at = -1; markHits(); stage.focus(); }
    queueLayout();
  }
  let qTimer = 0;
  searchInput.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(() => { query = searchInput.value; runSearch(); }, 180); });
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); stepMatch(-1); } });

  // ---------- Оролт ----------
  const onKey = (e) => {
    if (e.ctrlKey || e.metaKey) { if (isPdf && e.key.toLowerCase() === 'f') { e.preventDefault(); toggleSearch(true); } return; }
    wake();
    if (e.target.matches?.('input')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home' && isPdf) { e.preventDefault(); flipTo(0); }
    else if (e.key === 'End' && isPdf) { e.preventDefault(); flipTo(views() - 1); }
    else if (isPdf && (e.key === '+' || e.key === '=')) setZoom(1);
    else if (isPdf && (e.key === '-' || e.key === '_')) setZoom(-1);
    else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') toggleFull();
    else if (e.key === '/' && isPdf) { e.preventDefault(); toggleSearch(true); }
  };
  document.addEventListener('keydown', onKey);
  for (const ev of ['pointermove', 'pointerdown']) dialog.addEventListener(ev, wake);
  document.addEventListener('fullscreenchange', onFsChange);

  let x0 = null, y0 = 0, moved = false;
  stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; moved = false; });
  stage.addEventListener('pointerup', (e) => {
    if (x0 === null || !isPdf) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && stage.scrollWidth <= stage.clientWidth + 2) return step(dx < 0 ? 1 : -1);
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && !getSelection()?.toString()) { // хуудасны зүүн/баруун талд дарвал эргэнэ
      const t = e.target.closest?.('.pg'); if (t === cellL && !cellL.hidden) step(-1); else if (t === cellR) step(1);
    }
  });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  slider.addEventListener('input', () => { jump.value = slider.value; });
  slider.addEventListener('change', () => goPage(Number(slider.value)));
  const ro = new ResizeObserver(queueLayout); ro.observe(stage);
  dialog.addEventListener('close', () => {
    gen++; clearTimeout(idleTimer); clearTimeout(layoutTimer); ro.disconnect();
    document.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFsChange);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    task?.destroy?.(); cache.clear(); texts.clear(); dialog.remove();
  });

  document.body.append(dialog);
  dialog.showModal(); stage.focus();
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(res.status === 404 ? 'Файл олдсонгүй.' : 'Файлыг ачаалж чадсангүй.');
    if (isPdf) {
      const data = new Uint8Array(await res.arrayBuffer());
      const mod = await loadLib(); Util = mod.Util; task = mod.getDocument({ data }); pdf = await task.promise;
      total = pdf.numPages;
      const p1 = (await pdf.getPage(1)).getViewport({ scale: 1 }); bw = p1.width; bh = p1.height;
      status.remove(); measure(); await paint(0); buildIndex();
    } else {
      const src = URL.createObjectURL(await res.blob());
      status.remove(); book.replaceChildren(h('img', { class: 'viewer-image', src, alt: name })); book.classList.add('image');
      dialog.addEventListener('close', () => URL.revokeObjectURL(src), { once: true });
    }
  } catch (error) {
    status.textContent = error.message || 'Файлыг нээж чадсангүй. Татаж үзнэ үү.';
  }
}
