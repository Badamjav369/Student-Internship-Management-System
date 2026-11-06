// Ажлын төлөвлөгөө: нэг үед нэг; буцаагдсан бол засаж дахин илгээнэ (шинэ хувилбар өмнөхийг солино).
import { invalid, json, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { notify } from '../notifications.js';
import { conflictState, feature, parse, required, studentName } from './context.js';

const DEFAULT_FIELDS = [{ key: 'goal', label: 'Дадлагын зорилго', type: 'textarea', required: true }];
const fieldsOf = async (db, i) => parse(await db.value("SELECT plan_fields FROM templates WHERE semester_id = ? AND kind = 'plan'", i.semester_id), null) ?? DEFAULT_FIELDS;
const view = (p) => (p ? { status: p.status, version: p.version, submitted_at: p.submitted_at, decided_at: p.decided_at, mentor_comment: p.mentor_comment, teacher_comment: p.teacher_comment,
  fields: parse(p.fields, { values: {}, tasks: [] }) } : null);

async function get({ db, user }) {
  const i = await required(db, user);
  feature(i, 'plan');
  const plan = await db.one('SELECT * FROM work_plans WHERE internship_id = ?', i.id);
  return json({ plan: view(plan), planFields: await fieldsOf(db, i), period: { start_date: i.start_date, end_date: i.end_date } });
}

/** body: { fields: { key: value }, tasks: [{ from, to, task }] } */
async function submit({ db, request, user }) {
  const i = await required(db, user);
  feature(i, 'plan');
  if (i.status !== 'planning') throw conflictState('Ажлын төлөвлөгөөг одоо илгээх боломжгүй.');
  const old = await db.one('SELECT status, version FROM work_plans WHERE internship_id = ?', i.id);
  if (old && old.status !== 'returned') throw conflictState(old.status === 'submitted' ? 'Төлөвлөгөө хянагдаж байна.' : 'Төлөвлөгөө батлагдсан байна.');
  const { fields = {}, tasks = [] } = await body(request);
  const errors = {};
  for (const f of await fieldsOf(db, i)) {
    const v = String(fields[f.key] ?? '').trim();
    if (f.required && !v) errors[f.key] = 'Заавал бөглөнө.';
    else if (v.length > 5000) errors[f.key] = '5000 тэмдэгтээс ихгүй.';
  }
  if (!Array.isArray(tasks) || !tasks.length) errors.tasks = 'Ядаж нэг ажил нэмнэ үү.';
  else if (tasks.length > 60) errors.tasks = 'Хэт олон мөр байна.';
  else if (tasks.some((t) => !t.task?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(t.from) || !/^\d{4}-\d{2}-\d{2}$/.test(t.to) || t.from > t.to || t.from < i.start_date || t.to > i.end_date)) {
    errors.tasks = 'Ажил бүр дадлагын хугацаанд багтсан эхлэх, дуусах огноотой байна.';
  }
  if (Object.keys(errors).length) throw invalid(errors);
  const data = JSON.stringify({ values: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v ?? '').trim()])), tasks: tasks.map((t) => ({ from: t.from, to: t.to, task: t.task.trim() })) });
  await db.run(`INSERT INTO work_plans (internship_id, status, version, fields, submitted_at) VALUES (?, 'submitted', 1, ?, ?)
    ON CONFLICT (internship_id) DO UPDATE SET status = 'submitted', version = version + 1, fields = excluded.fields, submitted_at = excluded.submitted_at,
      decided_at = NULL, mentor_comment = NULL`, i.id, data, now());
  const text = `${studentName(user)} ажлын төлөвлөгөөгөө илгээлээ.`;
  await notify(db, [i.mentor_id], 'mentor', text, `/mentor/plans/${i.id}`);
  await notify(db, [i.supervisor_id], 'supervisor', text, `/supervisor/plans/${i.id}`);
  return json(null);
}

export const routes = [
  ['GET', '/api/student/plan', get],
  ['POST', '/api/student/plan', submit],
];
