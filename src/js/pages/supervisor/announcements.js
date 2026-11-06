// Удирдамж, зарлал: удирдагч багш зарлал нийтэлж (файл хавтаж болно), оюутнууд мэдэгдэл авна. Өмнө нийтэлсэн зарлал доор харагдана.
import { h, pageHead, replace } from '../../core/dom.js';
import { checkFile, clearErrors, field, setFieldError, values, onSubmit } from '../../core/forms.js';
import { deleteAnnouncement, listMyAnnouncements, publishAnnouncement } from '../../data/supervisor-api.js';
import { actionButton } from '../../components/action-button.js';
import { announcementCard } from '../../components/announcement-card.js';
import { emptyState } from '../../components/empty-state.js';
import { toast } from '../../components/toast-region.js';

export async function render() {
  const items = await listMyAnnouncements();
  const list = h('div', { class: 'stack' });
  const draw = () => replace(list, items.length
    ? items.map((a) => h('div', { class: 'panel' }, announcementCard(a, h('div', { class: 'actions' }, actionButton('Устгах', {
      small: true, iconName: 'trash', confirm: { title: 'Зарлалыг устгах уу?', body: [`«${a.title}» оюутнуудад харагдахаа болино.`] },
      run: () => deleteAnnouncement(a.id), done: 'Зарлалыг устгалаа.', after: () => { items.splice(items.indexOf(a), 1); draw(); },
    })))))
    : emptyState('Зарлал нийтлээгүй байна', 'Нийтэлсэн удирдамж, зарлал энд харагдана.', { icon: 'megaphone' }));
  draw();

  const submit = h('button', { class: 'button', type: 'submit' }, 'Нийтлэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Шинэ зарлал' },
    field({ label: 'Гарчиг', name: 'title', maxlength: 200 }),
    field({ label: 'Агуулга', name: 'body', type: 'textarea', rows: 6, maxlength: 10000 }),
    field({ label: 'Хавсралт (заавал биш)', name: 'file', type: 'file' }),
    h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    clearErrors(form);
    const { title, body } = values(form);
    const file = form.elements.file.files[0];
    const problem = checkFile(file, { test: /\.(pdf|docx?|xlsx?|pptx?|png|jpe?g)$/i, typeText: 'PDF, Word, Excel, PowerPoint эсвэл зураг', maxMb: 20 });
    if (!title.trim()) setFieldError(form, 'title', 'Гарчгаа бичнэ үү.');
    if (!body.trim()) setFieldError(form, 'body', 'Агуулгаа бичнэ үү.');
    if (problem) setFieldError(form, 'file', problem);
    if (!title.trim() || !body.trim() || problem) { form.querySelector('[data-invalid] input, [data-invalid] textarea')?.focus(); return; }
    items.unshift(await publishAnnouncement({ title: title.trim(), body: body.trim(), file: file ?? null }));
    draw();
    form.reset();
    form.querySelector('.file-picker-name')?.replaceChildren('Файл сонгоогүй');
    toast('Зарлал нийтлэгдлээ. Оюутнуудад мэдэгдэл очлоо.');
  });
  return h('div', { class: 'stack' }, pageHead('Удирдамж'),
    h('div', { class: 'split' }, list, h('aside', { class: 'stack' }, h('section', { class: 'panel', 'aria-labelledby': 'h-new' }, h('h2', { id: 'h-new' }, 'Шинэ зарлал'), form))));
}
