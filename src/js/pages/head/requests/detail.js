// Газрын хүсэлт шийдэх: оюутны санал болгосон газар эсвэл гадаадад хийх дадлагыг зөвшөөрөх, эсвэл шалтгаантай татгалзах. :id — дадлагын дугаар.
import { h } from '../../../core/dom.js';
import { fileButton } from '../../../core/files.js';
import { formatDate, formatRange } from '../../../core/format.js';
import { nameOf, REQUEST_KINDS } from '../../../core/labels.js';
import { approveRequest, getRequest, rejectRequest } from '../../../data/head-api.js';
import { backLink } from '../../../components/back-link.js';
import { banner } from '../../../components/banner.js';
import { missing } from '../../../components/empty-state.js';
import { factTile } from '../../../components/facts.js';
import { studentHead } from '../../../components/student-head.js';
import { badge } from '../../../components/status-badge.js';
import { decisionPanel, REQUEST_LABELS, REQUEST_TONES } from '../shared.js';

const day = (iso) => formatDate(iso.slice(0, 10));

export async function render({ params, refresh }) {
  let r;
  try { r = await getRequest(params.id); } catch { return missing('Хүсэлт олдсонгүй', '/head/requests'); }
  const q = r.request;
  const name = nameOf(r.student);
  const notice = q.status === 'rejected' ? banner('error', `Таны татгалзсан шалтгаан: ${q.decision_reason}`)
    : ['approved', 'registered'].includes(q.status) ? banner('success', `Хүсэлтийг ${day(q.decided_at)}-нд зөвшөөрсөн.`)
      : q.status === 'cancelled' ? banner('info', 'Хүсэлт цуцлагдсан.') : null;
  return h('div', { class: 'stack' }, backLink('/head/requests', 'Газрын хүсэлт'),
    studentHead(r.student, badge(REQUEST_LABELS[q.status], REQUEST_TONES[q.status])), notice,
    h('div', { class: 'fact-grid' },
      factTile(q.kind === 'abroad' ? 'globe' : 'building', 'violet', REQUEST_KINDS[q.kind], h('strong', {}, q.organization_name)),
      q.country ? factTile('globe', 'blue', 'Улс', h('strong', {}, q.country)) : null,
      factTile('calendar', 'amber', 'Дадлагын хугацаа', h('strong', {}, formatRange(q.start_date, q.end_date))),
      q.contact ? factTile(q.contact.includes('@') ? 'mail' : 'phone', 'green', 'Холбоо барих', h('strong', {}, q.contact)) : null),
    h('section', { class: 'panel', 'aria-labelledby': 'h-desc' }, h('h2', { id: 'h-desc' }, 'Тайлбар'), h('p', {}, q.description),
      q.document_name ? h('div', { class: 'actions' }, fileButton({ id: q.document_file_id, name: q.document_name })) : null),
    q.status === 'pending' ? decisionPanel({
      after: refresh,
      approve: { label: 'Зөвшөөрөх', run: () => approveRequest(r.id), done: 'Зөвшөөрлөө. Тэнхимийн админ дадлагын газрыг бүртгэнэ.',
        confirm: { title: 'Хүсэлтийг зөвшөөрөх үү?', body: [`${name} оюутан «${q.organization_name}»-д дадлага хийхийг зөвшөөрнө.`] } },
      reject: { label: 'Татгалзах', run: (reason) => rejectRequest(r.id, reason), done: 'Татгалзлаа. Оюутан өөр газар хайна.' },
    }) : null);
}
