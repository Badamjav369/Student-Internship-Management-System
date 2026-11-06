// Гуравласан гэрээний «домэйн»: харагдац (contractOf), агуулга ба хэш, гарын үсгийн логик (sign), эцсийн баталгаа (approveContract).
// Гурван горим (contracts.mode): paper — системээс татаж, цаасан дээр гарын үсэг зурж скан байршуулна (head/contracts.js баталгаажуулна);
// touch — талууд системд дэлгэцэнд зурж гарын үсэг зурна; digital — и-мэйл кодоор баталгаажуулсан цахим гарын үсэг. touch/digital-д
// оюутан, дадлага удирдагч (ямар ч дарааллаар), хамгийн сүүлд тэнхмийн эрхлэгч гарын үсэг зурмагц гэрээ автоматаар баталгаажна.
import { HttpError, invalid, json, notFound, body } from '../lib/http.js';
import { now } from '../lib/db.js';
import { code6, pngDataUrl, proofOf, sha256 } from '../lib/esign.js';
import { sendMail } from '../lib/mail.js';
import { printable } from '../lib/printable.js';
import { rateLimit } from '../lib/ratelimit.js';
import { notify, notifyRole } from './notifications.js';

export const ONLINE = ['touch', 'digital'];
export const PARTY_LABELS = { student: 'Оюутан', mentor: 'Дадлага удирдагч', head: 'Тэнхмийн эрхлэгч' };
const conflict = (message) => new HttpError(409, 'STATE_CONFLICT', message);
const fullName = (u) => (u ? `${u.last_name} ${u.first_name}` : '');

/** Гэрээ (байхгүй бол null). status: онлайн горимд гарын үсэг цуглуулж байвал 'signing'. */
export async function contractOf(db, internshipId, { forParty = null, userId = null } = {}) {
  const c = await db.one('SELECT c.*, f.name AS scan_name FROM contracts c LEFT JOIN files f ON f.id = c.scan_file_id WHERE c.internship_id = ?', internshipId);
  if (!c) return null;
  const online = ONLINE.includes(c.mode);
  const out = { internship_id: c.internship_id, mode: c.mode, status: online && c.status === 'filled' ? 'signing' : c.status, pdf_name: 'Гуравласан гэрээ', pdf_url: null,
    scan_name: c.scan_file_id ? c.scan_name : null, scan_file_id: c.scan_file_id, uploaded_at: c.uploaded_at, approved_at: c.approved_at, return_reason: c.return_reason, voided: c.voided };
  if (online) out.signing = await signingState(db, c, forParty, userId);
  return out;
}

/** Гурван талын гарын үсгийн төлөв: хэн зурсан, одоо хэн зурах боломжтой. */
async function signingState(db, c, forParty, userId) {
  const i = await db.one('SELECT student_id, mentor_id FROM internships WHERE id = ?', c.internship_id);
  const sigs = await db.all('SELECT s.party, s.user_id, s.method, s.signed_at, u.last_name, u.first_name FROM contract_signatures s JOIN users u ON u.id = s.user_id WHERE s.internship_id = ?', c.internship_id);
  const by = Object.fromEntries(sigs.map((s) => [s.party, s]));
  const who = { student: i.student_id, mentor: i.mentor_id, head: null };
  const users = await db.all('SELECT id, last_name, first_name FROM users WHERE id IN (?, ?)', who.student, who.mentor ?? 0);
  const named = (id) => fullName(users.find((u) => u.id === id));
  const parties = ['student', 'mentor', 'head'].map((party) => {
    const s = by[party];
    return { party, label: PARTY_LABELS[party], name: s ? fullName(s) : named(who[party]) || null, signed: Boolean(s), signed_at: s?.signed_at ?? null, method: s?.method ?? null,
      waiting: party === 'head' && !s && !(by.student && by.mentor), missing: party === 'mentor' && !i.mentor_id };
  });
  const me = parties.find((p) => p.party === forParty);
  return { method: c.mode, parties, count: sigs.length, can_sign: Boolean(me && !me.signed && !me.waiting && !me.missing && (forParty !== 'student' || userId === i.student_id)),
    hash_ok: !c.doc_hash || c.doc_hash === (await contractHash(db, c.internship_id)) };
}

