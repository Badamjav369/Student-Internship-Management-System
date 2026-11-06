// Тайлан хянах: хүлээн авах (оюутан хамгаалалтад бэлэн болно) эсвэл санал бичиж засвар шаардах.
import { invalid, json, notFound, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { notify } from '../notifications.js';
import { conflictState } from '../student/context.js';
import { own } from './students.js';

async function get({ db, user, params }) {
  const i = await own(db, user, params.id);
  if (!i.report) throw notFound('Тайлангийн хугацаа эхлээгүй байна.');
  const req = await db.value("SELECT required_files FROM templates WHERE semester_id = ? AND kind = 'report'", i.semester_id);
  return json({ ...i.report, requirements: req ? JSON.parse(req) : [] });
}
async function reviewable(db, user, id) {
  const i = await own(db, user, id);
  if (i.report?.status !== 'submitted') throw conflictState('Энэ тайлан аль хэдийн шийдвэрлэгдсэн байна.');
  return i;
}
async function accept({ db, user, params }) {
  const i = await reviewable(db, user, params.id);
  await db.batch([
    db.stmt("UPDATE reports SET status = 'accepted', comment = NULL, reviewed_at = ? WHERE internship_id = ?", now(), i.id),
    db.stmt("UPDATE internships SET status = 'ready' WHERE id = ? AND status = 'reporting'", i.id),
  ]);
  await notify(db, [i.student_id], 'student', 'Тайлан хүлээн авагдлаа.', '/student/report');
  return json(null);
}
async function revision({ db, user, params, request }) {
  const i = await reviewable(db, user, params.id);
  const comment = String((await body(request)).comment ?? '').trim();
  if (!comment) throw invalid({ comment: 'Оюутан юуг засахыг бичнэ үү.' });
  await db.run("UPDATE reports SET status = 'revision', is_open = 1, comment = ?, reviewed_at = ? WHERE internship_id = ?", comment.slice(0, 5000), now(), i.id);
  await notify(db, [i.student_id], 'student', 'Тайланд засвар шаардлаа. Санал харж дахин илгээнэ үү.', '/student/report');
  return json(null);
}

export const routes = [
  ['GET', '/api/supervisor/internships/:id/report', get],
  ['POST', '/api/supervisor/internships/:id/report/accept', accept],
  ['POST', '/api/supervisor/internships/:id/report/revision', revision],
];
