// Дадлагажигчид: дадлагын хугацаа, төлөвлөгөө, дэвтрийн явц, үнэлгээний товч байдал. Дэлгэрэнгүйг оюутан дээр дарж үзнэ.
import { h } from '../../../core/dom.js';
import { formatRange } from '../../../core/format.js';
import { INTERNSHIP_LABELS, nameOf, PLAN_LABELS, studentLine } from '../../../core/labels.js';
import { listMyInternships } from '../../../data/mentor-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge, statusBadge } from '../../../components/status-badge.js';
import { NO_INTERNS } from '../shared.js';

function row(i) {
  const chips = [i.features.logbook ? `Дэвтэр ${i.logbook.days_done}/${i.logbook.planned_days}` : null, i.features.plan && i.plan ? `Төлөвлөгөө: ${PLAN_LABELS[i.plan.status].toLowerCase()}` : null].filter(Boolean);
  return rowCard({
    lead: personAvatar(i.student), title: nameOf(i.student), href: `/mentor/students/${i.id}`,
    lines: [studentLine(i.student), i.start_date ? `Дадлага ${formatRange(i.start_date, i.end_date)}` : 'Дадлагын хугацаа тогтоогдоогүй'], chips,
    side: h('div', { class: 'row-stack' }, statusBadge(i.status), i.logbook.reviewable && i.logbook.unreviewed ? badge(`Хянаагүй ${i.logbook.unreviewed}`, 'pending') : null),
  });
}

export async function render() {
  const interns = await listMyInternships();
  const statuses = Object.keys(INTERNSHIP_LABELS).filter((s) => interns.some((i) => i.status === s));
  const groups = [['all', 'Бүгд', () => true], ...statuses.map((s) => [s, INTERNSHIP_LABELS[s], (i) => i.status === s])];
  return queuePage({ title: 'Дадлагажигчид', noun: 'оюутан', interns, groups, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: NO_INTERNS });
}
