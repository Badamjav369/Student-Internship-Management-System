// Улирал: хугацаа, тохиргоо, үнэлгээний шалгуур, загвар файл; идэвхжүүлэх, архивлах.
import { check, date, flag, number, oneOf, required, time } from '../../lib/check.js';
import { conflict, json, notFound, body, invalid } from '../../lib/http.js';
import { setClause } from '../../lib/db.js';
import { checkUpload, saveFile } from '../../lib/files.js';

const RANGES = ['register', 'work', 'report', 'defense'];
const DATES = RANGES.flatMap((r) => [`${r}_from`, `${r}_to`]);
const SETTINGS = [...DATES, 'holidays', 'reminder_time', 'report_remind_days', 'max_missing_days', 'max_file_mb', 'committee_method', 'plan_enabled', 'logbook_enabled'];
const FINISHED = ['completed', 'deferred', 'failed', 'stopped'];
const parse = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

/** Улирлыг шалгуур, загвартай нь (хуудсуудын хүлээж буй хэлбэр). */
export async function semesterView(db, id) {
  const s = await db.one('SELECT * FROM semesters WHERE id = ?', id);
  if (!s) throw notFound('Улирал олдсонгүй.');
  const [criteria, templates] = await Promise.all([
    db.all('SELECT id, semester_id, component, name, max_score FROM criteria WHERE semester_id = ? ORDER BY sort_order, id', id),
    db.all(`SELECT t.id, t.kind, t.file_id, f.name AS file_name, t.plan_fields, t.required_files FROM templates t LEFT JOIN files f ON f.id = t.file_id
      WHERE t.semester_id = ? ORDER BY t.id`, id),
  ]);
  return { ...s, holidays: parse(s.holidays, []), criteria,
    templates: templates.map(({ plan_fields, required_files, ...t }) => ({ ...t, ...(plan_fields ? { plan_fields: parse(plan_fields) } : {}), ...(required_files ? { required_files: parse(required_files) } : {}) })) };
}

async function list({ db }) {
  const ids = await db.all('SELECT id FROM semesters ORDER BY id DESC');
  return json(await Promise.all(ids.map((r) => semesterView(db, r.id))));
}
const get = async ({ db, params }) => json(await semesterView(db, params.id));

async function create({ db, request }) {
  const data = check(await body(request), { academic_year: [required, (v) => (/^\d{4}-\d{4}$/.test(v) && Number(v.slice(5)) === Number(v.slice(0, 4)) + 1 ? null : 'Жишээ нь 2026-2027.')], season: [required, oneOf('summer', 'winter')], plan_enabled: [flag], logbook_enabled: [flag] });
  if (await db.one('SELECT 1 FROM semesters WHERE academic_year = ? AND season = ?', data.academic_year, data.season)) throw conflict('Энэ улирал аль хэдийн үүссэн байна.');
  const id = await db.insert('INSERT INTO semesters (academic_year, season, plan_enabled, logbook_enabled) VALUES (?, ?, ?, ?)', data.academic_year, data.season, data.plan_enabled ?? true, data.logbook_enabled ?? true);
  // Шалгуурыг идэвхтэй (эсвэл сүүлд дууссан) улирлаас хуулна; дараа нь засна.
  const last = await db.value("SELECT id FROM semesters WHERE id <> ? ORDER BY status = 'active' DESC, status = 'archived' DESC, id DESC LIMIT 1", id);
  if (last) await db.run('INSERT INTO criteria (semester_id, component, name, max_score, sort_order) SELECT ?, component, name, max_score, sort_order FROM criteria WHERE semester_id = ?', id, last);
  return json({ id }, 201);
}

async function update({ db, request, params }) {
  const s = await semesterView(db, params.id);
  if (s.status === 'archived') throw conflict('Архивласан улирлыг засах боломжгүй.');
  const data = await body(request);
  const rules = { reminder_time: [time], committee_method: [oneOf('average', 'consensus')], report_remind_days: [number(0, 30)], max_missing_days: [number(0, 20)], max_file_mb: [number(1, 200)],
    plan_enabled: [flag], logbook_enabled: [flag],
    holidays: [(v) => (v !== undefined && (!Array.isArray(v) || v.some((d) => date(d) || !d)) ? 'Огноо буруу байна.' : null)] };
  let last = null;
  for (const r of RANGES) {
    const prev = last;
    rules[`${r}_from`] = [date, (v) => (v && prev && v < prev ? 'Өмнөх үе шатаас эрт эхэлж болохгүй.' : null)];
    rules[`${r}_to`] = [date, (v, d) => (v && d[`${r}_from`] && d[`${r}_from`] > v ? 'Дуусах өдөр эхлэх өдрөөс өмнө байна.' : null)];
    last = data[`${r}_from`] ?? last;
  }
  check(data, rules);
  for (const k of ['plan_enabled', 'logbook_enabled']) if (k in data && Boolean(s[k]) !== data[k] && s.status !== 'draft') throw conflict('Төлөвлөгөө, дэвтэр шаардах эсэхийг зөвхөн ноорог улиралд өөрчилнө.');
  if (s.status === 'active' && DATES.some((k) => k in data && !data[k])) throw invalid({}, 'Идэвхтэй улирлын хугацааг хоосон болгох боломжгүй.');
  const set = setClause(data, SETTINGS);
  if (set.sql) await db.run(`UPDATE semesters SET ${set.sql} WHERE id = ?`, ...set.args, params.id);
  return json(null);
}

