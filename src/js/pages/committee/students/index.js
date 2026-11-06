// Оюутан, оноо: хуваарилагдсан оюутнууд хамгаалалтын цагаар. Төлвөөр шүүж, дарж материал үзээд оноо оруулна.
import { nameOf, studentLine } from '../../../core/labels.js';
import { listMyStudents } from '../../../data/committee-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { NO_STUDENTS, stateBadge, whenText } from '../shared.js';

const row = (s) => rowCard({
  lead: personAvatar(s.student), title: nameOf(s.student), href: `/committee/students/${s.id}`,
  lines: [studentLine(s.student), `${s.committee.name}${s.committee.is_chair ? ' (дарга)' : ''} · ${s.defense.order_no}-р ээлж · ${whenText(s.defense)}`],
  side: stateBadge(s),
});

export async function render() {
  const students = await listMyStudents();
  const groups = [['todo', 'Оноо өгөх', (s) => s.state === 'todo'], ['entered', 'Оноо оруулсан', (s) => s.state === 'entered'], ['done', 'Баталгаажсан', (s) => s.state === 'done'], ['all', 'Бүгд', () => true]];
  return queuePage({ title: 'Оюутан, оноо', noun: 'оюутан', interns: students, groups, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: NO_STUDENTS, extra: (s) => s.committee.name, placeholder: 'Нэр, код, комисс' });
}
