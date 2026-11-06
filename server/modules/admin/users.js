// Хэрэглэгч: жагсаалт, нэмэх (урилгатай), эрх, идэвхгүй болгох, устгах, оюутныг CSV/Excel-ээр бүртгэх.
import { check, clean, email, maxLen, required } from '../../lib/check.js';
import { conflict, invalid, json, notFound, body, paging } from '../../lib/http.js';
import { checkUpload, extOf } from '../../lib/files.js';
import { invite, inviteMany } from '../../lib/invite.js';
import { readCsv, readXlsx } from '../../lib/xlsx.js';

const ROLES = ['student', 'supervisor', 'mentor', 'committee', 'org_rep', 'head', 'admin'];
const FINISHED = "('completed', 'stopped', 'failed', 'deferred')";
const FIELDS = 'id, email, last_name, first_name, phone, student_code, program, organization_id, position, status, consent_at, created_at';
const norm = (s) => String(s ?? '').trim().toLowerCase();

async function withRoles(db, users) {
  if (!users.length) return [];
  const rows = await db.all('SELECT user_id, role, semester_id FROM user_roles WHERE user_id IN (SELECT value FROM json_each(?)) ORDER BY role', JSON.stringify(users.map((u) => u.id)));
  return users.map((u) => ({ ...u, roles: rows.filter((r) => r.user_id === u.id).map((r) => (r.semester_id ? { role: r.role, semester_id: r.semester_id } : { role: r.role })) }));
}
async function userView(db, id) {
  const u = await db.one(`SELECT ${FIELDS} FROM users WHERE id = ?`, id);
  if (!u) throw notFound('Хэрэглэгч олдсонгүй.');
  return (await withRoles(db, [u]))[0];
}

async function list({ db, url }) {
  const role = url.searchParams.get('role') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const q = norm(url.searchParams.get('q'));
  let rows = await db.all(`SELECT ${FIELDS} FROM users WHERE (? = '' OR status = ?) AND (? = '' OR EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = users.id AND r.role = ?))
    ORDER BY last_name, first_name`, status, status, role, role);
  // Кирилл үсгийн том/жижгийг SQLite ялгадаг тул хайлтыг энд шүүнэ.
  if (q) rows = rows.filter((u) => norm(`${u.last_name} ${u.first_name} ${u.email} ${u.student_code ?? ''}`).includes(q));
  const { limit, offset } = paging(url);
  return json({ items: await withRoles(db, rows.slice(offset, offset + limit)), total: rows.length });
}
const get = async ({ db, params }) => json(await userView(db, params.id));

async function checkRoles(db, roles) {
  if (!Array.isArray(roles) || !roles.length) throw invalid({ roles: 'Ядаж нэг эрх сонгоно уу.' });
  for (const r of roles) {
    if (!ROLES.includes(r.role)) throw invalid({ roles: 'Буруу эрх.' });
    if (r.role === 'committee' && !(await db.one('SELECT 1 FROM semesters WHERE id = ?', r.semester_id))) throw invalid({ roles: 'Комиссын улирал буруу.' });
  }
  return roles.map((r) => ({ role: r.role, semester_id: r.role === 'committee' ? Number(r.semester_id) : null }));
}
const roleStatements = (db, userId, roles) => [db.stmt('DELETE FROM user_roles WHERE user_id = ?', userId),
  ...roles.map((r) => db.stmt('INSERT INTO user_roles (user_id, role, semester_id) VALUES (?, ?, ?)', userId, r.role, r.semester_id))];

async function create({ db, env, request, url }) {
  const data = clean(await body(request), ['last_name', 'first_name', 'email', 'phone', 'student_code', 'program', 'roles']);
  check(data, { last_name: [required, maxLen(100)], first_name: [required, maxLen(100)], email: [required, email], phone: [(v) => (v && !/^\+?\d{8,12}$/.test(v) ? 'Утасны дугаар буруу байна.' : null)] });
  const roles = await checkRoles(db, data.roles);
  if (roles.some((r) => r.role === 'student') && !data.student_code) throw invalid({ student_code: 'Оюутны код бичнэ үү.' });
  data.email = norm(data.email);
  if (await db.one('SELECT 1 FROM users WHERE email = ?', data.email)) throw invalid({ email: 'Энэ и-мэйл бүртгэлтэй байна.' });
  if (data.student_code && await db.one('SELECT 1 FROM users WHERE student_code = ?', data.student_code)) throw invalid({ student_code: 'Энэ кодтой оюутан бүртгэлтэй байна.' });
  const id = await db.insert('INSERT INTO users (email, last_name, first_name, phone, student_code, program) VALUES (?, ?, ?, ?, ?, ?)',
    data.email, data.last_name, data.first_name, data.phone, data.student_code ?? null, data.program ?? null);
  await db.batch(roleStatements(db, id, roles));
  await invite(db, env, url.origin, { id, email: data.email });
  return json({ id }, 201);
}

async function setRoles({ db, request, params, user }) {
  const target = await userView(db, params.id);
  const roles = await checkRoles(db, await body(request));
  if (target.id === user.id && !roles.some((r) => r.role === 'admin')) throw conflict('Өөрийнхөө админ эрхийг хасах боломжгүй.');
  await db.batch(roleStatements(db, target.id, roles));
  return json(null);
}