async function status({ db, request, params }) {
  const s = await semesterView(db, params.id);
  const { action } = await body(request);
  if (action === 'activate') {
    if (s.status !== 'draft') throw conflict('Зөвхөн ноорог улирлыг идэвхжүүлнэ.');
    if (DATES.some((k) => !s[k])) throw conflict('Бүх хугацааг бөглөнө үү.');
    const total = s.criteria.reduce((a, c) => a + c.max_score, 0);
    if (Math.abs(total - 100) > 1e-9) throw conflict('Үнэлгээний шалгуурын нийлбэр 100 байх ёстой.');
    if (!s.criteria.some((c) => c.component === 'org') || !s.criteria.some((c) => c.component === 'committee')) throw conflict('Байгууллага, комиссын шалгуур тус бүр байх ёстой.');
    if (await db.one("SELECT 1 FROM semesters WHERE status = 'active'")) throw conflict('Идэвхтэй улирал байна. Эхлээд түүнийг архивлана уу.');
    await db.run("UPDATE semesters SET status = 'active' WHERE id = ?", s.id);
  } else if (action === 'archive') {
    if (s.status !== 'active') throw conflict('Зөвхөн идэвхтэй улирлыг архивлана.');
    const open = await db.value(`SELECT count(*) FROM internships WHERE semester_id = ? AND status NOT IN (${FINISHED.map(() => '?').join(',')})`, s.id, ...FINISHED);
    if (open) throw conflict('Бүх оюутны дүн гарсан байх ёстой.');
    await db.run("UPDATE semesters SET status = 'archived' WHERE id = ?", s.id);
  } else throw invalid({ action: 'Буруу үйлдэл.' });
  return json(null);
}

async function remove({ db, params }) {
  const s = await semesterView(db, params.id);
  if (s.status !== 'draft') throw conflict('Зөвхөн ноорог улирлыг устгана.');
  if (await db.one('SELECT 1 FROM internships WHERE semester_id = ?', s.id)) throw conflict('Оюутантай улирлыг устгах боломжгүй.');
  await db.run('DELETE FROM semesters WHERE id = ?', s.id);
  return json(null);
}

// ---------- Шалгуур (зөвхөн ноорог улиралд) ----------
async function draft(db, id) {
  const s = await semesterView(db, id);
  if (s.status !== 'draft') throw conflict('Шалгуурыг зөвхөн ноорог улиралд засна.');
  return s;
}
async function saveCriterion({ db, request, params }) {
  await draft(db, params.id);
  const c = check(await body(request), { component: [required, oneOf('org', 'committee')], name: [required], max_score: [required, number(0.5, 100)] });
  if (c.id) await db.run('UPDATE criteria SET name = ?, max_score = ? WHERE id = ? AND semester_id = ?', c.name.trim(), Number(c.max_score), c.id, params.id);
  else await db.insert('INSERT INTO criteria (semester_id, component, name, max_score, sort_order) VALUES (?, ?, ?, ?, (SELECT ifnull(max(sort_order), 0) + 1 FROM criteria WHERE semester_id = ?))', params.id, c.component, c.name.trim(), Number(c.max_score), params.id);
  return json(null);
}
async function deleteCriterion({ db, params }) {
  await draft(db, params.id);
  await db.run('DELETE FROM criteria WHERE id = ? AND semester_id = ?', params.cid, params.id);
  return json(null);
}

// ---------- Загвар файл (multipart: kind, file, plan_fields?, required_files?) ----------
async function addTemplate({ db, env, request, params, user }) {
  const s = await semesterView(db, params.id);
  if (s.status === 'archived') throw conflict('Архивласан улиралд загвар нэмэхгүй.');
  const form = await body(request);
  const kind = form.get('kind');
  check({ kind }, { kind: [required, oneOf('guide', 'plan', 'report', 'form')] });
  if (kind !== 'form' && s.templates.some((t) => t.kind === kind)) throw conflict('Энэ төрлийн загвар аль хэдийн байна.');
  const file = await saveFile(env, db, checkUpload(form.get('file'), { types: ['pdf', 'doc', 'docx'], maxMb: s.max_file_mb }), user.id);
  const extra = (key) => { const v = form.get(key); if (!v) return null; const list = JSON.parse(v); if (!Array.isArray(list) || !list.length) throw invalid({ [key]: 'Хоосон байж болохгүй.' }); return JSON.stringify(list); };
  await db.insert('INSERT INTO templates (semester_id, kind, file_id, plan_fields, required_files) VALUES (?, ?, ?, ?, ?)', s.id, kind, file.id,
    kind === 'plan' ? extra('plan_fields') : null, kind === 'report' ? extra('required_files') : null);
  return json(null, 201);
}
async function deleteTemplate({ db, params }) {
  await db.run('DELETE FROM templates WHERE id = ? AND semester_id = ?', params.tid, params.id);
  return json(null);
}

export const routes = [
  ['GET', '/api/admin/semesters', list, { roles: ['admin', 'head'] }],
  ['POST', '/api/admin/semesters', create],
  ['GET', '/api/admin/semesters/:id', get],
  ['PATCH', '/api/admin/semesters/:id', update],
  ['DELETE', '/api/admin/semesters/:id', remove],
  ['POST', '/api/admin/semesters/:id/status', status],
  ['POST', '/api/admin/semesters/:id/criteria', saveCriterion],
  ['DELETE', '/api/admin/semesters/:id/criteria/:cid', deleteCriterion],
  ['POST', '/api/admin/semesters/:id/templates', addTemplate],
  ['DELETE', '/api/admin/semesters/:id/templates/:tid', deleteTemplate],
];
