// Дүнгийн хуудас: эцсийн дүн гарах бүрт систем PDF, Excel хуудсыг шинэчилнэ. Улирал бүрт нэг.
import { h, pageHead } from '../../core/dom.js';
import { downloadButton } from '../../core/files.js';
import { formatDateTime } from '../../core/format.js';
import { icon } from '../../core/icons.js';
import { SEASONS } from '../../core/labels.js';
import { listGradeSheets } from '../../data/supervisor-api.js';
import { emptyState } from '../../components/empty-state.js';
import { rowCard, rowList } from '../../components/list.js';

export async function render() {
  const sheets = await listGradeSheets();
  return h('div', { class: 'stack' }, pageHead('Дүнгийн хуудас'),
    sheets.length ? rowList('Дүнгийн хуудсууд', sheets.map((s) => rowCard({
      lead: h('span', { class: 'tile tile-green', 'aria-hidden': 'true' }, icon('chart', 22)), title: `${s.academic_year} · ${SEASONS[s.season]} улирал`,
      lines: [`Сүүлд шинэчлэгдсэн: ${formatDateTime(s.generated_at)}`],
      actions: h('div', { class: 'actions' }, downloadButton('PDF', s.pdf, 'button secondary', s.pdf_url ?? null), downloadButton('Excel', s.xlsx, 'button secondary', s.xlsx_url ?? null)),
    }))) : emptyState('Дүнгийн хуудас алга', 'Эхний эцсийн дүн гарсны дараа энд үүснэ.', { icon: 'chart' }));
}
