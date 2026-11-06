// Профайл: миний мэдээлэл, холбоо барих утас засах, нууц үг солих.
import { h, pageHead } from '../../core/dom.js';
import { formatDateTime, ROLE_LABELS } from '../../core/format.js';
import { busy, clearErrors, field, formAlert, showErrors, values } from '../../core/forms.js';
import { changePassword, getSession, updatePhone } from '../../data/session-api.js';
import { backLink } from '../../components/back-link.js';
import { toast } from '../../components/toast-region.js';
import { MIN_PASSWORD, passwordProblems } from '../auth/password.js';

export async function render() {
  const { user } = await getSession();
  const facts = [
    ['Нэр', `${user.last_name} ${user.first_name}`],
    ['И-мэйл', user.email],
    ['Дүр', ROLE_LABELS[user.role] ?? 'Оюутан'],
    ...(user.role === 'student' ? [['Оюутны код', user.student_code], ['Хөтөлбөр', user.program]] : []),
    ...(['mentor', 'org_rep'].includes(user.role) ? [['Байгууллага', user.organization], ['Албан тушаал', user.position]] : []),
    user.consent_at ? ['Зөвшөөрөл өгсөн', formatDateTime(user.consent_at)] : null,
  ].filter((f) => f && f[1]);

  const savePhone = h('button', { class: 'button', type: 'submit' }, 'Хадгалах');
  const contact = h('form', { class: 'form', novalidate: true },
    field({ label: 'Утас', name: 'phone', type: 'tel', autocomplete: 'tel', value: user.phone ?? '', inputmode: 'tel',
      hint: user.role !== 'student' ? null : 'Жишээ нь 99112233. Дадлагын газар, удирдагч тантай холбогдоход харагдана.' }),
    h('div', {}, savePhone));
  contact.addEventListener('submit', async (event) => {
    event.preventDefault();
    const phone = values(contact).phone.trim();
    if (phone && !/^[0-9+() -]{6,30}$/.test(phone)) return showErrors(contact, { phone: 'Утасны дугаарыг зөвхөн тоо, +, (, ), - тэмдэгтээр, 6-аас доошгүй оронтой бичнэ үү.' });
    clearErrors(contact);
    await busy(savePhone, async () => {
      try {
        await updatePhone(phone || null);
        toast('Утасны дугаар хадгалагдлаа.');
      } catch (error) { formAlert(contact, error.message); }
    });
  });

  const savePassword = h('button', { class: 'button', type: 'submit' }, 'Нууц үг солих');
  const password = h('form', { class: 'form', novalidate: true },
    field({ label: 'Одоогийн нууц үг', name: 'current_password', type: 'password', autocomplete: 'current-password', required: true }),
    field({ label: 'Шинэ нууц үг', name: 'password', type: 'password', autocomplete: 'new-password', required: true, hint: `${MIN_PASSWORD}-аас доошгүй тэмдэгт.` }),
    field({ label: 'Шинэ нууц үгээ давтах', name: 'password_repeat', type: 'password', autocomplete: 'new-password', required: true }),
    h('div', {}, savePassword));
  password.addEventListener('submit', async (event) => {
    event.preventDefault();
    const v = values(password);
    const errors = passwordProblems(v.password, v.password_repeat);
    if (!v.current_password) errors.current_password = 'Одоогийн нууц үгээ оруулна уу.';
    if (Object.keys(errors).length) return showErrors(password, errors);
    clearErrors(password);
    await busy(savePassword, async () => {
      try {
        await changePassword(v.current_password, v.password);
        password.reset();
        toast('Нууц үг солигдлоо.');
      } catch (error) { formAlert(password, error.message); }
    });
  });

  const back = backLink(`/${user.role}/home`);
  return h('section', {}, back, pageHead('Профайл'),
    h('div', { class: 'profile-grid' },
      h('section', { class: 'panel profile-info', 'aria-labelledby': 'p-info' }, h('h2', { id: 'p-info' }, 'Миний мэдээлэл'),
        h('dl', { class: 'facts' }, facts.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))),
      h('section', { class: 'panel', 'aria-labelledby': 'p-contact' }, h('h2', { id: 'p-contact' }, 'Холбоо барих'), contact),
      h('section', { class: 'panel', 'aria-labelledby': 'p-password' }, h('h2', { id: 'p-password' }, 'Нууц үг'), password)));
}
