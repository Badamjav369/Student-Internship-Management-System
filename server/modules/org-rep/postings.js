// Байгууллагын төлөөлөгч: байгууллагын мэдээлэл; дадлагын зар нийтлэх, засах, хаах.
import { HttpError, invalid, json, notFound, body } from '../../lib/http.js';
import { now, today } from '../../lib/db.js';

const parse = (v, f) => { try { return v ? JSON.parse(v) : f; } catch { return f; } };
const counts = `(SELECT count(*) FROM applications a WHERE a.posting_id = p.id AND a.status = 'accepted') AS accepted_count,
  (SELECT count(*) FROM applications a WHERE a.posting_id = p.id AND a.status = 'pending') AS pending_count`;
const view = (p) => ({ ...p, programs: parse(p.programs, []) });
export const orgOf = (user) => {
  if (!user.organization_id) throw new HttpError(403, 'FORBIDDEN', 'Таны бүртгэлд байгууллага холбогдоогүй байна.');
  return user.organization_id;
};

async function organization({ db, user }) {
  const [organization, semester] = await Promise.all([db.one('SELECT * FROM organizations WHERE id = ?', orgOf(user)), db.one("SELECT * FROM semesters WHERE status = 'active'")]);
  return json({ organization, semester, representative: { id: user.id, last_name: user.last_name, first_name: user.first_name, email: user.email, position: user.position, phone: user.phone } });
}

async function own(db, user, id) {
  const p = await db.one(`SELECT p.*, ${counts} FROM postings p WHERE p.id = ? AND p.organization_id = ?`, id, orgOf(user));
  if (!p) throw notFound('Зар олдсонгүй.');
  return view(p);
}
const list = async ({ db, user }) => json((await db.all(`SELECT p.*, o.name AS organization_name, o.logo_file_id AS organization_logo, ${counts} FROM postings p JOIN organizations o ON o.id = p.organization_id WHERE p.organization_id = ? ORDER BY p.status = 'open' DESC, p.id DESC`, orgOf(user))).map(view));
const get = async ({ db, user, params }) => json(await own(db, user, params.id));

/** Эцсийн өдрийг зөвхөн шинээр сонгосон/өөрчилсөн үед өнгөрсөн эсэхийг шалгана. */
function clean(d, accepted = 0, previous = null) {
  const e = {};
  const data = { title: String(d.title ?? '').trim(), field: String(d.field ?? '').trim() || null, positions: Number(d.positions), requirements: String(d.requirements ?? '').trim() || null,
    programs: [...new Set((Array.isArray(d.programs) ? d.programs : []).map((x) => String(x).trim()).filter(Boolean))], start_date: d.start_date, end_date: d.end_date, apply_deadline: d.apply_deadline };
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? '');
  if (!data.title) e.title = 'Зарын гарчгаа бичнэ үү.'; else if (data.title.length > 200) e.title = '200 тэмдэгтээс ихгүй.';
  if (!Number.isInteger(data.positions) || data.positions < 1 || data.positions > 500) e.positions = 'Орон тоог 1-ээс их бүхэл тоогоор бичнэ үү.';
  else if (data.positions < accepted) e.positions = `Хүлээн авсан хүний тооноос (${accepted}) бага байж болохгүй.`;
  if (!isDate(data.start_date)) e.start_date = 'Эхлэх огноог сонгоно уу.';
  if (!isDate(data.end_date)) e.end_date = 'Дуусах огноог сонгоно уу.'; else if (isDate(data.start_date) && data.end_date < data.start_date) e.end_date = 'Дуусах огноо эхлэхээс хойш байна.';
  if (!isDate(data.apply_deadline)) e.apply_deadline = 'Хүсэлт авах эцсийн өдрийг сонгоно уу.';
  else if (data.apply_deadline !== previous?.apply_deadline && data.apply_deadline < today()) e.apply_deadline = 'Өнгөрсөн огноо байна.';
  else if (isDate(data.start_date) && data.apply_deadline > data.start_date) e.apply_deadline = 'Дадлага эхлэхээс өмнөх огноо сонгоно уу.';
  if (data.requirements && data.requirements.length > 5000) e.requirements = '5000 тэмдэгтээс ихгүй.';
  if (Object.keys(e).length) throw invalid(e, 'Тэмдэглэсэн талбарыг засна уу.');
  return data;
}
const FIELDS = ['title', 'field', 'positions', 'requirements', 'programs', 'start_date', 'end_date', 'apply_deadline'];
const values = (d) => FIELDS.map((k) => (k === 'programs' ? JSON.stringify(d.programs) : k === 'field' ? d.field ?? '' : k === 'requirements' ? d.requirements ?? '' : d[k]));

async function create({ db, user, request }) {
  const d = clean(await body(request));
  const id = await db.insert(`INSERT INTO postings (organization_id, ${FIELDS.join(', ')}, created_at) VALUES (?, ${FIELDS.map(() => '?').join(', ')}, ?)`, orgOf(user), ...values(d), now());
  return json(await own(db, user, id), 201);
}
async function update({ db, user, params, request }) {
  const p = await own(db, user, params.id);
  if (p.status !== 'open') throw new HttpError(409, 'STATE_CONFLICT', 'Хаагдсан зарыг засах боломжгүй.');
  const d = clean(await body(request), p.accepted_count, p);
  await db.run(`UPDATE postings SET ${FIELDS.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...values(d), p.id);
  return json(null);
}
async function close({ db, user, params }) {
  const p = await own(db, user, params.id);
  if (p.status !== 'open') throw new HttpError(409, 'STATE_CONFLICT', 'Зар аль хэдийн хаагдсан байна.');
  await db.run("UPDATE postings SET status = 'closed' WHERE id = ?", p.id);
  return json(null);
}

export const routes = [
  ['GET', '/api/org/organization', organization],
  ['GET', '/api/org/postings', list],
  ['POST', '/api/org/postings', create],
  ['GET', '/api/org/postings/:id', get],
  ['PUT', '/api/org/postings/:id', update],
  ['POST', '/api/org/postings/:id/close', close],
];
