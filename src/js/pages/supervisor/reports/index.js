// Тайлан: оюутнуудын илгээсэн тайлан. Хянах хүлээж буй нь эхэндээ.
import { formatDate } from '../../../core/format.js';
import { nameOf, REPORT_LABELS, studentLine } from '../../../core/labels.js';
import { listMyInternships } from '../../../data/supervisor-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge, statusBadge } from '../../../components/status-badge.js';
import { NO_STUDENTS } from '../shared.js';

const is = (status) => (i) => i.report?.status === status;
const GROUPS = [
  ['submitted', 'Хянах', is('submitted')],
  ['revision', 'Засвар шаардсан', is('revision')],
  ['accepted', 'Хүлээн авсан', is('accepted')],
  ['waiting', 'Илгээгээгүй', (i) => !i.report || ['not_submitted', 'overdue'].includes(i.report.status)],
  ['all', 'Бүгд', () => true],
];

const row = (i) => rowCard({
  lead: personAvatar(i.student), title: nameOf(i.student), href: i.report ? `/supervisor/reports/${i.id}` : `/supervisor/students/${i.id}`,
  lines: [studentLine(i.student), i.report?.deadline ? `Хугацаа: ${formatDate(i.report.deadline)}` : null],
  side: i.report ? statusBadge(i.report.status, REPORT_LABELS) : badge('Эхлээгүй'),
});

export async function render() {
  return queuePage({ title: 'Тайлан', noun: 'оюутан', interns: await listMyInternships(), groups: GROUPS, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: NO_STUDENTS });
}
