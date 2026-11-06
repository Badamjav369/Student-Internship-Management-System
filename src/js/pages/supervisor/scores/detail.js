// Оноо, эцсийн дүн: байгууллагын оноог тодорхойлолттой тулган батлах (эсвэл буцаах), комиссын оноог баталгаажуулах,
// хамгаалаагүй бол 0 / W тэмдэглэх, эцсийн дүн гаргах, СИСИ-д оруулснаа тэмдэглэх. :id — дадлагын дугаар.
import { h } from '../../../core/dom.js';
import { downloadButton } from '../../../core/files.js';
import { num } from '../../../core/format.js';
import { clearErrors, field, setFieldError, values, onSubmit } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { nameOf } from '../../../core/labels.js';
import { approveOrgScore, confirmCommittee, finalizeScore, getMyInternship, getMyScore, markScore, markSisi, returnOrgScore } from '../../../data/supervisor-api.js';
import { actionButton } from '../../../components/action-button.js';
import { backLink } from '../../../components/back-link.js';
import { criteriaPanel } from '../../../components/criteria-panel.js';
import { missing } from '../../../components/empty-state.js';
import { badge } from '../../../components/status-badge.js';
import { studentHead } from '../../../components/student-head.js';
import { RECORD_LABELS, RECORD_TONES, SCORE_STATE, SCORE_TONES, scoreAction } from '../shared.js';

const sum = (list, key) => list.reduce((a, s) => a + s[key], 0);

// Нийт, байгууллага, комиссын оноо: хавтан бүрийн дээр жижиг төлөв.
function stats(r) {
  const orgMax = sum(r.org_scores, 'max_score');
  const comMax = sum(r.committee_scores, 'max_score');
  const org = sum(r.org_scores, 'value');
  const com = sum(r.committee_scores, 'value');
  const tile = (tone, iconName, state, value, label, accent = false) => h('div', { class: ['stat', accent && 'accent'] },
    h('span', { class: ['tile', `tile-${tone}`], 'aria-hidden': 'true' }, icon(iconName, 20)),
    h('div', {}, h('span', { class: 'stat-state' }, state), h('strong', {}, value), h('span', {}, label)));
  const of = (value, max, has) => (has ? `${num(value)} / ${num(max)}` : '—');
  return h('div', { class: 'stat-row text' },
    tile('violet', 'award', badge(RECORD_LABELS[r.status], RECORD_TONES[r.status]), r.mark ?? (r.total === null ? '—' : num(r.total)), r.mark ? 'Хамгаалаагүй' : 'Нийт оноо', true),
    tile('blue', 'building', badge(SCORE_STATE[r.org_status], SCORE_TONES[r.org_status]), of(org, orgMax, r.org_scores.length > 0), 'Байгууллагын оноо'),
    tile('green', 'users', badge(SCORE_STATE[r.committee_status], SCORE_TONES[r.committee_status]), of(com, comMax, r.committee_scores.length > 0), 'Комиссын оноо'));
}

// Байгууллагын оноо: батлах эсвэл шалтгаантай буцаах.
function orgDecision(i, r, refresh) {
  const total = sum(r.org_scores, 'value');
  const approve = actionButton('Батлах', { variant: 'primary', iconName: 'check', run: () => approveOrgScore(i.id), done: 'Оноог баталлаа.', after: refresh,
    confirm: { title: 'Байгууллагын оноог батлах уу?', body: [`${nameOf(i.student)}: ${num(total)} оноо батлагдана. Батласны дараа өөрчлөхгүй.`] } });
  const submit = h('button', { class: 'button secondary', type: 'submit' }, 'Буцаах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Оноог буцаах' },
    field({ label: 'Буцаах шалтгаан', name: 'reason', type: 'textarea', rows: 3, maxlength: 1000, hint: 'Дадлага удирдагчид харагдана.' }), h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    clearErrors(form);
    const { reason } = values(form);
    if (!reason.trim()) { setFieldError(form, 'reason', 'Шалтгаанаа бичнэ үү.'); form.elements.reason.focus(); return; }
    await returnOrgScore(i.id, reason.trim());
    refresh();
  });
  return [h('p', {}, 'Байгууллагын оноог тодорхойлолттой тулгаж шалгана уу.'),
    h('div', { class: 'actions' }, r.org_letter ? downloadButton('Тамгатай тодорхойлолт', r.org_letter, 'button secondary', r.org_letter_file_id ?? null) : null, approve), form];
}

