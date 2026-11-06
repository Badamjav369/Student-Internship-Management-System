// Удирдамж, зарлал: идэвхтэй улирлын бүх оюутанд харагдана; нийтлэхэд оюутнуудад мэдэгдэнэ. Өөрийн зарлалыг устгана.
import { HttpError, conflict, invalid, json, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { checkUpload, saveFile } from '../../lib/files.js';
import { notify } from '../notifications.js';

const active = (db) => db.one("SELECT id, max_file_mb FROM semesters WHERE status = 'active'");
const SELECT = `SELECT a.id, a.title, a.body, a.created_at, a.author_id, a.semester_id, u.last_name, u.first_name, f.id AS file_id, f.name AS file_name, f.size AS file_size
  FROM announcements a LEFT JOIN users u ON u.id = a.author_id LEFT JOIN files f ON f.id = a.file_id`;
const view = (a) => ({ id: a.id, title: a.title, body: a.body, created_at: a.created_at, semester_id: a.semester_id, author: { last_name: a.last_name, first_name: a.first_name },
  file: a.file_id ? { id: a.file_id, name: a.file_name, size: a.file_size } : null });

async function list({ db }) {
  const s = await active(db);
  return json(s ? (await db.all(`${SELECT} WHERE a.semester_id = ? ORDER BY a.created_at DESC, a.id DESC`, s.id)).map(view) : []);
}
/** multipart: title, body, file? */
async function publish({ db, env, request, user }) {
  const s = await active(db);
  if (!s) throw conflict('Идэвхтэй улирал алга.');
  const form = await body(request);
  const title = String(form.get('title') ?? '').trim();
  const text = String(form.get('body') ?? '').trim();
  const errors = {};
  if (!title) errors.title = 'Гарчгаа бичнэ үү.'; else if (title.length > 200) errors.title = '200 тэмдэгтээс ихгүй.';
  if (!text) errors.body = 'Агуулгаа бичнэ үү.'; else if (text.length > 10000) errors.body = '10000 тэмдэгтээс ихгүй.';
  if (Object.keys(errors).length) throw invalid(errors);
  const upload = form.get('file');
  const file = upload && typeof upload !== 'string' && upload.size
    ? await saveFile(env, db, checkUpload(upload, { types: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'], maxMb: s.max_file_mb }), user.id) : null;
  const id = await db.insert('INSERT INTO announcements (semester_id, author_id, title, body, file_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', s.id, user.id, title, text, file?.id ?? null, now());
  const students = await db.all("SELECT student_id FROM internships WHERE semester_id = ? AND status <> 'stopped'", s.id);
  await notify(db, students.map((x) => x.student_id), 'student', `Шинэ зарлал: ${title}`, '/student/guide');
  return json(view(await db.one(`${SELECT} WHERE a.id = ?`, id)), 201);
}
async function remove({ db, params, user }) {
  const a = await db.one('SELECT author_id FROM announcements WHERE id = ?', params.id);
  if (!a) return json(null);
  if (a.author_id !== user.id) throw new HttpError(403, 'FORBIDDEN', 'Зөвхөн өөрийн нийтэлсэн зарлалыг устгана.');
  await db.run('DELETE FROM announcements WHERE id = ?', params.id);
  return json(null);
}

export const routes = [
  ['GET', '/api/supervisor/announcements', list],
  ['POST', '/api/supervisor/announcements', publish],
  ['DELETE', '/api/supervisor/announcements/:id', remove],
];
