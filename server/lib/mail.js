// И-мэйл илгээх цэг.
//  • env.MAIL_API_KEY тохируулсан бол Resend (https://resend.com) API-аар жинхэнэ имэйл явуулна.
//  • Тохируулаагүй (локал хөгжүүлэлт) бол зөвхөн console-д бичнэ — холбоосыг консолоос авна.
// Нууц утгууд: `npx wrangler secret put MAIL_API_KEY`; илгээгчийн хаяг MAIL_FROM (wrangler.toml [vars] эсвэл secret).
// Түр алдаа (сүлжээ, 429, 5xx) гарвал нэг удаа дахин оролдоно. Илгээж чадаагүй нь хүсэлтийг унагаахгүй
// (хэрэглэгч "нууц үг сэргээх"/«Код илгээх»-ээр дахин авна), зөвхөн log-д тэмдэглэнэ.

const ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 8000;

/** Resend руу нэг хүсэлт; түр алдаа (сүлжээ, 429, 5xx) гарвал нэг удаа дахин. */
async function post(env, url, payload, label) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${env.MAIL_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return true;
      const detail = (await res.text()).slice(0, 300);
      if (attempt === 2 || !(res.status === 429 || res.status >= 500)) { console.error(`[mail] алдаа ${res.status} → ${label}: ${detail}`); return false; }
    } catch (e) {
      if (attempt === 2) { console.error(`[mail] илгээж чадсангүй → ${label}: ${e?.message ?? e}`); return false; }
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

/** @returns {Promise<boolean>} илгээгдсэн (эсвэл локалд log-д бичигдсэн) бол true */
export async function sendMail(env, { to, subject, text }) {
  if (!env?.MAIL_API_KEY) {
    console.log(`[mail] → ${to}: ${subject}\n${text}`);
    return true;
  }
  return post(env, env.MAIL_API_URL || ENDPOINT, { from: env.MAIL_FROM, to: [to], subject, text }, `${to}: ${subject}`);
}

/** Олон имэйл (жишээ нь оюутан бөөнөөр импортлох урилга): Resend batch API-аар 100-гаар — Workers Free-ийн 50 гадаад хүсэлтийн хязгаарт багтана. */
export async function sendMails(env, messages) {
  if (!env?.MAIL_API_KEY) { for (const m of messages) await sendMail(env, m); return true; }
  let ok = true;
  for (let k = 0; k < messages.length; k += 100) {
    const part = messages.slice(k, k + 100).map(({ to, subject, text }) => ({ from: env.MAIL_FROM, to: [to], subject, text }));
    ok = (await post(env, `${env.MAIL_API_URL || ENDPOINT}/batch`, part, `${part.length} имэйл (batch)`)) && ok;
  }
  return ok;
}
