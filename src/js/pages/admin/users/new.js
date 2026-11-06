// Шинэ хэрэглэгч нэмэх: хувийн мэдээлэл, эрх. Оюутан бол код, хөтөлбөр нэмэгдэнэ.
import { h, pageHead } from '../../../core/dom.js';
import { field, showErrors, values, EMAIL, formRow, onSubmit, PHONE } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { createUser, listSemesters } from '../../../data/admin-api.js';
import { backLink } from '../../../components/back-link.js';
import { toast } from '../../../components/toast-region.js';
import { rolePicker } from './roles.js';

export async function render({ navigate }) {
  const semesters = await listSemesters();
  const picker = rolePicker([{ role: 'student' }], semesters);
  const studentFields = h('div', { class: 'stack-tight' }, formRow(
    field({ label: 'Оюутны код', name: 'student_code', placeholder: 'B221910123', maxlength: 20 }),
    field({ label: 'Хөтөлбөр', name: 'program', maxlength: 100 })));
  const syncStudent = () => { studentFields.hidden = !picker.value().some((r) => r.role === 'student'); };
  picker.onChange(syncStudent);
  syncStudent();

  const submit = h('button', { class: 'button', type: 'submit' }, icon('plus', 18), 'Нэмэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Шинэ хэрэглэгч' },
    formRow(field({ label: 'Овог', name: 'last_name', required: true, maxlength: 60, autocomplete: 'off' }), field({ label: 'Нэр', name: 'first_name', required: true, maxlength: 60, autocomplete: 'off' })),
    formRow(field({ label: 'И-мэйл', name: 'email', type: 'email', required: true, maxlength: 120, autocomplete: 'off' }), field({ label: 'Утас', name: 'phone', type: 'tel', maxlength: 30 })),
    picker, studentFields, h('div', { class: 'form-submit' }, submit));

  onSubmit(form, submit, async () => {
    const v = values(form);
    const roles = picker.value();
    const errors = {};
    if (!v.last_name.trim()) errors.last_name = 'Овог бичнэ үү.';
    if (!v.first_name.trim()) errors.first_name = 'Нэр бичнэ үү.';
    if (!EMAIL.test(v.email.trim())) errors.email = 'И-мэйл хаяг буруу байна.';
    if (v.phone.trim() && !PHONE.test(v.phone.trim())) errors.phone = 'Утасны дугаар буруу байна.';
    const isStudent = roles.some((r) => r.role === 'student');
    if (isStudent && !v.student_code.trim()) errors.student_code = 'Оюутны код бичнэ үү.';
    if (!roles.length) errors.last_name ??= 'Ядаж нэг эрх сонгоно уу.';
    if (Object.keys(errors).length) { showErrors(form, errors); return; }
    const { id } = await createUser({
      last_name: v.last_name.trim(), first_name: v.first_name.trim(), email: v.email.trim(), phone: v.phone.trim() || null, roles,
      ...(isStudent ? { student_code: v.student_code.trim(), program: v.program.trim() || null } : {}),
    });
    toast('Хэрэглэгч нэмэгдлээ. Урилга илгээгдсэн.');
    navigate(`/admin/users/${id}`);
  });
  return h('div', { class: 'stack' }, backLink('/admin/users', 'Хэрэглэгчид'), pageHead('Хэрэглэгч нэмэх'), h('section', { class: 'panel narrow' }, form));
}
