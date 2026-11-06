// Ажлын төлөвлөгөө хянах: батлах (дадлага эхэлнэ) эсвэл санал бичиж буцаах.
import { invalid, json, notFound, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { notify } from '../notifications.js';
import { conflictState } from '../student/context.js';
import { own } from './interns.js';

const parse = (v, f) => { try { return v ? JSON.parse(v) : f; } catch { return f; } };

async function get({ db, user, params }) {
  const i = await own(db, user, params.id);
  const p = await db.one('SELECT * FROM work_plans WHERE internship_id = ?', i.id);
  if (!p) throw notFound('Оюутан ажлын төлөвлөгөөгөө илгээгээгүй байна.');
  const fields = parse(await db.value("SELECT plan_fields FROM templates WHERE semester_id = ? AND kind = 'plan'", i.semester_id), null)
    ?? [{ key: 'goal', label: 'Дадлагын зорилго', type: 'textarea', required: true }];
  return json({ ...p, fields: parse(p.fields, { values: {}, tasks: [] }), plan_fields: fields });
}
async function pending(db, user, id) {
  const i = await own(db, user, id);
  if ((await db.value('SELECT status FROM work_plans WHERE internship_id = ?', i.id)) !== 'submitted') throw conflictState('Энэ төлөвлөгөө аль хэдийн шийдвэрлэгдсэн байна.');
  return i;
}
async function approve({ db, user, params, request }) {
  const i = await pending(db, user, params.id);
  const comment = String((await body(request)).comment ?? '').trim().slice(0, 5000) || null;
  await db.batch([
    db.stmt("UPDATE work_plans SET status = 'approved', decided_at = ?, mentor_comment = ? WHERE internship_id = ?", now(), comment, i.id),
    db.stmt("UPDATE internships SET status = 'in_progress' WHERE id = ? AND status = 'planning'", i.id),
  ]);
  await notify(db, [i.student_id], 'student', 'Ажлын төлөвлөгөө батлагдлаа.', '/student/plan');
  await notify(db, [i.supervisor_id], 'supervisor', `${i.student.last_name} ${i.student.first_name}-ийн ажлын төлөвлөгөөг дадлага удирдагч баталлаа.`, `/supervisor/plans/${i.id}`);
  return json(null);
}
async function reject({ db, user, params, request }) {
  const i = await pending(db, user, params.id);
  const comment = String((await body(request)).comment ?? '').trim();
  if (!comment) throw invalid({ comment: 'Юуг засахыг бичнэ үү.' });
  await db.run("UPDATE work_plans SET status = 'returned', decided_at = ?, mentor_comment = ? WHERE internship_id = ?", now(), comment.slice(0, 5000), i.id);
  await notify(db, [i.student_id], 'student', 'Ажлын төлөвлөгөөг дадлага удирдагч санал бичиж буцаалаа.', '/student/plan');
  return json(null);
}

export const routes = [
  ['GET', '/api/mentor/internships/:id/plan', get],
  ['POST', '/api/mentor/internships/:id/plan/approve', approve],
  ['POST', '/api/mentor/internships/:id/plan/return', reject],
];
