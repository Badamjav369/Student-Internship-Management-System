// Оюутны материал, оноо өгөх: хамгаалалтын мэдээлэл; табууд — оноо (шалгуур бүрээр), тайлан, ажлын төлөвлөгөө, дэвтэр. :id — дадлагын дугаар.
// Гишүүн зөвхөн өөрийнхөө оноог оруулж харна; бусдынх нь тоо л харагдана. Баталгаажуулалтыг удирдагч багш хийнэ.
import { h } from '../../../core/dom.js';
import { downloadButton } from '../../../core/files.js';
import { formatDate, hoursText } from '../../../core/format.js';
import { busy, clearErrors, formAlert, showErrors } from '../../../core/forms.js';
import { tabs, rememberTab, tabStart } from '../../../core/tabs.js';
import { getStudent, getStudentLogbook, getStudentPlan, getStudentReport, saveScores } from '../../../data/committee-api.js';
import { backLink } from '../../../components/back-link.js';
import { banner } from '../../../components/banner.js';
import { commentCard } from '../../../components/comment-card.js';
import { criteriaPanel } from '../../../components/criteria-panel.js';
import { missing } from '../../../components/empty-state.js';
import { factTile } from '../../../components/facts.js';
import { fileTile } from '../../../components/file-tile.js';
import { planTimeline } from '../../../components/plan-view.js';
import { scoreFields } from '../../../components/score-fields.js';
import { studentHead } from '../../../components/student-head.js';
import { toast } from '../../../components/toast-region.js';
import { placeTile, stateBadge, whenText } from '../shared.js';

const none = (text) => h('p', { class: 'muted' }, text);

function scoreForm(s, refresh) {
  const sf = scoreFields(s.criteria, new Map(s.mine.map((x) => [x.criterion_id, x.value])));
  const submit = h('button', { class: 'button', type: 'submit' }, s.mine.length ? 'Өөрчлөлт хадгалах' : 'Оноо хадгалах');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Комиссын оноо' }, ...sf.nodes, h('div', { class: 'form-submit' }, submit));
  sf.bind(form);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const { scores, errors } = sf.collect(form);
    if (Object.keys(errors).length) { showErrors(form, errors); return; }
    await busy(submit, async () => {
      try {
        const { complete } = await saveScores(s.id, scores);
        toast(complete ? 'Оноо хадгалагдлаа. Удирдагч багш баталгаажуулна.' : 'Оноо хадгалагдлаа.');
        refresh();
      } catch (error) { formAlert(form, error.message); }
    });
  });
  return form;
}

function scorePanel(s, org, refresh) {
  const mine = s.criteria.filter((c) => s.mine.some((x) => x.criterion_id === c.id)).map((c) => ({ ...c, value: s.mine.find((x) => x.criterion_id === c.id).value }));
  const note = {
    done: s.lock === 'marked' ? banner('info', 'Хамгаалаагүй гэж 0 / W тэмдэглэсэн. Оноо оруулахгүй.') : banner('success', 'Комиссын оноо баталгаажсан. Засах боломжгүй.'),
    waiting: banner('info', 'Тайлан хүлээн авагдсаны дараа оноо оруулна.'),
    observe: banner('info', 'Комиссын оноог дарга тохиролцож оруулна. Та материалыг үзэж болно.'),
  }[s.state] ?? null;
  const progress = s.state === 'todo' || s.state === 'entered'
    ? h('p', { class: 'result-count', role: 'status' }, 'Оноо оруулсан гишүүн: ', h('strong', {}, `${s.progress.entered} / ${s.progress.required}`)) : null;
  return h('div', { class: 'stack' },
    org ? criteriaPanel('Байгууллагын оноо', org.scores) : null,
    org?.letter ? h('div', { class: 'actions' }, downloadButton('Тамгатай тодорхойлолт', org.letter, 'button secondary', org.letter_file_id ?? null)) : null,
    h('section', { class: 'panel stack', 'aria-labelledby': 'h-score' },
      h('div', { class: 'tab-summary' }, h('h2', { class: 'section-title', id: 'h-score' }, 'Миний оноо'), stateBadge(s)),
      note, progress,
      s.can_score ? scoreForm(s, refresh) : (mine.length ? criteriaPanel('Оруулсан оноо', mine) : null)));
}