/** Гэрээний агуулга (хэсгүүд) — харуулах болон SHA-256 хийх. Огноо, гарын үсэг ороогүй тул тогтвортой. */
async function contractSections(db, internshipId) {
  const i = await db.one('SELECT i.*, u.last_name, u.first_name, u.student_code, u.program FROM internships i JOIN users u ON u.id = i.student_id WHERE i.id = ?', internshipId);
  if (!(await db.one('SELECT 1 FROM contracts WHERE internship_id = ?', i.id))) throw notFound('Гэрээ байхгүй байна.');
  const student = i;
  const [org, sup, mentor] = await Promise.all([
    db.one('SELECT * FROM organizations WHERE id = ?', i.organization_id),
    db.one('SELECT last_name, first_name, email, phone FROM users WHERE id = ?', i.supervisor_id),
    db.one('SELECT last_name, first_name, position, email, phone FROM users WHERE id = ?', i.mentor_id),
  ]);
  const name = (u) => (u ? `${u.last_name} ${u.first_name}` : '');
  return [
    { paragraphs: ['Их сургууль (цаашид «Сургууль» гэх), дадлагын байгууллага (цаашид «Байгууллага» гэх), оюутан (цаашид «Оюутан» гэх) нар оюутны дадлагын журам, тухайн улирлын дадлагын удирдамжийг үндэслэн энэхүү гэрээг байгуулав.'] },
    { title: 'Талууд', rows: [['Оюутан', `${name(student)} (${[student.student_code, student.program].filter(Boolean).join(', ')})`], ['Байгууллага', org?.name], ['Байгууллагын хаяг', [org?.address, org?.phone, org?.email].filter(Boolean).join(', ')],
      ['Удирдагч багш', name(sup)], ['Дадлага удирдагч', mentor ? `${name(mentor)}${mentor.position ? `, ${mentor.position}` : ''}` : ''], ['Дадлагын хугацаа', `${i.start_date ?? ''} – ${i.end_date ?? ''}`]] },
    { title: '1. Ерөнхий', paragraphs: ['Энэхүү гэрээгээр Оюутан дээрх хугацаанд Байгууллагад дадлага хийхтэй холбогдон талуудын эрх, үүргийг тодорхойлно.',
      'Дадлагын ажлын төлөвлөгөө, өдөр тутмын тэмдэглэл, тайлан, үнэлгээг Сургуулийн дадлагын цахим системээр хөтөлнө.'] },
    { title: '2. Сургуулийн үүрэг', paragraphs: ['Оюутанд удирдагч багш томилж, дадлагын явцыг хянан зөвлөгөө өгөх.', 'Дадлагын удирдамж, ажлын төлөвлөгөө, тайлангийн загварыг Оюутан, Байгууллагад хүргэх.',
      'Дадлагын тайлан, хамгаалалтыг зохион байгуулж, дүнг журмын дагуу гаргах.'] },
    { title: '3. Байгууллагын үүрэг', paragraphs: ['Оюутанд дадлагын ажлын байр, шаардлагатай нөхцөлийг бүрдүүлж, дадлага удирдагч томилох.', 'Оюутны ажлын төлөвлөгөөг хянаж батлах, өдөр тутмын тэмдэглэлийг долоо хоног бүр хянах.',
      'Оюутанд хөдөлмөрийн аюулгүй байдал, дотоод журмын зааварчилгаа өгөх.', 'Дадлагын төгсгөлд Оюутны гүйцэтгэлийг үнэлж, тодорхойлолт гаргах.'] },
    { title: '4. Оюутны үүрэг', paragraphs: ['Ажлын төлөвлөгөөгөө дадлагын эхэнд гаргаж батлуулах.', 'Байгууллагын дотоод журам, хөдөлмөрийн аюулгүй байдлын шаардлагыг мөрдөх.',
      'Өдөр бүр хийсэн ажлаа цахим дадлагын дэвтэрт тэмдэглэх.', 'Дадлагын тайлангаа хугацаанд нь илгээж, хамгаалах.', 'Байгууллагын нууцад хамаарах мэдээллийг задруулахгүй байх.'] },
    { title: '5. Бусад', paragraphs: ['Гэрээ талууд гарын үсэг зурж, Сургууль баталгаажуулснаар хүчин төгөлдөр болж, дадлагын дүн гарснаар дуусгавар болно.',
      'Гэрээг гурван хувь үйлдэх бөгөөд тал бүр нэг хувийг хадгална. Гарын үсэг, тамгатай хувийн скан хувийг Оюутан системд байршуулна.'] },
  ];
}

