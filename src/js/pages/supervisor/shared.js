// Зөвхөн удирдагч багшийн хуудсуудад хэрэгтэй: төлөв/оноо шошго, оноонд хийх дараагийн алхам, «хийх ажил», оюутны толгой, дараалал хуудас.
import { fullName } from '../../core/format.js';
import { emptyState } from '../../components/empty-state.js';

export const SCORE_STATE = { none: 'Хүлээгдэж буй', unconfirmed: 'Баталгаажаагүй', confirmed: 'Баталгаажсан', marked: '0 / W тэмдэглэсэн' };
export const SCORE_TONES = { none: 'none', unconfirmed: 'pending', confirmed: 'done', marked: 'attention' };
export const RECORD_LABELS = { open: 'Үнэлгээ хийгдэж буй', finalized: 'Эцсийн дүн гарсан', closed: 'Дүн СИСИ-д орсон' };
export const RECORD_TONES = { open: 'pending', finalized: 'active', closed: 'done' };

/** Оноонд удирдагч багш юу хийх вэ: org → confirm → finalize → sisi, эсвэл хамгаалаагүй бол mark. */
export function scoreAction(i) {
  const s = i.score;
  if (!s) return null;
  if (s.status === 'finalized') return 'sisi';
  if (s.status !== 'open') return null;
  if ((s.org_status === 'confirmed' && s.committee_status === 'confirmed') || s.committee_status === 'marked') return 'finalize';
  if (s.org_status === 'unconfirmed') return 'org';
  if (s.committee_status === 'unconfirmed') return 'confirm';
  if (s.committee_status === 'none' && ['ready', 'failed'].includes(i.status)) return 'mark';
  return null;
}
const SCORE_TODO = {
  org: 'байгууллагын үнэлгээг шалгаж батлах хүлээж байна.',
  confirm: 'комиссын оноог баталгаажуулах хүлээж байна.',
  finalize: 'эцсийн дүн гаргах нөхцөл хангагдлаа.',
  sisi: 'эцсийн дүн гарсан. СИСИ-д оруулсныг тэмдэглэнэ үү.',
};

/** Нүүрний «Хийх ажил»: дэвтрийн анхааруулга, тайлан хянах, оноо шийдэх. */
export function todoItems(interns) {
  const items = [];
  const add = (icon, tone, text, href, action) => items.push({ icon, tone, text, href, action });
  for (const i of interns.filter((x) => x.logbook.alert)) add('book', 'rose', `${fullName(i.student)}: тэмдэглэлгүй ${i.logbook.missing_days} өдөр (${i.logbook.max_missing_days}-аас хэтэрсэн).`, `/supervisor/students/${i.id}`, 'Харах');
  for (const i of interns.filter((x) => x.report?.status === 'submitted')) add('report', 'green', `${fullName(i.student)}: тайлан хянах хүлээж байна.`, `/supervisor/reports/${i.id}`, 'Хянах');
  for (const i of interns) if (SCORE_TODO[scoreAction(i)]) add('award', 'violet', `${fullName(i.student)}: ${SCORE_TODO[scoreAction(i)]}`, `/supervisor/scores/${i.id}`, 'Шийдэх');
  return items;
}

export const NO_STUDENTS = 'Тэнхимийн админ танд оюутан оноосны дараа энд харагдана.';
export const noStudents = () => emptyState('Оюутан алга', NO_STUDENTS, { icon: 'users' });
