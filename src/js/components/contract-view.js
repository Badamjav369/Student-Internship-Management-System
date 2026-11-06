// Гуравласан гэрээний нэгдсэн харагдац: оюутан, тэнхмийн эрхлэгчийн хуудсанд яг ижил (ирээдүйд бусад талд ч дахин ашиглана).
// Буцаасан/баталгаажсан зурвас, гэрээ ба скан хувийн хавтан (буланд төлөв). extra — тухайн талд нэмэлт хавтан (хугацаа, байгууллага).
// Скан хувийн файл оюутан байршуулсны дараа л бий болно (өмнө нь нэр, татах товчгүй).
import { h } from '../core/dom.js';
import { downloadButton } from '../core/files.js';
import { formatDate, formatRange } from '../core/format.js';
import { banner } from './banner.js';
import { docTile } from './doc-tile.js';
import { factTile } from './facts.js';

const SCAN_STATE = {
  filled: { text: 'Байршуулаагүй', tone: 'none' }, scanned: { text: 'Байршуулсан', tone: 'done' },
  approved: { text: 'Байршуулсан', tone: 'done' }, returned: { text: 'Буцаагдсан', tone: 'attention' },
};
const day = (iso) => formatDate(iso.slice(0, 10));

/** Хугацаа, байгууллагын хавтан (эрхлэгчийн хуудсанд). */
export const periodTile = (from, to) => factTile('calendar', 'amber', 'Дадлагын хугацаа', h('strong', {}, from ? formatRange(from, to) : '—'));
export const organizationTile = (name) => factTile('building', 'blue', 'Байгууллага', h('strong', {}, name ?? '—'));

/** returnedBy — буцаасан шалтгааны өмнөх бичвэр. */
export function contractView(c, { returnedBy = 'Буцаасан', extra = [] } = {}) {
  const notice = c.status === 'returned' ? banner('error', h('strong', {}, `${returnedBy}: `), c.return_reason)
    : c.status === 'approved' && c.approved_at ? banner('success', `Гэрээ ${day(c.approved_at)}-нд баталгаажсан.`) : null;
  return [
    notice,
    h('div', { class: 'fact-grid' },
      docTile({ iconName: 'contract', tone: 'violet', label: 'Гэрээ', name: c.pdf_ready === false ? null : c.pdf_name, empty: '—',
        state: c.pdf_ready === false ? { text: 'Бэлтгэгдэж байна', tone: 'pending' } : { text: 'Бэлэн', tone: 'done' },
        action: downloadButton('Татах', c.pdf_name, 'button secondary small', c.pdf_url ?? null) }),
      docTile({ iconName: 'paperclip', tone: c.status === 'returned' ? 'rose' : 'green', label: 'Скан хувь', name: c.scan_name, empty: '—', state: SCAN_STATE[c.status],
        date: c.uploaded_at ?? null, action: downloadButton('Татах', c.scan_name, 'button secondary small', c.scan_file_id ?? null) }),
      ...extra),
    c.voided ? banner('info', `Өмнөх ${c.voided} гэрээ хүчингүй болсон (дадлагын газар өөрчлөгдсөн).`) : null,
  ];
}
