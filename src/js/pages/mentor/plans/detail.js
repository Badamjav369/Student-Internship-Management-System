// Ажлын төлөвлөгөө хянах: оюутны илгээсэн төлөвлөгөөг батлах (дадлага эхэлж, дэвтэр нээгдэнэ) эсвэл санал бичиж буцаах.
// Батласан төлөвлөгөөг буцаахгүй. :id — дадлагын дугаар.
import { h } from '../../../core/dom.js';
import { clearErrors, field, onSubmit, setFieldError, values } from '../../../core/forms.js';
import { nameOf } from '../../../core/labels.js';
import { approvePlan, getMyInternship, getMyPlan, returnPlan } from '../../../data/mentor-api.js';
import { actionButton } from '../../../components/action-button.js';
import { backLink } from '../../../components/back-link.js';
import { commentCard } from '../../../components/comment-card.js';
import { missing } from '../../../components/empty-state.js';
import { planTimeline, planVerdict } from '../../../components/plan-view.js';
import { studentHead } from '../../../components/student-head.js';
import { toast } from '../../../components/toast-region.js';

function decision(i, refresh) {
  const approve = actionButton('Батлах', { variant: 'primary', iconName: 'check', run: () => approvePlan(i.id, form.elements.comment.value), done: 'Төлөвлөгөө батлагдлаа. Дадлага эхэллээ.', after: refresh,
    confirm: { title: 'Төлөвлөгөөг батлах уу?', body: [`${nameOf(i.student)} оюутны дадлага эхэлж, оюутан өдөр бүр дэвтэрт тэмдэглэл бичнэ.`, 'Батласан төлөвлөгөөг буцаах боломжгүй.'] } });
  const back = h('button', { class: 'button secondary', type: 'submit' }, 'Санал бичиж буцаах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Шийдвэр' },
    field({ label: 'Санал', name: 'comment', type: 'textarea', rows: 4, maxlength: 5000, hint: 'Батлахад заавал биш. Буцаахад оюутан юуг засахыг бичнэ.' }),
    h('div', { class: 'actions' }, approve, back));
  onSubmit(form, back, async () => {
    clearErrors(form);
    const { comment } = values(form);
    if (!comment.trim()) { setFieldError(form, 'comment', 'Оюутан юуг засахыг бичнэ үү.'); form.elements.comment.focus(); return; }
    await returnPlan(i.id, comment);
    toast('Төлөвлөгөөг саналтай буцаалаа. Оюутан засаж дахин илгээнэ.');
    refresh();
  });
  return h('section', { class: 'panel', 'aria-labelledby': 'h-decision' }, h('h2', { id: 'h-decision' }, 'Шийдвэр'), form);
}

export async function render({ params, refresh }) {
  let i;
  let plan;
  try { [i, plan] = await Promise.all([getMyInternship(params.id), getMyPlan(params.id)]); } catch { return missing('Төлөвлөгөө олдсонгүй', '/mentor/plans'); }
  const cards = [
    plan.mentor_comment ? commentCard({ role: plan.status === 'returned' ? 'Таны санал' : 'Дадлага удирдагч', text: plan.mentor_comment, advice: plan.status !== 'returned', attention: plan.status === 'returned' }) : null,
    plan.teacher_comment ? commentCard({ role: 'Удирдагч багшийн зөвлөгөө', text: plan.teacher_comment, advice: true }) : null,
  ].filter(Boolean);
  return h('div', { class: 'stack' }, backLink('/mentor/plans', 'Ажлын төлөвлөгөө'),
    studentHead(i.student, null, h('a', { class: 'button secondary', href: `#/mentor/students/${i.id}` }, 'Оюутан')),
    planVerdict(plan), cards.length ? h('div', { class: 'comment-cards' }, ...cards) : null, planTimeline(plan, plan.plan_fields),
    plan.status === 'submitted' ? decision(i, refresh) : null);
}
