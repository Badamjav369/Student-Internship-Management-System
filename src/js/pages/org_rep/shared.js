// Зөвхөн байгууллагын төлөөлөгчийн хуудсуудад хэрэгтэй: зар, хүсэлтийн төлөв шошго, «хийх ажил».
import { fullName } from '../../core/format.js';

export const POSTING_LABELS = { open: 'Нээлттэй', closed: 'Хаагдсан' };
export const POSTING_TONES = { open: 'done', closed: 'none' };
export const APPLICATION_LABELS = { pending: 'Шийдвэр хүлээж буй', accepted: 'Хүлээн авсан', rejected: 'Татгалзсан', cancelled: 'Цуцалсан' };
export const APPLICATION_TONES = { pending: 'pending', accepted: 'done', rejected: 'attention', cancelled: 'none' };

/** Нүүрний «Хийх ажил»: шийдэх хүсэлт, дадлага удирдагч томилоогүй дадлагажигч. */
export function todoItems(applications, interns) {
  const items = [];
  for (const a of applications.filter((x) => x.status === 'pending')) {
    items.push({ icon: 'inbox', tone: 'blue', text: `${fullName(a.student)}: «${a.posting.title}» зарт хүсэлт илгээсэн. Шийдвэрлэнэ үү.`, href: `/org_rep/applications/${a.id}`, action: 'Шийдэх' });
  }
  for (const i of interns.filter((x) => x.assignable && !x.mentor)) {
    items.push({ icon: 'users', tone: 'amber', text: `${fullName(i.student)}: дадлага удирдагч томилоогүй байна.`, href: `/org_rep/interns/${i.id}`, action: 'Томилох' });
  }
  return items;
}
