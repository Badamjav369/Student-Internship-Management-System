// Нэвтрэлт, өөрийн профайл: нэвтрэх/гарах, дүр солих, зөвшөөрөл, утас, нууц үг солих, нууц үг сэргээх/тохируулах (урилга).
import { check, clean, email, maxLen, required } from '../lib/check.js';
import { HttpError, invalid, json, body } from '../lib/http.js';
import { now } from '../lib/db.js';
import { endSession, hashPassword, iterationsIn, iterationsOf, randomToken, rolesOf, sha256, startSession, verifyPassword } from '../lib/auth.js';
import { sendMail } from '../lib/mail.js';
import { checkCaptcha, rateLimit } from '../lib/ratelimit.js';
import { invite } from '../lib/invite.js';

const ORDER = ['admin', 'head', 'supervisor', 'mentor', 'org_rep', 'committee', 'student'];
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
const strong = (v) => (v && (v.length < 8 || !/[A-Za-zА-Яа-яЁёӨөҮү]/.test(v) || !/\d/.test(v)) ? 'Хамгийн багадаа 8 тэмдэгт, үсэг, тоо орсон байна.' : null);
/** Ажлын төлөвлөгөө, дэвтэр шаардах эсэх: оюутанд өөрийн улирлынх, бусдад идэвхтэй улирлынх (байхгүй бол бүгд шаардана). */
async function featuresOf(db, user) {
  const row = await db.one(user.active_role === 'student'
    ? `SELECT s.plan_enabled, s.logbook_enabled FROM internships i JOIN semesters s ON s.id = i.semester_id WHERE i.student_id = ? AND s.status <> 'draft' ORDER BY s.status = 'active' DESC, s.id DESC LIMIT 1`
    : "SELECT plan_enabled, logbook_enabled FROM semesters WHERE status = 'active' AND ? IS NOT NULL", user.id);
  return { plan: row ? Boolean(row.plan_enabled) : true, logbook: row ? Boolean(row.logbook_enabled) : true };
}
const me = async (db, user) => {
  const roles = await rolesOf(db, user.id);
  const organization = user.organization_id ? await db.value('SELECT name FROM organizations WHERE id = ?', user.organization_id) : null;
  return { ...user, role: user.active_role, roles, organization, features: await featuresOf(db, user) };
};

async function login({ db, env, request }) {
  await rateLimit(db, env, request, { name: 'login', max: 30, windowSec: 600 });
  const data = await body(request);
  const wrong = new HttpError(401, 'INVALID_CREDENTIALS', 'И-мэйл эсвэл нууц үг буруу байна.');
  const u = await db.one('SELECT * FROM users WHERE email = ?', String(data.email ?? '').trim().toLowerCase());
  if (!u || u.status === 'disabled' || !u.password_hash) throw wrong;
  if (u.locked_until && u.locked_until > now()) throw new HttpError(429, 'LOCKED', `Олон удаа буруу оруулсан тул ${LOCK_MINUTES} минутын дараа дахин оролдоно уу.`);
  if (!(await verifyPassword(String(data.password ?? ''), u.password_hash))) {
    const failed = u.failed_logins + 1;
    await db.run('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?', failed >= LOCK_AFTER ? 0 : failed,
      failed >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 6e4).toISOString() : null, u.id);
    throw wrong;
  }
  // Давталтын тоог нэмсэн бол (жишээ нь Workers Paid руу шилжсэн) нэвтрэх үед шинэ хэш болгоно.
  const upgrade = iterationsIn(u.password_hash) < iterationsOf(env) ? await hashPassword(String(data.password), iterationsOf(env)) : u.password_hash;
  await db.run('UPDATE users SET failed_logins = 0, locked_until = NULL, password_hash = ? WHERE id = ?', upgrade, u.id);
  const roles = await rolesOf(db, u.id);
  const role = ORDER.find((r) => roles.some((x) => x.role === r));
  if (!role) throw wrong;
  return startSession(db, request, u, role, { role, roles, consent_at: u.consent_at });
}

