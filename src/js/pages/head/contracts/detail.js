// Гэрээ шалгах: скан хувиас гарын үсэг, тамга бүрэн эсэхийг шалгаж баталгаажуулах эсвэл шалтгаантай буцаах.
// Харагдац нь оюутан, дадлага удирдагчийнхтай нэг (components/contract-view.js). :id — дадлагын дугаар.
import { h } from '../../../core/dom.js';
import { CONTRACT_LABELS, CONTRACT_TONES, nameOf } from '../../../core/labels.js';
import { approveContract, getContract, returnContract } from '../../../data/head-api.js';
import { backLink } from '../../../components/back-link.js';
import { contractView, organizationTile, periodTile } from '../../../components/contract-view.js';
import { missing } from '../../../components/empty-state.js';
import { studentHead } from '../../../components/student-head.js';
import { badge } from '../../../components/status-badge.js';
import { decisionPanel } from '../shared.js';
import { signingApi, signingPanel } from '../../../components/contract-signing.js';

export async function render({ params, refresh }) {
  let c;
  try { c = await getContract(params.id); } catch { return missing('Гэрээ олдсонгүй', '/head/contracts'); }
  const { contract } = c;
  const name = nameOf(c.student);
  return h('div', { class: 'stack' }, backLink('/head/contracts', 'Гуравласан гэрээ'),
    studentHead(c.student, badge(CONTRACT_LABELS[contract.status], CONTRACT_TONES[contract.status])),
    ...(contract.mode === 'touch' || contract.mode === 'digital' ? [
      contract.status === 'approved' ? contractView(contract)[0] : null,
      h('div', { class: 'fact-grid' }, organizationTile(c.organization?.name), periodTile(c.start_date, c.end_date)),
      signingPanel({ contract, api: signingApi(`/head/contracts/${c.id}`), onChange: refresh, reload: async () => (await getContract(params.id)).contract }),
      contract.status === 'signing' ? decisionPanel({
        after: refresh, reject: { label: 'Буцаах', run: (reason) => returnContract(c.id, reason), done: 'Гэрээг буцаалаа. Гарын үсгүүд цуцлагдаж, оюутан дахин сонгоно.' },
      }) : null,
    ] : [...contractView(contract, { returnedBy: 'Таны буцаасан шалтгаан', extra: [organizationTile(c.organization?.name), periodTile(c.start_date, c.end_date)] }),
    contract.status === 'scanned' ? decisionPanel({
      after: refresh,
      approve: { label: 'Баталгаажуулах', run: () => approveContract(c.id), done: 'Гэрээ баталгаажлаа.',
        confirm: { title: 'Гэрээг баталгаажуулах уу?', body: [`${name} оюутны гэрээ баталгаажиж, оюутан ажлын төлөвлөгөө бичих боломжтой болно.`] } },
      reject: { label: 'Буцаах', run: (reason) => returnContract(c.id, reason), done: 'Гэрээг буцаалаа. Оюутан засаж дахин байршуулна.' },
    }) : null]));
}