export async function contractHash(db, internshipId) {
  return sha256(JSON.stringify(await contractSections(db, internshipId)));
}

/** Гэрээний HTML. Гарын үсэг зурсан бол зураг/тэмдэглэгээ, тамга, баталгаажуулах мөрүүдтэй. */
export async function contractDocument(db, internshipId) {
  const sections = await contractSections(db, internshipId);
  const rows = await db.all('SELECT s.*, u.last_name, u.first_name FROM contract_signatures s JOIN users u ON u.id = s.user_id WHERE s.internship_id = ?', internshipId);
  const by = Object.fromEntries(rows.map((r) => [r.party, r]));
  const seal = by.mentor ? await db.value('SELECT o.seal FROM internships i JOIN organizations o ON o.id = i.organization_id WHERE i.id = ?', internshipId) : null;
  const when = (iso) => new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Ulaanbaatar' }).slice(0, 16);
  const signatures = ['student', 'mentor', 'head'].map((party) => {
    const s = by[party];
    const label = party === 'mentor' ? 'Дадлага удирдагч (тамга)' : PARTY_LABELS[party];
    if (!s) return label;
    return { label, image: s.method === 'touch' ? s.image : null, mark: s.method === 'digital' ? 'Цахимаар гарын үсэг зурсан' : null, seal: party === 'mentor' ? seal : null,
      lines: [fullName(s), `${when(s.signed_at)} · ${s.method === 'touch' ? 'дэлгэцэнд зурсан' : 'цахим'}`] };
  });
  const footer = rows.length ? [`Баримтын SHA-256: ${await sha256(JSON.stringify(sections))}`, ...rows.map((r) => `${PARTY_LABELS[r.party]}: ${r.proof}`)] : [];
  return printable('Оюутны дадлагын гуравласан гэрээ', sections, { signatures, footer });
}

/** Гарын үсгийн бүрэн бүтэн байдал: агуулгын хэш + тал бүрийн HMAC. */
export async function verifyContract(db, env, internshipId) {
  const hash = await contractHash(db, internshipId);
  const rows = await db.all('SELECT * FROM contract_signatures WHERE internship_id = ?', internshipId);
  const results = [];
  for (const r of rows) results.push({ party: r.party, label: PARTY_LABELS[r.party], signed_at: r.signed_at, content_ok: r.doc_hash === hash, proof_ok: (await proofOf(env, r)) === r.proof });
  return { hash, valid: results.length > 0 && results.every((r) => r.content_ok && r.proof_ok), signatures: results };
}

/** Горим сонгох (оюутан): гарын үсэг зураагүй, скан байршуулаагүй үед. */
export async function setMode(db, internshipId, mode) {
  const c = await db.one('SELECT status FROM contracts WHERE internship_id = ?', internshipId);
  if (!c) throw notFound('Гэрээ байхгүй байна.');
  if (!['paper', ...ONLINE].includes(mode)) throw invalid({ mode: 'Горим буруу байна.' });
  if (!['filled', 'returned'].includes(c.status)) throw conflict('Одоо горим солих боломжгүй.');
  if (await db.value('SELECT count(*) FROM contract_signatures WHERE internship_id = ?', internshipId)) throw conflict('Гарын үсэг зурагдсан тул горим солих боломжгүй.');
  await db.run("UPDATE contracts SET mode = ?, doc_hash = NULL, status = 'filled', return_reason = CASE WHEN ? = 'paper' THEN return_reason ELSE NULL END WHERE internship_id = ?", mode, mode, internshipId);
}

