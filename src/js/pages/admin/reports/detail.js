// Тайлангийн дэлгэрэнгүй: илгээсэн файлууд, засварын тэмдэглэл. Хугацаа хаагдсан засварт тайланг оюутны өмнөөс илгээх эсвэл хугацаа хэтэрсэнд тооцно.
import { h } from '../../../core/dom.js';
import { formatDate, fullName } from '../../../core/format.js';
import { checkFile, clearErrors, field, setFieldError, values, onSubmit } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { REPORT_LABELS, studentLine } from '../../../core/labels.js';
import { expireReport, getReportOf, getSemester, proxySubmitReport } from '../../../data/admin-api.js';
import { backLink } from '../../../components/back-link.js';
import { confirmAction } from '../../../components/confirm-dialog.js';
import { missing } from '../../../components/empty-state.js';
import { fileTile } from '../../../components/file-tile.js';
import { personAvatar } from '../../../components/person.js';
import { badge, statusBadge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';

const FALLBACK = [{ key: 'report', label: 'Дадлагын тайлан', types: ['pdf'] }, { key: 'review', label: 'Байгууллагын тодорхойлолт', types: ['pdf'] }];

function proxyForm(i, requirements, refresh) {
  const submit = h('button', { class: 'button', type: 'submit' }, icon('upload', 18), 'Оюутны өмнөөс илгээх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Тайлан илгээх' },
    requirements.map((r) => field({ label: r.label, name: r.key, type: 'file', required: true, accept: r.types.map((t) => `.${t}`).join(','), hint: r.types.map((t) => t.toUpperCase()).join(', ') })),
    h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    clearErrors(form);
    let bad = false;
    const files = [];
    for (const r of requirements) {
      const file = form.elements[r.key].files[0];
      const problem = !file ? 'Файл сонгоно уу.' : checkFile(file, { test: new RegExp(`\\.(${r.types.join('|')})$`, 'i'), typeText: r.types.map((t) => t.toUpperCase()).join(' эсвэл '), maxMb: 20 });
      if (problem) { setFieldError(form, r.key, problem); bad = true; } else files.push({ requirement: r.key, name: file.name, size: file.size, file });
    }
    if (bad) { form.querySelector('[data-invalid] input')?.focus(); return; }
    await proxySubmitReport(i.id, files);
    toast('Тайлан хүлээн авагдлаа.');
    refresh();
  });
  return form;
}

function expireForm(i, refresh) {
  const submit = h('button', { class: 'button danger', type: 'submit' }, icon('circle-x', 18), 'Хугацаа хэтэрсэнд тооцох');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Хугацаа хэтэрсэнд тооцох' },
    field({ label: 'Шалтгаан', name: 'reason', type: 'textarea', rows: 3, required: true, maxlength: 500 }), h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    clearErrors(form);
    const { reason } = values(form);
    if (reason.trim().length < 5) { setFieldError(form, 'reason', 'Шалтгаанаа 5-аас дээш тэмдэгтээр бичнэ үү.'); form.elements.reason.focus(); return; }
    if (!(await confirmAction({ title: 'Хугацаа хэтэрсэнд тооцох уу?', body: [`${i.student.last_name} ${i.student.first_name}-ийн дүн 0 болно.`], confirmLabel: 'Тооцох', danger: true }))) return;
    await expireReport(i.id, reason.trim());
    toast('Хугацаа хэтэрсэнд тооцлоо.');
    refresh();
  });
  return form;
}

export async function render({ params, refresh }) {
  let i;
  try { i = await getReportOf(params.id); } catch { return missing('Тайлан олдсонгүй', '/admin/reports'); }
  const semester = await getSemester(i.semester_id);
  const requirements = semester.templates.find((t) => t.kind === 'report')?.required_files ?? FALLBACK;
  const r = i.report;
  const files = r.submission?.files ?? [];
  const closedRevision = r.status === 'revision' && !r.open;

  const head = h('section', { class: 'panel profile-head', 'aria-label': 'Оюутан' },
    personAvatar(i.student, 'lg'),
    h('div', { class: 'profile-text' }, h('h1', { tabindex: '-1' }, `${i.student.last_name} ${i.student.first_name}`), h('p', { class: 'muted' }, studentLine(i.student)), statusBadge(r.status, REPORT_LABELS)),
    h('a', { class: 'button secondary', href: `#/admin/internships/${i.id}` }, icon('arrow-up-right', 18), 'Дадлага'));

  return h('div', { class: 'stack' }, backLink('/admin/reports', 'Тайлангууд'), head,
    h('section', { class: 'panel', 'aria-labelledby': 'h-files' }, h('h2', { id: 'h-files' }, 'Тайлан'),
      h('div', { class: 'fact-grid' },
        requirements.map((q, k) => fileTile(q.label, files.find((f) => f.requirement === q.key) ?? files[k] ?? null)),
        h('div', { class: 'fact-tile' }, h('span', { class: 'tile tile-amber', 'aria-hidden': 'true' }, icon('clock', 22)),
          h('div', {}, h('span', { class: 'fact-label' }, 'Илгээх хугацаа'), h('strong', {}, formatDate(r.deadline)), badge(r.open ? 'Нээлттэй' : 'Хаагдсан', r.open ? 'done' : 'none'))),
        i.supervisor ? h('div', { class: 'fact-tile' }, h('span', { class: 'tile tile-blue', 'aria-hidden': 'true' }, icon('user', 22)), h('div', {}, h('span', { class: 'fact-label' }, 'Удирдагч багш'), h('strong', {}, fullName(i.supervisor)))) : null),
      r.comment ? h('div', { class: 'org-banner error' }, icon('alert', 18), h('p', {}, r.comment)) : null),
    closedRevision ? h('div', { class: 'split even' },
      h('section', { class: 'panel', 'aria-labelledby': 'h-proxy' }, h('h2', { id: 'h-proxy' }, 'Оюутны өмнөөс илгээх'), proxyForm(i, requirements, refresh)),
      h('section', { class: 'panel', 'aria-labelledby': 'h-expire' }, h('h2', { id: 'h-expire' }, 'Хугацаа хэтэрсэн'), expireForm(i, refresh))) : null);
}
