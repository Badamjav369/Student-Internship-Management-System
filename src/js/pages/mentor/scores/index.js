// Байгууллагын үнэлгээ: оюутан бүрийн байгууллагын оноо оруулсан эсэх. Таны оруулах нь эхэндээ.
import { nameOf, studentLine } from '../../../core/labels.js';
import { listMyInternships } from '../../../data/mentor-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { NO_INTERNS, orgBadge } from '../shared.js';

const GROUPS = [
  ['todo', 'Оруулах', (i) => i.score.enterable && i.score.org_status === 'none'],
  ['review', 'Тэнхим шалгаж буй', (i) => i.score.org_status === 'unconfirmed'],
  ['done', 'Баталгаажсан', (i) => i.score.org_status === 'confirmed'],
  ['wait', 'Хугацаа болоогүй', (i) => !i.score.enterable && i.score.org_status === 'none'],
  ['all', 'Бүгд', () => true],
];

const row = (i) => rowCard({
  lead: personAvatar(i.student), title: nameOf(i.student), href: i.score.enterable || i.score.org_status !== 'none' ? `/mentor/scores/${i.id}` : `/mentor/students/${i.id}`,
  lines: [studentLine(i.student), i.score.total !== null ? `Оруулсан оноо: ${i.score.total} / ${i.score.max}` : null, i.score.return_reason ? `Тэнхим буцаасан: ${i.score.return_reason}` : null],
  side: orgBadge(i.score),
});

export async function render() {
  return queuePage({ title: 'Байгууллагын үнэлгээ', noun: 'оюутан', interns: await listMyInternships(), groups: GROUPS, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: NO_INTERNS });
}
