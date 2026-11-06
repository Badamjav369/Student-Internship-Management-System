// Ажлын төлөвлөгөө: нэг үед нэг л төлөвлөгөө байна. Байхгүй эсвэл буцаагдсан бол маягтыг бөглөж илгээнэ (буцаагдсаныг солино);
// илгээсэн бол харах горимд: шийдвэр, дадлага удирдагчийн санал, төлөвлөгөөний мэдээлэл + ажлын хуваарь. Дизайн нь «Дадлагын байгууллага» хуудастай нэг хэлтэй.
import { h, pageHead, replace } from '../../core/dom.js';
import { addDays, formatRange, isoDate, parseDate } from '../../core/format.js';
import { busy, clearErrors, field, formAlert, setFieldError } from '../../core/forms.js';
import { icon } from '../../core/icons.js';
import { getDashboard, getWorkPlan, submitWorkPlan } from '../../data/student-api.js';
import { commentCard } from '../../components/comment-card.js';
import { emptyState } from '../../components/empty-state.js';
import { planTimeline, planVerdict } from '../../components/plan-view.js';
import { toast } from '../../components/toast-region.js';
import { noInternship } from './shared.js';


// Дадлагын хугацааг долоо хоног (Даваа–Баасан) бүрээр хуваана.
export function weeklyRanges(start, end) {
  const ranges = [];
  const last = parseDate(end);
  let t = parseDate(start);
  while (t <= last) {
    const wd = new Date(t).getUTCDay();
    if (wd === 0 || wd === 6) { t += 86400000; continue; }
    const friday = Math.min(last, t + (5 - wd) * 86400000);
    ranges.push({ from: isoDate(t), to: isoDate(friday), task: '' });
    t = friday + 86400000;
  }
  return ranges;
}

// ---------- Харах горим ----------
// Чухлын дараалал: шийдвэр (өнгөт зурвас) → дадлага удирдагчийн санал (шар, мөр дүүрэн) → ажлын хуваарь (дээр нь төлөвлөгөөний мэдээлэл).

function comments(plan, people) {
  if (!plan.mentor_comment) return null;
  const role = plan.status === 'returned' ? 'Дадлага удирдагчийн санал' : 'Дадлага удирдагч';
  return h('div', { class: 'comment-cards' }, commentCard({ role, name: people.mentor?.name, text: plan.mentor_comment, advice: true }));
}

function planView(plan, planFields, people) {
  return h('div', { class: 'stack' }, planVerdict(plan), comments(plan, people), planTimeline(plan, planFields));
}

// ---------- Бөглөх горим ----------

function taskRow(task, index, { start, end, onRemove }) {
  const id = `task-${index}`;
  const from = h('input', { id: `${id}-from`, type: 'date', name: 'from', value: task.from, min: start, max: end, required: true });
  const to = h('input', { id: `${id}-to`, type: 'date', name: 'to', value: task.to, min: start, max: end, required: true });
  const text = h('textarea', { id: `${id}-task`, name: 'task', rows: 2, maxlength: 1000, required: true }, task.task);
  const error = h('p', { class: 'error', id: `${id}-error`, hidden: true });
  for (const control of [from, to, text]) control.setAttribute('aria-describedby', `${id}-error`);
  return h('fieldset', { class: 'task-row', dataset: { field: `tasks.${index}` } },
    h('legend', { class: 'sr-only' }, `Ажил ${index + 1}`),
    h('div', { class: 'field' }, h('label', { for: from.id }, 'Эхлэх'), from),
    h('div', { class: 'field' }, h('label', { for: to.id }, 'Дуусах'), to),
    h('div', { class: 'field grow' }, h('label', { for: text.id }, 'Хийх ажил'), text),
    h('button', { class: 'icon-button', type: 'button', 'aria-label': `Ажил ${index + 1}-г хасах`, on: { click: onRemove } }, icon('trash', 18)),
    error);
}

