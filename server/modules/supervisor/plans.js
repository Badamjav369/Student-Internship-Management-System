// Ажлын төлөвлөгөө: харах, зөвлөгөө бичих (батлахыг дадлага удирдагч хийнэ).
import { invalid, json, notFound, body } from '../../lib/http.js';
import { notify } from '../notifications.js';
import { own } from './students.js';

const parse = (v, f) => { try { return v ? JSON.parse(v) : f; } catch { return f; } };

async function get({ db, user, params }) {
  const i = await own(db, user, params.id);
  const p = await db.one('SELECT * FROM work_plans WHERE internship_id = ?', i.id);
  if (!p) throw notFound('Төлөвлөгөө илгээгдээгүй байна.');
  const fields = parse(await db.value("SELECT plan_fields FROM templates WHERE semester_id = ? AND kind = 'plan'", i.semester_id), null)
    ?? [{ key: 'goal', label: 'Дадлагын зорилго', type: 'textarea', required: true }];
  return json({ ...p, fields: parse(p.fields, { values: {}, tasks: [] }), plan_fields: fields });
}
async function advice({ db, user, params, request }) {
  const i = await own(db, user, params.id);
  const { text } = await body(request);
  const advice = String(text ?? '').trim();
  if (!advice) throw invalid({ advice: 'Зөвлөгөөгөө бичнэ үү.' });
  if (advice.length > 5000) throw invalid({ advice: '5000 тэмдэгтээс ихгүй.' });
  const r = await db.run('UPDATE work_plans SET teacher_comment = ? WHERE internship_id = ?', advice, i.id);
  if (!r.meta.changes) throw notFound('Төлөвлөгөө илгээгдээгүй байна.');
  await notify(db, [i.student_id], 'student', 'Удирдагч багш ажлын төлөвлөгөөнд зөвлөгөө бичлээ.', '/student/plan');
  return json(null);
}

export const routes = [
  ['GET', '/api/supervisor/internships/:id/plan', get],
  ['POST', '/api/supervisor/internships/:id/plan/advice', advice],
];
