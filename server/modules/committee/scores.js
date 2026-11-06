// Оноо оруулах: гишүүн шалгуур бүрт өөрийн оноог (бусдынхыг харахгүй). Шаардлагатай гишүүд бүгд оруулмагц удирдагч багш баталгаажуулна.
import { HttpError, invalid, json, body } from '../../lib/http.js';
import { notify } from '../notifications.js';
import { own } from './context.js';
import { criteriaOf } from './students.js';

const fine = (v, max) => Number.isFinite(v) && v >= 0 && v <= max && Math.abs(Math.round(v * 100) - v * 100) < 1e-6;

/** body: { scores: [{ criterion_id, value }] } → { complete }. */
async function save({ db, user, params, request }) {
  const s = await own(db, user, params.id);
  if (!s.can_score) throw new HttpError(409, 'STATE_CONFLICT', 'Энэ оюутанд оноо оруулах боломжгүй байна. Дэлгэцийг шинэчилнэ үү.');
  const given = (await body(request)).scores;
  const list = Array.isArray(given) ? given : [];
  const rows = (await criteriaOf(db, s.semester_id)).map((c) => {
    const value = Number(list.find((x) => Number(x?.criterion_id) === c.id)?.value);
    if (!fine(value, c.max_score)) throw invalid({ [`score-${c.id}`]: `Оноо 0–${c.max_score} хооронд байна.` }, `«${c.name}» оноо 0–${c.max_score} хооронд, хоёр орноос ихгүй бутархайтай байна.`);
    return [c.id, value];
  });
  await db.batch([
    db.stmt('DELETE FROM committee_scores WHERE internship_id = ? AND member_id = ?', s.id, user.id),
    ...rows.map(([c, v]) => db.stmt('INSERT INTO committee_scores (internship_id, criterion_id, member_id, value) VALUES (?, ?, ?, ?)', s.id, c, user.id, v)),
  ]);
  const done = await db.all('SELECT DISTINCT member_id FROM committee_scores WHERE internship_id = ?', s.id);
  const complete = s.required_ids.every((id) => done.some((d) => d.member_id === id));
  if (complete) {
    // Хамгаалалт болж, бүх оноо орсон: үнэлгээний шат, удирдагч багш баталгаажуулна.
    const [, , changed] = await db.batch([
      db.stmt('INSERT OR IGNORE INTO score_records (internship_id) VALUES (?)', s.id),
      db.stmt("UPDATE internships SET status = 'evaluating' WHERE id = ? AND status = 'ready'", s.id),
      db.stmt("UPDATE score_records SET committee_status = 'unconfirmed' WHERE internship_id = ? AND committee_status = 'none'", s.id),
    ]);
    if (changed.meta.changes) await notify(db, [s.supervisor_id], 'supervisor', `${s.student.last_name} ${s.student.first_name}-ийн комиссын оноо баталгаажуулахыг хүлээж байна.`, `/supervisor/scores/${s.id}`);
  }
  return json({ complete });
}

export const routes = [['POST', '/api/committee/students/:id/scores', save]];
