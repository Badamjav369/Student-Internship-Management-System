// Нэвтрэх: и-мэйл, нууц үг. Нэвтэрсний дараа main.js дараагийн хуудас (зөвшөөрөл эсвэл нүүр/next) руу шилжүүлнэ.
import { h } from '../../core/dom.js';
import { busy, clearErrors, field, formAlert, showErrors, values } from '../../core/forms.js';
import { icon } from '../../core/icons.js';
import { login } from '../../data/session-api.js';

export async function render({ query }) {
  const submit = h('button', { class: 'button block', type: 'submit' }, 'Нэвтрэх');
  const passwordField = field({ label: 'Нууц үг', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const password = passwordField.querySelector('input');
  // Нууц үг: аньсан нүд — нуусан, нээлттэй нүд — харагдаж байна.
  const toggle = h('button', { class: 'reveal', type: 'button', 'aria-pressed': 'false', 'aria-label': 'Харуулах', title: 'Нууц үг харуулах' }, icon('eye-closed', 20));
  toggle.addEventListener('click', () => {
    const shown = password.type === 'password';
    password.type = shown ? 'text' : 'password';
    toggle.replaceChildren(icon(shown ? 'eye' : 'eye-closed', 20));
    toggle.setAttribute('aria-label', shown ? 'Нуух' : 'Харуулах');
    toggle.title = shown ? 'Нууц үг нуух' : 'Нууц үг харуулах';
    toggle.setAttribute('aria-pressed', String(shown));
  });
  const wrap = h('div', { class: 'input-wrap' });
  password.replaceWith(wrap);
  wrap.append(password, toggle);

  const form = h('form', { class: 'form', novalidate: true },
    field({ label: 'И-мэйл', name: 'email', type: 'email', autocomplete: 'username', required: true, inputmode: 'email' }),
    passwordField,
    h('div', { class: 'form-aside' }, h('a', { href: '#/forgot-password' }, 'Нууц үгээ мартсан уу?')),
    submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { email, password: secret } = values(form);
    const errors = {};
    if (!email.trim()) errors.email = 'И-мэйл хаягаа оруулна уу.';
    if (!secret) errors.password = 'Нууц үгээ оруулна уу.';
    if (Object.keys(errors).length) return showErrors(form, errors);
    clearErrors(form);
    await busy(submit, async () => {
      try {
        await login(email.trim(), secret);
      } catch (error) {
        formAlert(form, error.message);
        password.value = '';
        password.focus();
      }
    });
  });

  const notices = query.get('reset') === '1'
    ? [h('div', { class: 'alert success', role: 'status' }, h('p', {}, 'Нууц үг тохирлоо. Шинэ нууц үгээрээ нэвтэрнэ үү.'))] : [];
  return h('section', { class: 'auth-card' },
    h('h1', { class: 'welcome', tabindex: '-1' }, 'Тавтай морилно уу'),
    h('p', {}, 'Бүртгэлтэй и-мэйл хаяг, нууц үгээрээ нэвтэрнэ үү.'),
    ...notices, form,
    h('div', { class: 'auth-or' }, h('span', {}, 'эсвэл')),
    h('a', { class: 'register-cta', href: '#/register' },
      h('span', { class: 'cta-icon', 'aria-hidden': 'true' }, icon('building', 24)),
      h('span', { class: 'cta-text' }, h('strong', {}, 'Байгууллага бүртгүүлэх'), h('small', {}, 'Дадлага авах байгууллагад')),
      h('span', { class: 'cta-arrow', 'aria-hidden': 'true' }, icon('arrow-up-right', 20))));
}