function markForm(i, refresh) {
  const submit = h('button', { class: 'button danger', type: 'submit' }, 'Тэмдэглэх');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': '0 эсвэл W тэмдэглэх' },
    field({ label: 'Үнэлгээ', name: 'mark', type: 'select', options: [{ value: 'W', label: 'W — хүндэтгэх шалтгаантай, хамгаалаагүй' }, { value: '0', label: '0 — хамгаалаагүй' }] }),
    field({ label: 'Шалтгаан', name: 'reason', type: 'textarea', rows: 3, maxlength: 1000 }), h('div', { class: 'form-submit' }, submit));
  onSubmit(form, submit, async () => {
    clearErrors(form);
    const { mark, reason } = values(form);
    if (!reason.trim()) { setFieldError(form, 'reason', 'Шалтгаанаа бичнэ үү.'); form.elements.reason.focus(); return; }
    await markScore(i.id, mark, reason.trim());
    refresh();
  });
  return [h('p', {}, 'Оюутан хамгаалаагүй бол 0 эсвэл W тэмдэглэнэ.'), form];
}

function nextStep(i, r, refresh) {
  const name = nameOf(i.student);
  const kind = scoreAction(i);
  const button = (label, run, done, title, body) => actionButton(label, { variant: 'primary', run, done, after: refresh, confirm: { title, body } });
  if (kind === 'org') return orgDecision(i, r, refresh);
  if (kind === 'confirm') return [h('p', {}, 'Комиссын бүх гишүүний оноо орсон. Баталгаажуулсны дараа оноог засахгүй.'),
    button('Комиссын оноог баталгаажуулах', () => confirmCommittee(i.id), 'Комиссын оноо баталгаажлаа.', 'Комиссын оноог баталгаажуулах уу?', ['Баталгаажуулсан оноог засах боломжгүй.'])];
  if (kind === 'finalize') return [h('p', {}, 'Нөхцөл хангагдсан. Эцсийн дүн гаргахад оноо түгжигдэж, оюутанд мэдэгдэл очно.'),
    button('Эцсийн дүн гаргах', () => finalizeScore(i.id), 'Эцсийн дүн гарлаа. Оюутанд мэдэгдэл очлоо.', 'Эцсийн дүн гаргах уу?', [`${name} оюутны эцсийн дүн гарна. Үүнийг буцаах боломжгүй.`])];
  if (kind === 'sisi') return [h('p', {}, 'Эцсийн дүнг СИСИ-д оруулсны дараа тэмдэглэнэ.'),
    button('СИСИ-д оруулсан', () => markSisi(i.id), 'Дүн СИСИ-д орсон гэж тэмдэглэлээ.', 'Дүн СИСИ-д орсныг тэмдэглэх уу?', ['Тэмдэглэснээр онооны бүртгэл төгсөнө.'])];
  if (kind === 'mark') return markForm(i, refresh);
  if (r.status === 'closed') return [h('p', {}, 'Дүн СИСИ-д орсон. Энэ бүртгэлд хийх үйлдэл алга.')];
  const wait = [r.org_status === 'none' ? 'дадлага удирдагч үнэлгээ оруулахыг' : null, r.committee_status === 'none' ? 'комисс оноо оруулахыг' : null].filter(Boolean);
  return [h('p', {}, wait.length ? `Та ${wait.join(', ')} хүлээнэ.` : 'Одоогоор хийх үйлдэл алга.')];
}

export async function render({ params, refresh }) {
  let i;
  let r;
  try { [i, r] = await Promise.all([getMyInternship(params.id), getMyScore(params.id)]); } catch { return missing('Онооны бүртгэл олдсонгүй', '/supervisor/scores'); }
  i.score = { status: r.status, org_status: r.org_status, committee_status: r.committee_status, mark: r.mark }; // сүүлийн төлөвөөр дараагийн алхмыг шийднэ
  return h('div', { class: 'stack' }, backLink('/supervisor/scores', 'Оноо, эцсийн дүн'),
    studentHead(i.student, null, h('a', { class: 'button secondary', href: `#/supervisor/students/${i.id}` }, 'Оюутан')),
    stats(r),
    r.org_return_reason ? h('div', { class: 'org-banner error' }, icon('alert', 18), h('p', {}, `Таны буцаасан шалтгаан: ${r.org_return_reason}`)) : null,
    r.mark_reason ? h('div', { class: 'org-banner info' }, icon('info', 18), h('p', {}, `Шалтгаан: ${r.mark_reason}`)) : null,
    h('section', { class: 'panel', 'aria-labelledby': 'h-next' }, h('h2', { id: 'h-next' }, 'Дараагийн алхам'), h('div', { class: 'stack' }, ...nextStep(i, r, refresh))),
    criteriaPanel('Байгууллагын оноо', r.org_scores), criteriaPanel('Комиссын оноо', r.committee_scores));
}
