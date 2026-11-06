// Дадлагын дэвтэр: ажлын өдөр бүр тэмдэглэл (цаг, гүйцэтгэсэн ажил, хавсралт). Хянагдсан өдрийг засахгүй. Хэвлэх хувилбар.
import { invalid, json, body } from '../../lib/http.js';
import { now, today } from '../../lib/db.js';
import { checkUpload, saveFile } from '../../lib/files.js';
import { printable } from '../../lib/printable.js';
import { conflictState, daysOf, feature, parse, refreshProgress, required } from './context.js';

const MAX_FILES = 5;

async function entries(db, i) {
  const [rows, files] = await Promise.all([
    db.all('SELECT date, hours, work_done, saved_at, reviewed_at, mentor_comment FROM log_entries WHERE internship_id = ?', i.id),
    db.all('SELECT l.date, f.id, f.name, f.size FROM log_files l JOIN files f ON f.id = l.file_id WHERE l.internship_id = ? ORDER BY f.id', i.id),
  ]);
  return new Map(rows.map((e) => [e.date, { ...e, files: files.filter((f) => f.date === e.date).map(({ date, ...f }) => f) }]));
}
const approvedTasks = async (db, i) => {
  const p = await db.one("SELECT fields FROM work_plans WHERE internship_id = ? AND status = 'approved'", i.id);
  return p ? parse(p.fields, { tasks: [] }).tasks : [];
};

async function get({ db, user }) {
  const i = await required(db, user);
  feature(i, 'logbook');
  const [map, tasks] = await Promise.all([entries(db, i), approvedTasks(db, i)]);
  const open = i.status === 'in_progress';
  return json({ days: daysOf(i).map((date) => ({ date, planned_task: tasks.find((t) => t.from <= date && date <= t.to)?.task ?? null, entry: map.get(date) ?? null, writable: open && date <= today() })) });
}

/** multipart: hours, work_done, remove (JSON [file id]), files (олон). */
async function save({ db, env, request, params, user }) {
  const i = await required(db, user);
  feature(i, 'logbook');
  const date = params.date;
  if (i.status !== 'in_progress') throw conflictState('Дэвтэр нээлттэй биш байна.');
  if (!daysOf(i).includes(date) || date > today()) throw invalid({ date: 'Энэ өдөр тэмдэглэл бичих боломжгүй.' });
  const old = (await entries(db, i)).get(date);
  if (old?.reviewed_at) throw conflictState('Хянагдсан тэмдэглэлийг засах боломжгүй.');
  const form = await body(request);
  const raw = String(form.get('hours') ?? '').trim();
  const work = String(form.get('work_done') ?? '').trim();
  const remove = new Set((parse(form.get('remove'), []) ?? []).map(Number));
  const uploads = form.getAll('files').filter((f) => typeof f !== 'string' && f.size);
  const errors = {};
  if (!/^\d{1,2}(\.\d)?$/.test(raw) || Number(raw) > 24) errors.hours = 'Ажилласан цагийг 0–24 хооронд, нэг бутархай оронтой бичнэ үү.';
  if (!work) errors.work_done = 'Гүйцэтгэсэн ажлаа бичнэ үү.';
  else if (work.length > 5000) errors.work_done = '5000 тэмдэгтээс ихгүй.';
  const kept = (old?.files ?? []).filter((f) => !remove.has(f.id));
  if (kept.length + uploads.length > MAX_FILES) errors.files = `Нэг өдөрт ${MAX_FILES}-аас олон файл хавсаргахгүй.`;
  if (Object.keys(errors).length) throw invalid(errors);
  uploads.forEach((f) => checkUpload(f, { types: ['pdf', 'png', 'jpg', 'jpeg'], maxMb: i.max_file_mb, field: 'files' }));
  const saved = [];
  for (const f of uploads) saved.push(await saveFile(env, db, f, user.id));
  await db.batch([
    db.stmt(`INSERT INTO log_entries (internship_id, date, hours, work_done, saved_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (internship_id, date) DO UPDATE SET hours = excluded.hours, work_done = excluded.work_done, saved_at = excluded.saved_at`, i.id, date, Number(raw), work, now()),
    ...[...remove].map((id) => db.stmt('DELETE FROM log_files WHERE internship_id = ? AND date = ? AND file_id = ?', i.id, date, id)),
    ...saved.map((f) => db.stmt('INSERT INTO log_files (internship_id, date, file_id) VALUES (?, ?, ?)', i.id, date, f.id)),
  ]);
  await refreshProgress(db, i);
  return json((await entries(db, i)).get(date));
}

/** Нэгтгэсэн дэвтэр (хэвлэх → PDF): тайлантай хамт илгээнэ. */
async function document({ db, user }) {
  const i = await required(db, user);
  feature(i, 'logbook');
  const map = await entries(db, i);
  const org = await db.value('SELECT name FROM organizations WHERE id = ?', i.organization_id);
  return printable('Дадлагын дэвтэр', [
    { rows: [['Оюутан', `${user.last_name} ${user.first_name} (${user.student_code ?? ''})`], ['Байгууллага', org], ['Хугацаа', `${i.start_date ?? ''} – ${i.end_date ?? ''}`],
      ['Бичсэн өдөр', `${map.size} / ${daysOf(i).length}`], ['Нийт цаг', String([...map.values()].reduce((a, e) => a + e.hours, 0))]] },
    { table: { head: ['Огноо', 'Цаг', 'Гүйцэтгэсэн ажил', 'Дадлага удирдагчийн санал'], rows: daysOf(i).filter((d) => map.has(d)).map((d) => [d, map.get(d).hours, map.get(d).work_done, map.get(d).mentor_comment ?? '']) } },
  ], { signatures: ['Оюутан', 'Дадлага удирдагч'] });
}

export const routes = [
  ['GET', '/api/student/logbook', get],
  ['GET', '/api/student/logbook/document', document],
  ['POST', '/api/student/logbook/:date', save],
];
