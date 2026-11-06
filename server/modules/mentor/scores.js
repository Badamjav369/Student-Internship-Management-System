// Байгууллагын үнэлгээ: шалгуур бүрийн оноо + тамгатай тодорхойлолтын скан (анх заавал). Удирдагч багш батлах хүртэл засна.
import { invalid, json, body } from '../../lib/http.js';
import { checkUpload, saveFile } from '../../lib/files.js';
import { notify } from '../notifications.js';
import { conflictState } from '../student/context.js';
import { own, scoreInfo } from './interns.js';

const criteriaOf = (db, i) => db.all("SELECT id, semester_id, component, name, max_score FROM criteria WHERE semester_id = ? AND component = 'org' ORDER BY sort_order, id", i.semester_id);

async function get({ db, user, params }) {
  const i = await own(db, user, params.id);
  const [info, criteria, scores, r] = await Promise.all([
    scoreInfo(db, i), criteriaOf(db, i),
    db.all('SELECT o.criterion_id, c.name, c.max_score, o.value FROM org_scores o JOIN criteria c ON c.id = o.criterion_id WHERE o.internship_id = ? ORDER BY c.sort_order, c.id', i.id),
    db.one('SELECT s.mark, s.committee_status, s.org_letter_file_id, f.name AS org_letter FROM score_records s LEFT JOIN files f ON f.id = s.org_letter_file_id WHERE s.internship_id = ?', i.id),
  ]);
  return json({ ...info, criteria, org_scores: scores, org_letter: r?.org_letter ?? null, org_letter_file_id: r?.org_letter_file_id ?? null, mark: r?.mark ?? null, committee_status: r?.committee_status ?? 'none' });
}

/** multipart: scores (JSON [{ criterion_id, value }]), letter? (анх заавал). */
async function submit({ db, env, user, params, request }) {
  const i = await own(db, user, params.id);
  if (!(await scoreInfo(db, i)).enterable) throw conflictState('Байгууллагын үнэлгээг одоо оруулах боломжгүй.');
  const form = await body(request);
  let given;
  try { given = JSON.parse(form.get('scores') || '[]'); } catch { throw invalid({ scores: 'Буруу утга.' }); }
  const fields = {};
  const rows = (await criteriaOf(db, i)).map((c) => {
    const v = Number(given.find((s) => Number(s.criterion_id) === c.id)?.value);
    if (!Number.isFinite(v) || v < 0 || v > c.max_score || Math.round(v * 100) !== v * 100) fields[`score-${c.id}`] = `Оноо 0–${c.max_score} хооронд байна.`;
    return [c.id, v];
  });
  const old = await db.one('SELECT org_status, org_letter_file_id FROM score_records WHERE internship_id = ?', i.id);
  const upload = form.get('letter');
  const hasUpload = upload && typeof upload !== 'string' && upload.size;
  if (!hasUpload && !old?.org_letter_file_id) fields.letter = 'Тамгатай тодорхойлолтын скан хувийг хавсаргана уу.';
  if (Object.keys(fields).length) throw invalid(fields);
  const maxMb = await db.value('SELECT max_file_mb FROM semesters WHERE id = ?', i.semester_id);
  const letter = hasUpload ? await saveFile(env, db, checkUpload(upload, { types: ['pdf', 'png', 'jpg', 'jpeg'], maxMb, field: 'letter' }), user.id) : null;
  await db.batch([
    db.stmt('INSERT OR IGNORE INTO score_records (internship_id) VALUES (?)', i.id),
    db.stmt('DELETE FROM org_scores WHERE internship_id = ?', i.id),
    ...rows.map(([cid, v]) => db.stmt('INSERT INTO org_scores (internship_id, criterion_id, value) VALUES (?, ?, ?)', i.id, cid, v)),
    db.stmt("UPDATE score_records SET org_status = 'unconfirmed', org_return_reason = NULL, org_letter_file_id = coalesce(?, org_letter_file_id) WHERE internship_id = ?", letter?.id ?? null, i.id),
  ]);
  if (!old || old.org_status === 'none') await notify(db, [i.supervisor_id], 'supervisor', `${i.student.last_name} ${i.student.first_name}-ийн байгууллагын үнэлгээ орлоо. Шалгаж батална уу.`, `/supervisor/scores/${i.id}`);
  return json(null);
}

export const routes = [
  ['GET', '/api/mentor/internships/:id/score', get],
  ['POST', '/api/mentor/internships/:id/score', submit],
];