async function action({ db, env, request, params, url, user }) {
  const target = await userView(db, params.id);
  const { action: kind } = await body(request);
  if (kind === 'disable') {
    if (target.id === user.id) throw conflict('Өөрийгөө идэвхгүй болгох боломжгүй.');
    await db.batch([db.stmt("UPDATE users SET status = 'disabled' WHERE id = ?", target.id), db.stmt('DELETE FROM sessions WHERE user_id = ?', target.id)]);
  } else if (kind === 'enable') {
    await db.run("UPDATE users SET status = CASE WHEN consent_at IS NULL THEN 'invited' ELSE 'active' END, failed_logins = 0, locked_until = NULL WHERE id = ?", target.id);
  } else if (kind === 'invite') {
    if (target.status !== 'invited') throw conflict('Зөвхөн урилгатай хэрэглэгчид дахин илгээнэ.');
    await invite(db, env, url.origin, target);
  } else throw invalid({ action: 'Буруу үйлдэл.' });
  return json(null);
}

async function remove({ db, params, user }) {
  const target = await userView(db, params.id);
  if (target.id === user.id) throw conflict('Өөрийгөө устгах боломжгүй.');
  if (await db.one(`SELECT 1 FROM internships WHERE student_id = ? AND status NOT IN ${FINISHED}`, target.id)) throw conflict('Дуусаагүй дадлагатай оюутныг устгах боломжгүй.');
  if (await db.one('SELECT 1 FROM committee_members WHERE user_id = ?', target.id)) throw conflict('Комиссын бүрэлдэхүүнд байгаа хэрэглэгчийг устгах боломжгүй.');
  if (await db.one('SELECT 1 FROM internships WHERE student_id = ? OR supervisor_id = ? OR mentor_id = ?', target.id, target.id, target.id)) {
    throw conflict('Дадлагын түүхтэй хэрэглэгчийг устгахгүй, идэвхгүй болгоно уу.');
  }
  await db.run('DELETE FROM users WHERE id = ?', target.id);
  return json(null);
}

// ---------- Оюутан бөөнөөр бүртгэх: багана — код, овог, нэр, и-мэйл, хөтөлбөр, утас (эхний мөр гарчиг) ----------
async function importStudents({ db, env, request, url }) {
  const form = await body(request);
  const file = checkUpload(form.get('file'), { types: ['csv', 'xlsx'], maxMb: 5 });
  const dry = form.get('dry') !== 'false';
  let rows;
  try { rows = extOf(file.name) === 'csv' ? readCsv(await file.text()) : await readXlsx(await file.arrayBuffer()); } catch { throw invalid({ file: 'Файлыг уншиж чадсангүй.' }); }
  rows = rows.slice(1).filter((r) => r.some(Boolean));
  if (rows.length > 2000) throw invalid({ file: 'Нэг удаад 2000 мөрөөс ихгүй.' });
  const known = await db.all("SELECT email, student_code FROM users");
  const emails = new Set(known.map((u) => u.email));
  const codes = new Set(known.map((u) => u.student_code).filter(Boolean));
  const errors = []; const fresh = []; let existing = 0;
  rows.forEach(([code, last, first, mail, program, phone], k) => {
    const row = k + 2;
    if (!code || !last || !first || !mail) return errors.push({ row, message: 'Заавал бөглөх талбар дутуу байна.' });
    if (email(mail)) return errors.push({ row, message: 'И-мэйл буруу байна.' });
    const m = norm(mail);
    if (emails.has(m) || codes.has(code)) { existing += 1; return undefined; }
    emails.add(m); codes.add(code);
    fresh.push({ code, last, first, email: m, program: program || null, phone: phone || null });
    return undefined;
  });
  if (!dry && fresh.length) {
    for (let k = 0; k < fresh.length; k += 50) {
      const part = fresh.slice(k, k + 50);
      await db.batch(part.map((f) => db.stmt('INSERT INTO users (email, last_name, first_name, phone, student_code, program) VALUES (?, ?, ?, ?, ?, ?)', f.email, f.last, f.first, f.phone, f.code, f.program)));
    }
    const created = await db.all('SELECT id, email FROM users WHERE email IN (SELECT value FROM json_each(?))', JSON.stringify(fresh.map((f) => f.email)));
    await db.batch(created.map((u) => db.stmt("INSERT INTO user_roles (user_id, role) VALUES (?, 'student')", u.id)));
    await inviteMany(db, env, url.origin, created);
  }
  return json({ total_rows: rows.length, created_users: fresh.length, existing_users: existing, errors });
}

export const routes = [
  ['GET', '/api/admin/users', list],
  ['POST', '/api/admin/users', create],
  ['POST', '/api/admin/users/import', importStudents],
  ['GET', '/api/admin/users/:id', get],
  ['DELETE', '/api/admin/users/:id', remove],
  ['PUT', '/api/admin/users/:id/roles', setRoles],
  ['POST', '/api/admin/users/:id/action', action],
];
