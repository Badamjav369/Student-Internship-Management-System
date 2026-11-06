// Байгууллагын мэдээлэл засах нэг загвар: админ болон байгууллагын төлөөлөгч хоёрт ижил (лого, нэр, регистр, холбоо барих, танилцуулга).
// orgEditor({ org, api: { update(body), uploadLogo(file), removeLogo(), reload() }, actions? }) — actions: «Хадгалах»-ын ард гарах нэмэлт товч (жишээ нь «Устгах»).
import { h, replace } from '../core/dom.js';
import { busy, EMAIL, field, formRow, onSubmit, PHONE, showErrors, values } from '../core/forms.js';
import { icon } from '../core/icons.js';
import { cropImage } from './image-cropper.js';
import { orgAvatar } from './person.js';
import { toast } from './toast-region.js';

export function orgEditor({ org, api, actions = [] }) {
  const o = { ...org };
  const title = h('h1', { tabindex: '-1' }, o.name);
  const register = h('p', { class: 'muted' });
  const logoSlot = h('div', { class: 'logo-preview' });
  const message = h('p', { class: 'error', hidden: true });
  const input = h('input', { type: 'file', accept: 'image/png,image/jpeg', hidden: true, 'aria-label': 'Лого сонгох' });
  const pickText = h('span', {});
  const pick = h('button', { class: 'button secondary', type: 'button', on: { click: () => input.click() } }, icon('upload', 18), pickText);
  const drop = h('button', { class: 'button quiet', type: 'button', on: { click: () => change(() => api.removeLogo(), 'Лого устгагдлаа.') } }, icon('trash', 18), 'Лого устгах');

  const draw = () => {
    title.textContent = o.name;
    register.textContent = `Регистр: ${o.register_no}`;
    replace(logoSlot, orgAvatar(o, 'xl'));
    pickText.textContent = o.logo_file_id ? 'Лого солих' : 'Лого оруулах';
    drop.hidden = !o.logo_file_id;
  };
  async function change(action, text) {
    message.hidden = true;
    message.removeAttribute('role');
    try {
      await action();
      Object.assign(o, await api.reload());
      draw();
      toast(text);
    } catch (error) { message.textContent = error.fields?.file ?? error.message; message.setAttribute('role', 'alert'); message.hidden = false; }
  }
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    message.hidden = true;
    let cropped;
    try { cropped = await cropImage(file, { title: 'Логоны хэсгийг сонгоно уу' }); } catch (error) { message.textContent = error.message; message.setAttribute('role', 'alert'); message.hidden = false; return; }
    if (cropped) await busy(pick, () => change(async () => { await api.uploadLogo(cropped); }, 'Лого хадгалагдлаа.'));
  });

  const submit = h('button', { class: 'button', type: 'submit' }, icon('check', 18), 'Хадгалах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Байгууллагын мэдээлэл' },
    formRow(
      field({ label: 'Нэр', name: 'name', value: o.name, required: true, maxlength: 150 }),
      field({ label: 'Регистрийн дугаар', name: 'register_no', value: o.register_no, required: true, maxlength: 20, inputmode: 'numeric' })),
    formRow(
      field({ label: 'Үйл ажиллагааны чиглэл', name: 'field', value: o.field ?? '', maxlength: 100 }),
      field({ label: 'Хаяг', name: 'address', value: o.address ?? '', maxlength: 300 })),
    formRow(
      field({ label: 'Утас', name: 'phone', type: 'tel', value: o.phone ?? '', maxlength: 30, inputmode: 'tel' }),
      field({ label: 'И-мэйл', name: 'email', type: 'email', value: o.email ?? '', maxlength: 120 })),
    field({ label: 'Танилцуулга', name: 'description', type: 'textarea', value: o.description ?? '', rows: 6, maxlength: 3000 }),
    h('div', { class: 'actions form-submit' }, submit, ...actions));
  onSubmit(form, submit, async () => {
    const v = values(form);
    const errors = {};
    if (!v.name.trim()) errors.name = 'Нэр бичнэ үү.';
    if (!/^\d{5,12}$/.test(v.register_no.trim())) errors.register_no = 'Регистрийн дугаар 5–12 оронтой тоо байна.';
    if (v.email.trim() && !EMAIL.test(v.email.trim())) errors.email = 'И-мэйл хаяг буруу байна.';
    if (v.phone.trim() && !PHONE.test(v.phone.trim())) errors.phone = 'Утасны дугаар буруу байна.';
    if (Object.keys(errors).length) { showErrors(form, errors); return; }
    Object.assign(o, await api.update(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim() || null]))));
    draw();
    toast('Байгууллагын мэдээлэл хадгалагдлаа.');
  });
  draw();

  return h('div', { class: 'stack' },
    h('section', { class: 'panel profile-head', 'aria-label': 'Байгууллага' }, logoSlot,
      h('div', { class: 'profile-text' }, title, register,
        h('div', { class: 'actions' }, pick, drop, input), h('p', { class: 'hint' }, 'Лого: PNG эсвэл JPG. Оруулахдаа хэсгийг нь сонгоно.'), message)),
    h('section', { class: 'panel', 'aria-label': 'Мэдээлэл засах' }, h('h2', {}, 'Мэдээлэл'), form));
}