function reportPanel(report) {
  if (!report) return none('Тайлан илгээгдээгүй байна.');
  const files = report.submission.files;
  return h('section', { class: 'panel stack', 'aria-labelledby': 'h-report' }, h('h2', { class: 'section-title', id: 'h-report' }, 'Дадлагын тайлан'),
    h('div', { class: 'fact-grid' }, report.requirements.map((q, k) => fileTile(q.label, files.find((f) => f.requirement === q.key) ?? files[k] ?? null))));
}

function planPanel(plan) {
  if (!plan) return none('Ажлын төлөвлөгөө илгээгдээгүй байна.');
  return h('div', { class: 'stack' }, planTimeline(plan, plan.plan_fields),
    plan.mentor_comment ? h('div', { class: 'comment-cards' }, commentCard({ role: 'Дадлага удирдагчийн санал', text: plan.mentor_comment, advice: true })) : null);
}

function logbookPanel(entries, l) {
  if (!entries.length) return none('Тэмдэглэл бичигдээгүй байна.');
  return h('section', { class: 'panel stack', 'aria-labelledby': 'h-log' },
    h('div', { class: 'tab-summary' }, h('h2', { class: 'section-title', id: 'h-log' }, 'Дадлагын дэвтэр'), h('span', { class: 'chip' }, `${l.days_done}/${l.planned_days} өдөр · ${hoursText(l.hours_done)}`)),
    h('div', { class: 'stack' }, entries.map((e) => h('details', { class: 'version' },
      h('summary', {}, h('span', {}, formatDate(e.date)), h('span', { class: 'muted small' }, hoursText(e.hours))),
      h('p', { class: 'prose' }, e.work_done),
      e.mentor_comment ? commentCard({ role: 'Дадлага удирдагчийн санал', text: e.mentor_comment, advice: true }) : null))));
}

export async function render({ params, query, refresh }) {
  let s;
  try { s = await getStudent(params.id); } catch { return missing('Оюутан олдсонгүй', '/committee/students'); }
  const f = s.features ?? { plan: true, logbook: true };
  const [plan, report, entries] = await Promise.all([f.plan ? getStudentPlan(s.id) : null, getStudentReport(s.id), f.logbook ? getStudentLogbook(s.id) : []]);
  const all = [
    ['score', { label: 'Оноо', icon: 'award', panel: scorePanel(s, s.org, refresh), tone: s.state === 'todo' ? 'pending' : null, status: 'Оноо өгнө' }],
    ['report', { label: 'Тайлан', icon: 'report', panel: reportPanel(report) }],
    f.plan ? ['plan', { label: 'Төлөвлөгөө', icon: 'plan', panel: planPanel(plan) }] : null,
    f.logbook ? ['logbook', { label: 'Дэвтэр', icon: 'book', panel: logbookPanel(entries, s.logbook), count: entries.length }] : null,
  ].filter(Boolean);
  const keys = all.map(([k]) => k);
  const t = tabs(all.map(([, tab]) => tab), { label: 'Оюутны материал', start: tabStart(keys, query) });
  rememberTab(t, keys, `/committee/students/${s.id}`);
  return h('div', { class: 'stack' }, backLink('/committee/students', 'Оюутан, оноо'), studentHead(s.student, stateBadge(s)),
    h('div', { class: 'fact-grid' },
      factTile('calendar', 'blue', 'Хамгаалалт', h('strong', {}, whenText(s.defense)),
        h('span', { class: 'fact-label' }, `${s.committee.name}${s.committee.is_chair ? ' (дарга)' : ''}${s.defense.order_no ? ` · ${s.defense.order_no}-р ээлж` : ''}`)),
      placeTile(s.defense.format, s.defense.place)),
    t);
}
