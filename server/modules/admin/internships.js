// Улирлын оюутан (дадлага): жагсаалт, нэмэх/хасах, удирдагч оноох, тэнхмийн шийдвэр (газар, удирдагч, хугацаа, зогсоох) түүхтэй.
import { check, date, oneOf, required } from '../../lib/check.js';
import { conflict, invalid, json, notFound, body, paging } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { checkUpload, saveFile } from '../../lib/files.js';
import { internshipById, internships, withDetails } from '../internship-view.js';

const FINISHED = ['completed', 'deferred', 'failed', 'stopped'];
const norm = (s) => String(s ?? '').trim().toLowerCase();
const ALLOWED = {
  searching: ['direct_placement', 'change_supervisor', 'stop'], applied: ['direct_placement', 'change_supervisor', 'stop'],
  contracting: ['change_place', 'change_supervisor', 'stop'], planning: ['change_place', 'change_supervisor', 'stop'],
  in_progress: ['change_place', 'change_supervisor', 'extend', 'stop'], reporting: ['change_supervisor', 'extend', 'stop'],
  ready: ['change_supervisor'], evaluating: ['change_supervisor'],
};

export async function getOne(db, id) {
  const i = await internshipById(db, id);
  if (!i) throw notFound('Дадлага олдсонгүй.');
  return i;
}
const isSupervisor = (db, id) => db.one("SELECT 1 FROM users u JOIN user_roles r ON r.user_id = u.id AND r.role = 'supervisor' WHERE u.id = ? AND u.status <> 'disabled'", id);

/** Шүүлт: status, supervisor (id | 'none'), report (тайлангийн төлөв), q (нэр, код, и-мэйл). */
export async function filtered(db, semesterId, params) {
  const get = (k) => params.get(k) ?? '';
  const where = ['i.semester_id = ?'];
  const args = [semesterId];
  if (get('status')) { where.push('i.status = ?'); args.push(get('status')); }
  if (get('supervisor') === 'none') where.push('i.supervisor_id IS NULL');
  else if (get('supervisor')) { where.push('i.supervisor_id = ?'); args.push(Number(get('supervisor'))); }
  if (get('report')) { where.push('r.status = ?'); args.push(get('report')); }
  let list = await internships(db, where.join(' AND '), ...args);
  const q = norm(get('q'));
  if (q) list = list.filter((i) => norm(`${i.student.last_name} ${i.student.first_name} ${i.student.email} ${i.student.student_code ?? ''}`).includes(q));
  return list;
}

async function list({ db, url, params }) {
  const all = await filtered(db, params.id, url.searchParams);
  const { limit, offset } = paging(url, 200);
  return json({ items: await withDetails(db, all.slice(offset, offset + limit)), total: all.length });
}
async function get({ db, params }) {
  const i = await getOne(db, params.id);
  const changes = await db.all(`SELECT c.id, c.kind, c.reason, c.details, c.created_at, f.name AS document_name, c.document_file_id FROM internship_changes c
    LEFT JOIN files f ON f.id = c.document_file_id WHERE c.internship_id = ? ORDER BY c.id DESC`, i.id);
  return json({ ...i, changes: changes.map((c) => ({ ...c, details: JSON.parse(c.details) })) });
}

async function candidates({ db, url, params }) {
  const q = norm(url.searchParams.get('q'));
  const rows = await db.all(`SELECT u.id, u.last_name, u.first_name, u.email, u.student_code, u.program, u.status FROM users u
    JOIN user_roles r ON r.user_id = u.id AND r.role = 'student'
    WHERE u.status <> 'disabled' AND NOT EXISTS (SELECT 1 FROM internships i WHERE i.student_id = u.id AND i.semester_id = ?) ORDER BY u.last_name, u.first_name`, params.id);
  return json(q ? rows.filter((u) => norm(`${u.last_name} ${u.first_name} ${u.email} ${u.student_code ?? ''}`).includes(q)) : rows);
}

async function add({ db, request, params }) {
  const s = await db.one('SELECT status FROM semesters WHERE id = ?', params.id);
  if (!s) throw notFound('Улирал олдсонгүй.');
  if (s.status === 'archived') throw conflict('Архивласан улиралд оюутан нэмэхгүй.');
  const picks = await body(request);
  if (!Array.isArray(picks) || !picks.length) throw invalid({ students: 'Оюутан сонгоно уу.' });
  for (const p of picks) if (p.supervisor_id && !(await isSupervisor(db, p.supervisor_id))) throw invalid({ supervisor_id: 'Удирдагч багш буруу.' });
  await db.batch(picks.map((p) => db.stmt(`INSERT INTO internships (semester_id, student_id, supervisor_id)
    SELECT ?, u.id, ? FROM users u JOIN user_roles r ON r.user_id = u.id AND r.role = 'student' WHERE u.id = ?`, params.id, p.supervisor_id ?? null, p.student_id)));
  return json({ created: picks.length }, 201);
}

async function remove({ db, params }) {
  const i = await getOne(db, params.id);
  if (i.status !== 'searching' || i.organization || i.request) throw conflict('Зөвхөн газар сонгоогүй, хүсэлтгүй оюутныг хасна.');
  await db.run('DELETE FROM internships WHERE id = ?', i.id);
  return json(null);
}

async function assign({ db, request }) {
  const list = await body(request);
  if (!Array.isArray(list) || !list.length) throw invalid({ supervisor_id: 'Оюутан сонгоно уу.' });
  for (const a of list) if (!(await isSupervisor(db, a.supervisor_id))) throw invalid({ supervisor_id: 'Удирдагч багш буруу.' });
  await db.batch(list.map((a) => db.stmt(`UPDATE internships SET supervisor_id = ? WHERE id = ? AND status NOT IN ('completed', 'deferred', 'failed', 'stopped')`, a.supervisor_id, a.internship_id)));
  return json(null);
}

