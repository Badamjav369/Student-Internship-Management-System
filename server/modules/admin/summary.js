// Нүүрний «хийх ажил», нэгтгэл (оюутан бүрийн явц), статистик.
import { json } from '../../lib/http.js';
import { filtered } from './internships.js';

export const GRADE_BANDS = [['A', 90, 100], ['B', 80, 89.99], ['C', 70, 79.99], ['D', 60, 69.99], ['F', 0, 59.99]];

async function todo({ db, params }) {
  const n = (sql, ...args) => db.value(sql, params.id, ...args);
  const [students, noSupervisor, places, noSlot, sisi] = await Promise.all([
    n('SELECT count(*) FROM internships WHERE semester_id = ?'),
    n("SELECT count(*) FROM internships WHERE semester_id = ? AND supervisor_id IS NULL AND status <> 'stopped'"),
    n("SELECT count(*) FROM internships i JOIN placement_requests p ON p.internship_id = i.id WHERE i.semester_id = ? AND p.status = 'approved' AND i.status IN ('searching', 'applied')"),
    n("SELECT count(*) FROM internships i WHERE i.semester_id = ? AND i.status IN ('reporting', 'ready') AND NOT EXISTS (SELECT 1 FROM defense_slots d WHERE d.internship_id = i.id)"),
    n("SELECT count(*) FROM internships WHERE semester_id = ? AND status = 'evaluating'"),
  ]);
  return json({ students, no_supervisor: noSupervisor, places_to_register: places, no_defense_slot: noSlot, sisi_pending: sisi });
}

async function summary({ db, url, params }) {
  const list = await filtered(db, params.id, url.searchParams);
  return json({ total: list.length, items: list.map((i) => ({ ...i, progress: { days_done: i.days_done, planned_days: i.planned_days, hours_done: i.hours_done, missing_days: i.missing_days } })) });
}

async function stats({ db, params }) {
  const list = await filtered(db, params.id, new URLSearchParams());
  const count = (key) => { const m = new Map(); for (const i of list) { const k = key(i); m.set(k, (m.get(k) ?? 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); };
  const totals = list.map((i) => i.grade?.total).filter((t) => typeof t === 'number');
  return json({
    students: list.length, stopped: list.filter((i) => i.status === 'stopped').length,
    by_status: count((i) => i.status), by_organization: count((i) => i.organization?.name ?? null), by_program: count((i) => i.student?.program ?? null),
    lateness: { logbook: list.filter((i) => i.lateness.logbook).length, report: list.filter((i) => i.lateness.report).length },
    grades: { graded: totals.length, deferred: list.filter((i) => i.grade?.mark === 'W').length, failed: list.filter((i) => i.grade?.mark === '0').length,
      average: totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : null,
      distribution: GRADE_BANDS.map(([grade, from, to]) => ({ grade, from, to, count: totals.filter((t) => t >= from && t <= to).length })) },
  });
}

export const routes = [
  ['GET', '/api/admin/semesters/:id/todo', todo],
  ['GET', '/api/admin/semesters/:id/summary', summary, { roles: ['admin', 'head'] }],
  ['GET', '/api/admin/semesters/:id/stats', stats, { roles: ['admin', 'head'] }],
];
