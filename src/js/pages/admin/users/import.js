// Оюутнуудыг CSV/Excel файлаар бүртгэх: эхлээд шалгаж, дараа нь бүртгэнэ.
import { h, pageHead, replace } from '../../../core/dom.js';
import { checkFile, field, setFieldError, clearErrors, busy } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { importStudents } from '../../../data/admin-api.js';
import { backLink } from '../../../components/back-link.js';
import { stat } from '../../../components/facts.js';
import { toast } from '../../../components/toast-region.js';

export async function render({ navigate }) {
  const result = h('div', { class: 'stack', 'aria-live': 'polite' });
  const check = h('button', { class: 'button', type: 'submit' }, icon('check', 18), 'Шалгах');
  const run = h('button', { class: 'button', type: 'button', hidden: true }, icon('upload', 18), 'Бүртгэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Оюутан бүртгэх файл' },
    field({ label: 'Файл', name: 'file', type: 'file', accept: '.csv,.xlsx', required: true, hint: 'Баганууд: код, овог, нэр, и-мэйл, хөтөлбөр, утас. Эхний мөр толгой.' }),
    h('div', { class: 'actions' }, check, run));
  const pick = () => form.elements.file.files[0];

  function show(r, done) {
    const errors = r.errors.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Мөр'), h('th', {}, 'Алдаа'))),
      h('tbody', {}, r.errors.map((e) => h('tr', {}, h('td', { class: 'num' }, e.row), h('td', {}, e.message)))))) : null;
    replace(result,
      h('div', { class: 'stat-row' }, stat('blue', 'report', r.total_rows, 'Нийт мөр'), stat('green', 'users', r.created_users, done ? 'Бүртгэгдсэн' : 'Шинээр бүртгэх'), stat('gray', 'check', r.existing_users, 'Бүртгэлтэй'), stat(r.errors.length ? 'rose' : 'gray', 'alert', r.errors.length, 'Алдаатай')),
      errors);
    run.hidden = done || r.created_users === 0;
  }

  form.addEventListener('change', () => { run.hidden = true; replace(result); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const file = pick();
    const problem = !file ? 'Файл сонгоно уу.' : checkFile(file, { test: /\.(csv|xlsx)$/i, typeText: 'CSV эсвэл Excel (.xlsx)', maxMb: 5 });
    if (problem) { setFieldError(form, 'file', problem); return; }
    await busy(check, async () => { try { show(await importStudents(file, { dry: true }), false); } catch (error) { toast(error.message, 'error'); } });
  });
  run.addEventListener('click', () => busy(run, async () => {
    try {
      const r = await importStudents(pick(), { dry: false });
      toast(`${r.created_users} оюутан бүртгэгдлээ. Урилга илгээгдсэн.`);
      navigate('/admin/users?role=student');
    } catch (error) { toast(error.message, 'error'); }
  }));
  return h('div', { class: 'stack' }, backLink('/admin/users', 'Хэрэглэгчид'), pageHead('Оюутан Excel-ээр бүртгэх'), h('section', { class: 'panel narrow' }, form), result);
}