const logout = ({ db, request }) => endSession(db, request);
const session = async ({ db, user }) => json({ user: await me(db, user) });

async function switchRole({ db, request, user }) {
  const { role } = await body(request);
  if (!(await rolesOf(db, user.id)).some((r) => r.role === role)) throw new HttpError(403, 'FORBIDDEN', 'Энэ дүр танд байхгүй.');
  await endSession(db, request);
  return startSession(db, request, user, role, { role });
}

async function consent({ db, user }) {
  await db.run("UPDATE users SET consent_at = ?, status = CASE WHEN status = 'invited' THEN 'active' ELSE status END WHERE id = ?", now(), user.id);
  return json(null);
}
async function updateMe({ db, request, user }) {
  const { phone } = await body(request);
  if (phone && !/^\+?\d{8,12}$/.test(phone)) throw invalid({ phone: 'Утасны дугаар буруу байна.' });
  await db.run('UPDATE users SET phone = ? WHERE id = ?', phone || null, user.id);
  return json(null);
}
async function changePassword({ db, env, request, user }) {
  const data = check(await body(request), { current: [required], next: [required, strong] });
  const row = await db.one('SELECT password_hash FROM users WHERE id = ?', user.id);
  if (!(await verifyPassword(data.current, row.password_hash))) throw invalid({ current: 'Одоогийн нууц үг буруу байна.' });
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(data.next, iterationsOf(env)), user.id);
  return json(null);
}

// ---------- Нууц үг сэргээх / урилгаар тохируулах ----------
async function forgot({ db, env, request, url }) {
  await rateLimit(db, env, request, { name: 'forgot', max: 5, windowSec: 900 });
  const data = check(await body(request), { email: [required, email] });
  await rateLimit(db, env, request, { name: 'forgot-mail', key: data.email.trim().toLowerCase(), max: 3, windowSec: 3600 });
  const u = await db.one("SELECT id, email FROM users WHERE email = ? AND status <> 'disabled'", data.email.trim().toLowerCase());
  if (u) {
    const token = randomToken();
    await db.run('INSERT INTO password_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)', await sha256(token), u.id, new Date(Date.now() + 3600e3).toISOString());
    await sendMail(env, { to: u.email, subject: 'Нууц үг сэргээх', text: `Нууц үгээ шинэчлэх холбоос (1 цаг): ${url.origin}/#/password?token=${token}` });
  }
  return json({ message: 'Хэрэв энэ и-мэйл бүртгэлтэй бол нууц үг тохируулах холбоос илгээгдлээ.' });
}
async function reset({ db, env, request }) {
  await rateLimit(db, env, request, { name: 'reset', max: 20, windowSec: 900 });
  const data = check(await body(request), { token: [required], password: [required, strong] });
  const hash = await sha256(data.token);
  const t = await db.one('SELECT * FROM password_tokens WHERE token_hash = ?', hash);
  if (!t || t.expires_at < now()) throw new HttpError(400, 'INVALID_TOKEN', 'Холбоос хүчингүй эсвэл хугацаа нь дууссан байна. Шинэ холбоос авна уу.');
  await db.batch([
    db.stmt('UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE id = ?', await hashPassword(data.password, iterationsOf(env)), t.user_id),
    db.stmt('DELETE FROM password_tokens WHERE user_id = ?', t.user_id),
    db.stmt('DELETE FROM sessions WHERE user_id = ?', t.user_id),
  ]);
  return json(null);
}

