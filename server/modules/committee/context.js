// Комиссын гишүүний харагдац: зөвхөн нийтлэгдсэн, миний гишүүн болсон комиссын оюутнууд. Бусад файл own()-оор эрхээ шалгана.
import { notFound } from '../../lib/http.js';

export const SCORABLE = ['ready', 'evaluating'];
const SELECT = `SELECT i.id, i.status, i.semester_id, i.student_id, i.supervisor_id, u.last_name, u.first_name, u.student_code, u.program, u.email, o.id AS oid, o.name AS oname,
  c.id AS cid, c.name AS cname, c.defense_date, c.start_time, c.format, c.location, c.online_url, m.is_chair, d.order_no, d.slot_time, s.committee_method,
  sr.status AS score_status, sr.committee_status
  FROM committee_members m JOIN committees c ON c.id = m.committee_id AND c.published_at IS NOT NULL JOIN defense_slots d ON d.committee_id = c.id
  JOIN internships i ON i.id = d.internship_id JOIN semesters s ON s.id = i.semester_id JOIN users u ON u.id = i.student_id
  LEFT JOIN organizations o ON o.id = i.organization_id LEFT JOIN score_records sr ON sr.internship_id = i.id`;

export const placeOf = (c) => (c.format === 'online' ? { format: 'online', place: c.online_url ?? 'Онлайн' } : { format: 'onsite', place: c.location ?? 'Байршил тодорхойгүй' });

/** Миний оюутнууд (харагдацаар). where — нэмэлт нөхцөл. */
export async function students(db, user, where = '1 = 1', ...args) {
  const rows = await db.all(`${SELECT} WHERE m.user_id = ? AND ${where} ORDER BY c.defense_date, coalesce(d.slot_time, c.start_time), d.order_no`, user.id, ...args);
  if (!rows.length) return [];
  const cids = [...new Set(rows.map((r) => r.cid))];
  const [members, entries] = await Promise.all([
    db.all('SELECT committee_id, user_id, is_chair FROM committee_members WHERE committee_id IN (SELECT value FROM json_each(?))', JSON.stringify(cids)),
    db.all('SELECT internship_id, member_id, criterion_id, value FROM committee_scores WHERE internship_id IN (SELECT value FROM json_each(?))', JSON.stringify(rows.map((r) => r.id))),
  ]);
  return rows.map((x) => view(x, members.filter((m) => m.committee_id === x.cid), entries.filter((e) => e.internship_id === x.id), user.id));
}

/** Миний төлөв: done (баталгаажсан, 0/W) · waiting (тайлан хүлээн аваагүй) · observe (тохиролцоо аргад дарга оруулна) · entered · todo. */
function view(x, members, entries, me) {
  const consensus = x.committee_method === 'consensus';
  const need = consensus ? members.filter((m) => m.is_chair) : members;
  const has = (id) => entries.some((e) => e.member_id === id);
  const mine = entries.filter((e) => e.member_id === me).map(({ criterion_id, value }) => ({ criterion_id, value }));
  const lock = x.score_status && (x.score_status !== 'open' || ['confirmed', 'marked'].includes(x.committee_status)) ? (x.committee_status === 'marked' ? 'marked' : 'confirmed') : null;
  const must = need.some((m) => m.user_id === me);
  const state = lock ? 'done' : !SCORABLE.includes(x.status) ? 'waiting' : !must ? 'observe' : mine.length ? 'entered' : 'todo';
  return {
    id: x.id, status: x.status, semester_id: x.semester_id, student_id: x.student_id, supervisor_id: x.supervisor_id,
    student: { id: x.student_id, last_name: x.last_name, first_name: x.first_name, student_code: x.student_code, program: x.program, email: x.email },
    organization: x.oid ? { id: x.oid, name: x.oname } : null,
    committee: { id: x.cid, name: x.cname, is_chair: Boolean(x.is_chair) },
    defense: { date: x.defense_date, time: x.slot_time ?? x.start_time, order_no: x.order_no, ...placeOf(x) },
    state, lock, can_score: !lock && SCORABLE.includes(x.status) && must, consensus,
    progress: { entered: need.filter((m) => has(m.user_id)).length, required: need.length }, mine,
    required_ids: need.map((m) => m.user_id),
  };
}
/** Миний оюутан, эсвэл 404. */
export async function own(db, user, id) {
  const [s] = await students(db, user, 'i.id = ?', id);
  if (!s) throw notFound('Энэ оюутан танд хуваарилагдаагүй байна.');
  return s;
}
export const strip = ({ semester_id, student_id, supervisor_id, required_ids, ...s }) => s;
