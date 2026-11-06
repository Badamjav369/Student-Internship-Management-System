// Урилга: нууц үг тохируулах 7 хоногийн холбоос и-мэйлээр (админ хэрэглэгч нэмэхэд, байгууллага дадлага удирдагч томилоход).
import { randomToken, sha256 } from './auth.js';
import { sendMail, sendMails } from './mail.js';

const SUBJECT = 'Дадлагын системд урилга';
const expires = () => new Date(Date.now() + 7 * 864e5).toISOString();
const textOf = (origin, token) => `Нууц үгээ тохируулна уу: ${origin}/#/password?token=${token}`;

export async function invite(db, env, origin, user) {
  const token = randomToken();
  await db.run('INSERT INTO password_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)', await sha256(token), user.id, expires());
  await sendMail(env, { to: user.email, subject: SUBJECT, text: textOf(origin, token) });
}

/** Олон хэрэглэгчид нэг дор (импорт): токенуудыг batch-аар, имэйлийг Resend batch-аар. */
export async function inviteMany(db, env, origin, users) {
  const items = await Promise.all(users.map(async (u) => { const token = randomToken(); return { u, token, hash: await sha256(token) }; }));
  for (let k = 0; k < items.length; k += 50) {
    await db.batch(items.slice(k, k + 50).map((x) => db.stmt('INSERT INTO password_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)', x.hash, x.u.id, expires())));
  }
  await sendMails(env, items.map((x) => ({ to: x.u.email, subject: SUBJECT, text: textOf(origin, x.token) })));
}
