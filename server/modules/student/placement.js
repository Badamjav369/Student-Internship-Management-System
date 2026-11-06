// Дадлагын газар: нээлттэй зар (хайлт, шүүлт), CV-тэй өргөдөл, санал болгосон / гадаадад хийх газрын хүсэлт.
import { check, date, maxLen, oneOf, required } from '../../lib/check.js';
import { HttpError, conflict, invalid, json, notFound, body, paging } from '../../lib/http.js';
import { now, today } from '../../lib/db.js';
import { checkUpload, saveFile } from '../../lib/files.js';
import { notify, notifyRole } from '../notifications.js';
import { conflictState, parse, required as myInternship, studentName } from './context.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();
const SELECT = `SELECT p.*, o.name AS organization_name, o.logo_file_id AS organization_logo, o.field AS organization_field, o.address AS organization_address, o.description AS organization_description,
  (SELECT count(*) FROM applications a WHERE a.posting_id = p.id AND a.status = 'accepted') AS accepted_count
  FROM postings p JOIN organizations o ON o.id = p.organization_id`;
const view = (p) => ({ ...p, programs: parse(p.programs, []) });
const forProgram = (p, program) => !program || p.programs.length === 0 || p.programs.includes(program);

async function open(db) { return (await db.all(`${SELECT} WHERE p.status = 'open' ORDER BY p.created_at DESC, p.id DESC`)).map(view); }

async function list({ db, url }) {
  const q = norm(url.searchParams.get('q'));
  const field = norm(url.searchParams.get('field'));
  const program = url.searchParams.get('program') ?? '';
  const hit = (await open(db)).filter((p) => forProgram(p, program) && (!field || norm(p.field).includes(field))
    && (!q || [p.title, p.organization_name, p.requirements].some((t) => norm(t).includes(q))));
  const { limit, offset } = paging(url, 50);
  return json({ total: hit.length, items: hit.slice(offset, offset + limit) });
}
async function facets({ db, url }) {
  const program = url.searchParams.get('program') ?? '';
  const counts = new Map();
  for (const p of await open(db)) if (forProgram(p, program)) counts.set(p.field, (counts.get(p.field) ?? 0) + 1);
  return json([...counts].map(([name, count]) => ({ name, count })));
}
async function get({ db, params }) {
  const p = await db.one(`${SELECT} WHERE p.id = ?`, params.id);
  if (!p) throw notFound('Зар олдсонгүй.');
  return json(view(p));
}

// ---------- Өргөдөл ----------
async function applications({ db, user }) {
  const i = await myInternship(db, user);
  return json(await db.all(`SELECT a.id, a.posting_id, p.title AS posting_title, p.organization_id, o.logo_file_id AS organization_logo, o.name AS organization_name, a.status, a.submitted_at, a.decided_at,
      a.cover_letter AS letter, f.name AS cv_name, a.cv_file_id
    FROM applications a JOIN postings p ON p.id = a.posting_id JOIN organizations o ON o.id = p.organization_id LEFT JOIN files f ON f.id = a.cv_file_id
    WHERE a.internship_id = ? ORDER BY a.submitted_at DESC, a.id DESC`, i.id));
}
/** multipart: cv (PDF), letter. */
async function apply({ db, env, request, params, user }) {
  const i = await myInternship(db, user);
  if (!['searching', 'applied'].includes(i.status)) throw conflictState('Дадлагын газар тогтсон тул хүсэлт илгээх боломжгүй.');
  if (today() < i.register_from || today() > i.register_to) throw conflict('Дадлагын бүртгэлийн хугацаа нээлттэй биш байна.');
  const p = await db.one(`${SELECT} WHERE p.id = ? AND p.status = 'open'`, params.id);
  if (!p) throw notFound('Зар олдсонгүй эсвэл хаагдсан байна.');
  if (p.apply_deadline < today()) throw conflict('Хүсэлт авах хугацаа дууссан байна.');
  if (p.accepted_count >= p.positions) throw conflict('Энэ зарын орон тоо дүүрсэн байна.');
  if (await db.one("SELECT 1 FROM applications WHERE internship_id = ? AND posting_id = ? AND status <> 'cancelled'", i.id, p.id)) throw conflict('Энэ зарт хүсэлт илгээсэн байна.');
  const form = await body(request);
  const letter = String(form.get('letter') ?? '').trim() || null;
  if (letter && letter.length > 2000) throw invalid({ letter: '2000 тэмдэгтээс ихгүй.' });
  const cv = await saveFile(env, db, checkUpload(form.get('cv'), { types: ['pdf'], maxMb: i.max_file_mb, field: 'cv' }), user.id);
  await db.batch([
    db.stmt('INSERT INTO applications (internship_id, posting_id, cover_letter, cv_file_id, submitted_at) VALUES (?, ?, ?, ?, ?)', i.id, p.id, letter, cv.id, now()),
    db.stmt("UPDATE internships SET status = 'applied' WHERE id = ? AND status = 'searching'", i.id),
  ]);
  const reps = await db.all("SELECT u.id FROM users u JOIN user_roles r ON r.user_id = u.id AND r.role = 'org_rep' WHERE u.organization_id = ? AND u.status <> 'disabled'", p.organization_id);
  const id = await db.value('SELECT max(id) FROM applications WHERE internship_id = ?', i.id);
  await notify(db, reps.map((r) => r.id), 'org_rep', `${studentName(user)} «${p.title}» зарт хүсэлт илгээлээ.`, `/org_rep/applications/${id}`);
  return json({ id }, 201);
}
async function cancelApplication({ db, params, user }) {
  const i = await myInternship(db, user);
  const a = await db.one('SELECT * FROM applications WHERE id = ? AND internship_id = ?', params.id, i.id);
  if (!a || a.status !== 'pending') throw conflictState('Хүсэлтийг цуцлах боломжгүй.');
  await db.run("UPDATE applications SET status = 'cancelled', decided_at = ? WHERE id = ?", now(), a.id);
  if (!(await db.one("SELECT 1 FROM applications WHERE internship_id = ? AND status = 'pending'", i.id))) await db.run("UPDATE internships SET status = 'searching' WHERE id = ? AND status = 'applied'", i.id);
  return json(null);
}

