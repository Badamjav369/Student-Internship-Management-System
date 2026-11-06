// Газрын хүсэлт: оюутны санал болгосон газар, гадаадад хийх дадлага. Шийдэх нь эхэндээ.
import { formatRange } from '../../../core/format.js';
import { nameOf, REQUEST_KINDS, studentLine } from '../../../core/labels.js';
import { listRequests } from '../../../data/head-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge } from '../../../components/status-badge.js';
import { REQUEST_LABELS, REQUEST_TONES } from '../shared.js';

const GROUPS = [
  ['pending', 'Шийдэх', (r) => r.request.status === 'pending'],
  ['approved', 'Зөвшөөрсөн', (r) => ['approved', 'registered'].includes(r.request.status)],
  ['rejected', 'Татгалзсан', (r) => r.request.status === 'rejected'],
  ['all', 'Бүгд', () => true],
];

const row = (r) => rowCard({
  lead: personAvatar(r.student), title: nameOf(r.student), href: `/head/requests/${r.id}`,
  lines: [studentLine(r.student), [r.request.organization_name, r.request.country].filter(Boolean).join(', '), `${REQUEST_KINDS[r.request.kind]} · ${formatRange(r.request.start_date, r.request.end_date)}`],
  side: badge(REQUEST_LABELS[r.request.status], REQUEST_TONES[r.request.status]),
});

export async function render() {
  return queuePage({ title: 'Газрын хүсэлт', noun: 'хүсэлт', interns: await listRequests(), groups: GROUPS, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: 'Оюутан санал болгосон газар эсвэл гадаадын дадлагын хүсэлт гаргахад энд харагдана.' });
}
