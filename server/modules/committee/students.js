// Оюутны материал: жагсаалт, дэлгэрэнгүй (шалгуур, батлагдсан байгууллагын оноо), төлөвлөгөө, тайлан, дэвтэр (зөвхөн унших), миний комиссууд.
import { json } from '../../lib/http.js';
import { internshipById } from '../internship-view.js';
import { own, placeOf, strip, students } from './context.js';

const parse = (v, f) => { try { return v ? JSON.parse(v) : f; } catch { return f; } };
export const criteriaOf = (db, semesterId) => db.all("SELECT id, name, max_score FROM criteria WHERE semester_id = ? AND component = 'committee' ORDER BY sort_order, id", semesterId);

const list = async ({ db, user }) => json((await students(db, user)).map(strip));

async function get({ db, user, params }) {
  const s = await own(db, user, params.id);
  const [criteria, i, r] = await Promise.all([criteriaOf(db, s.semester_id), internshipById(db, s.id),
    db.one('SELECT s.org_status, s.org_letter_file_id, f.name AS letter FROM score_records s LEFT JOIN files f ON f.id = s.org_letter_file_id WHERE s.internship_id = ?', s.id)]);
  const org = r?.org_status === 'confirmed' ? { letter: r.letter, letter_file_id: r.org_letter_file_id,
    scores: await db.all('SELECT o.criterion_id, c.name, c.max_score, o.value FROM org_scores o JOIN criteria c ON c.id = o.criterion_id WHERE o.internship_id = ? ORDER BY c.sort_order, c.id', s.id) } : null;
  return json({ ...strip(s), features: i.features, criteria, org, logbook: { days_done: i.days_done, planned_days: i.planned_days, hours_done: i.hours_done, missing_days: i.missing_days } });
}
async function plan({ db, user, params }) {
  const s = await own(db, user, params.id);
  const p = await db.one('SELECT * FROM work_plans WHERE internship_id = ?', s.id);
  if (!p) return json(null);
  const fields = parse(await db.value("SELECT plan_fields FROM templates WHERE semester_id = ? AND kind = 'plan'", s.semester_id), null)
    ?? [{ key: 'goal', label: 'Дадлагын зорилго', type: 'textarea', required: true }];
  return json({ ...p, fields: parse(p.fields, { values: {}, tasks: [] }), plan_fields: fields });
}
async function report({ db, user, params }) {
  const s = await own(db, user, params.id);
  const i = await internshipById(db, s.id);
  if (!i.report?.submission) return json(null);
  const req = await db.value("SELECT required_files FROM templates WHERE semester_id = ? AND kind = 'report'", s.semester_id);
  return json({ ...i.report, requirements: parse(req, []) });
}
async function logbook({ db, user, params }) {
  const s = await own(db, user, params.id);
  return json(await db.all('SELECT date, hours, work_done, mentor_comment, reviewed_at FROM log_entries WHERE internship_id = ? ORDER BY date DESC', s.id));
}

/** Хуваарь: комисс бүрийн гишүүд, оюутнууд (ээлжээр). */
async function committees({ db, user }) {
  const mine = await students(db, user);
  const ids = [...new Set(mine.map((s) => s.committee.id))];
  if (!ids.length) return json([]);
  const list = JSON.stringify(ids); // D1: нэг query-д 100-аас ихгүй параметр — json_each-ээр нэг параметр
  const [rows, members] = await Promise.all([
    db.all('SELECT * FROM committees WHERE id IN (SELECT value FROM json_each(?)) ORDER BY defense_date, start_time', list),
    db.all(`SELECT m.committee_id, m.is_chair, u.id, u.last_name, u.first_name, u.email FROM committee_members m JOIN users u ON u.id = m.user_id
      WHERE m.committee_id IN (SELECT value FROM json_each(?)) ORDER BY m.is_chair DESC, u.last_name, u.first_name`, list),
  ]);
  return json(rows.map((c) => ({
    id: c.id, name: c.name, defense_date: c.defense_date, start_time: c.start_time, ...placeOf(c),
    is_chair: members.some((m) => m.committee_id === c.id && m.id === user.id && m.is_chair),
    members: members.filter((m) => m.committee_id === c.id).map(({ committee_id, is_chair, ...m }) => ({ ...m, student_code: null, program: null, is_chair: Boolean(is_chair), is_me: m.id === user.id })),
    students: mine.filter((s) => s.committee.id === c.id).sort((a, b) => a.defense.order_no - b.defense.order_no).map(strip),
  })));
}
const semester = async ({ db }) => json(await db.one("SELECT * FROM semesters WHERE status = 'active'"));

export const routes = [
  ['GET', '/api/committee/semester', semester],
  ['GET', '/api/committee/committees', committees],
  ['GET', '/api/committee/students', list],
  ['GET', '/api/committee/students/:id', get],
  ['GET', '/api/committee/students/:id/plan', plan],
  ['GET', '/api/committee/students/:id/report', report],
  ['GET', '/api/committee/students/:id/logbook', logbook],
];
