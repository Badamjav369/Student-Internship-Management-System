// Гуравласан гэрээг системд гарын үсэг зурж байгуулах: гурван талын төлөв (хэн зурсан), өөрийн гарын үсэг (зурах / тоон), гэрээг харах, шалгах.
// Горим: touch — дэлгэцэнд зурна; digital — и-мэйл кодоор баталгаажуулна. Хуудас нээлттэй байхад 4 секунд тутам шинэчлэгдэж,
// бусад тал гарын үсэг зурмагц onChange() дуудагдана (ээлж ирсэн тал шууд зурах боломжтой болно).
import { h } from '../core/dom.js';
import { api } from '../data/http.js';
import { busy, checkbox, clearErrors, field, onSubmit } from '../core/forms.js';
import { icon } from '../core/icons.js';
import { banner } from './banner.js';
import { signaturePad } from './signature-pad.js';
import { badge } from './status-badge.js';
import { toast } from './toast-region.js';

/** base — '/student/contract' эсвэл '/head/contracts/9' гэх мэт (api() угтвартай). */
export const signingApi = (base) => ({
  sign: (body) => api(`${base}/sign`, { method: 'POST', body }),
  code: () => api(`${base}/sign/code`, { method: 'POST' }),
  verify: () => api(`${base}/verify`),
  docUrl: `/api${base}/document`,
});

const stamp = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ulaanbaatar' });
const METHOD = { touch: 'дэлгэцэнд зурсан', digital: 'цахим' };

function partyRow(p) {
  const status = p.signed ? h('span', { class: 'sign-when' }, `${stamp.format(new Date(p.signed_at))} · ${METHOD[p.method]}`)
    : p.missing ? badge('Томилогдоогүй', 'attention') : p.waiting ? badge('Бусад тал зурсны дараа') : badge('Хүлээж байна', 'pending');
  return h('li', { class: ['sign-party', p.signed && 'is-signed'] },
    h('span', { class: 'sign-mark', 'aria-hidden': 'true' }, icon(p.signed ? 'check' : 'clock', 18)),
    h('div', { class: 'sign-who' }, h('strong', {}, p.label), p.name ? h('span', {}, p.name) : null), status);
}

function touchForm(contract, apiRef, done) {
  const submit = h('button', { class: 'button', type: 'submit', disabled: true }, icon('pen', 18), 'Гарын үсэг зурах');
  const pad = signaturePad({ onChange: (empty) => { submit.disabled = empty; } });
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Гарын үсэг' }, pad.el, h('div', {}, submit));
  onSubmit(form, submit, async () => {
    if (pad.isEmpty()) return;
    await apiRef.sign({ image: pad.toDataURL() });
    toast('Гарын үсэг зурагдлаа.');
    done();
  });
  return form;
}

function digitalForm(apiRef, done) {
  const send = h('button', { class: 'button secondary', type: 'button' }, icon('mail', 18), 'Код илгээх');
  send.addEventListener('click', () => busy(send, async () => { await apiRef.code(); toast('Код и-мэйлээр илгээгдлээ.'); }).catch((e) => toast(e.message, 'error')));
  const submit = h('button', { class: 'button', type: 'submit' }, icon('shield', 18), 'Баталгаажуулж гарын үсэг зурах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Тоон гарын үсэг' },
    h('div', { class: 'actions' }, send),
    field({ label: 'И-мэйлээр ирсэн код', name: 'code', inputmode: 'numeric', maxlength: 6, autocomplete: 'one-time-code' }),
    checkbox({ label: 'Энэ гэрээнд өөрийн цахим гарын үсгээр баталгаажуулж байна', name: 'consent' }),
    h('div', {}, submit));
  onSubmit(form, submit, async () => {
    await apiRef.sign({ code: form.elements.code.value.trim(), consent: form.elements.consent.checked });
    toast('Гарын үсэг зурагдлаа.');
    done();
  });
  return form;
}

