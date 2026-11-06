// Дадлага удирдагч — гуравласан гэрээ: онлайн горимд (дэлгэцэнд зурах / тоон) өөрт томилогдсон оюутны гэрээнд гарын үсэг зурна, байгууллагын тамгаа оруулна.
// Цаасан горимд дадлага удирдагч системд оролцохгүй (гэрээг цаасан дээр гарын үсэг зуруулна).
import { invalid, json, notFound, body } from '../../lib/http.js';
import { pngDataUrl } from '../../lib/esign.js';
import { contractOf, signingRoutes } from '../contracts.js';

const SELECT = `SELECT i.id, i.status, i.student_id, i.mentor_id, i.organization_id, i.start_date, i.end_date, u.last_name, u.first_name, u.student_code, u.program, u.email
  FROM internships i JOIN users u ON u.id = i.student_id JOIN contracts c ON c.internship_id = i.id`;
const ONLINE = "c.mode IN ('touch', 'digital') AND c.status IN ('filled', 'approved')";
const view = async (db, i, user) => ({ id: i.id, student: { id: i.student_id, last_name: i.last_name, first_name: i.first_name, student_code: i.student_code, program: i.program, email: i.email },
  start_date: i.start_date, end_date: i.end_date, contract: await contractOf(db, i.id, { forParty: 'mentor', userId: user.id }),
  organization: i.organization_id ? await db.one('SELECT id, name, seal FROM organizations WHERE id = ?', i.organization_id) : null });

async function mine(db, user, id) {
  const i = await db.one(`${SELECT} WHERE i.id = ? AND i.mentor_id = ? AND ${ONLINE}`, id, user.id);
  if (!i) throw notFound('Гэрээ олдсонгүй.');
  return i;
}
async function list({ db, user }) {
  const rows = await db.all(`${SELECT} WHERE i.mentor_id = ? AND ${ONLINE} ORDER BY c.status = 'filled' DESC, u.last_name, u.first_name`, user.id);
  const items = await Promise.all(rows.map((i) => view(db, i, user)));
  return json(items.map(({ organization, ...x }) => x));
}
const get = async ({ db, user, params }) => json(await view(db, await mine(db, user, params.id), user));

/** Байгууллагын тамгын зураг (PNG/JPEG, ≤300 КБ) — байгууллагад хадгалагдаж гарын үсэг бүрт ашиглагдана; null бол устгана. */
async function seal({ db, user, request }) {
  if (!user.organization_id) throw notFound('Байгууллага олдсонгүй.');
  const { image } = await body(request);
  const value = image === null ? null : pngDataUrl(image, { kb: 300, jpeg: true });
  if (image !== null && !value) throw invalid({ image: 'PNG эсвэл JPEG зураг (300 КБ хүртэл) оруулна уу.' });
  await db.run('UPDATE organizations SET seal = ? WHERE id = ?', value, user.organization_id);
  return json(null);
}

export const routes = [
  ['GET', '/api/mentor/contracts', list],
  ['GET', '/api/mentor/contracts/:id', get],
  ['PUT', '/api/mentor/seal', seal],
  ...signingRoutes('/api/mentor/contracts/:id', 'mentor', ({ db, user, params }) => mine(db, user, params.id)),
];
