// Зарын форм: шинээр нийтлэх, засах хоёрт нэг. Шалгалтыг API хийж, алдааг талбар дээр нь харуулна.
import { h } from '../../../core/dom.js';
import { field, formRow, onSubmit, values } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';

export function postingForm({ posting = null, today, onSave, onCancel = null }) {
  const v = posting ?? { title: '', field: '', programs: [], positions: 1, requirements: '', start_date: '', end_date: '', apply_deadline: '' };
  const taken = posting?.accepted_count ?? 0;
  const submit = h('button', { class: 'button', type: 'submit' }, icon('check', 18), posting ? 'Хадгалах' : 'Нийтлэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': posting ? 'Зар засах' : 'Шинэ зар' },
    field({ label: 'Гарчиг', name: 'title', value: v.title, required: true, maxlength: 200, placeholder: 'Жишээ нь: Веб хөгжүүлэгч дадлагжигч' }),
    formRow(
      field({ label: 'Чиглэл', name: 'field', value: v.field ?? '', maxlength: 100 }),
      field({ label: 'Орон тоо', name: 'positions', type: 'number', value: String(v.positions), min: Math.max(1, taken), max: 1000, inputmode: 'numeric', required: true, hint: taken ? `Хүлээн авсан ${taken}` : null })),
    field({ label: 'Хөтөлбөр', name: 'programs', value: v.programs.join(', '), maxlength: 2000, hint: 'Таслалаар тусгаарлана. Хоосон бол бүх хөтөлбөрийн оюутанд нээлттэй.' }),
    field({ label: 'Шаардлага, хийх ажил', name: 'requirements', type: 'textarea', value: v.requirements ?? '', rows: 6, maxlength: 5000 }),
    formRow(
      field({ label: 'Дадлага эхлэх', name: 'start_date', type: 'date', value: v.start_date, required: true }),
      field({ label: 'Дадлага дуусах', name: 'end_date', type: 'date', value: v.end_date, required: true }),
      field({ label: 'Хүсэлт авах эцсийн өдөр', name: 'apply_deadline', type: 'date', value: v.apply_deadline, min: today, required: true })),
    h('div', { class: 'actions form-submit' }, onCancel ? h('button', { class: 'button quiet', type: 'button', on: { click: onCancel } }, 'Болих') : null, submit));
  onSubmit(form, submit, async () => {
    const r = values(form);
    await onSave({
      title: r.title, field: r.field, programs: r.programs.split(','), positions: Number(r.positions), requirements: r.requirements,
      start_date: r.start_date, end_date: r.end_date, apply_deadline: r.apply_deadline,
    });
  });
  return form;
}