/** Гэрээг эцэслэн баталгаажуулах: гэрээ approved, дадлагын газар confirmed, төлөвлөгөөний (эсвэл шууд дадлагын) шат руу. */
export async function approveContract(db, internshipId) {
  const i = await db.one('SELECT i.student_id, (SELECT plan_enabled FROM semesters s WHERE s.id = i.semester_id) AS plan_enabled FROM internships i WHERE i.id = ?', internshipId);
  await db.batch([
    db.stmt("UPDATE contracts SET status = 'approved', approved_at = ? WHERE internship_id = ?", now(), internshipId),
    db.stmt("UPDATE internships SET place_status = 'confirmed', status = CASE WHEN status = 'contracting' THEN (SELECT CASE WHEN plan_enabled = 1 THEN 'planning' ELSE 'in_progress' END FROM semesters WHERE id = internships.semester_id) ELSE status END WHERE id = ?", internshipId),
  ]);
  await notify(db, [i.student_id], 'student', 'Гэрээ баталгаажлаа.' + (i.plan_enabled ? ' Ажлын төлөвлөгөөгөө илгээнэ үү.' : ''), i.plan_enabled ? '/student/plan' : '/student/home');
}

/** Гарын үсгүүдийг цуцлах (эрхлэгч буцаах): горим сонголтыг дахин нээнэ. */
export const resetSigning = (db, internshipId, reason) => db.batch([
  db.stmt('DELETE FROM contract_signatures WHERE internship_id = ?', internshipId),
  db.stmt("UPDATE contracts SET status = 'returned', mode = NULL, doc_hash = NULL, return_reason = ? WHERE internship_id = ?", reason, internshipId),
]);

async function sendCode({ db, env, user }, internshipId) {
  await rateLimit(db, env, null, { name: 'sign-code', key: `${user.id}`, max: 5, windowSec: 600 });
  const code = code6();
  await db.run('INSERT INTO sign_codes (user_id, internship_id, code_hash, expires_at, attempts) VALUES (?, ?, ?, ?, 0) ON CONFLICT(user_id, internship_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0',
    user.id, internshipId, await sha256(`${code}|${user.id}|${internshipId}`), new Date(Date.now() + 10 * 60_000).toISOString());
  await sendMail(env, { to: user.email, subject: 'Гэрээнд гарын үсэг зурах код', text: `Таны гэрээнд гарын үсэг зурах нэг удаагийн код: ${code}\n\nКод 10 минут хүчинтэй. Та энэ үйлдлийг хийгээгүй бол үл тоомсорлоно уу.` });
}
async function checkCode(db, user, internshipId, code) {
  const row = await db.one('SELECT * FROM sign_codes WHERE user_id = ? AND internship_id = ?', user.id, internshipId);
  const bad = invalid({ code: 'Код буруу эсвэл хугацаа дууссан байна.' });
  if (!row || row.expires_at < new Date().toISOString() || row.attempts >= 5) throw bad;
  await db.run('UPDATE sign_codes SET attempts = attempts + 1 WHERE user_id = ? AND internship_id = ?', user.id, internshipId);
  if (row.code_hash !== (await sha256(`${String(code ?? '').trim()}|${user.id}|${internshipId}`))) throw bad;
  await db.run('DELETE FROM sign_codes WHERE user_id = ? AND internship_id = ?', user.id, internshipId);
}

