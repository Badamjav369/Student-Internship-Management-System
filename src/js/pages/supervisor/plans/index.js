// Ажлын төлөвлөгөө: оюутнуудын илгээсэн төлөвлөгөө. Батлах шийдвэрийг дадлага удирдагч гаргана; багш харж, зөвлөгөө бичнэ.
import { formatRange } from '../../../core/format.js';
import { nameOf, PLAN_LABELS, PLAN_TONES, studentLine } from '../../../core/labels.js';
import { listMyInternships } from '../../../data/supervisor-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge } from '../../../components/status-badge.js';
import { NO_STUDENTS } from '../shared.js';

const GROUPS = [
  ['submitted', 'Илгээсэн', (i) => i.plan?.status === 'submitted'],
  ['approved', 'Батлагдсан', (i) => i.plan?.status === 'approved'],
  ['none', 'Илгээгээгүй', (i) => !i.plan],
  ['all', 'Бүгд', () => true],
];

const row = (i) => rowCard({
  lead: personAvatar(i.student), title: nameOf(i.student), href: i.plan ? `/supervisor/plans/${i.id}` : `/supervisor/students/${i.id}`,
  lines: [studentLine(i.student), i.organization ? `${i.organization.name} · ${formatRange(i.start_date, i.end_date)}` : null],
  side: i.plan ? badge(PLAN_LABELS[i.plan.status], PLAN_TONES[i.plan.status]) : badge('Илгээгээгүй'),
});

export async function render() {
  return queuePage({ title: 'Ажлын төлөвлөгөө', noun: 'оюутан', interns: await listMyInternships(), groups: GROUPS, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: NO_STUDENTS });
}
