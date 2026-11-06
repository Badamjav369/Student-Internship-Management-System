// Дадлагажигчид: байгууллагад дадлага хийх оюутнууд, дадлага удирдагч. Томилох нь эхэндээ.
import { h } from '../../../core/dom.js';
import { formatRange } from '../../../core/format.js';
import { INTERNSHIP_LABELS, nameOf, studentLine } from '../../../core/labels.js';
import { listInterns } from '../../../data/org-rep-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge, statusBadge } from '../../../components/status-badge.js';

const row = (i) => rowCard({
  lead: personAvatar(i.student), title: nameOf(i.student), href: `/org_rep/interns/${i.id}`,
  lines: [studentLine(i.student), i.start_date ? `Дадлага ${formatRange(i.start_date, i.end_date)}` : null, i.mentor ? `Дадлага удирдагч: ${nameOf(i.mentor)}` : null],
  side: h('div', { class: 'row-stack' }, statusBadge(i.status), i.mentor ? null : badge('Удирдагчгүй', 'pending')),
});

export async function render() {
  const interns = await listInterns();
  const statuses = Object.keys(INTERNSHIP_LABELS).filter((s) => interns.some((i) => i.status === s));
  const groups = [['nomentor', 'Удирдагчгүй', (i) => !i.mentor && i.assignable], ['all', 'Бүгд', () => true], ...statuses.map((s) => [s, INTERNSHIP_LABELS[s], (i) => i.status === s])];
  return queuePage({
    title: 'Дадлагажигчид', noun: 'оюутан', interns, groups, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.',
    none: 'Оюутны хүсэлтийг хүлээн авбал дадлагажигчаар энд харагдана.', extra: (i) => i.mentor && nameOf(i.mentor), placeholder: 'Нэр, код, дадлага удирдагч',
  });
}
