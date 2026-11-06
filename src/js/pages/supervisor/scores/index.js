// Оноо, эцсийн дүн: оюутан бүрийн байгууллага, комиссын онооны төлөв. Таны шийдэх нь эхэндээ.
import { num } from '../../../core/format.js';
import { nameOf, studentLine } from '../../../core/labels.js';
import { listMyInternships } from '../../../data/supervisor-api.js';
import { rowCard } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { queuePage } from '../../../components/queue-page.js';
import { badge } from '../../../components/status-badge.js';
import { NO_STUDENTS, RECORD_LABELS, RECORD_TONES, scoreAction } from '../shared.js';

const GROUPS = [
  ['todo', 'Шийдэх', (i) => Boolean(scoreAction(i))],
  ['waiting', 'Хүлээж буй', (i) => i.score?.status === 'open' && !scoreAction(i)],
  ['done', 'Дууссан', (i) => i.score?.status === 'closed'],
  ['all', 'Бүгд', (i) => Boolean(i.score)],
];

function row(i) {
  const s = i.score;
  const result = s.mark ? `Хамгаалаагүй: ${s.mark}` : s.total !== null ? `Нийт оноо: ${num(s.total)}` : null;
  return rowCard({
    lead: personAvatar(i.student), title: nameOf(i.student), href: `/supervisor/scores/${i.id}`,
    lines: [studentLine(i.student), result], side: badge(RECORD_LABELS[s.status], RECORD_TONES[s.status]),
  });
}

export async function render() {
  return queuePage({ title: 'Оноо, эцсийн дүн', noun: 'оюутан', interns: (await listMyInternships()).filter((i) => i.score), groups: GROUPS, row, emptyText: 'Хайлт, төлвөө өөрчилж үзнэ үү.', none: NO_STUDENTS });
}
