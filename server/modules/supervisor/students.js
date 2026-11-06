// Миний оюутнууд: дэвтрийн явц, төлөвлөгөө, тайлан, оноо хэдэн шатандаа байгаа. Бусад модуль own()-оор эрхээ шалгана.
import { json, notFound } from '../../lib/http.js';
import { internships, withDetails } from '../internship-view.js';
import { totals } from './scores.js';

/** Миний (удирдагч багш) дадлага, эсвэл 404. */
export async function own(db, user, id) {
  const [i] = await withDetails(db, await internships(db, 'i.id = ? AND i.supervisor_id = ?', id, user.id));
  if (!i) throw notFound('Энэ оюутан таны жагсаалтад алга.');
  return i;
}

async function summaries(db, list) {
  const sums = await totals(db, list.map((i) => i.id));
  return list.map((i) => ({
    id: i.id, status: i.status, features: i.features, semester_id: i.semester_id, start_date: i.start_date, end_date: i.end_date, student: i.student, organization: i.organization,
    logbook: { days_done: i.days_done, planned_days: i.planned_days, hours_done: i.hours_done, missing_days: i.missing_days, max_missing_days: i.max_missing_days, alert: i.missing_days > i.max_missing_days },
    plan: i.plan_status ? { status: i.plan_status, version: i.plan_version } : null,
    report: i.report ? { status: i.report.status, deadline: i.report.deadline } : null,
    score: i.score ? { ...i.score, total: i.score.status === 'open' || i.score.mark ? null : sums.get(i.id) ?? 0 } : null,
  }));
}

const list = async ({ db, user }) => json(await summaries(db, await internships(db, 'i.supervisor_id = ?', user.id)));
const get = async ({ db, user, params }) => json((await summaries(db, [await own(db, user, params.id)]))[0]);
const semester = async ({ db }) => json(await db.one("SELECT * FROM semesters WHERE status = 'active'"));

export const routes = [
  ['GET', '/api/supervisor/semester', semester],
  ['GET', '/api/supervisor/internships', list],
  ['GET', '/api/supervisor/internships/:id', get],
];
