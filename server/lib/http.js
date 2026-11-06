// HTTP туслахууд: JSON хариу, алдаа (код + Монгол мессеж + талбарын алдаа), хүсэлтийн бие.
export class HttpError extends Error {
  constructor(status, code, message, fields = null) { super(message); Object.assign(this, { status, code, fields }); }
}
export const notFound = (message = 'Олдсонгүй.') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message) => new HttpError(409, 'CONFLICT', message);
export const invalid = (fields, message = 'Мэдээллээ шалгана уу.') => new HttpError(422, 'VALIDATION_ERROR', message, fields);

export const json = (data, status = 200, headers = {}) => new Response(data === null ? null : JSON.stringify(data), {
  status: data === null ? 204 : status, headers: data === null ? headers : { 'content-type': 'application/json; charset=utf-8', ...headers },
});

export function errorResponse(error) {
  if (error instanceof HttpError) return json({ code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) }, error.status);
  if (/UNIQUE constraint failed/.test(error?.message)) return json({ code: 'CONFLICT', message: 'Ийм бүртгэл аль хэдийн байна.' }, 409);
  if (/FOREIGN KEY constraint failed/.test(error?.message)) return json({ code: 'CONFLICT', message: 'Холбоотой бүртгэл байгаа тул хийх боломжгүй.' }, 409);
  console.error(error);
  return json({ code: 'SERVER_ERROR', message: 'Серверт алдаа гарлаа. Дахин оролдоно уу.' }, 500);
}

/** JSON бие (хоосон бол {}). multipart бол FormData. */
export async function body(request) {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('multipart/form-data')) return request.formData();
  const text = await request.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'BAD_REQUEST', 'Хүсэлтийн бие буруу байна.'); }
}

/** Хуудаслалт: ?limit=&offset= (дээд хязгаартай). */
export function paging(url, max = 100) {
  const limit = Math.min(max, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  return { limit, offset };
}
