// Дадлага удирдагчийн дадлагажигчид: зөвхөн өөрт томилогдсон оюутнууд (own). Дэвтрийн явц (хянаагүй тоо), төлөвлөгөө, байгууллагын үнэлгээний төлөв.
import { json, notFound } from '../../lib/http.js';
import { internships } from '../internship-view.js';

export const SCORABLE = ['reporting', 'ready', 'evaluating'];
export async function own(db, user, id) {
  const [i] = await internships(db, 'i.id = ? AND i.mentor_id = ?', id, user.id);
  if (!i) throw notFound('Энэ оюутан таны дадлагажигчдын жагсаалтад алга.');
  return i;
}
const person = (p) => p && { id: p.id, last_name: p.last_name, first_name: p.first_name, student_code: p.student_code ?? null, program: p.program ?? null, email: p.email };

/** Байгууллагын үнэлгээ оруулах боломж, оруулсан оноо. */
export async function scoreInfo(db, i) {
  const [r, sum, max] = await Promise.all([
    db.one('SELECT status, org_status, org_return_reason FROM score_records WHERE internship_id = ?', i.id),
    db.value('SELECT sum(value) FROM org_scores WHERE internship_id = ?', i.id),
    db.value("SELECT sum(max_score) FROM criteria WHERE semester_id = ? AND component = 'org'", i.semester_id),
  ]);
  return { org_status: r?.org_status ?? 'none', enterable: SCORABLE.includes(i.status) && (!r || (r.status === 'open' && r.org_status !== 'confirmed')),
    return_reason: r?.org_return_reason ?? null, total: sum ?? null, max: max ?? 0 };
}

async function summary(db, i) {
  const unreviewed = await db.value('SELECT count(*) FROM log_entries WHERE internship_id = ? AND reviewed_at IS NULL', i.id);
  return {
    id: i.id, status: i.status, features: i.features, start_date: i.start_date, end_date: i.end_date, student: person(i.student), supervisor: i.supervisor ? person(i.supervisor) : null,
    logbook: { days_done: i.days_done, planned_days: i.planned_days, hours_done: i.hours_done, missing_days: i.missing_days, max_missing_days: i.max_missing_days,
      alert: i.missing_days > i.max_missing_days, unreviewed, reviewable: i.status === 'in_progress' },
    plan: i.plan_status ? { status: i.plan_status, version: i.plan_version } : null,
    score: await scoreInfo(db, i),
  };
}
async function list({ db, user }) {
  const rows = await internships(db, 'i.mentor_id = ?', user.id);
  return json(await Promise.all(rows.map((i) => summary(db, i))));
}
const get = async ({ db, user, params }) => json(await summary(db, await own(db, user, params.id)));

async function organization({ db, user }) {
  const [organization, semester] = await Promise.all([
    db.one('SELECT id, name FROM organizations WHERE id = ?', user.organization_id),
    db.one("SELECT * FROM semesters WHERE status = 'active'"),
  ]);
  return json({ organization, semester });
}

export const routes = [
  ['GET', '/api/mentor/organization', organization],
  ['GET', '/api/mentor/internships', list],
  ['GET', '/api/mentor/internships/:id', get],
];
