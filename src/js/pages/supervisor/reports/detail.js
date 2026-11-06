// Тайлан хянах: илгээсэн файлууд. Хүлээн авах эсвэл санал бичиж засвар шаардана. Хүлээн авсан тайланг буцаах боломжгүй.
import { h } from '../../../core/dom.js';
import { formatDate } from '../../../core/format.js';
import { clearErrors, field, setFieldError, values, busy } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { REPORT_LABELS } from '../../../core/labels.js';
import { acceptReport, getMyInternship, getMyReport, requestRevision } from '../../../data/supervisor-api.js';
import { backLink } from '../../../components/back-link.js';
import { confirmAction } from '../../../components/confirm-dialog.js';
import { missing } from '../../../components/empty-state.js';
import { fileTile } from '../../../components/file-tile.js';
import { badge, statusBadge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';
import { studentHead } from '../../../components/student-head.js';

const NOTES = {
  not_submitted: 'Оюутан тайлангаа хараахан илгээгээгүй байна.',
  revision: 'Засвар шаардсан. Оюутан засаж дахин илгээнэ.',
  accepted: 'Тайланг хүлээн авсан. Оюутан хамгаалалтад бэлэн.',
  overdue: 'Тайлан хүлээн авах хугацаа дууссан. Тэнхимийн админ шийднэ.',
};

function decisionForm(i, refresh) {
  const accept = h('button', { class: 'button', type: 'button' }, icon('check', 18), 'Хүлээн авах');
  const revise = h('button', { class: 'button secondary', type: 'button' }, 'Засвар шаардах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Шийдвэр' },
    field({ label: 'Санал', name: 'comment', type: 'textarea', rows: 4, maxlength: 5000, hint: 'Засвар шаардахад оюутан юуг засахыг заавал бичнэ.' }),
    h('div', { class: 'actions' }, accept, revise));
  const done = async (button, work, message) => {
    clearErrors(form);
    await busy(button, async () => {
      try { await work(); toast(message); dispatchEvent(new CustomEvent('notifications-changed')); refresh(); } catch (error) { toast(error.message, 'error'); refresh(); }
    });
  };
  accept.addEventListener('click', async () => {
    const ok = await confirmAction({ title: 'Тайланг хүлээн авах уу?', body: [`${i.student.last_name} ${i.student.first_name} хамгаалалтад бэлэн болно.`, 'Хүлээн авсан тайланг буцаах боломжгүй.'], confirmLabel: 'Хүлээн авах' });
    if (ok) await done(accept, () => acceptReport(i.id), 'Тайлан хүлээн авлаа. Оюутанд мэдэгдэл очлоо.');
  });
  revise.addEventListener('click', async () => {
    const { comment } = values(form);
    if (!comment.trim()) { setFieldError(form, 'comment', 'Оюутан юуг засахыг бичнэ үү.'); form.elements.comment.focus(); return; }
    await done(revise, () => requestRevision(i.id, comment.trim()), 'Засвар шаардлаа. Оюутан засаж дахин илгээнэ.');
  });
  return form;
}

export async function render({ params, refresh }) {
  let i;
  let report;
  try { [i, report] = await Promise.all([getMyInternship(params.id), getMyReport(params.id)]); } catch { return missing('Тайлан олдсонгүй', '/supervisor/reports'); }
  const files = report.submission?.files ?? [];
  return h('div', { class: 'stack' }, backLink('/supervisor/reports', 'Тайлан'),
    studentHead(i.student, statusBadge(report.status, REPORT_LABELS), h('a', { class: 'button secondary', href: `#/supervisor/students/${i.id}` }, 'Оюутан')),
    h('section', { class: 'panel', 'aria-labelledby': 'h-files' }, h('h2', { id: 'h-files' }, 'Тайлан'),
      h('div', { class: 'fact-grid' }, report.requirements.map((q, k) => fileTile(q.label, files.find((f) => f.requirement === q.key) ?? files[k] ?? null)),
        h('div', { class: 'fact-tile' }, h('span', { class: 'tile tile-amber', 'aria-hidden': 'true' }, icon('clock', 22)),
          h('div', {}, h('span', { class: 'fact-label' }, 'Хүлээн авах хугацаа'), h('strong', {}, formatDate(report.deadline)), badge(report.open ? 'Нээлттэй' : 'Хаагдсан', report.open ? 'done' : 'none')))),
      report.comment ? h('div', { class: 'org-banner error' }, icon('alert', 18), h('p', {}, report.comment))
        : NOTES[report.status] ? h('div', { class: ['org-banner', report.status === 'accepted' ? 'success' : 'info'] }, icon(report.status === 'accepted' ? 'circle-check' : 'info', 18), h('p', {}, NOTES[report.status])) : null),
    report.status === 'submitted' ? h('section', { class: 'panel', 'aria-labelledby': 'h-decision' }, h('h2', { id: 'h-decision' }, 'Шийдвэр'), decisionForm(i, refresh)) : null);
}
