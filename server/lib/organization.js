// Байгууллагын мэдээлэл, логог хадгалах нэг дүрэм: админ болон байгууллагын төлөөлөгч хоёр адилхан ашиглана.
import { check, clean, email, maxLen, required } from './check.js';
import { checkUpload, saveFile } from './files.js';
import { conflict, invalid, notFound } from './http.js';
import { setClause } from './db.js';

const FIELDS = ['name', 'register_no', 'field', 'address', 'email', 'phone', 'description'];
const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPG = [0xff, 0xd8, 0xff];
const startsWith = (bytes, sig) => sig.every((b, i) => bytes[i] === b);

export async function getOrganization(db, id) {
  const o = await db.one('SELECT * FROM organizations WHERE id = ?', id);
  if (!o) throw notFound('Байгууллага олдсонгүй.');
  return o;
}

export async function saveOrganization(db, id, input) {
  const o = await getOrganization(db, id);
  const data = clean(input, FIELDS);
  check(data, { name: [required, maxLen(200)], register_no: [required, maxLen(20)], field: [maxLen(100)], address: [maxLen(300)], email: [email, maxLen(120)], phone: [maxLen(30)], description: [maxLen(3000)] });
  if (data.register_no && !/^\d{5,12}$/.test(data.register_no)) throw invalid({ register_no: 'Регистрийн дугаар 5–12 оронтой тоо байна.' });
  if (data.phone && !/^[0-9+() -]{6,30}$/.test(data.phone)) throw invalid({ phone: 'Утасны дугаар буруу байна.' });
  if (data.register_no && await db.one('SELECT 1 FROM organizations WHERE register_no = ? AND id <> ?', data.register_no, o.id)) throw invalid({ register_no: 'Энэ регистрийн дугаар бүртгэлтэй байна.' });
  const set = setClause(data, FIELDS);
  if (set.sql) await db.run(`UPDATE organizations SET ${set.sql} WHERE id = ?`, ...set.args, o.id);
  return getOrganization(db, o.id);
}

/** Хуучин логоны файлыг R2-оос устгана. files хүснэгтийн мөрийг үлдээнэ: id дахин ашиглагдвал хөтөч хуучин зургийг харуулдаг (лого `?v=<id>`-тай). */
async function dropFile(env, db, fileId) {
  if (!fileId) return;
  const f = await db.one('SELECT storage_key FROM files WHERE id = ?', fileId);
  if (f) await env.FILES.delete(f.storage_key).catch(() => {});
}

/** form — FormData: file (PNG/JPG, ≤1 МБ). Хуучин лого солигдоно. */
export async function setLogo(env, db, id, userId, form) {
  const o = await getOrganization(db, id);
  const file = checkUpload(form?.get?.('file'), { types: ['png', 'jpg', 'jpeg'], maxMb: 1 });
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!startsWith(head, PNG) && !startsWith(head, JPG)) throw invalid({ file: 'Зөвхөн PNG, JPG зураг.' });
  const saved = await saveFile(env, db, file, userId);
  await db.run('UPDATE organizations SET logo_file_id = ? WHERE id = ?', saved.id, o.id);
  await dropFile(env, db, o.logo_file_id);
  return { logo_file_id: saved.id };
}

export async function removeLogo(env, db, id) {
  const o = await getOrganization(db, id);
  await db.run('UPDATE organizations SET logo_file_id = NULL WHERE id = ?', o.id);
  await dropFile(env, db, o.logo_file_id);
}

export async function deletableOrganization(db, id) {
  const o = await getOrganization(db, id);
  if (await db.one("SELECT 1 FROM internships WHERE organization_id = ? AND status NOT IN ('completed', 'stopped', 'failed', 'deferred')", o.id)) throw conflict('Дуусаагүй дадлагатай байгууллагыг устгах боломжгүй.');
  if (await db.one('SELECT 1 FROM internships WHERE organization_id = ?', o.id)) throw conflict('Дадлагын түүхтэй байгууллагыг устгах боломжгүй.');
  return o;
}
