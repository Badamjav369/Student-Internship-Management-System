// Дадлагын дэвтэр хянах: өдөр бүрийн тэмдэглэл (төлөвлөсөн ажилтай), хянаагүй өдрүүдийг санал бичиж хянасан болгоно (оюутан дахин засахгүй).
import { invalid, json, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { notify } from '../notifications.js';
import { conflictState } from '../student/context.js';
import { workDates } from '../internship-view.js';
import { own } from './interns.js';

const parse = (v, f) => { try { return v ? JSON.parse(v) : f; } catch { return f; } };

async function get({ db, user, params }) {
  const i = await own(db, user, params.id);
  const holidays = parse(await db.value('SELECT holidays FROM semesters WHERE id = ?', i.semester_id), []);
  const [rows, files, plan] = await Promise.all([
    db.all('SELECT date, hours, work_done, saved_at, reviewed_at, mentor_comment FROM log_entries WHERE internship_id = ?', i.id),
    db.all('SELECT l.date, f.id, f.name, f.size FROM log_files l JOIN files f ON f.id = l.file_id WHERE l.internship_id = ? ORDER BY f.id', i.id),
    db.value("SELECT fields FROM work_plans WHERE internship_id = ? AND status = 'approved'", i.id),
  ]);
  const tasks = parse(plan, { tasks: [] }).tasks;
  const map = new Map(rows.map((e) => [e.date, { ...e, files: files.filter((f) => f.date === e.date).map(({ date, ...f }) => f) }]));
  return json({ reviewable: i.status === 'in_progress',
    days: workDates(i.start_date, i.end_date, holidays).map((date) => ({ date, planned_task: tasks.find((t) => t.from <= date && date <= t.to)?.task ?? null, entry: map.get(date) ?? null })) });
}

/** body: [{ date, comment? }] — хянаагүй өдрүүд. */
async function review({ db, user, params, request }) {
  const i = await own(db, user, params.id);
  if (i.status !== 'in_progress') throw conflictState('Энэ дадлагын тэмдэглэлийг одоо хянах боломжгүй.');
  const list = await body(request);
  if (!Array.isArray(list) || !list.length) throw invalid({ entries: 'Хянах өдрөө сонгоно уу.' });
  const open = new Set((await db.all('SELECT date FROM log_entries WHERE internship_id = ? AND reviewed_at IS NULL', i.id)).map((r) => r.date));
  if (list.some((x) => !open.has(x.date))) throw conflictState('Тэмдэглэл аль хэдийн хянагдсан байна. Дэлгэцийг шинэчилнэ үү.');
  const at = now();
  await db.batch(list.map((x) => db.stmt('UPDATE log_entries SET reviewed_at = ?, mentor_comment = coalesce(?, mentor_comment) WHERE internship_id = ? AND date = ?',
    at, String(x.comment ?? '').trim().slice(0, 2000) || null, i.id, x.date)));
  const dates = list.map((x) => x.date).sort();
  await notify(db, [i.student_id], 'student', `Дадлага удирдагч ${dates[0].slice(5).replace('-', '.')}–${dates.at(-1).slice(5).replace('-', '.')}-ны тэмдэглэлийг хянаж санал бичлээ.`, '/student/logbook');
  return json(null);
}

export const routes = [
  ['GET', '/api/mentor/internships/:id/logbook', get],
  ['POST', '/api/mentor/internships/:id/logbook/review', review],
];
