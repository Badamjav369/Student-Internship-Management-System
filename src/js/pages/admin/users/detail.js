// Хэрэглэгчийн дэлгэрэнгүй: мэдээлэл, эрх, идэвхжүүлэх/идэвхгүй болгох, устгах.
import { h } from '../../../core/dom.js';
import { formatDate } from '../../../core/format.js';
import { busy } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { deleteUser, getUser, listSemesters, setUserRoles, userAction } from '../../../data/admin-api.js';
import { actionButton } from '../../../components/action-button.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { infoList } from '../../../components/facts.js';
import { personAvatar } from '../../../components/person.js';
import { badge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';
import { USER_STATUS, USER_TONES } from '../shared.js';
import { rolePicker } from './roles.js';

export async function render({ params, navigate, refresh }) {
  let user;
  try { user = await getUser(params.id); } catch { return missing('Хэрэглэгч олдсонгүй', '/admin/users'); }
  const semesters = await listSemesters();
  const name = `${user.last_name} ${user.first_name}`;
  const isStudent = user.roles.some((r) => r.role === 'student');

  const picker = rolePicker(user.roles, semesters);
  picker.querySelector('legend').classList.add('sr-only');
  const save = h('button', { class: 'button', type: 'button', disabled: true }, icon('check', 18), 'Хадгалах');
  picker.onChange(() => { save.disabled = picker.value().length === 0; });
  save.addEventListener('click', () => busy(save, async () => {
    const roles = picker.value();
    if (!roles.length) { toast('Ядаж нэг эрх сонгоно уу.', 'error'); return; }
    await setUserRoles(user.id, roles);
    toast('Эрх хадгалагдлаа.');
    refresh();
  }));

  const actions = h('div', { class: 'actions' },
    user.status === 'disabled'
      ? actionButton('Идэвхжүүлэх', { iconName: 'circle-check', run: () => userAction(user.id, 'enable'), done: 'Хэрэглэгч идэвхжлээ.', after: refresh })
      : actionButton('Идэвхгүй болгох', { iconName: 'lock', confirm: { title: 'Хэрэглэгчийг идэвхгүй болгох уу?', body: [name], confirmLabel: 'Идэвхгүй болгох' }, run: () => userAction(user.id, 'disable'), done: 'Хэрэглэгч идэвхгүй боллоо.', after: refresh }),
    user.status === 'invited' ? actionButton('Урилга дахин илгээх', { iconName: 'mail', run: () => userAction(user.id, 'invite'), done: 'Урилга илгээгдлээ.' }) : null,
    actionButton('Устгах', { variant: 'danger', iconName: 'trash', confirm: { title: 'Хэрэглэгчийг устгах уу?', body: [name], confirmLabel: 'Устгах' }, run: () => deleteUser(user.id), done: 'Хэрэглэгч устгагдлаа.', after: () => navigate('/admin/users') }));

  const head = h('section', { class: 'panel profile-head', 'aria-label': 'Хэрэглэгч' },
    personAvatar(user, 'lg'),
    h('div', { class: 'profile-text' }, h('h1', { tabindex: '-1' }, name), h('p', { class: 'muted' }, user.email), badge(USER_STATUS[user.status], USER_TONES[user.status])),
    actions);

  const info = infoList([
    ['Утас', user.phone], isStudent ? ['Оюутны код', user.student_code] : null, isStudent ? ['Хөтөлбөр', user.program] : null,
    ['Зөвшөөрөл', user.consent_at ? formatDate(user.consent_at.slice(0, 10)) : null],
  ].filter(Boolean));

  return h('div', { class: 'stack' }, backLink('/admin/users', 'Хэрэглэгчид'), head,
    h('div', { class: 'split even' },
      h('section', { class: 'panel', 'aria-label': 'Мэдээлэл' }, h('h2', {}, 'Мэдээлэл'), info),
      h('section', { class: 'panel', 'aria-label': 'Эрх' }, h('h2', {}, 'Эрх'), picker, h('div', { class: 'form-submit' }, save))));
}
