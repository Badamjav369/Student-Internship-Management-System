// Гэрээнд гарын үсэг зурах (дадлага удирдагч): гурван талын төлөв, өөрийн гарын үсэг, байгууллагын тамга. :id — дадлагын дугаар.
import { h } from '../../../core/dom.js';
import { CONTRACT_LABELS, CONTRACT_TONES, nameOf } from '../../../core/labels.js';
import { getContract, saveSeal } from '../../../data/mentor-api.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { organizationTile, periodTile } from '../../../components/contract-view.js';
import { sealManager, signingApi, signingPanel } from '../../../components/contract-signing.js';
import { studentHead } from '../../../components/student-head.js';
import { badge } from '../../../components/status-badge.js';

export async function render({ params, refresh }) {
  let c;
  try { c = await getContract(params.id); } catch { return missing('Гэрээ олдсонгүй', '/mentor/contracts'); }
  const { contract } = c;
  const seal = contract.signing.can_sign ? sealManager(c.organization?.seal ?? null, async (image) => { await saveSeal(image); refresh(); }) : null;
  return h('div', { class: 'stack' }, backLink('/mentor/contracts', 'Гуравласан гэрээ'),
    studentHead(c.student, badge(CONTRACT_LABELS[contract.status], CONTRACT_TONES[contract.status])),
    h('div', { class: 'fact-grid' }, organizationTile(c.organization?.name), periodTile(c.start_date, c.end_date)),
    signingPanel({ contract, api: signingApi(`/mentor/contracts/${c.id}`), onChange: refresh, reload: async () => (await getContract(params.id)).contract, seal }));
}
