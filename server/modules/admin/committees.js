// Комисс: бүрэлдэхүүн (дарга нэг), хамгаалах өдөр, байршил/онлайн, оюутны дараалал; нийтлэхэд гишүүдэд мэдэгдэнэ.
import { check, date, maxLen, oneOf, required, time } from '../../lib/check.js';
import { conflict, invalid, json, notFound, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { notify } from '../notifications.js';

async function view(db, id) {
  const c = await db.one('SELECT * FROM committees WHERE id = ?', id);
  if (!c) throw notFound('Комисс олдсонгүй.');
  const [members, slots] = await Promise.all([
    db.all('SELECT user_id, is_chair FROM committee_members WHERE committee_id = ? ORDER BY is_chair DESC, user_id', id),
    db.all(`SELECT d.internship_id, d.order_no, d.slot_time, u.id AS sid, u.last_name, u.first_name, u.student_code, u.program, u.email
      FROM defense_slots d JOIN internships i ON i.id = d.internship_id JOIN users u ON u.id = i.student_id WHERE d.committee_id = ? ORDER BY d.order_no`, id),
  ]);
  return { ...c, members: members.map((m) => ({ user_id: m.user_id, is_chair: Boolean(m.is_chair) })),
    slots: slots.map(({ sid, last_name, first_name, student_code, program, email, ...s }) => ({ ...s, student: { id: sid, last_name, first_name, student_code, program, email } })) };
}

/** Нийтэлсэн хуваарь өөрчлөгдөх/цуцлагдахад оюутан, гишүүдэд мэдэгдэнэ. */
async function notifyPeople(db, c, text) {
  const students = await db.all('SELECT i.student_id FROM defense_slots d JOIN internships i ON i.id = d.internship_id WHERE d.committee_id = ?', c.id);
  await notify(db, students.map((s) => s.student_id), 'student', text, '/student/defense');
  await notify(db, c.members.map((m) => m.user_id), 'committee', text, '/committee/committees');
}

async function list({ db, params }) {
  const ids = await db.all('SELECT id FROM committees WHERE semester_id = ? ORDER BY name', params.id);
  return json(await Promise.all(ids.map((r) => view(db, r.id))));
}
const get = async ({ db, params }) => json(await view(db, params.id));

const members = async ({ db, params }) => json(await db.all(`SELECT u.id, u.last_name, u.first_name, u.email FROM users u
  JOIN user_roles r ON r.user_id = u.id AND r.role = 'committee' AND r.semester_id = ? WHERE u.status <> 'disabled' ORDER BY u.last_name, u.first_name`, params.id));

async function save({ db, request, params }) {
  const data = await body(request);
  check(data, { name: [required, maxLen(100)], defense_date: [date], start_time: [time], format: [required, oneOf('onsite', 'online')],
    online_url: [(v) => (v && !/^https?:\/\//i.test(v) ? 'Холбоос http:// эсвэл https://-ээр эхэлнэ.' : null)] });
  const old = params.id ? await view(db, params.id) : null;
  const semesterId = old?.semester_id ?? data.semester_id;
  const sem = await db.one('SELECT * FROM semesters WHERE id = ?', semesterId);
  if (!sem) throw invalid({ name: 'Улирал олдсонгүй.' });
  if (data.defense_date && ((sem.defense_from && data.defense_date < sem.defense_from) || (sem.defense_to && data.defense_date > sem.defense_to))) throw invalid({ defense_date: 'Хамгаалалтын хугацаанд багтаана уу.' });
  const list = Array.isArray(data.members) ? data.members : [];
  if (list.length && list.filter((m) => m.is_chair).length !== 1) throw invalid({ name: 'Комиссын даргаа сонгоно уу.' });
  const allowed = new Set((await db.all("SELECT user_id FROM user_roles WHERE role = 'committee' AND semester_id = ?", semesterId)).map((r) => r.user_id));
  if (list.some((m) => !allowed.has(Number(m.user_id)))) throw invalid({ name: 'Энэ улирлын комиссын гишүүн биш хэрэглэгч байна.' });
  const fields = [data.name.trim(), data.defense_date ?? null, data.start_time ?? null, data.format, data.format === 'onsite' ? data.location ?? null : null, data.format === 'online' ? data.online_url ?? null : null];
  let id = old?.id;
  if (old) await db.run('UPDATE committees SET name = ?, defense_date = ?, start_time = ?, format = ?, location = ?, online_url = ? WHERE id = ?', ...fields, id);
  else id = await db.insert('INSERT INTO committees (name, defense_date, start_time, format, location, online_url, semester_id) VALUES (?, ?, ?, ?, ?, ?, ?)', ...fields, semesterId);
  if (old || list.length) {
    await db.batch([db.stmt('DELETE FROM committee_members WHERE committee_id = ?', id),
      ...list.map((m) => db.stmt('INSERT INTO committee_members (committee_id, user_id, is_chair) VALUES (?, ?, ?)', id, Number(m.user_id), m.is_chair ? 1 : 0))]);
  }
  if (old?.published_at) await notifyPeople(db, await view(db, id), `${data.name.trim()}: хамгаалалтын хуваарь өөрчлөгдлөө.`);
  return json({ id }, old ? 200 : 201);
}

// Оноо (эцсийн дүн) гарсан оюутантай бол устгахгүй. Нийтэлсэн бол хуваарь цуцлагдсаныг мэдэгдэнэ.
async function remove({ db, params }) {
  const c = await view(db, params.id);
  const scored = await db.value(`SELECT count(*) FROM defense_slots d JOIN internships i ON i.id = d.internship_id
    WHERE d.committee_id = ? AND (i.grade_total IS NOT NULL OR i.grade_mark IS NOT NULL)`, c.id);
  if (scored) throw conflict(`Дүн гарсан ${scored} оюутантай комиссыг устгах боломжгүй.`);
  if (c.published_at) await notifyPeople(db, c, `«${c.name}» комиссын хуваарь цуцлагдлаа. Шинэ хуваарийг дараа мэдэгдэнэ.`);
  await db.run('DELETE FROM committees WHERE id = ?', c.id);
  return json(null);
}

/** body: [{ internship_id, order_no, slot_time }] — бүх дарааллыг солино. */
async function slots({ db, request, params }) {
  const c = await view(db, params.id);
  const list = await body(request);
  if (!Array.isArray(list)) throw invalid({ slots: 'Буруу утга.' });
  for (const s of list) {
    if (time(s.slot_time)) throw invalid({ slots: 'Цаг буруу байна.' });
    const i = await db.one('SELECT semester_id, status FROM internships WHERE id = ?', s.internship_id);
    if (!i || i.semester_id !== c.semester_id) throw invalid({ slots: 'Энэ улирлын оюутан биш.' });
    const other = await db.one('SELECT committee_id FROM defense_slots WHERE internship_id = ? AND committee_id <> ?', s.internship_id, c.id);
    if (other) throw conflict('Оюутан өөр комисст хуваарилагдсан байна.');
  }
  await db.batch([db.stmt('DELETE FROM defense_slots WHERE committee_id = ?', c.id),
    ...list.map((s, k) => db.stmt('INSERT INTO defense_slots (committee_id, internship_id, order_no, slot_time) VALUES (?, ?, ?, ?)', c.id, s.internship_id, k + 1, s.slot_time ?? null))]);
  if (c.published_at) await notifyPeople(db, await view(db, c.id), `${c.name}: хамгаалалтын хуваарь өөрчлөгдлөө.`);
  return json(null);
}

async function publish({ db, params }) {
  const c = await view(db, params.id);
  if (!c.defense_date) throw conflict('Хамгаалах өдрийг тогтооно уу.');
  if (!c.slots.length) throw conflict('Оюутнуудыг хуваарьт оруулна уу.');
  if (!c.members.length) throw conflict('Комиссын бүрэлдэхүүнийг сонгоно уу.');
  const first = !c.published_at;
  await db.run('UPDATE committees SET published_at = ? WHERE id = ?', now(), c.id);
  if (first) await notifyPeople(db, c, `${c.name}-ийн хамгаалалтын хуваарь нийтлэгдлээ.`);
  return json(null);
}

export const routes = [
  ['GET', '/api/admin/semesters/:id/committees', list],
  ['GET', '/api/admin/semesters/:id/committee-members', members],
  ['POST', '/api/admin/committees', save],
  ['GET', '/api/admin/committees/:id', get],
  ['PUT', '/api/admin/committees/:id', save],
  ['DELETE', '/api/admin/committees/:id', remove],
  ['PUT', '/api/admin/committees/:id/slots', slots],
  ['POST', '/api/admin/committees/:id/publish', publish],
];
