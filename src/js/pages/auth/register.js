// Байгууллага бүртгүүлэх (нэвтрэлтгүй): байгууллагын мэдээлэл + системд нэвтрэх холбогдох хүн. Байгууллага шууд идэвхжиж,
// холбогдох хүний и-мэйл рүү нууц үг тохируулах холбоос очно (backend: POST /api/auth/register-org).
import { h, replace } from '../../core/dom.js';
import { busy, clearErrors, EMAIL, field, formAlert, formRow, PHONE, setFieldError, values } from '../../core/forms.js';
import { icon } from '../../core/icons.js';
import { captchaSiteKey, registerOrganization } from '../../data/session-api.js';

const FIELDS = ['Мэдээллийн технологи', 'Санхүү, банк', 'Боловсрол', 'Эрүүл мэнд', 'Барилга, архитектур', 'Уул уурхай', 'Эрчим хүч', 'Худалдаа, үйлчилгээ', 'Хэвлэл мэдээлэл', 'Төрийн байгууллага', 'Судалгаа, шинжлэх ухаан'];
const REG_NO = /^[0-9A-Za-zА-ЯЁӨҮа-яёөү]{5,20}$/;

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Байгууллагын нэрээ оруулна уу.';
  if (!REG_NO.test(v.register_no.trim())) e.register_no = 'Регистрийн дугаар 5–20 үсэг, тоотой байна.';
  if (v.email.trim() && !EMAIL.test(v.email.trim())) e.email = 'И-мэйл хаягийг зөв бичнэ үү.';
  if (v.phone.trim() && !PHONE.test(v.phone.trim())) e.phone = 'Утасны дугаарыг тоогоор бичнэ үү.';
  if (!v['representative.last_name'].trim()) e['representative.last_name'] = 'Овгоо оруулна уу.';
  if (!v['representative.first_name'].trim()) e['representative.first_name'] = 'Нэрээ оруулна уу.';
  if (!EMAIL.test(v['representative.email'].trim())) e['representative.email'] = 'И-мэйл хаягаа зөв бичнэ үү.';
  if (v['representative.phone'].trim() && !PHONE.test(v['representative.phone'].trim())) e['representative.phone'] = 'Утасны дугаарыг тоогоор бичнэ үү.';
  return e;
}

const section = (iconName, title, ...children) => h('fieldset', { class: 'form-section' },
  h('legend', {}, h('span', { class: 'section-icon', 'aria-hidden': 'true' }, icon(iconName, 20)), title), ...children);

/** Cloudflare Turnstile: түлхүүр тохируулсан үед л ачаалагдана. token() — одоогийн баталгаа. */
async function captcha() {
  const siteKey = await captchaSiteKey();
  if (!siteKey) return { node: null, token: () => undefined, reset() {} };
  await new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = h('script', { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true });
    s.onload = resolve; s.onerror = reject; document.head.append(s);
  }).catch(() => {});
  const node = h('div', { class: 'captcha' });
  let token; let id;
  queueMicrotask(() => { id = window.turnstile?.render(node, { sitekey: siteKey, callback: (t) => { token = t; }, 'expired-callback': () => { token = undefined; } }); });
  return { node, token: () => token, reset() { token = undefined; if (id !== undefined) window.turnstile?.reset(id); } };
}

export async function render() {
  const cap = await captcha();
  const submit = h('button', { class: 'button block', type: 'submit' }, 'Бүртгүүлэх');
  const form = h('form', { class: 'form', novalidate: true },
    section('building', 'Байгууллага',
      field({ label: 'Байгууллагын нэр', name: 'name', required: true, maxlength: 200, autocomplete: 'organization' }),
      formRow(
        field({ label: 'Регистрийн дугаар', name: 'register_no', required: true, maxlength: 20, autocomplete: 'off' }),
        field({ label: 'Үйл ажиллагааны чиглэл', name: 'field', maxlength: 100, list: 'org-fields' })),
      h('datalist', { id: 'org-fields' }, FIELDS.map((f) => h('option', { value: f }))),
      formRow(
        field({ label: 'И-мэйл', name: 'email', type: 'email', inputmode: 'email', maxlength: 254 }),
        field({ label: 'Утас', name: 'phone', type: 'tel', inputmode: 'tel', maxlength: 30 })),
      field({ label: 'Хаяг', name: 'address', maxlength: 300, autocomplete: 'street-address' }),
      field({ label: 'Танилцуулга', name: 'description', type: 'textarea', rows: 3, maxlength: 3000 })),
    section('user', 'Холбогдох хүн',
      formRow(
        field({ label: 'Овог', name: 'representative.last_name', required: true, maxlength: 100, autocomplete: 'family-name' }),
        field({ label: 'Нэр', name: 'representative.first_name', required: true, maxlength: 100, autocomplete: 'given-name' })),
      formRow(
        field({ label: 'И-мэйл', name: 'representative.email', type: 'email', required: true, inputmode: 'email', maxlength: 254, autocomplete: 'email' }),
        field({ label: 'Утас', name: 'representative.phone', type: 'tel', inputmode: 'tel', maxlength: 30, autocomplete: 'tel' }))),
    h('input', { class: 'hp', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }),
    cap.node,
    submit);

  const card = h('section', { class: 'auth-card wide' },
    h('h1', { class: 'welcome', tabindex: '-1' }, 'Байгууллага бүртгүүлэх'),
    h('p', {}, 'Дадлагын зар нийтэлж, оюутны хүсэлт хүлээн авахын тулд бүртгүүлнэ үү.'), form,
    h('div', { class: 'auth-links' }, h('a', { href: '#/login' }, 'Нэвтрэх хуудас руу буцах')));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const v = values(form);
    const errors = validate(v);
    if (Object.keys(errors).length) {
      for (const [k, m] of Object.entries(errors)) setFieldError(form, k, m);
      return form.querySelector('[data-invalid] input, [data-invalid] textarea')?.focus();
    }
    const t = (k) => v[k].trim();
    await busy(submit, async () => {
      try {
        const { message } = await registerOrganization({
          name: t('name'), register_no: t('register_no'), field: t('field'), email: t('email'), phone: t('phone'), address: t('address'), description: t('description'),
          website: form.elements.website.value, captcha: cap.token(),
          representative: { last_name: t('representative.last_name'), first_name: t('representative.first_name'), email: t('representative.email'), phone: t('representative.phone') },
        });
        replace(card, h('div', { class: 'auth-done' },
          h('span', { class: 'done-icon', 'aria-hidden': 'true' }, icon('circle-check', 32)),
          h('h1', { tabindex: '-1' }, 'Бүртгэл амжилттай'), h('p', {}, message),
          h('a', { class: 'button block', href: '#/login' }, 'Нэвтрэх хуудас руу')));
        card.querySelector('h1').focus();
      } catch (error) {
        for (const [k, m] of Object.entries(error.fields ?? {})) setFieldError(form, k, m);
        formAlert(form, error.message);
        cap.reset();
      }
    });
  });
  return card;
}
