// Нууц үг сэргээх холбоос авах. Бүртгэлтэй эсэхийг таалгахгүй: хариу үргэлж ижил.
import { h, replace } from '../../core/dom.js';
import { busy, clearErrors, field, formAlert, showErrors, values } from '../../core/forms.js';
import { requestPasswordReset } from '../../data/session-api.js';

export async function render() {
  const submit = h('button', { class: 'button block', type: 'submit' }, 'Холбоос илгээх');
  const form = h('form', { class: 'form', novalidate: true },
    field({ label: 'И-мэйл', name: 'email', type: 'email', autocomplete: 'email', required: true, inputmode: 'email' }), submit);
  const area = h('div', {}, form);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const { email } = values(form);
    if (!email.trim()) return showErrors(form, { email: 'Бүртгэлтэй и-мэйл хаягаа оруулна уу.' });
    clearErrors(form);
    await busy(submit, async () => {
      try {
        const { message } = await requestPasswordReset(email.trim());
        replace(area, h('div', { class: 'alert success', role: 'status' }, h('p', {}, message),
          h('p', {}, 'И-мэйлээ шалгаад холбоосоор шинэ нууц үгээ тохируулна уу. Холбоос нэг цагийн дотор хүчинтэй.')));
      } catch (error) {
        formAlert(form, error.message);
      }
    });
  });
  return h('section', { class: 'auth-card' }, h('h1', { tabindex: '-1' }, 'Нууц үг сэргээх'),
    h('p', {}, 'Бүртгэлтэй и-мэйл хаягаа оруулбал нууц үг тохируулах холбоос илгээнэ.'), area,
    h('div', { class: 'auth-links' }, h('a', { href: '#/login' }, 'Нэвтрэх хуудас руу буцах')));
}