/** Тал өөрийн гарын үсгийг зурна. i — дадлага (id, student_id, mentor_id, organization_id). */
async function sign(ctx, party, i) {
  const { db, env, request, user } = ctx;
  const c = await db.one('SELECT * FROM contracts WHERE internship_id = ?', i.id);
  if (!c) throw notFound('Гэрээ байхгүй байна.');
  if (!ONLINE.includes(c.mode) || c.status !== 'filled') throw conflict('Энэ гэрээнд одоо гарын үсэг зурах боломжгүй.');
  if (!i.mentor_id) throw conflict('Дадлага удирдагч томилогдоогүй байна.');
  if (await db.one('SELECT 1 FROM contract_signatures WHERE internship_id = ? AND party = ?', i.id, party)) throw conflict('Та аль хэдийн гарын үсэг зурсан байна.');
  if (party === 'head' && (await db.value('SELECT count(*) FROM contract_signatures WHERE internship_id = ? AND party IN (?, ?)', i.id, 'student', 'mentor')) < 2) throw conflict('Оюутан, дадлага удирдагч гарын үсэг зурсны дараа зурна.');
  const hash = await contractHash(db, i.id);
  if (c.doc_hash && c.doc_hash !== hash) throw conflict('Гэрээний агуулга өөрчлөгдсөн тул гарын үсэг хүчингүй болсон. Тэнхмийн эрхлэгч гэрээг буцааж дахин эхлүүлнэ.');
  const data = await body(request);
  let image = null;
  if (c.mode === 'touch') {
    image = pngDataUrl(data.image, { kb: 150 });
    if (!image) throw invalid({ image: 'Гарын үсгээ дэлгэцэнд зурна уу.' });
  } else {
    if (data.consent !== true) throw invalid({ consent: 'Зөвшөөрлөө баталгаажуулна уу.' });
    await checkCode(db, user, i.id, data.code);
  }
  const rec = { party, user_id: user.id, method: c.mode, doc_hash: hash, signed_at: now() };
  await db.batch([
    db.stmt('INSERT INTO contract_signatures (internship_id, party, user_id, method, image, doc_hash, signed_at, ip, user_agent, proof) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      i.id, party, user.id, c.mode, image, hash, rec.signed_at, request.headers.get('cf-connecting-ip'), (request.headers.get('user-agent') ?? '').slice(0, 200), await proofOf(env, rec)),
    db.stmt('UPDATE contracts SET doc_hash = ? WHERE internship_id = ? AND doc_hash IS NULL', hash, i.id),
  ]);
  const link = { student: '/student/contract', mentor: `/mentor/contracts/${i.id}`, head: `/head/contracts/${i.id}` };
  const text = party === 'head' ? 'Гэрээ бүх талын гарын үсгээр баталгаажлаа.' : `${fullName(user)} (${PARTY_LABELS[party]}) гэрээнд гарын үсэг зурлаа.`;
  if (party !== 'student') await notify(db, [i.student_id], 'student', text, link.student);
  if (party !== 'mentor') await notify(db, [i.mentor_id], 'mentor', text, link.mentor);
  if (party !== 'head' && (await db.value('SELECT count(*) FROM contract_signatures WHERE internship_id = ?', i.id)) === 2) {
    const st = await db.one('SELECT last_name, first_name FROM users WHERE id = ?', i.student_id);
    await notifyRole(db, 'head', `${fullName(st)}: гэрээнд гарын үсэг зурах таны ээлж.`, link.head);
  }
  if (party === 'head') await approveContract(db, i.id);
  return json({ status: party === 'head' ? 'approved' : 'signing' });
}

/** Тал бүрийн маршрут: base + /document, /sign, /sign/code, /verify. resolve(ctx) — тухайн талын дадлага (эрх шалгана). */
export function signingRoutes(base, party, resolve) {
  return [
    ['GET', `${base}/document`, async (ctx) => contractDocument(ctx.db, (await resolve(ctx)).id)],
    ['GET', `${base}/verify`, async (ctx) => json(await verifyContract(ctx.db, ctx.env, (await resolve(ctx)).id))],
    ['POST', `${base}/sign/code`, async (ctx) => {
      const i = await resolve(ctx);
      const c = await ctx.db.one('SELECT mode, status FROM contracts WHERE internship_id = ?', i.id);
      if (c?.mode !== 'digital' || c.status !== 'filled') throw conflict('Энэ гэрээ тоон гарын үсгийн горимд биш байна.');
      await sendCode(ctx, i.id);
      return json(null);
    }],
    ['POST', `${base}/sign`, async (ctx) => sign(ctx, party, await resolve(ctx))],
  ];
}