const supervisors = async ({ db }) => json(await db.all(`SELECT u.id, u.last_name, u.first_name, u.email FROM users u JOIN user_roles r ON r.user_id = u.id AND r.role = 'supervisor'
  WHERE u.status <> 'disabled' ORDER BY u.last_name, u.first_name`));

// ---------- Тэнхмийн шийдвэр (multipart: kind, reason, details(JSON), document?) ----------
async function change({ db, env, request, params, user }) {
  const i = await getOne(db, params.id);
  const form = await body(request);
  const kind = form.get('kind');
  const reason = String(form.get('reason') ?? '').trim();
  let d;
  try { d = JSON.parse(form.get('details') || '{}'); } catch { throw invalid({ details: 'Буруу утга.' }); }
  check({ kind, reason }, { kind: [required, oneOf('direct_placement', 'change_place', 'change_supervisor', 'extend', 'stop')], reason: [required] });
  if (!(ALLOWED[i.status] ?? []).includes(kind)) throw conflict('Энэ төлөвт энэ шийдвэрийг гаргах боломжгүй.');
  const doc = form.get('document') && form.get('document').size ? await saveFile(env, db, checkUpload(form.get('document'), { types: ['pdf', 'png', 'jpg', 'jpeg'], field: 'document' }), user.id) : null;
  const ops = [];
  if (kind === 'direct_placement' || kind === 'change_place') {
    check(d, { organization_id: [required], start_date: [required, date], end_date: [required, date, (v) => (v < d.start_date ? 'Дуусах өдөр эхлэх өдрөөс өмнө байна.' : null)] });
    if (!(await db.one('SELECT 1 FROM organizations WHERE id = ?', d.organization_id))) throw invalid({ organization_id: 'Байгууллага олдсонгүй.' });
    if (kind === 'direct_placement') {
      ops.push(db.stmt("UPDATE internships SET organization_id = ?, start_date = ?, end_date = ?, place_status = 'unconfirmed', status = 'contracting' WHERE id = ?", d.organization_id, d.start_date, d.end_date, i.id));
      ops.push(db.stmt("UPDATE placement_requests SET status = 'registered' WHERE internship_id = ? AND status IN ('pending', 'approved')", i.id));
      ops.push(db.stmt("UPDATE applications SET status = 'cancelled', decided_at = ? WHERE internship_id = ? AND status = 'pending'", now(), i.id));
      ops.push(db.stmt('INSERT OR IGNORE INTO contracts (internship_id) VALUES (?)', i.id));
    } else {
      const counted = Number(d.counted_days);
      if (!Number.isInteger(counted) || counted < 0 || counted > i.planned_days) throw invalid({ counted_days: `0–${i.planned_days} хооронд бүхэл тоо бичнэ үү.` });
      ops.push(db.stmt("UPDATE internships SET organization_id = ?, start_date = ?, end_date = ?, place_status = 'unconfirmed', days_done = min(days_done, ?) WHERE id = ?",
        d.organization_id, d.start_date, d.end_date, counted, i.id));
      // Газар солигдвол өмнөх гэрээ хүчингүй — шинэ гэрээ дахин байгуулна.
      ops.push(db.stmt("UPDATE contracts SET status = 'filled', scan_file_id = NULL, uploaded_at = NULL, approved_at = NULL, return_reason = NULL, mode = NULL, doc_hash = NULL, voided = voided + 1 WHERE internship_id = ?", i.id));
      ops.push(db.stmt('DELETE FROM contract_signatures WHERE internship_id = ?', i.id));
    }
  } else if (kind === 'change_supervisor') {
    if (!d.supervisor_id || !(await isSupervisor(db, d.supervisor_id))) throw invalid({ supervisor_id: 'Удирдагч багш сонгоно уу.' });
    ops.push(db.stmt('UPDATE internships SET supervisor_id = ? WHERE id = ?', d.supervisor_id, i.id));
  } else if (kind === 'extend') {
    check(d, { end_date: [date, (v) => (v && i.start_date && v < i.start_date ? 'Дуусах өдөр эхлэх өдрөөс өмнө байна.' : null)], report_due: [date] });
    if (!d.end_date && !d.report_due) throw invalid({ end_date: 'Ядаж нэг хугацааг өөрчилнө үү.' });
    if (d.end_date) ops.push(db.stmt('UPDATE internships SET end_date = ? WHERE id = ?', d.end_date, i.id));
    if (d.report_due) ops.push(db.stmt('UPDATE reports SET deadline = ?, is_open = 1 WHERE internship_id = ?', d.report_due, i.id));
  } else if (kind === 'stop') {
    ops.push(db.stmt("UPDATE internships SET status = 'stopped' WHERE id = ?", i.id));
    ops.push(db.stmt("UPDATE placement_requests SET status = 'cancelled' WHERE internship_id = ? AND status = 'pending'", i.id));
  }
  ops.push(db.stmt('INSERT INTO internship_changes (internship_id, kind, reason, details, document_file_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    i.id, kind, reason, JSON.stringify(d), doc?.id ?? null, user.id, now()));
  await db.batch(ops);
  return json({ internship_id: i.id });
}

export const routes = [
  ['GET', '/api/admin/semesters/:id/internships', list],
  ['POST', '/api/admin/semesters/:id/internships', add],
  ['GET', '/api/admin/semesters/:id/candidates', candidates],
  ['GET', '/api/admin/supervisors', supervisors],
  ['POST', '/api/admin/internships/supervisors', assign],
  ['GET', '/api/admin/internships/:id', get],
  ['DELETE', '/api/admin/internships/:id', remove],
  ['POST', '/api/admin/internships/:id/changes', change],
];
export { FINISHED };
