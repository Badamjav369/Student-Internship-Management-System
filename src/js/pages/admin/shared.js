// Зөвхөн админы хуудсуудад хэрэгтэй нэр томьёо: хэрэглэгчийн төлөв, дүр, улирлын загвар.
import { ROLE_LABELS } from '../../core/format.js';

export const USER_STATUS = { invited: 'Урилга илгээсэн', active: 'Идэвхтэй', disabled: 'Идэвхгүй' };
export const USER_TONES = { invited: 'pending', active: 'done', disabled: 'attention' };
export const roleText = (roles, semesters = []) => roles.map((r) => (r.role === 'committee' && r.semester_id
  ? `${ROLE_LABELS.committee} · ${semesters.find((s) => s.id === r.semester_id)?.academic_year ?? ''}` : ROLE_LABELS[r.role] ?? r.role));

export { TEMPLATE_LABELS } from '../../core/labels.js';
export const TEMPLATE_ICONS = { guide: ['book', 'violet'], plan: ['plan', 'blue'], report: ['report', 'green'], form: ['contract', 'amber'] };
