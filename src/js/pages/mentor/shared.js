// Зөвхөн дадлага удирдагчийн хуудсуудад хэрэгтэй: байгууллагын үнэлгээний шошго, «хийх ажил», оюутан байхгүй үеийн тайлбар.
import { fullName } from '../../core/format.js';
import { emptyState } from '../../components/empty-state.js';
import { badge } from '../../components/status-badge.js';

export const NO_INTERNS = 'Байгууллага таныг дадлага удирдагчаар томилсны дараа оюутнууд энд харагдана.';
export const noInterns = () => emptyState('Дадлагажигч алга', NO_INTERNS, { icon: 'users' });

/** Байгууллагын үнэлгээний шошго: оруулах хугацаа болоогүй / оруулаагүй / буцаасан / тэнхим шалгаж буй / баталгаажсан. */
export function orgBadge(s) {
  if (s.org_status === 'confirmed') return badge('Баталгаажсан', 'done');
  if (s.org_status === 'unconfirmed') return badge('Тэнхим шалгаж буй', 'pending');
  if (s.return_reason) return badge('Буцаасан', 'attention');
  return s.enterable ? badge('Оруулаагүй', 'pending') : badge('Хугацаа болоогүй');
}

/** Нүүрний «Хийх ажил»: батлах төлөвлөгөө, оруулах/засах үнэлгээ, хянах тэмдэглэл. */
export function todoItems(interns) {
  const items = [];
  const add = (icon, tone, text, href, action) => items.push({ icon, tone, text, href, action });
  for (const i of interns.filter((x) => x.plan?.status === 'submitted')) add('plan', 'blue', `${fullName(i.student)}: ажлын төлөвлөгөө хянах хүлээж байна.`, `/mentor/plans/${i.id}`, 'Хянах');
  for (const i of interns.filter((x) => x.score.enterable && x.score.org_status === 'none')) {
    add('award', i.score.return_reason ? 'rose' : 'violet', `${fullName(i.student)}: ${i.score.return_reason ? 'тэнхим байгууллагын үнэлгээг буцаасан. Засаад дахин оруулна уу.' : 'байгууллагын үнэлгээгээ оруулах хугацаа болсон.'}`,
      `/mentor/scores/${i.id}`, i.score.return_reason ? 'Засах' : 'Оруулах');
  }
  for (const i of interns.filter((x) => x.logbook.reviewable && x.logbook.unreviewed > 0)) add('book', 'amber', `${fullName(i.student)}: хянаагүй ${i.logbook.unreviewed} өдрийн тэмдэглэл байна.`, `/mentor/logbook?student=${i.id}`, 'Хянах');
  return items;
}
