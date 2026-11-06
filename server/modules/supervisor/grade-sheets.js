// Дүнгийн хуудас: улирал бүрт миний оюутнуудын эцсийн дүн — хэвлэх хуудас (→ PDF) ба CSV (Excel нээнэ). Үргэлж одоогийн өгөгдлөөс.
import { json, notFound } from '../../lib/http.js';
import { now } from '../../lib/db.js';
import { printable } from '../../lib/printable.js';

const SEASONS = { summer: 'Зуны', winter: 'Өвлийн' };
const LETTER = (t) => (t >= 90 ? 'A' : t >= 80 ? 'B' : t >= 70 ? 'C' : t >= 60 ? 'D' : 'F');

async function list({ db, user }) {
  const rows = await db.all(`SELECT DISTINCT s.id, s.academic_year, s.season, s.status FROM semesters s JOIN internships i ON i.semester_id = s.id
    WHERE i.supervisor_id = ? AND s.status <> 'draft' ORDER BY s.id DESC`, user.id);
  const at = now();
  return json(rows.map((s) => ({ ...s, generated_at: at, pdf: `Дүнгийн_хуудас_${s.academic_year}_${s.season}.pdf`, xlsx: `Дүнгийн_хуудас_${s.academic_year}_${s.season}.csv`,
    pdf_url: `/api/supervisor/grade-sheets/${s.id}/print`, xlsx_url: `/api/supervisor/grade-sheets/${s.id}/csv` })));
}

async function rowsOf(db, user, semesterId) {
  const s = await db.one('SELECT * FROM semesters WHERE id = ?', semesterId);
  if (!s) throw notFound('Улирал олдсонгүй.');
  const rows = await db.all(`SELECT u.student_code, u.last_name, u.first_name, u.program, o.name AS organization, i.status, i.grade_total, i.grade_mark
    FROM internships i JOIN users u ON u.id = i.student_id LEFT JOIN organizations o ON o.id = i.organization_id
    WHERE i.semester_id = ? AND i.supervisor_id = ? ORDER BY u.last_name, u.first_name`, s.id, user.id);
  const grade = (r) => (r.grade_mark ?? (r.grade_total != null ? `${r.grade_total} (${LETTER(r.grade_total)})` : 'Гараагүй'));
  return { s, title: `${s.academic_year} оны ${SEASONS[s.season].toLowerCase()} улирлын дадлагын дүн`, head: ['№', 'Код', 'Овог, нэр', 'Хөтөлбөр', 'Байгууллага', 'Дүн'],
    rows: rows.map((r, k) => [k + 1, r.student_code ?? '', `${r.last_name} ${r.first_name}`, r.program ?? '', r.organization ?? '', grade(r)]) };
}
async function print({ db, user, params }) {
  const { title, head, rows } = await rowsOf(db, user, params.id);
  return printable(title, [{ rows: [['Удирдагч багш', `${user.last_name} ${user.first_name}`], ['Оюутны тоо', String(rows.length)]] }, { table: { head, rows } }], { signatures: ['Удирдагч багш', 'Тэнхмийн эрхлэгч'] });
}
async function csv({ db, user, params }) {
  const { s, head, rows } = await rowsOf(db, user, params.id);
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const text = `﻿${[head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}`;
  return new Response(text, { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'private, no-store',
    'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`Дүнгийн_хуудас_${s.academic_year}_${s.season}.csv`)}` } });
}

export const routes = [
  ['GET', '/api/supervisor/grade-sheets', list],
  ['GET', '/api/supervisor/grade-sheets/:id/print', print],
  ['GET', '/api/supervisor/grade-sheets/:id/csv', csv],
];
