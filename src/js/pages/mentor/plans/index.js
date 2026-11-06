// Ажлын төлөвлөгөө: оюутнуудын илгээсэн төлөвлөгөө. Хянах хүлээж буй нь эхэндээ.
import { formatDate } from '../../../core/format.js';
import { nameOf, PLAN_LABELS, PLAN_TONES, studentLine } from '../../../core/labels.js';
import { listMyInternships } from '../../../data/mentor-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge } from '../../../components/status-badge.js';
import { NO_INTERNS } from '../shared.js';

const is = (status) => (i) => i.plan?.status === status;
const GROUPS = [
  ['submitted', 'Хянах', is('submitted')],
  ['approved', 'Батлагдсан', is('approved')],
  ['returned', 'Буцаасан', is('returned')],
  ['none', 'Илгээгээгүй', (i) => !i.plan],
  ['all', 'Бүгд', () => true],
];

const row = (i) => rowCard({
  lead: personAvatar(i.student), title: nameOf(i.student), href: i.plan ? `/mentor/plans/${i.id}` : `/mentor/students/${i.id}`,
  lines: [studentLine(i.student), i.start_date ? `Дадлага ${formatDate(i.start_date)} – ${formatDate(i.end_date)}` : null],
  side: i.plan ? badge(PLAN_LABELS[i.plan.status], PLAN_TONES[i.plan.status]) : badge('Илгээгээгүй'),
});

export async function render() {
  return queuePage({ title: 'Ажлын төлөвлөгөө', noun: 'оюутан', interns: await listMyInternships(), groups: GROUPS, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: NO_INTERNS });
}