/** contract — GET-ийн хариу (signing талбартай). reload — шинэ төлөвийг авах функц (polling). seal — тамгын самбар (дадлага удирдагч). */
export function signingPanel({ contract, api: apiRef, onChange, reload, seal = null }) {
  const s = contract.signing;
  const viewer = h('div', { class: 'sign-doc', hidden: true });
  const toggle = h('button', { class: 'button secondary small', type: 'button' }, icon('contract', 16), 'Гэрээг харах');
  toggle.addEventListener('click', () => {
    if (viewer.hidden && !viewer.firstChild) viewer.append(h('iframe', { src: apiRef.docUrl, title: 'Гуравласан гэрээ', sandbox: 'allow-scripts allow-modals' }), h('a', { class: 'button secondary small', href: apiRef.docUrl, target: '_blank', rel: 'noopener' }, 'Шинэ цонхонд нээх'));
    viewer.hidden = !viewer.hidden;
  });
  const check = h('button', { class: 'button secondary small', type: 'button' }, icon('shield', 16), 'Шалгах');
  check.addEventListener('click', () => busy(check, async () => {
    const r = await apiRef.verify();
    toast(r.valid ? 'Гарын үсэг бүрэн, гэрээний агуулга өөрчлөгдөөгүй.' : 'Анхаар: гарын үсэг эсвэл агуулга өөрчлөгдсөн байна!', r.valid ? 'success' : 'error');
  }));

  const mine = s.can_sign
    ? h('div', { class: 'sign-mine' }, h('h3', {}, 'Таны гарын үсэг'), seal, s.method === 'touch' ? touchForm(contract, apiRef, onChange) : digitalForm(apiRef, onChange))
    : null;
  const root = h('section', { class: 'panel sign-panel', 'aria-labelledby': 'h-signing' },
    h('div', { class: 'sign-head' }, h('h2', { id: 'h-signing' }, 'Гарын үсэг'), badge(s.method === 'touch' ? 'Дэлгэцэнд зурах' : 'Тоон гарын үсэг')),
    s.hash_ok ? null : banner('error', 'Гэрээний агуулга өөрчлөгдсөн тул өмнөх гарын үсгүүд хүчингүй. Тэнхмийн эрхлэгч гэрээг буцааж дахин эхлүүлнэ.'),
    h('ul', { class: 'sign-parties' }, s.parties.map(partyRow)),
    mine,
    h('div', { class: 'actions' }, toggle, s.count ? check : null), viewer);

  // Бусад тал гарын үсэг зурмагц хуудсыг шинэчилнэ (ээлж ирсэн эсэх, төлөв).
  const key = (c) => `${c.status}:${c.signing?.count}:${c.signing?.can_sign}`;
  const timer = setInterval(async () => {
    if (!root.isConnected) { if (root.dataset.seen) clearInterval(timer); return; }
    root.dataset.seen = '1';
    if (document.hidden) return;
    try { if (key(await reload()) !== key(contract)) { clearInterval(timer); onChange(); } } catch { /* сүлжээний түр алдаа */ }
  }, 4000);
  return root;
}

/** Нэр, зураг бүхий байгууллагын тамга (дадлага удирдагч): оруулах / солих / устгах. */
export function sealManager(current, save) {
  const input = h('input', { type: 'file', accept: 'image/png,image/jpeg', class: 'sr-only', id: 'seal-file' });
  const read = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
  const run = (fn) => fn().then(() => toast('Тамга хадгалагдлаа.')).catch((e) => toast(e.message, 'error'));
  input.addEventListener('change', () => input.files[0] && run(async () => save(await read(input.files[0]))));
  return h('div', { class: 'seal-box' },
    current ? h('img', { src: current, alt: 'Байгууллагын тамга', class: 'seal-img' }) : h('span', { class: 'seal-empty' }, 'Тамга оруулаагүй'),
    h('label', { class: 'button secondary small', for: 'seal-file' }, 'Байгууллагын тамга ' + (current ? 'солих' : 'оруулах')), input,
    current ? h('button', { class: 'button secondary small', type: 'button', onclick: () => run(() => save(null)) }, 'Устгах') : null);
}