// ---------- Байгууллага өөрөө бүртгүүлэх ----------
// Байгууллага шууд идэвхжиж, холбогдох хүн (org_rep) нууц үг тохируулах урилгыг и-мэйлээр авна. Бүртгэлтэй и-мэйлийг таалгахгүйн тулд хариу ижил.
const phoneOk = (v) => (v && !/^[0-9+() -]{6,30}$/.test(v) ? 'Утасны дугаарыг тоогоор бичнэ үү.' : null);
const ORG_FIELDS = ['name', 'register_no', 'field', 'address', 'email', 'phone', 'description'];
async function registerOrg({ db, env, request, url }) {
  await rateLimit(db, env, request, { name: 'register-org', max: 3, windowSec: 3600 });
  const raw = await body(request);
  if (raw.website) return json({ message: 'Холбогдох хүний и-мэйл рүү нууц үг тохируулах холбоос илгээгдлээ.' }); // honeypot: нуугдмал талбарыг зөвхөн робот бөглөнө
  await checkCaptcha(env, request, raw.captcha);
  const org = clean(raw, ORG_FIELDS);
  const rep = clean(raw.representative ?? {}, ['last_name', 'first_name', 'email', 'phone', 'position']);
  const errors = {};
  const run = (prefix, data, rules) => { try { check(data, rules); } catch (e) { for (const [k, v] of Object.entries(e.fields ?? {})) errors[prefix + k] = v; } };
  run('', org, { name: [required, maxLen(200)], register_no: [required, (v) => (/^[0-9A-Za-zА-ЯЁӨҮа-яёөү]{5,20}$/.test(v ?? '') ? null : 'Регистрийн дугаар 5–20 үсэг, тоотой байна.')], email: [email], phone: [phoneOk], description: [maxLen(3000)] });
  run('representative.', rep, { last_name: [required, maxLen(100)], first_name: [required, maxLen(100)], email: [required, email], phone: [phoneOk] });
  if (Object.keys(errors).length) throw invalid(errors);
  const mail = rep.email.trim().toLowerCase();
  const done = json({ message: 'Холбогдох хүний и-мэйл рүү нууц үг тохируулах холбоос илгээгдлээ.' });
  if (await db.one('SELECT 1 FROM organizations WHERE register_no = ?', org.register_no)) throw invalid({ register_no: 'Энэ регистрийн дугаартай байгууллага бүртгэлтэй байна. Төлөөлөгчөөр нэмүүлэх бол тэнхимд хандана уу.' });
  if (await db.one('SELECT 1 FROM users WHERE email = ?', mail)) return done;
  const orgId = await db.insert('INSERT INTO organizations (name, register_no, field, address, email, phone, description) VALUES (?, ?, ?, ?, ?, ?, ?)', ...ORG_FIELDS.map((k) => org[k] ?? null));
  const id = await db.insert('INSERT INTO users (email, last_name, first_name, phone, organization_id, position) VALUES (?, ?, ?, ?, ?, ?)', mail, rep.last_name, rep.first_name, rep.phone ?? null, orgId, rep.position ?? null);
  await db.run("INSERT INTO user_roles (user_id, role) VALUES (?, 'org_rep')", id);
  await invite(db, env, url.origin, { id, email: mail });
  return done;
}

// roles: null — нэвтрэлтгүй; 'any' — нэвтэрсэн хэн ч.
export const routes = [
  ['POST', '/api/auth/login', login, { roles: null }],
  ['POST', '/api/auth/logout', logout, { roles: null }],
  ['GET', '/api/auth/captcha', ({ env }) => json({ siteKey: env.TURNSTILE_SECRET ? env.TURNSTILE_SITE_KEY ?? null : null }), { roles: null }],
  ['POST', '/api/auth/register-org', registerOrg, { roles: null }],
  ['POST', '/api/auth/password/forgot', forgot, { roles: null }],
  ['POST', '/api/auth/password/reset', reset, { roles: null }],
  ['GET', '/api/me', session],
  ['PATCH', '/api/me', updateMe],
  ['POST', '/api/me/role', switchRole],
  ['POST', '/api/me/consent', consent],
  ['POST', '/api/me/password', changePassword],
];
