// Дадлагын нэгдсэн харагдац: оюутан, удирдагч, газар, баримтын төлөв, тайлан, хүсэлт. Админ (одоо), бусад дүр (дараа) хуваалцана.
// where — нөхцөл ('i.semester_id = ?' гэх мэт), args — утгууд. Шүүлт/хуудаслалтыг дуудагч хийнэ.
const parse = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

const SELECT = `SELECT i.*, s.holidays AS sem_holidays, s.report_to AS sem_report_to, s.max_missing_days, s.plan_enabled, s.logbook_enabled, w.version AS plan_version,
  sr.status AS score_status, sr.org_status, sr.committee_status, sr.mark,
  st.last_name AS st_last, st.first_name AS st_first, st.student_code AS st_code, st.program AS st_program, st.email AS st_email,
  sv.last_name AS sv_last, sv.first_name AS sv_first, sv.email AS sv_email, o.name AS org_name,
  w.status AS plan_status, r.status AS report_status, r.is_open AS report_open, r.deadline AS report_deadline,
  r.comment AS report_comment, r.submitted_at AS report_submitted_at
  FROM internships i JOIN semesters s ON s.id = i.semester_id JOIN users st ON st.id = i.student_id
  LEFT JOIN users sv ON sv.id = i.supervisor_id LEFT JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN work_plans w ON w.internship_id = i.id LEFT JOIN reports r ON r.internship_id = i.id
  LEFT JOIN score_records sr ON sr.internship_id = i.id`;

/** Ажлын өдрүүд (Даваа–Баасан, баярын өдрийг хасаад). */
export function workDates(from, to, holidays = []) {
  const list = [];
  if (!from || !to) return list;
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    if (d.getUTCDay() % 6 !== 0 && !holidays.includes(iso)) list.push(iso);
  }
  return list;
}
export const workingDays = (from, to, holidays = []) => workDates(from, to, holidays).length;

function shape(x) {
  const person = (p) => (x[`${p}_last`] ? { last_name: x[`${p}_last`], first_name: x[`${p}_first`], email: x[`${p}_email`], ...(p === 'st' ? { student_code: x.st_code, program: x.st_program } : {}) } : null);
  return {
    id: x.id, semester_id: x.semester_id, student_id: x.student_id, supervisor_id: x.supervisor_id, organization_id: x.organization_id, mentor_id: x.mentor_id,
    status: x.status, place_status: x.place_status, start_date: x.start_date, end_date: x.end_date,
    days_done: x.days_done, planned_days: workingDays(x.start_date, x.end_date, parse(x.sem_holidays, [])), hours_done: x.hours_done, missing_days: x.missing_days,
    lateness: { logbook: Boolean(x.late_logbook), report: Boolean(x.late_report) },
    grade: x.grade_total != null || x.grade_mark ? { total: x.grade_total, mark: x.grade_mark } : null,
    features: { plan: Boolean(x.plan_enabled), logbook: Boolean(x.logbook_enabled) },
    plan_status: x.plan_status, plan_version: x.plan_version, max_missing_days: x.max_missing_days,
    score: x.score_status ? { status: x.score_status, org_status: x.org_status, committee_status: x.committee_status, mark: x.mark } : null,
    report: x.report_status ? { status: x.report_status, open: Boolean(x.report_open), deadline: x.report_deadline ?? x.sem_report_to, comment: x.report_comment,
      submission: x.report_submitted_at ? { submitted_at: x.report_submitted_at, files: [] } : null } : null,
    request: null,
    student: { id: x.student_id, ...person('st') }, supervisor: x.supervisor_id ? { id: x.supervisor_id, ...person('sv') } : null,
    organization: x.organization_id ? { id: x.organization_id, name: x.org_name } : null,
  };
}

/** Мөрүүд (хураангуй). Тайлангийн файл, хүсэлтийг withDetails-ээр нэмнэ. */
export async function internships(db, where = '1 = 1', ...args) {
  return (await db.all(`${SELECT} WHERE ${where} ORDER BY st.last_name, st.first_name`, ...args)).map(shape);
}
/** Тайлангийн файл, газрын хүсэлтийг нэмнэ (хуудаслалтын дараа — цөөн мөрөнд). */
export async function withDetails(db, list) {
  if (!list.length) return list;
  const ids = list.map((i) => i.id);
  const idList = JSON.stringify(ids); // D1: нэг query-д 100-аас ихгүй параметр — json_each
  const [files, requests] = await Promise.all([
    db.all(`SELECT rf.internship_id, rf.requirement, rf.uploaded_at, f.id, f.name, f.size FROM report_files rf JOIN files f ON f.id = rf.file_id WHERE rf.stage = 'submitted' AND rf.internship_id IN (SELECT value FROM json_each(?))`, idList),
    db.all(`SELECT p.*, f.name AS document_name FROM placement_requests p LEFT JOIN files f ON f.id = p.document_file_id WHERE p.internship_id IN (SELECT value FROM json_each(?)) ORDER BY p.id DESC`, idList),
  ]);
  for (const i of list) {
    if (i.report?.submission) i.report.submission.files = files.filter((f) => f.internship_id === i.id).map(({ internship_id, ...f }) => f);
    i.request = requests.find((r) => r.internship_id === i.id) ?? null;
  }
  return list;
}
export async function internshipById(db, id) {
  const [i] = await withDetails(db, await internships(db, 'i.id = ?', id));
  return i ?? null;
}
