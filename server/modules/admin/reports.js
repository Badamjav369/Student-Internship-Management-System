// Тайлан: тоо, нэг оюутны тайлан, хугацааны дараа оюутны өмнөөс илгээх, хугацаа хэтэрсэн гэж хаах.
import { conflict, invalid, json, notFound, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { checkUpload, saveFile } from '../../lib/files.js';
import { getOne } from './internships.js';

async function counts({ db, params }) {
  const rows = await db.all('SELECT r.status, count(*) AS n FROM reports r JOIN internships i ON i.id = r.internship_id WHERE i.semester_id = ? GROUP BY r.status', params.id);
  const out = { revision: 0, not_submitted: 0, overdue: 0, submitted: 0, accepted: 0 };
  for (const r of rows) if (r.status in out) out[r.status] = r.n;
  return json(out);
}

async function get({ db, params }) {
  const i = await getOne(db, params.id);
  if (!i.report) throw notFound('Тайлан олдсонгүй.');
  return json(i);
}

async function requirements(db, i) {
  const t = await db.one("SELECT required_files FROM templates WHERE semester_id = ? AND kind = 'report'", i.semester_id);
  const list = t?.required_files ? JSON.parse(t.required_files) : [];
  if (!list.length) throw conflict('Тайлангийн шаардлага (загвар) тохируулагдаагүй байна.');
  return list;
}

/** multipart: шаардлага бүрийн түлхүүрээр файл. Засварт буцсан, хугацаа нь дууссан тайланд. */
async function proxySubmit({ db, env, request, params, user }) {
  const i = await getOne(db, params.id);
  if (!i.report || !['revision', 'not_submitted'].includes(i.report.status)) throw conflict('Энэ тайланг оюутны өмнөөс илгээх боломжгүй.');
  const form = await body(request);
  const maxMb = await db.value('SELECT max_file_mb FROM semesters WHERE id = ?', i.semester_id);
  const list = await requirements(db, i);
  const picked = list.map((r) => checkUpload(form.get(r.key), { types: r.types, maxMb, field: r.key }));
  const at = now();
  const saved = [];
  for (const [k, file] of picked.entries()) saved.push([list[k].key, await saveFile(env, db, file, user.id)]);
  await db.batch([
    db.stmt('DELETE FROM report_files WHERE internship_id = ?', i.id),
    ...saved.map(([key, f]) => db.stmt("INSERT INTO report_files (internship_id, stage, requirement, file_id, uploaded_at) VALUES (?, 'submitted', ?, ?, ?)", i.id, key, f.id, at)),
    db.stmt("UPDATE reports SET status = 'accepted', submitted_at = ?, comment = NULL WHERE internship_id = ?", at, i.id),
    db.stmt("UPDATE internships SET status = 'ready' WHERE id = ? AND status = 'reporting'", i.id),
  ]);
  return json(null);
}

async function expire({ db, request, params, user }) {
  const i = await getOne(db, params.id);
  const { reason } = await body(request);
  if (!String(reason ?? '').trim()) throw invalid({ reason: 'Шалтгаанаа бичнэ үү.' });
  if (!i.report || !['revision', 'not_submitted'].includes(i.report.status)) throw conflict('Энэ тайланг хаах боломжгүй.');
  await db.batch([
    db.stmt("UPDATE reports SET status = 'overdue', is_open = 0 WHERE internship_id = ?", i.id),
    db.stmt("UPDATE internships SET status = 'failed', grade_total = NULL, grade_mark = '0', late_report = 1 WHERE id = ?", i.id),
    db.stmt("INSERT INTO internship_changes (internship_id, kind, reason, created_by, created_at) VALUES (?, 'expire', ?, ?, ?)", i.id, reason.trim(), user.id, now()),
  ]);
  return json(null);
}

export const routes = [
  ['GET', '/api/admin/semesters/:id/report-counts', counts],
  ['GET', '/api/admin/internships/:id/report', get],
  ['POST', '/api/admin/internships/:id/report', proxySubmit],
  ['POST', '/api/admin/internships/:id/report/expire', expire],
];
