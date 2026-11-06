// Мэдэгдэл: хэрэглэгч + дүрээр. notify()-г бусад модуль дуудна.
import { json, paging } from '../lib/http.js';
import { now } from '../lib/db.js';

export async function notify(db, userIds, role, text, link = null) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length) await db.batch(ids.map((id) => db.stmt('INSERT INTO notifications (user_id, role, text, link, created_at) VALUES (?, ?, ?, ?, ?)', id, role, text, link, now())));
}
/** Тухайн дүрийн бүх хэрэглэгчид (жишээ нь бүх админ). */
export async function notifyRole(db, role, text, link = null) {
  const users = await db.all("SELECT u.id FROM users u JOIN user_roles r ON r.user_id = u.id AND r.role = ? WHERE u.status <> 'disabled'", role);
  await notify(db, users.map((u) => u.id), role, text, link);
}

async function list({ db, url, user }) {
  const unreadOnly = url.searchParams.get('unread') === '1';
  const { limit, offset } = paging(url, 50);
  const scope = 'user_id = ? AND role = ?';
  const [items, total, unread, all] = await Promise.all([
    db.all(`SELECT id, text, link, created_at AS time, read_at FROM notifications WHERE ${scope} ${unreadOnly ? 'AND read_at IS NULL' : ''} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, user.id, user.active_role, limit, offset),
    db.value(`SELECT count(*) FROM notifications WHERE ${scope} ${unreadOnly ? 'AND read_at IS NULL' : ''}`, user.id, user.active_role),
    db.value(`SELECT count(*) FROM notifications WHERE ${scope} AND read_at IS NULL`, user.id, user.active_role),
    db.value(`SELECT count(*) FROM notifications WHERE ${scope}`, user.id, user.active_role),
  ]);
  return json({ items: items.map(({ read_at, ...n }) => ({ ...n, read: Boolean(read_at) })), total, unread, all });
}
async function readAll({ db, user }) {
  await db.run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND role = ? AND read_at IS NULL', now(), user.id, user.active_role);
  return json(null);
}
async function readOne({ db, params, user }) {
  await db.run('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL', now(), params.id, user.id);
  return json(null);
}

export const routes = [
  ['GET', '/api/notifications', list],
  ['POST', '/api/notifications/read', readAll],
  ['POST', '/api/notifications/:id/read', readOne],
];
