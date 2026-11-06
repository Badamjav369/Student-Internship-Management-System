// Файл татах. Эрх: байршуулсан хүн; загвар, зарлалын файл — нэвтэрсэн хэн ч; дадлагад хамаарах файл — тэр дадлагыг харах эрхтэй хүн (access.js).
import { notFound } from '../lib/http.js';
import { fileResponse } from '../lib/files.js';
import { canSeeInternship, internshipsOfFile } from './access.js';

const PUBLIC = ['SELECT 1 FROM templates WHERE file_id = ?', 'SELECT 1 FROM announcements WHERE file_id = ?'];
async function canRead(db, user, f) {
  if (['admin', 'head'].includes(user.active_role) || f.uploaded_by === user.id) return true;
  for (const sql of PUBLIC) if (await db.one(sql, f.id)) return true;
  for (const { internship_id: id } of await internshipsOfFile(db, f.id)) if (await canSeeInternship(db, user, id)) return true;
  // Байгууллагын төлөөлөгч өөрийн зарт ирсэн өргөдлийн CV-г харна (оюутан хараахан тэнд дадлагагүй ч).
  if (user.active_role === 'org_rep') return Boolean(await db.one(`SELECT 1 FROM applications a JOIN postings p ON p.id = a.posting_id
    WHERE a.cv_file_id = ? AND p.organization_id = (SELECT organization_id FROM users WHERE id = ?)`, f.id, user.id));
  return false;
}

async function download({ db, env, params, user }) {
  const f = await db.one('SELECT * FROM files WHERE id = ?', params.id);
  if (!f || !(await canRead(db, user, f))) throw notFound('Файл олдсонгүй.');
  return fileResponse(env, f);
}

/** Байгууллагын лого (/logo/<файлын id> — лого солигдох бүрт хаяг өөрчлөгдөнө): нэвтэрсэн хэн ч харна (зар, жагсаалтад гарна). Зөвхөн PNG/JPG, хөтөч өөрөө төрлийг таахгүй.
 *  Шинэчлэгдсэн логог хөтөч хуучнаар нь харуулахгүйн тулд бүрэн кэшлэхгүй: ETag-аар шалгуулж, өөрчлөгдөөгүй бол 304. */
async function logo({ db, env, params, request }) {
  const f = await db.one('SELECT f.* FROM organizations o JOIN files f ON f.id = o.logo_file_id WHERE o.id = ? AND f.id = ?', params.id, params.file);
  if (!f) throw notFound('Лого олдсонгүй.');
  const headers = { etag: `"${f.storage_key}"`, 'cache-control': 'private, no-cache' };
  if (request.headers.get('if-none-match') === headers.etag) return new Response(null, { status: 304, headers });
  const object = await env.FILES.get(f.storage_key);
  if (!object) throw notFound('Лого олдсонгүй.');
  return new Response(object.body, { headers: { ...headers, 'content-type': f.mime, 'content-disposition': 'inline', 'x-content-type-options': 'nosniff' } });
}
export const routes = [['GET', '/api/files/:id', download], ['GET', '/api/organizations/:id/logo/:file', logo]];
