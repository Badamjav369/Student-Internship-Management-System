// Оюутны хүсэлт: зарт ирсэн хүсэлтүүд. Шийдэх нь эхэндээ.
import { formatDate } from '../../../core/format.js';
import { nameOf, studentLine } from '../../../core/labels.js';
import { listApplications } from '../../../data/org-rep-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge } from '../../../components/status-badge.js';
import { APPLICATION_LABELS, APPLICATION_TONES } from '../shared.js';

const GROUPS = [
  ['pending', 'Шийдэх', (a) => a.status === 'pending'],
  ['accepted', 'Хүлээн авсан', (a) => a.status === 'accepted'],
  ['other', 'Татгалзсан, цуцалсан', (a) => ['rejected', 'cancelled'].includes(a.status)],
  ['all', 'Бүгд', () => true],
];

const row = (a) => rowCard({
  lead: personAvatar(a.student), title: nameOf(a.student), href: `/org_rep/applications/${a.id}`,
  lines: [studentLine(a.student), `«${a.posting.title}» · ${formatDate(a.submitted_at.slice(0, 10))}`], side: badge(APPLICATION_LABELS[a.status], APPLICATION_TONES[a.status]),
});

export async function render() {
  return queuePage({
    title: 'Оюутны хүсэлт', noun: 'хүсэлт', interns: await listApplications(), groups: GROUPS, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.',
    none: 'Оюутан таны зарт хүсэлт илгээхэд энд харагдана.', extra: (a) => a.posting.title, placeholder: 'Нэр, код, зар',
  });
}
