// Удирдамж: удирдагч багшийн нийтэлсэн зарлал (шинэ нь эхэнд), тэнхимийн оруулсан заавар, маягтын файлууд. Хоёр хэсэг нь өөрийн табтай.
// Дизайн нь «Дадлагын байгууллага» хуудастай нэг хэлтэй: табын тоо, хүний карт, баримтын хавтан.
import { h, pageHead, replace } from '../../core/dom.js';
import { downloadButton } from '../../core/files.js';
import { sizeLabel } from '../../core/format.js';
import { TEMPLATE_LABELS } from '../../core/labels.js';
import { busy } from '../../core/forms.js';
import { tabs } from '../../core/tabs.js';
import { getDashboard, listAnnouncements, listTemplates } from '../../data/student-api.js';
import { announcementCard } from '../../components/announcement-card.js';
import { emptyState } from '../../components/empty-state.js';
import { docTile, noInternship } from './shared.js';

const PAGE = 2;
const KIND_LOOK = { guide: ['book', 'violet'], report: ['report', 'blue'], form: ['contract', 'amber'] };

export async function render() {
  const dash = await getDashboard();
  if (!dash.internship) return noInternship('Удирдамж', 'megaphone');
  const [first, templates] = await Promise.all([listAnnouncements({ limit: PAGE, offset: 0 }), listTemplates()]);
  const items = [...first.items];
  const list = h('div', { class: 'stack' });
  const more = h('button', { class: 'button secondary', type: 'button' }, 'Өмнөх зарлал');
  more.addEventListener('click', () => busy(more, async () => {
    const next = await listAnnouncements({ limit: PAGE, offset: items.length });
    items.push(...next.items);
    draw(next.items[0]?.id);
  }));

  function draw(focusId) {
    if (items.length === 0) { replace(list, emptyState('Зарлал алга', null, { icon: 'megaphone' })); return; }
    replace(list, items.map((a) => announcementCard(a)), items.length < first.total ? h('div', { class: 'pager' }, more) : null);
    if (focusId) { const el = list.querySelector(`#a-${focusId}`); el?.setAttribute('tabindex', '-1'); el?.focus(); }
  }
  draw();

  const files = templates.filter((t) => t.kind !== 'plan');
  const head = pageHead('Удирдамж');
  if (files.length === 0) return h('section', {}, head, list);
  const fileTiles = h('div', { class: 'fact-grid' }, files.map((t) => {
    const [iconName, tone] = KIND_LOOK[t.kind] ?? ['paperclip', 'violet'];
    return docTile({ iconName, tone, label: `${TEMPLATE_LABELS[t.kind] ?? 'Файл'} · ${sizeLabel(t.file_size)}`, name: t.file_name, action: downloadButton('Татах', t.file_name, 'button secondary small', t.file_id) });
  }));
  return h('section', {}, head, tabs([
    { label: 'Зарлал', icon: 'megaphone', panel: list, count: first.total },
    { label: 'Заавар, маягт', icon: 'report', panel: fileTiles, count: files.length },
  ], { label: 'Удирдамжийн хэсгүүд' }));
}
