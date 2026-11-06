// Хамгаалалтын хуваарь, үнэлгээ (дүн гарсны дараа шалгуур бүрээр), удирдамж (зарлал, загвар файл).
import { json, paging } from '../../lib/http.js';
import { mine, required } from './context.js';

async function defense({ db, user }) {
  const i = await required(db, user);
  const slot = await db.one(`SELECT d.slot_time, d.order_no, c.* FROM defense_slots d JOIN committees c ON c.id = d.committee_id
    WHERE d.internship_id = ? AND c.published_at IS NOT NULL`, i.id);
  if (!slot) return json({ scheduled: false });
  const [members, students] = await Promise.all([
    db.all('SELECT u.last_name, u.first_name, m.is_chair FROM committee_members m JOIN users u ON u.id = m.user_id WHERE m.committee_id = ? ORDER BY m.is_chair DESC, u.last_name', slot.id),
    db.all('SELECT u.last_name, u.first_name FROM defense_slots d JOIN internships x ON x.id = d.internship_id JOIN users u ON u.id = x.student_id WHERE d.committee_id = ? ORDER BY d.order_no', slot.id),
  ]);
  return json({ scheduled: true, slot_time: slot.slot_time, order_no: slot.order_no, committee: {
    name: slot.name, defense_date: slot.defense_date, start_time: slot.start_time, format: slot.format, location: slot.location, online_url: slot.online_url,
    members: [...members.map((m) => ({ last_name: m.last_name, first_name: m.first_name, role: m.is_chair ? 'chair' : 'teacher' })), ...students.map((s) => ({ ...s, role: 'student' }))],
  } });
}

const STATE = { pending: 'Хүлээгдэж буй', finalized: 'Баталгаажсан' };
async function evaluation({ db, user }) {
  const i = await required(db, user);
  const criteria = await db.all('SELECT id, component, name, max_score FROM criteria WHERE semester_id = ? ORDER BY sort_order, id', i.semester_id);
  const r = await db.one('SELECT * FROM score_records WHERE internship_id = ?', i.id);
  const done = r && ['finalized', 'closed'].includes(r.status);
  const out = {
    status: done ? 'finalized' : r && (r.org_status !== 'none' || r.committee_status !== 'none') ? 'evaluating' : 'pending',
    org: r?.org_status === 'confirmed' ? { status: 'finalized', label: STATE.finalized } : { status: 'pending', label: STATE.pending },
    committee: ['confirmed', 'marked'].includes(r?.committee_status) ? { status: 'finalized', label: STATE.finalized }
      : r?.committee_status === 'unconfirmed' || (r && i.status === 'evaluating') ? { status: 'pending', label: 'Комисс үнэлж байна' } : { status: 'pending', label: STATE.pending },
    mark: done ? r.mark : null, final: null, criteria,
  };
  out.status_label = { finalized: 'Дууссан', evaluating: 'Үнэлгээ явагдаж байна', pending: 'Хүлээгдэж буй' }[out.status];
  if (done && !r.mark) {
    const [org, com] = await Promise.all([
      db.all('SELECT criterion_id, value FROM org_scores WHERE internship_id = ?', i.id),
      db.all('SELECT criterion_id, avg(value) AS value FROM committee_scores WHERE internship_id = ? GROUP BY criterion_id', i.id),
    ]);
    const sum = (list) => Math.round(list.reduce((a, x) => a + x.value, 0) * 100) / 100;
    out.final = { org_score: sum(org), committee_score: sum(com), total: i.grade_total, criteria: [...org, ...com].map((x) => ({ criterion_id: x.criterion_id, value: Math.round(x.value * 100) / 100 })) };
  }
  return json(out);
}

async function announcements({ db, url, user }) {
  const i = await mine(db, user);
  if (!i) return json({ total: 0, items: [] });
  const { limit, offset } = paging(url, 50);
  const [rows, total] = await Promise.all([
    db.all(`SELECT a.id, a.title, a.body, a.created_at, u.last_name, u.first_name, f.id AS file_id, f.name AS file_name, f.size AS file_size
      FROM announcements a LEFT JOIN users u ON u.id = a.author_id LEFT JOIN files f ON f.id = a.file_id WHERE a.semester_id = ? ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`, i.semester_id, limit, offset),
    db.value('SELECT count(*) FROM announcements WHERE semester_id = ?', i.semester_id),
  ]);
  return json({ total, items: rows.map((a) => ({ id: a.id, title: a.title, body: a.body, created_at: a.created_at, author: { last_name: a.last_name, first_name: a.first_name },
    file: a.file_id ? { id: a.file_id, name: a.file_name, size: a.file_size } : null })) });
}

async function templates({ db, user }) {
  const i = await mine(db, user);
  if (!i) return json([]);
  return json(await db.all(`SELECT t.kind, t.file_id, f.name AS file_name, f.size AS file_size FROM templates t JOIN files f ON f.id = t.file_id
    WHERE t.semester_id = ? ORDER BY t.id`, i.semester_id));
}

export const routes = [
  ['GET', '/api/student/defense', defense],
  ['GET', '/api/student/evaluation', evaluation],
  ['GET', '/api/student/announcements', announcements],
  ['GET', '/api/student/templates', templates],
];
