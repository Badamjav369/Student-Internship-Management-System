// Тэнхмийн эрхлэгч — оюутны санал болгосон газар, гадаадад хийх дадлагын хүсэлт: зөвшөөрөх (админ газрыг бүртгэнэ) эсвэл татгалзах.
import { HttpError, invalid, json, notFound, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { notify, notifyRole } from '../notifications.js';

// Дадлага бүрийн сүүлийн хүсэлт (идэвхтэй улирал). :id — дадлагын дугаар.
const SELECT = `SELECT p.*, f.name AS document_name, u.id AS sid, u.last_name, u.first_name, u.student_code, u.program, u.email
  FROM placement_requests p JOIN internships i ON i.id = p.internship_id JOIN users u ON u.id = i.student_id LEFT JOIN files f ON f.id = p.document_file_id
  WHERE i.semester_id = (SELECT id FROM semesters WHERE status = 'active') AND p.id = (SELECT max(id) FROM placement_requests x WHERE x.internship_id = p.internship_id)`;
const view = ({ sid, last_name, first_name, student_code, program, email, ...r }) => ({ id: r.internship_id,
  student: { id: sid, last_name, first_name, student_code, program, email }, organization: { name: r.organization_name }, request: r });

const list = async ({ db }) => json((await db.all(`${SELECT} ORDER BY p.status = 'pending' DESC, p.created_at DESC`)).map(view));
async function one(db, id) {
  const r = await db.one(`${SELECT} AND p.internship_id = ?`, id);
  if (!r) throw notFound('Хүсэлт олдсонгүй.');
  return r;
}
const get = async ({ db, params }) => json(view(await one(db, params.id)));
async function pending(db, id) {
  const r = await one(db, id);
  if (r.status !== 'pending') throw new HttpError(409, 'STATE_CONFLICT', 'Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна. Дэлгэцийг шинэчилнэ үү.');
  return r;
}

async function approve({ db, params }) {
  const r = await pending(db, params.id);
  await db.run("UPDATE placement_requests SET status = 'approved', decided_at = ? WHERE id = ?", now(), r.id);
  await notifyRole(db, 'admin', `${r.last_name} ${r.first_name}-ийн санал болгосон газрыг эрхлэгч зөвшөөрлөө. Газрыг бүртгэнэ үү.`, `/admin/internships/${r.internship_id}`);
  await notify(db, [r.sid], 'student', 'Санал болгосон дадлагын газрыг тэнхим зөвшөөрлөө.', '/student/postings?tab=own');
  return json(null);
}
async function reject({ db, params, request }) {
  const r = await pending(db, params.id);
  const reason = String((await body(request)).reason ?? '').trim();
  if (!reason) throw invalid({ reason: 'Шалтгаанаа бичнэ үү.' });
  await db.run("UPDATE placement_requests SET status = 'rejected', decision_reason = ?, decided_at = ? WHERE id = ?", reason.slice(0, 1000), now(), r.id);
  await notify(db, [r.sid], 'student', `Санал болгосон газрын хүсэлт татгалзагдлаа: ${reason.slice(0, 120)}`, '/student/postings?tab=own');
  return json(null);
}

const semester = async ({ db }) => json(await db.one("SELECT * FROM semesters WHERE status = 'active'"));

export const routes = [
  ['GET', '/api/head/semester', semester],
  ['GET', '/api/head/requests', list],
  ['GET', '/api/head/requests/:id', get],
  ['POST', '/api/head/requests/:id/approve', approve],
  ['POST', '/api/head/requests/:id/reject', reject],
];
