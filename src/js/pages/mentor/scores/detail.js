// Байгууллагын үнэлгээ оруулах: шалгуур бүрийн оноо (дээд хязгаараас хэтрэхгүй), тамгатай тодорхойлолтын скан (анх заавал).
// Удирдагч багш батлах хүртэл засаж болно; тэнхим буцаавал шалтгааныг харж засна. :id — дадлагын дугаар.
import { h } from '../../../core/dom.js';
import { downloadButton } from '../../../core/files.js';
import { num } from '../../../core/format.js';
import { busy, checkFile, clearErrors, field, formAlert, showErrors } from '../../../core/forms.js';
import { icon } from '../../../core/icons.js';
import { getMyInternship, getMyScore, submitOrgScore } from '../../../data/mentor-api.js';
import { backLink } from '../../../components/back-link.js';
import { banner } from '../../../components/banner.js';
import { criteriaPanel } from '../../../components/criteria-panel.js';
import { scoreFields } from '../../../components/score-fields.js';
import { missing } from '../../../components/empty-state.js';
import { studentHead } from '../../../components/student-head.js';
import { toast } from '../../../components/toast-region.js';
import { orgBadge } from '../shared.js';

const LETTER_TYPES = /\.(pdf|png|jpe?g)$/i;
const sum = (list, key) => list.reduce((a, x) => a + x[key], 0);

function scoreForm(i, r, refresh) {
  const sf = scoreFields(r.criteria, new Map(r.org_scores.map((s) => [s.criterion_id, s.value])));
  const submit = h('button', { class: 'button', type: 'submit' }, r.org_status === 'none' ? 'Үнэлгээ илгээх' : 'Өөрчлөлт хадгалах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Байгууллагын үнэлгээ' }, ...sf.nodes,
    r.org_letter ? h('div', { class: 'actions' }, downloadButton('Оруулсан тодорхойлолт', r.org_letter, 'button secondary', r.org_letter_file_id ?? null)) : null,
    field({ label: r.org_letter ? 'Тодорхойлолт солих (заавал биш)' : 'Тамгатай тодорхойлолтын скан', name: 'letter', type: 'file', accept: '.pdf,.png,.jpg,.jpeg', required: !r.org_letter,
      hint: 'Байгууллагын тамга, гарын үсэгтэй. PDF, JPG, PNG.' }),
    h('div', { class: 'form-submit' }, submit));
  sf.bind(form);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const { scores, errors } = sf.collect(form);
    const letter = form.elements.letter.files[0];
    if (!letter && !r.org_letter) errors.letter = 'Тамгатай тодорхойлолтын скан хувийг хавсаргана уу.';
    else if (letter) { const bad = checkFile(letter, { test: LETTER_TYPES, typeText: 'PDF, JPG, PNG', maxMb: 20 }); if (bad) errors.letter = bad; }
    if (Object.keys(errors).length) { showErrors(form, errors); return; }
    await busy(submit, async () => {
      try {
        await submitOrgScore(i.id, { scores, letter: letter ?? null });
        toast('Үнэлгээ илгээгдлээ. Удирдагч багш шалгаж батална.');
        refresh();
      } catch (error) { formAlert(form, error.message); }
    });
  });
  return form;
}

function readOnly(r) {
  const total = sum(r.org_scores, 'value');
  return [r.org_scores.length ? h('div', { class: 'stat-row text' }, h('div', { class: 'stat accent' }, h('span', { class: ['tile', 'tile-blue'], 'aria-hidden': 'true' }, icon('building', 20)),
    h('div', {}, h('strong', {}, `${num(total)} / ${num(sum(r.criteria, 'max_score'))}`), h('span', {}, 'Оруулсан оноо')))) : null,
  criteriaPanel('Байгууллагын оноо', r.org_scores),
  r.org_letter ? h('div', { class: 'actions' }, downloadButton('Тамгатай тодорхойлолт', r.org_letter, 'button secondary', r.org_letter_file_id ?? null)) : null];
}

export async function render({ params, refresh }) {
  let i;
  let r;
  try { [i, r] = await Promise.all([getMyInternship(params.id), getMyScore(params.id)]); } catch { return missing('Оюутан олдсонгүй', '/mentor/scores'); }
  const info = r.criteria.length === 0 ? banner('info', 'Тэнхим энэ улирлын байгууллагын үнэлгээний шалгуурыг хараахан тохируулаагүй байна.')
    : r.enterable ? null
      : banner('info', r.org_status === 'confirmed' ? 'Удирдагч багш үнэлгээг баталгаажуулсан тул өөрчлөх боломжгүй.' : 'Байгууллагын үнэлгээг дадлагын хугацаа дууссаны дараа оруулна.');
  return h('div', { class: 'stack' }, backLink('/mentor/scores', 'Байгууллагын үнэлгээ'),
    studentHead(i.student, orgBadge(r), h('a', { class: 'button secondary', href: `#/mentor/students/${i.id}` }, 'Оюутан')),
    r.return_reason ? banner('error', `Тэнхим буцаасан: ${r.return_reason}`) : null, info,
    r.criteria.length && r.enterable ? h('section', { class: 'panel', 'aria-labelledby': 'h-form' }, h('h2', { id: 'h-form' }, r.org_status === 'none' ? 'Үнэлгээ оруулах' : 'Үнэлгээ засах'), scoreForm(i, r, refresh)) : null,
    ...(r.enterable ? [] : readOnly(r)));
}
