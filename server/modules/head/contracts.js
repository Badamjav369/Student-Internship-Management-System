// Тэнхмийн эрхлэгч — гуравласан гэрээ: оюутны байршуулсан скан хувийг шалгаж эцсийн баталгаа гаргах (оюутан төлөвлөгөөний шатанд орно) эсвэл шалтгаантай буцаах.
// Онлайн горимд (contracts.mode touch/digital) эрхлэгч хамгийн сүүлд гарын үсэг зурж гэрээг баталгаажуулна (contracts.js).
import { HttpError, invalid, json, notFound, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { approveContract, contractOf, resetSigning, signingRoutes } from '../contracts.js';
import { notify } from '../notifications.js';

const ACTIVE = "i.semester_id = (SELECT id FROM semesters WHERE status = 'active')";
const SELECT = `SELECT i.id, i.start_date, i.end_date, i.student_id, i.mentor_id, u.last_name, u.first_name, u.student_code, u.program, u.email, o.id AS oid, o.name AS oname,
  (SELECT plan_enabled FROM semesters s WHERE s.id = i.semester_id) AS plan_enabled
  FROM internships i JOIN users u ON u.id = i.student_id LEFT JOIN organizations o ON o.id = i.organization_id`;
const row = async (db, i) => ({ id: i.id, student: { id: i.student_id, last_name: i.last_name, first_name: i.first_name, student_code: i.student_code, program: i.program, email: i.email },
  organization: i.oid ? { id: i.oid, name: i.oname } : null, start_date: i.start_date, end_date: i.end_date, contract: await contractOf(db, i.id, { forParty: 'head' }) });

async function list({ db }) {
  const rows = await db.all(`${SELECT} WHERE ${ACTIVE} AND EXISTS (SELECT 1 FROM contracts c WHERE c.internship_id = i.id AND (c.uploaded_at IS NOT NULL OR c.mode IN ('touch', 'digital'))) ORDER BY u.last_name, u.first_name`);
  return json(await Promise.all(rows.map((i) => row(db, i))));
}
async function one(db, id) {
  const i = await db.one(`${SELECT} WHERE i.id = ? AND ${ACTIVE}`, id);
  const c = i && (await contractOf(db, i.id));
  if (!c) throw notFound('Гэрээ олдсонгүй.');
  return [i, c];
}
const get = async ({ db, params }) => { const [i] = await one(db, params.id); return json(await row(db, i)); };
async function scanned(db, id) {
  const [i, c] = await one(db, id);
  if (c.status !== 'scanned') throw new HttpError(409, 'STATE_CONFLICT', 'Энэ гэрээ аль хэдийн шийдвэрлэгдсэн байна. Дэлгэцийг шинэчилнэ үү.');
  return [i, c];
}

async function approve({ db, params }) {
  const [i] = await scanned(db, params.id);
  await approveContract(db, i.id);
  return json(null);
}
async function reject({ db, params, request }) {
  const [i, c] = await one(db, params.id);
  if (c.status !== 'scanned' && c.status !== 'signing') throw new HttpError(409, 'STATE_CONFLICT', 'Энэ гэрээ аль хэдийн шийдвэрлэгдсэн байна. Дэлгэцийг шинэчилнэ үү.');
  const reason = String((await body(request)).reason ?? '').trim();
  if (!reason) throw invalid({ reason: 'Шалтгаанаа бичнэ үү.' });
  if (c.status === 'signing') await resetSigning(db, i.id, reason.slice(0, 1000));
  else await db.run("UPDATE contracts SET status = 'returned', return_reason = ? WHERE internship_id = ?", reason.slice(0, 1000), i.id);
  await notify(db, [i.student_id], 'student', `Гэрээ буцаагдлаа: ${reason.slice(0, 120)}`, '/student/contract');
  if (i.mentor_id && c.status === 'signing') await notify(db, [i.mentor_id], 'mentor', 'Гэрээг эрхлэгч буцааж, гарын үсгийг цуцаллаа.', null);
  return json(null);
}

export const routes = [
  ['GET', '/api/head/contracts', list],
  ['GET', '/api/head/contracts/:id', get],
  ['POST', '/api/head/contracts/:id/approve', approve],
  ['POST', '/api/head/contracts/:id/return', reject],
  ...signingRoutes('/api/head/contracts/:id', 'head', async ({ db, params }) => (await one(db, params.id))[0]),
];