// ---------- Санал болгосон / гадаадад хийх газрын хүсэлт ----------
async function requests({ db, user }) {
  const i = await myInternship(db, user);
  return json(await db.all(`SELECT p.id, p.kind, p.organization_name, p.country, p.contact, p.description, p.start_date, p.end_date, p.status, p.decision_reason, p.decided_at,
      p.created_at, p.document_file_id, f.name AS document_name FROM placement_requests p LEFT JOIN files f ON f.id = p.document_file_id WHERE p.internship_id = ? ORDER BY p.id DESC`, i.id));
}
/** multipart: kind, organization_name, country, contact, start_date, end_date, description, document? */
async function createRequest({ db, env, request, user }) {
  const i = await myInternship(db, user);
  if (!['searching', 'applied'].includes(i.status) || i.organization_id) throw conflictState('Дадлагын газар тогтсон тул хүсэлт илгээх боломжгүй.');
  if (await db.one("SELECT 1 FROM placement_requests WHERE internship_id = ? AND status = 'pending'", i.id)) throw new HttpError(409, 'CONFLICT', 'Шийдвэрлэгдээгүй хүсэлт байна.');
  const form = await body(request);
  const d = Object.fromEntries(['kind', 'organization_name', 'country', 'contact', 'start_date', 'end_date', 'description'].map((k) => [k, String(form.get(k) ?? '').trim() || null]));
  check(d, { kind: [required, oneOf('own', 'abroad')], organization_name: [required, maxLen(200)], country: [(v, x) => (x.kind === 'abroad' && !v ? 'Улсаа бичнэ үү.' : null)],
    start_date: [required, date], end_date: [required, date, (v, x) => (v < x.start_date ? 'Дуусах огноо эхлэх огнооноос хойш байна.' : null)], description: [required, maxLen(3000)], contact: [maxLen(200)] });
  const doc = form.get('document') && form.get('document').size ? await saveFile(env, db, checkUpload(form.get('document'), { types: ['pdf'], maxMb: i.max_file_mb, field: 'document' }), user.id) : null;
  const id = await db.insert(`INSERT INTO placement_requests (internship_id, kind, organization_name, country, contact, description, document_file_id, start_date, end_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, i.id, d.kind, d.organization_name, d.kind === 'abroad' ? d.country : null, d.contact, d.description, doc?.id ?? null, d.start_date, d.end_date, now());
  await notifyRole(db, 'head', `${studentName(user)} ${d.kind === 'abroad' ? 'гадаадад дадлага хийх' : 'санал болгосон газрын'} хүсэлт илгээлээ.`, `/head/requests/${i.id}`);
  return json({ id }, 201);
}
async function cancelRequest({ db, params, user }) {
  const i = await myInternship(db, user);
  const r = await db.run("UPDATE placement_requests SET status = 'cancelled' WHERE id = ? AND internship_id = ? AND status = 'pending'", params.id, i.id);
  if (!r.meta.changes) throw conflictState('Хүсэлтийг цуцлах боломжгүй.');
  return json(null);
}

export const routes = [
  ['GET', '/api/student/postings', list],
  ['GET', '/api/student/postings/facets', facets],
  ['GET', '/api/student/postings/:id', get],
  ['POST', '/api/student/postings/:id/apply', apply],
  ['GET', '/api/student/applications', applications],
  ['POST', '/api/student/applications/:id/cancel', cancelApplication],
  ['GET', '/api/student/requests', requests],
  ['POST', '/api/student/requests', createRequest],
  ['POST', '/api/student/requests/:id/cancel', cancelRequest],
];
