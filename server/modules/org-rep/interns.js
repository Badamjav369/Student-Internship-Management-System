// Дадлагажигчид: идэвхтэй улирлын байгууллагын оюутнууд; дадлага эхлэхээс өмнө дадлага удирдагч томилох (жагсаалтаас эсвэл шинэ хүнийг урина).
import { email, required, check } from '../../lib/check.js';
import { HttpError, invalid, json, notFound, body } from '../../lib/http.js';
import { invite } from '../../lib/invite.js';
import { notify } from '../notifications.js';
import { orgOf } from './postings.js';

const ASSIGNABLE = ['contracting', 'planning'];
const SELECT = `SELECT i.id, i.status, i.start_date, i.end_date, s.id AS sid, s.last_name, s.first_name, s.student_code, s.program, s.email,
    m.id AS mid, m.last_name AS m_last, m.first_name AS m_first, m.email AS m_email, m.position AS m_position
  FROM internships i JOIN semesters sem ON sem.id = i.semester_id AND sem.status = 'active' JOIN users s ON s.id = i.student_id LEFT JOIN users m ON m.id = i.mentor_id`;
const view = (i) => ({ id: i.id, status: i.status, start_date: i.start_date, end_date: i.end_date,
  student: { id: i.sid, last_name: i.last_name, first_name: i.first_name, student_code: i.student_code, program: i.program, email: i.email, position: null },
  mentor: i.mid ? { id: i.mid, last_name: i.m_last, first_name: i.m_first, email: i.m_email, position: i.m_position, student_code: null, program: null } : null,
  assignable: ASSIGNABLE.includes(i.status) });

const list = async ({ db, user }) => json((await db.all(`${SELECT} WHERE i.organization_id = ? ORDER BY s.last_name, s.first_name`, orgOf(user))).map(view));
async function own(db, user, id) {
  const i = await db.one(`${SELECT} WHERE i.id = ? AND i.organization_id = ?`, id, orgOf(user));
  if (!i) throw notFound('Дадлагажигч олдсонгүй.');
  return i;
}
const get = async ({ db, user, params }) => json(view(await own(db, user, params.id)));

/** Томилох боломжтой хүмүүс: байгууллагын дадлага удирдагчид, төлөөлөгч өөрөө. */
async function candidates({ db, user }) {
  const rows = await db.all(`SELECT DISTINCT u.id, u.last_name, u.first_name, u.email, u.position FROM users u JOIN user_roles r ON r.user_id = u.id
    WHERE u.organization_id = ? AND u.status <> 'disabled' AND (r.role = 'mentor' OR u.id = ?) ORDER BY u.last_name`, orgOf(user), user.id);
  return json(rows.map((u) => ({ ...u, student_code: null, program: null, self: u.id === user.id })));
}

/** body: { mentor_id } эсвэл { person: { last_name, first_name, email, position } } — шинэ хүнд урилга очно. */
async function assign({ db, env, user, params, request, url }) {
  const org = orgOf(user);
  const i = await own(db, user, params.id);
  if (!ASSIGNABLE.includes(i.status)) throw new HttpError(409, 'STATE_CONFLICT', 'Дадлага эхэлсэн тул дадлага удирдагчийг солих боломжгүй. Тэнхимд хандана уу.');
  const data = await body(request);
  let mentor;
  if (data.person) {
    const p = check({ ...data.person }, { last_name: [required], first_name: [required], email: [required, email] });
    const mail = p.email.trim().toLowerCase();
    if (await db.one('SELECT 1 FROM users WHERE email = ?', mail)) throw invalid({ email: 'Энэ и-мэйл бүртгэлтэй байна.' }, 'Энэ и-мэйл бүртгэлтэй байна. Жагсаалтаас сонгоно уу.');
    const id = await db.insert('INSERT INTO users (email, last_name, first_name, organization_id, position) VALUES (?, ?, ?, ?, ?)', mail, p.last_name.trim(), p.first_name.trim(), org, String(p.position ?? '').trim() || null);
    await db.run("INSERT INTO user_roles (user_id, role) VALUES (?, 'mentor')", id);
    await invite(db, env, url.origin, { id, email: mail });
    mentor = { id, status: 'invited', last_name: p.last_name.trim(), first_name: p.first_name.trim() };
  } else {
    mentor = await db.one('SELECT id, status, last_name, first_name FROM users WHERE id = ? AND organization_id = ?', data.mentor_id, org);
    if (!mentor) throw notFound('Дадлага удирдагч олдсонгүй.');
    await db.run("INSERT OR IGNORE INTO user_roles (user_id, role) VALUES (?, 'mentor')", mentor.id);
  }
  await db.run('UPDATE internships SET mentor_id = ? WHERE id = ?', mentor.id, i.id);
  await notify(db, [mentor.id], 'mentor', `${i.last_name} ${i.first_name} таны байгууллагад дадлагажигчаар томилогдлоо.`, `/mentor/students/${i.id}`);
  await notify(db, [i.sid], 'student', 'Дадлага удирдагч томилогдлоо.', '/student/home');
  return json({ invited: mentor.status === 'invited', name: `${mentor.last_name} ${mentor.first_name}` });
}

export const routes = [
  ['GET', '/api/org/interns', list],
  ['GET', '/api/org/interns/:id', get],
  ['GET', '/api/org/mentor-candidates', candidates],
  ['POST', '/api/org/interns/:id/mentor', assign],
];
