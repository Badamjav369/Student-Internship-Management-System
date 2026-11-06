// Гуравласан гэрээ: оюутнуудын байршуулсан гарын үсэг, тамгатай скан. Шалгах нь эхэндээ.
import { formatDate } from '../../../core/format.js';
import { CONTRACT_LABELS, CONTRACT_TONES, nameOf, studentLine } from '../../../core/labels.js';
import { listContracts } from '../../../data/head-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge } from '../../../components/status-badge.js';

const is = (status) => (c) => c.contract.status === status;
const GROUPS = [
  ['scanned', 'Шалгах', is('scanned')],
  ['signing', 'Гарын үсэг цуглуулж буй', is('signing')],
  ['approved', 'Баталгаажсан', is('approved')],
  ['returned', 'Буцаасан', is('returned')],
  ['all', 'Бүгд', () => true],
];

const row = (c) => rowCard({
  lead: personAvatar(c.student), title: nameOf(c.student), href: `/head/contracts/${c.id}`,
  lines: [studentLine(c.student), c.organization?.name, c.contract.uploaded_at ? `Скан байршуулсан: ${formatDate(c.contract.uploaded_at.slice(0, 10))}` : `Гарын үсэг ${c.contract.signing?.count ?? 0}/3`],
  side: badge(CONTRACT_LABELS[c.contract.status], CONTRACT_TONES[c.contract.status]),
});

export async function render() {
  return queuePage({ title: 'Гуравласан гэрээ', noun: 'гэрээ', interns: await listContracts(), groups: GROUPS, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: 'Оюутан гарын үсэг, тамгатай скан хувийг байршуулахад энд харагдана.' });
}
