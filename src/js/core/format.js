// Огноо, хэмжээний форматлалт. Огноо нь 'YYYY-MM-DD' хэлбэрийн тэмдэгт мөр (цагийн бүсээс хамаарахгүй).
const DAY = 24 * 3600 * 1000;
const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

export const parseDate = (d) => Date.parse(`${d}T00:00:00Z`);
export const isoDate = (t) => new Date(t).toISOString().slice(0, 10);
export const addDays = (d, n) => isoDate(parseDate(d) + n * DAY);
export const daysBetween = (from, to) => Math.round((parseDate(to) - parseDate(from)) / DAY);
export const weekday = (d) => WEEKDAYS[new Date(parseDate(d)).getUTCDay()];
export const mondayOf = (d) => addDays(d, -((new Date(parseDate(d)).getUTCDay() + 6) % 7));

/** 2026-11-04 → 2026.11.04 */
export const formatDate = (d) => (d ? d.replaceAll('-', '.') : '—');
export const shortDate = (d) => (d ? d.slice(5).replace('-', '.') : '—');
export const formatRange = (a, b) => `${formatDate(a)} – ${formatDate(b)}`;
export const todayLabel = (today) => `${formatDate(today)}, ${weekday(today)}`;
export const formatDateTime = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export function daysLeftText(days) {
  if (days === 0) return 'өнөөдөр';
  if (days < 0) return `${-days} хоног хэтэрсэн`;
  return `${days} хоног үлдсэн`;
}

export const sizeLabel = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`);
export const hoursText = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)} цаг`;
export const num = (x) => (Number.isInteger(Number(x)) ? String(Number(x)) : Number(x).toFixed(2).replace(/0$/, ''));
export const fullName = (p) => (p ? `${p.last_name?.[0] ?? ''}. ${p.first_name}` : '—');

export const ROLE_LABELS = Object.freeze({ student: 'Оюутан', supervisor: 'Удирдагч багш', mentor: 'Дадлага удирдагч', committee: 'Комиссын гишүүн', org_rep: 'Байгууллагын төлөөлөгч', admin: 'Админ', head: 'Тэнхмийн эрхлэгч' });
