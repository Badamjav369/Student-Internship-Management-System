// Файл: R2-д хадгалж, files хүснэгтэд бүртгэнэ. Татахдаа эрхийг дуудсан модуль шалгана.
import { invalid } from './http.js';

const TYPES = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', csv: 'text/csv', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', zip: 'application/zip' };
export const extOf = (name) => String(name).split('.').pop().toLowerCase();

/** file — FormData-гийн File. types — зөвшөөрөх өргөтгөл, maxMb — хэмжээ. Буруу бол талбарын алдаа (field). */
export function checkUpload(file, { types, maxMb = 20, field = 'file' }) {
  if (!file || typeof file === 'string' || !file.size) throw invalid({ [field]: 'Файл сонгоно уу.' });
  if (!types.includes(extOf(file.name))) throw invalid({ [field]: `Зөвхөн ${types.map((t) => t.toUpperCase()).join(', ')} файл.` });
  if (file.size > maxMb * 1024 * 1024) throw invalid({ [field]: `Файлын хэмжээ ${maxMb} МБ-аас ихгүй.` });
  return file;
}

export async function saveFile(env, db, file, userId) {
  const key = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${extOf(file.name)}`;
  const mime = TYPES[extOf(file.name)] ?? 'application/octet-stream';
  await env.FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mime } });
  const id = await db.insert('INSERT INTO files (storage_key, name, mime, size, uploaded_by) VALUES (?, ?, ?, ?, ?)', key, file.name, mime, file.size, userId);
  return { id, name: file.name, size: file.size };
}

export async function fileResponse(env, row) {
  const object = await env.FILES.get(row.storage_key);
  const body = object?.body ?? (String(row.storage_key).startsWith('seed/') ? placeholder(row.name) : null);
  if (!body) return new Response('Файл олдсонгүй', { status: 404 });
  return new Response(body, { headers: { 'content-type': row.mime, 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`, 'cache-control': 'private, no-store' } });
}

/** Демо өгөгдлийн файл (storage_key 'seed/...') R2-д байхгүй үед: нэг хуудастай PDF («Demo file»), бусад төрөлд энгийн текст. */
function placeholder(name) {
  if (!name.toLowerCase().endsWith('.pdf')) return new TextEncoder().encode(`Демо файл: ${name}\n`);
  const text = 'BT /F1 24 Tf 72 720 Td (Demo file) Tj ET';
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let pdf = '%PDF-1.4\n';
  const at = objs.map((o, k) => { const pos = pdf.length; pdf += `${k + 1} 0 obj\n${o}\nendobj\n`; return pos; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${at.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
  return new TextEncoder().encode(`${pdf}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
