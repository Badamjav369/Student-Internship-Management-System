// Хувийн мэдээлэл боловсруулах зөвшөөрөл: анх нэвтрэхэд зорилгыг уншиж зөвшөөрнө; зөвшөөрсөн цаг хадгалагдана.
import { h } from '../../core/dom.js';
import { busy, checkbox, formAlert, showErrors } from '../../core/forms.js';
import { acceptConsent, logout } from '../../data/session-api.js';

export async function render() {
  const submit = h('button', { class: 'button', type: 'submit' }, 'Зөвшөөрөх');
  const leave = h('button', { class: 'button secondary', type: 'button' }, 'Зөвшөөрөхгүй, гарах');
  const form = h('form', { class: 'form', novalidate: true },
    checkbox({ name: 'agree', label: 'Дээрх мэдээллийг уншиж танилцсан бөгөөд хувийн мэдээллээ дадлагын зорилгоор боловсруулахыг зөвшөөрч байна.' }),
    h('div', { class: 'actions' }, submit, leave));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.querySelector('[name="agree"]').checked) return showErrors(form, { agree: 'Үргэлжлүүлэхийн тулд зөвшөөрлийн тэмдэглэгээг сонгоно уу.' });
    await busy(submit, async () => {
      try { await acceptConsent(); } catch (error) { formAlert(form, error.message); }
    });
  });
  leave.addEventListener('click', () => busy(leave, () => logout()));

  return h('section', { class: 'auth-card consent' },
    h('h1', { tabindex: '-1' }, 'Хувийн мэдээлэл боловсруулах зөвшөөрөл'),
    h('p', {}, 'Систем Хүний хувийн мэдээлэл хамгаалах тухай хуулийн дагуу таны мэдээллийг зөвхөн дадлагын үйл ажиллагаанд ашиглана.'),
    h('h2', {}, 'Ямар мэдээлэл'),
    h('ul', {},
      h('li', {}, 'Овог, нэр, и-мэйл, утас; оюутны хувьд оюутны код, хөтөлбөр.'),
      h('li', {}, 'Дадлагын явцын мэдээлэл: хүсэлт, CV, гэрээ, ажлын төлөвлөгөө, өдрийн тэмдэглэл, тайлан, оноо.')),
    h('h2', {}, 'Ямар зорилгоор, хэн харах'),
    h('ul', {},
      h('li', {}, 'Дадлагын газар сонгох, гэрээ байгуулах, явцыг хянах, үнэлэх, дүнг СИСИ-д оруулахад.'),
      h('li', {}, 'Зөвхөн тухайн дадлагад холбогдох хүн харна: байгууллага, дадлага удирдагч, удирдагч багш, комисс, тэнхимийн админ.'),
      h('li', {}, 'Регистрийн дугаар, гэрийн хаяг зэрэг дадлагад шаардлагагүй мэдээлэл цуглуулахгүй.')),
    h('h2', {}, 'Хадгалах хугацаа, таны эрх'),
    h('ul', {},
      h('li', {}, 'Мэдээллийг улирлын турш ашиглаж, дараа нь тэнхимийн тогтоосон хугацаанд засах боломжгүй архив болгон хадгална.'),
      h('li', {}, 'Та өөрийн мэдээллийг профайлаас харж, засах боломжтой. Асуулт гарвал тэнхимийн админд хандана уу.')),
    form);
}
