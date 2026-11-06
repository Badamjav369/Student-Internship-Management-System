// Ажлын төлөвлөгөө харах, зөвлөгөө бичих. Төлөвлөгөөг дадлага удирдагч батална; багшийн зөвлөгөө оюутанд төлөвлөгөөн дээр харагдана.
import { h } from '../../../core/dom.js';
import { clearErrors, field, setFieldError, values, onSubmit } from '../../../core/forms.js';
import { getMyInternship, getMyPlan, saveAdvice } from '../../../data/supervisor-api.js';
import { backLink } from '../../../components/back-link.js';
import { commentCard } from '../../../components/comment-card.js';
import { missing } from '../../../components/empty-state.js';
import { planTimeline, planVerdict } from '../../../components/plan-view.js';
import { badge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';
import { studentHead } from '../../../components/student-head.js';

function adviceForm(id, plan, refresh) {
  const submit = h('button', { class: 'button', type: 'submit' }, 'Зөвлөгөө хадгалах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Зөвлөгөө' },
    field({ label: 'Удирдагч багшийн зөвлөгөө', name: 'advice', type: 'textarea', rows: 4, maxlength: 5000, value: plan.teacher_comment ?? '' }),
    h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    clearErrors(form);
    const { advice } = values(form);
    if (!advice.trim()) { setFieldError(form, 'advice', 'Зөвлөгөөгөө бичнэ үү.'); form.elements.advice.focus(); return; }
    await saveAdvice(id, advice.trim());
    toast('Зөвлөгөө хадгалагдлаа. Оюутанд мэдэгдэл очлоо.');
    refresh();
  });
  return form;
}

export async function render({ params, refresh }) {
  let i;
  let plan;
  try { [i, plan] = await Promise.all([getMyInternship(params.id), getMyPlan(params.id)]); } catch { return missing('Төлөвлөгөө олдсонгүй', '/supervisor/plans'); }
  const mentor = plan.mentor_comment ? commentCard({ role: plan.status === 'returned' ? 'Дадлага удирдагчийн санал' : 'Дадлага удирдагч', text: plan.mentor_comment, advice: true }) : null;
  return h('div', { class: 'stack' }, backLink('/supervisor/plans', 'Ажлын төлөвлөгөө'),
    studentHead(i.student, null, h('a', { class: 'button secondary', href: `#/supervisor/students/${i.id}` }, 'Оюутан')),
    planVerdict(plan), mentor ? h('div', { class: 'comment-cards' }, mentor) : null, planTimeline(plan, plan.plan_fields),
    h('section', { class: 'panel', 'aria-labelledby': 'h-advice' }, h('h2', { id: 'h-advice' }, 'Зөвлөгөө'), adviceForm(params.id, plan, refresh)));
}