function editor({ period, planFields, previous, onSubmitted }) {
  const { start_date: start, end_date: end } = period;
  let tasks = (previous?.fields.tasks ?? []).map((t) => ({ ...t }));
  if (tasks.length === 0) tasks = weeklyRanges(start, end);
  const values = previous?.fields.values ?? {};
  const rows = h('div', { class: 'task-rows' });
  const readRows = () => [...rows.querySelectorAll('.task-row')].map((r) => ({ from: r.querySelector('[name=from]').value, to: r.querySelector('[name=to]').value, task: r.querySelector('[name=task]').value }));
  const draw = () => replace(rows, tasks.map((t, i) => taskRow(t, i, { start, end, onRemove: () => { tasks = readRows(); tasks.splice(i, 1); draw(); } })));
  draw();

  const add = h('button', { class: 'button secondary small', type: 'button', on: { click: () => {
    tasks = readRows();
    const last = tasks.at(-1);
    const nextDay = last ? addDays(last.to, 1) : start;
    const date = nextDay <= end ? nextDay : (last?.to ?? start);
    tasks.push({ from: date, to: date, task: '' });
    draw();
    rows.querySelector('.task-row:last-of-type input')?.focus();
  } } }, icon('plus', 16), 'Мөр нэмэх');
  const submit = h('button', { class: 'button', type: 'submit' }, icon('send', 18), 'Төлөвлөгөө илгээх');
  const info = planFields.length
    ? h('section', { class: 'panel', 'aria-labelledby': 'h-info' },
      h('h2', { id: 'h-info' }, 'Төлөвлөгөөний мэдээлэл'),
      h('div', { class: 'form' }, planFields.map((f) => field({
        label: f.required ? f.label : `${f.label} (заавал биш)`, name: `fields.${f.key}`, type: f.type === 'textarea' ? 'textarea' : f.type, value: values[f.key] ?? '', rows: 4,
        ...(f.type === 'number' ? { inputmode: 'decimal', step: 'any' } : {}),
      }))))
    : null;
  const schedule = h('section', { class: 'panel', 'aria-labelledby': 'h-tasks', dataset: { field: 'tasks' } },
    h('div', { class: 'panel-head' },
      h('div', {}, h('h2', { id: 'h-tasks' }, 'Ажлын хуваарь'), h('p', { class: 'hint' }, `Хугацаа: ${formatRange(start, end)}`)),
      h('div', { class: 'row-actions' }, add)),
    h('p', { class: 'error', hidden: true }), rows);
  const form = h('form', { class: 'stack', novalidate: true }, info, schedule, h('div', { class: 'form-submit' }, submit));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    const list = readRows();
    const errors = {};
    const fields = {};
    for (const f of planFields) {
      const raw = form.elements[`fields.${f.key}`].value.trim();
      if (!raw) { if (f.required) errors[`fields.${f.key}`] = `${f.label} бөглөнө үү.`; continue; }
      if (f.type === 'number') {
        const n = Number(raw.replace(',', '.'));
        if (!Number.isFinite(n)) errors[`fields.${f.key}`] = 'Тоо оруулна уу.'; else fields[f.key] = n;
      } else fields[f.key] = raw;
    }
    if (list.length === 0) errors.tasks = 'Дор хаяж нэг ажил нэмнэ үү.';
    list.forEach((t, i) => {
      const key = `tasks.${i}`;
      if (!t.from || !t.to) errors[key] = 'Эхлэх, дуусах огноог сонгоно уу.';
      else if (t.from > t.to) errors[key] = 'Эхлэх огноо дуусах огнооноос хойш байна.';
      else if (t.from < start || t.to > end) errors[key] = `Дадлагын хугацаанд (${formatRange(start, end)}) багтана.`;
      else if (!t.task.trim()) errors[key] = 'Хийх ажлаа бичнэ үү.';
    });
    if (Object.keys(errors).length) {
      for (const [name, message] of Object.entries(errors)) setFieldError(form, name, message);
      formAlert(form, 'Тэмдэглэсэн талбарыг засаад дахин илгээнэ үү.');
      form.querySelector('[data-invalid] input, [data-invalid] textarea')?.focus();
      return;
    }
    await busy(submit, async () => {
      await submitWorkPlan({ fields, tasks: list.map((t) => ({ ...t, task: t.task.trim() })) });
      toast('Төлөвлөгөө илгээгдлээ.');
      onSubmitted();
    });
  });
  return form;
}

export async function render({ refresh }) {
  const dash = await getDashboard();
  const i = dash.internship;
  if (!i) return noInternship('Ажлын төлөвлөгөө', 'plan');
  const { plan, planFields, period } = await getWorkPlan();
  const people = { mentor: i.info.mentor };
  const head = pageHead('Ажлын төлөвлөгөө');
  const wait = (text) => h('section', {}, head, emptyState(text, null, { icon: 'plan' }));

  // Нэг үед нэг л төлөвлөгөө: байхгүй эсвэл буцаагдсан бол энэ маягтыг бөглөж илгээнэ (буцаагдсаныг солино).
  if (i.status === 'planning' && (!plan || plan.status === 'returned')) {
    if (!people.mentor) return wait('Дадлага удирдагч томилогдоогүй байна.');
    return h('section', {}, head, h('div', { class: 'stack' },
      plan ? planVerdict(plan) : null, plan ? comments(plan, people) : null,
      editor({ period, planFields, previous: plan, onSubmitted: refresh })));
  }
  if (!plan) return wait(['searching', 'applied', 'contracting'].includes(i.status) ? 'Төлөвлөгөө бичих үе болоогүй байна.' : 'Төлөвлөгөө илгээгээгүй байна.');
  return h('section', {}, head, planView(plan, planFields, people));
}
