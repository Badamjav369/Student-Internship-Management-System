// Оюутны хүсэлт: хүлээн авах (оюутны бусад хүсэлт цуцлагдаж, гэрээ байгуулах шатанд орно) эсвэл татгалзах.
import { HttpError, json, notFound } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { notify } from '../notifications.js';
import { orgOf } from './postings.js';

const SELECT = `SELECT a.id, a.internship_id AS application_internship, a.status, a.submitted_at, a.decided_at, a.cover_letter AS letter, a.cv_file_id, f.name AS cv_name,
    p.id AS posting_id, p.title AS posting_title, u.id AS sid, u.last_name, u.first_name, u.student_code, u.program, u.email, i.organization_id AS placed_org
  FROM applications a JOIN postings p ON p.id = a.posting_id JOIN internships i ON i.id = a.internship_id JOIN users u ON u.id = i.student_id LEFT JOIN files f ON f.id = a.cv_file_id`;
const view = (a, org) => ({ id: a.id, student: { id: a.sid, last_name: a.last_name, first_name: a.first_name, student_code: a.student_code, program: a.program, email: a.email },
  posting: { id: a.posting_id, title: a.posting_title }, status: a.status, submitted_at: a.submitted_at, decided_at: a.decided_at, cv_name: a.cv_name, cv_file_id: a.cv_file_id,
  letter: a.letter, internship_id: a.placed_org === org ? a.application_internship : null });

async function list({ db, user }) {
  const org = orgOf(user);
  return json((await db.all(`${SELECT} WHERE p.organization_id = ? AND a.status <> 'cancelled' ORDER BY a.submitted_at DESC`, org)).map((a) => view(a, org)));
}
async function one(db, user, id) {
  const org = orgOf(user);
  const a = await db.one(`${SELECT} WHERE a.id = ? AND p.organization_id = ?`, id, org);
  if (!a) throw notFound('Хүсэлт олдсонгүй.');
  return [a, org];
}
const get = async ({ db, user, params }) => { const [a, org] = await one(db, user, params.id); return json(view(a, org)); };
const conflictState = (m) => new HttpError(409, 'STATE_CONFLICT', m);

async function accept({ db, user, params }) {
  const [a, org] = await one(db, user, params.id);
  if (a.status !== 'pending') throw conflictState('Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна. Дэлгэцийг шинэчилнэ үү.');
  const p = await db.one(`SELECT p.*, (SELECT count(*) FROM applications x WHERE x.posting_id = p.id AND x.status = 'accepted') AS accepted FROM postings p WHERE p.id = ?`, a.posting_id);
  if (p.positions - p.accepted <= 0) throw new HttpError(409, 'FULL', 'Энэ зарын орон тоо дүүрсэн байна.');
  const i = await db.one('SELECT id, status, student_id FROM internships WHERE id = ?', a.application_internship);
  if (!['searching', 'applied'].includes(i.status)) throw conflictState('Оюутан дадлагын газраа аль хэдийн тогтоосон байна.');
  const at = now();
  await db.batch([
    db.stmt("UPDATE applications SET status = CASE WHEN id = ? THEN 'accepted' ELSE 'cancelled' END, decided_at = ? WHERE internship_id = ? AND status = 'pending'", a.id, at, i.id),
    db.stmt("UPDATE placement_requests SET status = 'cancelled', decided_at = ? WHERE internship_id = ? AND status = 'pending'", at, i.id),
    db.stmt("UPDATE internships SET organization_id = ?, mentor_id = NULL, status = 'contracting', place_status = 'unconfirmed', start_date = ?, end_date = ? WHERE id = ?", org, p.start_date, p.end_date, i.id),
    db.stmt('INSERT OR IGNORE INTO contracts (internship_id) VALUES (?)', i.id),
  ]);
  const name = await db.value('SELECT name FROM organizations WHERE id = ?', org);
  await notify(db, [i.student_id], 'student', `«${name}» таны хүсэлтийг зөвшөөрлөө. Гэрээ бэлтгэгдлээ.`, '/student/contract');
  return json(null);
}
async function reject({ db, user, params }) {
  const [a] = await one(db, user, params.id);
  if (a.status !== 'pending') throw conflictState('Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна. Дэлгэцийг шинэчилнэ үү.');
  await db.run("UPDATE applications SET status = 'rejected', decided_at = ? WHERE id = ?", now(), a.id);
  if (!(await db.one("SELECT 1 FROM applications WHERE internship_id = ? AND status = 'pending'", a.application_internship))) {
    await db.run("UPDATE internships SET status = 'searching' WHERE id = ? AND status = 'applied'", a.application_internship);
  }
  const student = await db.value('SELECT student_id FROM internships WHERE id = ?', a.application_internship);
  await notify(db, [student], 'student', `«${a.posting_title}» зарт илгээсэн хүсэлтийг байгууллага татгалзлаа.`, '/student/postings?tab=mine');
  return json(null);
}

export const routes = [
  ['GET', '/api/org/applications', list],
  ['GET', '/api/org/applications/:id', get],
  ['POST', '/api/org/applications/:id/accept', accept],
  ['POST', '/api/org/applications/:id/reject', reject],
];
