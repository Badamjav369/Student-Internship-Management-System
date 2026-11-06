// Гуравласан гэрээ (дадлага удирдагч): онлайнаар гарын үсэг зурах горимтой өөрт томилогдсон оюутнуудын гэрээ. Зурах ээлж ирсэн нь эхэндээ.
import { CONTRACT_LABELS, CONTRACT_TONES, nameOf, studentLine } from '../../../core/labels.js';
import { listContracts } from '../../../data/mentor-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge } from '../../../components/status-badge.js';

const GROUPS = [
  ['todo', 'Зурах', (c) => c.contract.signing?.can_sign],
  ['signing', 'Цуглуулж буй', (c) => c.contract.status === 'signing'],
  ['approved', 'Баталгаажсан', (c) => c.contract.status === 'approved'],
  ['all', 'Бүгд', () => true],
];
const row = (c) => rowCard({
  lead: personAvatar(c.student), title: nameOf(c.student), href: `/mentor/contracts/${c.id}`,
  lines: [studentLine(c.student), `Гарын үсэг ${c.contract.signing?.count ?? 0}/3`],
  side: c.contract.signing?.can_sign ? badge('Таны ээлж', 'attention') : badge(CONTRACT_LABELS[c.contract.status], CONTRACT_TONES[c.contract.status]),
});

export async function render() {
  return queuePage({ title: 'Гуравласан гэрээ', noun: 'гэрээ', interns: await listContracts(), groups: GROUPS, row, emptyText: 'Онлайнаар гарын үсэг зурах гэрээ алга.' });
}
