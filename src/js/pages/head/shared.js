// Зөвхөн тэнхмийн эрхлэгчийн хуудсуудад хэрэгтэй: хүсэлтийн төлөв шошго, «хийх ажил», шийдвэрийн самбар.
import { h } from '../../core/dom.js';
import { fullName } from '../../core/format.js';
import { clearErrors, field, onSubmit, setFieldError, values } from '../../core/forms.js';
import { REQUEST_KINDS } from '../../core/labels.js';
import { actionButton } from '../../components/action-button.js';
import { toast } from '../../components/toast-region.js';

export const REQUEST_LABELS = { pending: 'Шийдвэр хүлээж буй', approved: 'Зөвшөөрсөн', registered: 'Зөвшөөрсөн', rejected: 'Татгалзсан', cancelled: 'Цуцалсан' };
export const REQUEST_TONES = { pending: 'pending', approved: 'done', registered: 'done', rejected: 'attention', cancelled: 'none' };

/** Нүүрний «Хийх ажил»: гарын үсэг хүлээж буй гэрээ, шийдэх хүсэлт. */
export function todoItems(contracts, requests) {
  const items = [];
  for (const c of contracts.filter((x) => x.contract.status === 'scanned')) {
    items.push({ icon: 'contract', tone: 'violet', text: `${fullName(c.student)}: гуравласан гэрээний скан баталгаажуулахыг хүлээж байна.`, href: `/head/contracts/${c.id}`, action: 'Шалгах' });
  }
  for (const r of requests.filter((x) => x.request.status === 'pending')) {
    const { kind, organization_name: org } = r.request;
    items.push({ icon: kind === 'abroad' ? 'globe' : 'building', tone: 'blue', text: `${fullName(r.student)}: ${REQUEST_KINDS[kind].toLowerCase()} (${org}) зөвшөөрөл хүсэж байна.`, href: `/head/requests/${r.id}`, action: 'Шийдэх' });
  }
  return items;
}

/**
 * Шийдвэрийн самбар: нэг товчоор батлах/зөвшөөрөх, эсвэл шалтгаан бичиж буцаах/татгалзах (шалтгаан заавал, оюутанд харагдана).
 * approve: { label, run, done, confirm }; reject: { label, run(reason), done }; after — амжилттай болсны дараа дэлгэцийг шинэчилнэ.
 */
export function decisionPanel({ approve, reject, after }) {
  const accept = approve && actionButton(approve.label, { variant: 'primary', iconName: 'check', run: approve.run, done: approve.done, after, confirm: approve.confirm });
  const back = h('button', { class: 'button secondary', type: 'submit' }, reject.label);
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Шийдвэр' },
    field({ label: 'Шалтгаан', name: 'reason', type: 'textarea', rows: 3, maxlength: 1000, hint: `Зөвхөн «${reject.label}» үед бичнэ. Оюутанд харагдана.` }),
    h('div', { class: 'actions' }, accept ?? null, back));
  onSubmit(form, back, async () => {
    clearErrors(form);
    const { reason } = values(form);
    if (!reason.trim()) { setFieldError(form, 'reason', 'Шалтгаанаа бичнэ үү.'); form.elements.reason.focus(); return; }
    await reject.run(reason.trim());
    toast(reject.done);
    after();
  });
  return h('section', { class: 'panel', 'aria-labelledby': 'h-decision' }, h('h2', { id: 'h-decision' }, 'Шийдвэр'), form);
}
