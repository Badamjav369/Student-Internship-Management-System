// Оноо, эцсийн дүн: байгууллагын оноог батлах/буцаах, комиссын оноог баталгаажуулах, хамгаалаагүй бол 0/W, эцсийн дүн, СИСИ.
import { check } from '../../lib/check.js';
import { HttpError, invalid, json, notFound, body } from '../../lib/http.js';
import { notify } from '../notifications.js';
import { own } from './students.js';

/** Нийт оноо: байгууллагын оноо + комиссын шалгуур бүрийн дундаж (тохиролцоо аргад — даргын нэг утга). */
export async function totals(db, ids) {
  if (!ids.length) return new Map();
  const list = JSON.stringify(ids); // D1: нэг query-д 100-аас ихгүй параметр — json_each
  const rows = await db.all(`SELECT internship_id, sum(v) AS total FROM (
      SELECT internship_id, value AS v FROM org_scores WHERE internship_id IN (SELECT value FROM json_each(?))
      UNION ALL SELECT internship_id, avg(value) AS v FROM committee_scores WHERE internship_id IN (SELECT value FROM json_each(?)) GROUP BY internship_id, criterion_id)
    GROUP BY internship_id`, list, list);
  return new Map(rows.map((r) => [r.internship_id, Math.round(r.total * 100) / 100]));
}

async function view(db, i) {
  const r = await db.one('SELECT s.*, f.name AS org_letter FROM score_records s LEFT JOIN files f ON f.id = s.org_letter_file_id WHERE s.internship_id = ?', i.id);
  if (!r) throw notFound('Онооны бүртгэл үүсээгүй байна.');
  const [org, com] = await Promise.all([
    db.all('SELECT o.criterion_id, c.name, c.max_score, o.value FROM org_scores o JOIN criteria c ON c.id = o.criterion_id WHERE o.internship_id = ? ORDER BY c.sort_order, c.id', i.id),
    db.all(`SELECT s.criterion_id, c.name, c.max_score, round(avg(s.value), 2) AS value FROM committee_scores s JOIN criteria c ON c.id = s.criterion_id
      WHERE s.internship_id = ? GROUP BY s.criterion_id ORDER BY c.sort_order, c.id`, i.id),
  ]);
  return { ...r, org_scores: org, committee_scores: r.committee_status === 'none' ? [] : com,
    total: r.status === 'open' || r.mark ? null : (await totals(db, [i.id])).get(i.id) ?? 0 };
}
const get = async ({ db, user, params }) => json(await view(db, await own(db, user, params.id)));

/** Төлвийн нөхцөл шалгаад [дадлага, бүртгэл]. */
async function scoring(db, user, id, test) {
  const i = await own(db, user, id);
  const r = await db.one('SELECT * FROM score_records WHERE internship_id = ?', i.id);
  if (!r || !test(r, i)) throw new HttpError(409, 'STATE_CONFLICT', 'Энэ үйлдлийг одоо хийх боломжгүй. Дэлгэцийг шинэчилнэ үү.');
  return [i, r];
}
const orgPending = (r) => r.status === 'open' && r.org_status === 'unconfirmed';

async function approveOrg({ db, user, params }) {
  const [i] = await scoring(db, user, params.id, orgPending);
  await db.run("UPDATE score_records SET org_status = 'confirmed' WHERE internship_id = ?", i.id);
  return json(null);
}
async function returnOrg({ db, user, params, request }) {
  const [i] = await scoring(db, user, params.id, orgPending);
  const reason = String((await body(request)).reason ?? '').trim();
  if (!reason) throw invalid({ reason: 'Шалтгаанаа бичнэ үү.' });
  await db.batch([
    db.stmt('DELETE FROM org_scores WHERE internship_id = ?', i.id),
    db.stmt("UPDATE score_records SET org_status = 'none', org_letter_file_id = NULL, org_return_reason = ? WHERE internship_id = ?", reason.slice(0, 1000), i.id),
  ]);
  await notify(db, [i.mentor_id], 'mentor', `${i.student.last_name} ${i.student.first_name}-ийн байгууллагын үнэлгээг тэнхим буцаалаа. Засаад дахин оруулна уу.`, `/mentor/scores/${i.id}`);
  return json(null);
}
async function confirmCommittee({ db, user, params }) {
  const [i] = await scoring(db, user, params.id, (r) => r.status === 'open' && r.committee_status === 'unconfirmed');
  await db.run("UPDATE score_records SET committee_status = 'confirmed' WHERE internship_id = ?", i.id);
  return json(null);
}
async function mark({ db, user, params, request }) {
  const [i] = await scoring(db, user, params.id, (r, x) => r.status === 'open' && r.committee_status === 'none' && ['ready', 'failed'].includes(x.status));
  const data = check(await body(request), { mark: [(v) => (['0', 'W'].includes(v) ? null : 'Буруу утга.')], reason: [(v) => (String(v ?? '').trim() ? null : 'Шалтгаанаа бичнэ үү.')] });
  await db.run("UPDATE score_records SET committee_status = 'marked', mark = ?, mark_reason = ? WHERE internship_id = ?", data.mark, data.reason.trim().slice(0, 1000), i.id);
  return json(null);
}
async function finalize({ db, user, params }) {
  const [i, r] = await scoring(db, user, params.id, (x) => x.status === 'open' && ((x.org_status === 'confirmed' && x.committee_status === 'confirmed') || x.committee_status === 'marked'));
  const total = r.mark ? null : (await totals(db, [i.id])).get(i.id) ?? 0;
  await db.batch([
    db.stmt("UPDATE score_records SET status = 'finalized' WHERE internship_id = ?", i.id),
    r.mark ? db.stmt('UPDATE internships SET grade_total = NULL, grade_mark = ?, status = ? WHERE id = ?', r.mark, r.mark === 'W' ? 'deferred' : 'failed', i.id)
      : db.stmt("UPDATE internships SET grade_total = ?, grade_mark = NULL, status = CASE WHEN status = 'ready' THEN 'evaluating' ELSE status END WHERE id = ?", total, i.id),
  ]);
  await notify(db, [i.student_id], 'student', 'Дадлагын эцсийн дүн гарлаа.', '/student/score');
  return json(null);
}
async function sisi({ db, user, params }) {
  const [i] = await scoring(db, user, params.id, (x) => x.status === 'finalized');
  await db.batch([
    db.stmt("UPDATE score_records SET status = 'closed' WHERE internship_id = ?", i.id),
    db.stmt("UPDATE internships SET status = 'completed' WHERE id = ? AND status = 'evaluating'", i.id),
  ]);
  return json(null);
}

export const routes = [
  ['GET', '/api/supervisor/internships/:id/score', get],
  ['POST', '/api/supervisor/internships/:id/score/org/approve', approveOrg],
  ['POST', '/api/supervisor/internships/:id/score/org/return', returnOrg],
  ['POST', '/api/supervisor/internships/:id/score/committee/confirm', confirmCommittee],
  ['POST', '/api/supervisor/internships/:id/score/mark', mark],
  ['POST', '/api/supervisor/internships/:id/score/finalize', finalize],
  ['POST', '/api/supervisor/internships/:id/score/sisi', sisi],
];
