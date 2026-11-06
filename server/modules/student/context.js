// Оюутны «миний дадлага»: идэвхтэй (эсвэл сүүлийн) улирлын дадлага, улирлын хугацаа. Огнооноос хамаарах төлвийг энд шилжүүлнэ
// (дадлагын хугацаа дуусвал → тайлан). Дэвтрийн тоог (бичсэн өдөр, цаг, тэмдэглэлгүй өдөр) шинэчилнэ.
import { notFound, HttpError } from '../../lib/http.js';
import { today } from '../../lib/db.js';
import { workDates } from '../internship-view.js';

export const parse = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

/** Дадлага + улирал (байхгүй бол null). */
export async function mine(db, user) {
  const i = await db.one(`SELECT i.*, s.academic_year, s.season, s.status AS semester_status, s.register_from, s.register_to, s.work_from, s.work_to, s.report_from, s.report_to,
      s.defense_from, s.defense_to, s.holidays, s.plan_enabled, s.logbook_enabled, s.max_file_mb, s.max_missing_days, s.committee_method
    FROM internships i JOIN semesters s ON s.id = i.semester_id WHERE i.student_id = ? AND s.status <> 'draft'
    ORDER BY s.status = 'active' DESC, s.id DESC LIMIT 1`, user.id);
  if (!i) return null;
  i.holidays = parse(i.holidays, []);
  await advance(db, i);
  return i;
}
export async function required(db, user) {
  const i = await mine(db, user);
  if (!i) throw notFound('Бүртгэлтэй дадлага алга.');
  return i;
}
export const conflictState = (message) => new HttpError(409, 'STATE_CONFLICT', message);
const OFF = { plan: 'Энэ улиралд ажлын төлөвлөгөө шаардлагагүй.', logbook: 'Энэ улиралд дадлагын дэвтэр шаардлагагүй.' };
/** Улирал энэ шаардлагыг (plan / logbook) тавьсан эсэх; үгүй бол 409. */
export function feature(i, name) {
  if (!i[`${name}_enabled`]) throw conflictState(OFF[name]);
}

/** Огнооноос хамаарах шилжилт: дадлагын хугацаа дуусвал тайлангийн шат нээгдэнэ. */
async function advance(db, i) {
  if (i.status === 'in_progress' && i.end_date && today() > i.end_date) {
    await db.batch([
      db.stmt("UPDATE internships SET status = 'reporting' WHERE id = ? AND status = 'in_progress'", i.id),
      db.stmt('INSERT OR IGNORE INTO reports (internship_id, deadline) VALUES (?, ?)', i.id, i.report_to),
    ]);
    i.status = 'reporting';
  }
  if (i.logbook_enabled && ['in_progress', 'reporting'].includes(i.status)) await refreshProgress(db, i);
}

/** Дадлагын ажлын өдрүүд. */
export const daysOf = (i) => workDates(i.start_date, i.end_date, i.holidays);

/** internships.days_done / hours_done / missing_days / late_logbook-ийг тэмдэглэлээс дахин тооцно. */
export async function refreshProgress(db, i) {
  const rows = await db.all('SELECT date, hours FROM log_entries WHERE internship_id = ?', i.id);
  const written = new Set(rows.map((r) => r.date));
  const missing = daysOf(i).filter((d) => d < today() && !written.has(d)).length;
  const hours = rows.reduce((a, r) => a + r.hours, 0);
  if (i.days_done !== rows.length || i.hours_done !== hours || i.missing_days !== missing) {
    await db.run('UPDATE internships SET days_done = ?, hours_done = ?, missing_days = ?, late_logbook = ? WHERE id = ?', rows.length, hours, missing, missing > i.max_missing_days ? 1 : 0, i.id);
    Object.assign(i, { days_done: rows.length, hours_done: hours, missing_days: missing });
  }
}

/** Мэдэгдэл хүлээн авах хүмүүс: удирдагч багш, дадлага удирдагч, тэнхмийн эрхлэгч. */
export const studentName = (user) => `${user.last_name} ${user.first_name}`;
