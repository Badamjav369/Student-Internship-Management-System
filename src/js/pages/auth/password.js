// Урилга эсвэл сэргээх холбоосоор нууц үг тохируулах (#/password?token=…).
import { h } from '../../core/dom.js';
import { busy, clearErrors, field, formAlert, showErrors, values } from '../../core/forms.js';
import { resetPassword } from '../../data/session-api.js';

export const MIN_PASSWORD = 8;

export function passwordProblems(password, repeat) {
  const errors = {};
  if (password.length < MIN_PASSWORD) errors.password = `Нууц үг ${MIN_PASSWORD}-аас доошгүй тэмдэгттэй байна.`;
  if (repeat !== password) errors.password_repeat = 'Давтсан нууц үг таарахгүй байна.';
  return errors;
}

export async function render({ query, navigate }) {
  const token = query.get('token');
  if (!token) {
    return h('section', { class: 'auth-card' }, h('h1', { tabindex: '-1' }, 'Нууц үг тохируулах'),
      h('div', { class: 'alert error', role: 'alert' }, h('p', {}, 'Холбоос дутуу байна. И-мэйлээр ирсэн холбоосыг бүтнээр нь нээнэ үү.')),
      h('div', { class: 'auth-links' }, h('a', { href: '#/forgot-password' }, 'Шинэ холбоос авах')));
  }
  const submit = h('button', { class: 'button block', type: 'submit' }, 'Нууц үг тохируулах');
  const form = h('form', { class: 'form', novalidate: true },
    field({ label: 'Шинэ нууц үг', name: 'password', type: 'password', autocomplete: 'new-password', required: true,
      hint: `${MIN_PASSWORD}-аас доошгүй тэмдэгт. Бусдад таагдахгүй, өөр системд ашигладаггүй нууц үг сонгоно уу.` }),
    field({ label: 'Нууц үгээ давтах', name: 'password_repeat', type: 'password', autocomplete: 'new-password', required: true }),
    submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { password, password_repeat: repeat } = values(form);
    const errors = passwordProblems(password, repeat);
    if (Object.keys(errors).length) return showErrors(form, errors);
    clearErrors(form);
    await busy(submit, async () => {
      try {
        await resetPassword(token, password);
        navigate('/login?reset=1', { replace: true });
      } catch (error) {
        formAlert(form, error.message);
        if (error.code === 'INVALID_TOKEN') form.querySelector('.form-alert').append(h('p', {}, h('a', { href: '#/forgot-password' }, 'Шинэ холбоос авах')));
      }
    });
  });
  return h('section', { class: 'auth-card' }, h('h1', { tabindex: '-1' }, 'Нууц үг тохируулах'),
    h('p', {}, 'Системд нэвтрэх нууц үгээ тохируулна уу. Тохируулсны дараа нэвтрэх хуудас нээгдэнэ.'), form);
}
