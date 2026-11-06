// Гуравласан гэрээ (оюутан): горим сонгох (цаасан / дэлгэцэнд зурах / тоон), цаасан бол гэрээг татаж скан байршуулах, онлайн бол өөрөө гарын үсэг зурах (contracts.js).
// (хуучин тайлбар) системийн загвараар үүсгэсэн гэрээг татах, гарын үсэг тамгатай скан хувийг байршуулах.
// Скан хувь (файл) оюутан байршуулсны дараа л бий болно; эцсийн баталгааг тэнхмийн эрхлэгч гаргана (head/contracts.js), тэр үед дадлага
// ажлын төлөвлөгөөний шат руу шилжинэ. Гурван талын гарын үсэг системээс гадуур. Домэйн (харагдац, загвар) — ../contracts.js.
import { json, notFound, body } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { notifyRole } from '../notifications.js';
import { checkUpload, saveFile } from '../../lib/files.js';
import { contractOf, setMode, signingRoutes } from '../contracts.js';
import { conflictState, required, studentName } from './context.js';

// Байршуулах боломжтой: анх удаа ('filled') эсвэл эрхлэгч буцаасан ('returned') үед.
const canUpload = (c) => (c.status === 'filled' || c.status === 'returned') && !c.mode?.match(/touch|digital/);

async function get({ db, user }) {
  const i = await required(db, user);
  const c = await contractOf(db, i.id, { forParty: 'student', userId: user.id });
  return json(c && { ...c, pdf_url: '/api/student/contract/document', can_upload: canUpload(c), can_choose: ['filled', 'returned', 'signing'].includes(c.status) && !c.signing?.count });
}

async function chooseMode({ db, user, request }) {
  const i = await required(db, user);
  await setMode(db, i.id, String((await body(request)).mode ?? ''));
  return json(null);
}

/** multipart: file — гарын үсэг, тамгатай скан (PDF, PNG, JPEG). */
async function uploadScan({ db, env, request, user }) {
  const i = await required(db, user);
  const c = await contractOf(db, i.id);
  if (!c) throw notFound('Гэрээ байхгүй байна.');
  if (!canUpload(c)) throw conflictState('Скан хувийг одоо байршуулах боломжгүй.');
  await db.run("UPDATE contracts SET mode = 'paper' WHERE internship_id = ? AND mode IS NULL", i.id);
  const form = await body(request);
  const file = await saveFile(env, db, checkUpload(form.get('file'), { types: ['pdf'], maxMb: i.max_file_mb }), user.id);
  await db.run("UPDATE contracts SET status = 'scanned', scan_file_id = ?, uploaded_at = ?, return_reason = NULL WHERE internship_id = ?", file.id, now(), i.id);
  await notifyRole(db, 'head', `${studentName(user)} гэрээний скан байршууллаа. Баталгаажуулна уу.`, `/head/contracts/${i.id}`);
  return json(null);
}

export const routes = [
  ['GET', '/api/student/contract', get],
  ['POST', '/api/student/contract/mode', chooseMode],
  ['POST', '/api/student/contract/scan', uploadScan],
  ...signingRoutes('/api/student/contract', 'student', ({ db, user }) => required(db, user)),
];
