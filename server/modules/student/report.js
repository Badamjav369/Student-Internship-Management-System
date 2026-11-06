// Тайлан: шаардлагатай файл бүрийг ноорогт байршуулж, бүгд бүрдсэн үед илгээнэ. Засвар шаардвал өмнөх файлууд ноорогт үлдэнэ.
import { invalid, json, body } from '../../lib/http.js';
import { now, today } from '../../lib/db.js';
import { checkUpload, saveFile } from '../../lib/files.js';
import { notify } from '../notifications.js';
import { conflictState, parse, required, studentName } from './context.js';

const requirementsOf = async (db, i) => parse(await db.value("SELECT required_files FROM templates WHERE semester_id = ? AND kind = 'report'", i.semester_id), []);
const files = (db, i, stage) => db.all(`SELECT r.requirement, r.uploaded_at, f.id AS file_id, f.id, f.name, f.size FROM report_files r JOIN files f ON f.id = r.file_id
  WHERE r.internship_id = ? AND r.stage = ? ORDER BY r.requirement`, i.id, stage);
const editable = (r) => ['not_submitted', 'revision'].includes(r.status);
const isOpen = (r) => Boolean(r.is_open) && today() <= r.deadline;

async function view(db, i) {
  const r = await db.one('SELECT * FROM reports WHERE internship_id = ?', i.id);
  if (!r) return null;
  // Засвар шаардсан бол өмнө илгээсэн файлууд ноорогт үлдэнэ — оюутан зөвхөн солих файлаа солино.
  if (r.status === 'revision' && !(await files(db, i, 'draft')).length) {
    await db.run("INSERT INTO report_files (internship_id, stage, requirement, file_id, uploaded_at) SELECT internship_id, 'draft', requirement, file_id, uploaded_at FROM report_files WHERE internship_id = ? AND stage = 'submitted'", i.id);
  }
  const [requirements, draft, submitted] = await Promise.all([requirementsOf(db, i), files(db, i, 'draft'), files(db, i, 'submitted')]);
  const have = new Set(draft.map((f) => f.requirement));
  return {
    status: r.status, logbook_enabled: Boolean(i.logbook_enabled), requirements, deadline: r.deadline, draft: { files: editable(r) ? draft : [] },
    submission: r.submitted_at ? { submitted_at: r.submitted_at, reviewed_at: r.reviewed_at, teacher_comment: r.comment, logbook_url: i.logbook_enabled ? '/api/student/logbook/document' : null, files: submitted } : null,
    missing: requirements.filter((q) => !have.has(q.key)), open: isOpen(r), opens: i.report_from,
  };
}

const get = async ({ db, user }) => json(await view(db, await required(db, user)));

/** multipart: file — тухайн шаардлагын (:key) файл. */
async function upload({ db, env, request, params, user }) {
  const i = await required(db, user);
  const r = await db.one('SELECT * FROM reports WHERE internship_id = ?', i.id);
  if (!r || !editable(r) || !isOpen(r)) throw conflictState('Тайлан илгээх хугацаа нээлттэй биш байна.');
  const req = (await requirementsOf(db, i)).find((q) => q.key === params.key);
  if (!req) throw invalid({ file: 'Тайлангийн шаардлага олдсонгүй.' });
  const form = await body(request);
  const file = await saveFile(env, db, checkUpload(form.get('file'), { types: ['pdf'], maxMb: i.max_file_mb }), user.id);
  await db.run(`INSERT INTO report_files (internship_id, stage, requirement, file_id, uploaded_at) VALUES (?, 'draft', ?, ?, ?)
    ON CONFLICT (internship_id, stage, requirement) DO UPDATE SET file_id = excluded.file_id, uploaded_at = excluded.uploaded_at`, i.id, req.key, file.id, now());
  return json(await view(db, i));
}

async function submit({ db, user }) {
  const i = await required(db, user);
  const r = await db.one('SELECT * FROM reports WHERE internship_id = ?', i.id);
  if (!r || !editable(r) || !isOpen(r)) throw conflictState('Тайлан илгээх хугацаа нээлттэй биш байна.');
  const have = new Set((await files(db, i, 'draft')).map((f) => f.requirement));
  if ((await requirementsOf(db, i)).some((q) => !have.has(q.key))) throw invalid({ files: 'Шаардлагатай файл дутуу байна.' }, 'Шаардлагатай файл дутуу байна.');
  await db.batch([
    db.stmt("DELETE FROM report_files WHERE internship_id = ? AND stage = 'submitted'", i.id),
    db.stmt("UPDATE report_files SET stage = 'submitted' WHERE internship_id = ? AND stage = 'draft'", i.id),
    db.stmt("UPDATE reports SET status = 'submitted', submitted_at = ?, reviewed_at = NULL WHERE internship_id = ?", now(), i.id),
  ]);
  await notify(db, [i.supervisor_id], 'supervisor', `${studentName(user)} тайлангаа илгээлээ. Хянана уу.`, `/supervisor/reports/${i.id}`);
  return json(null);
}

export const routes = [
  ['GET', '/api/student/report', get],
  ['POST', '/api/student/report/files/:key', upload],
  ['POST', '/api/student/report/submit', submit],
];
