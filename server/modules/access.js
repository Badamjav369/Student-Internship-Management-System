// Хэн аль дадлагыг харж болох вэ (дүрээр). Файл татах эрх, бусад модуль хуваалцана.
const RULES = {
  admin: () => ['1 = 1'], head: () => ['1 = 1'],
  student: () => ['i.student_id = ?'],
  supervisor: () => ['i.supervisor_id = ?'],
  mentor: () => ['i.mentor_id = ?'],
  org_rep: () => ['i.organization_id = (SELECT organization_id FROM users WHERE id = ?)'],
  committee: () => ['EXISTS (SELECT 1 FROM defense_slots d JOIN committee_members m ON m.committee_id = d.committee_id JOIN committees c ON c.id = d.committee_id AND c.published_at IS NOT NULL WHERE d.internship_id = i.id AND m.user_id = ?)'],
};
export async function canSeeInternship(db, user, internshipId) {
  const [where] = (RULES[user.active_role] ?? (() => ['0 = 1']))();
  const args = where.includes('?') ? [user.id] : [];
  return Boolean(await db.one(`SELECT 1 FROM internships i WHERE i.id = ? AND ${where}`, internshipId, ...args));
}

/** Файлыг агуулсан дадлагууд (тайлан, дэвтэр, гэрээ, тодорхойлолт, CV, хүсэлт, шийдвэрийн баримт). */
export const internshipsOfFile = (db, fileId) => db.all(`SELECT internship_id FROM report_files WHERE file_id = ?1 UNION SELECT internship_id FROM log_files WHERE file_id = ?1
  UNION SELECT internship_id FROM contracts WHERE scan_file_id = ?1 UNION SELECT internship_id FROM score_records WHERE org_letter_file_id = ?1
  UNION SELECT internship_id FROM applications WHERE cv_file_id = ?1 UNION SELECT internship_id FROM placement_requests WHERE document_file_id = ?1
  UNION SELECT internship_id FROM internship_changes WHERE document_file_id = ?1`, fileId);
