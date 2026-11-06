// Байгууллагын жагсаалт (оюутнуудын санал болгосон, бүртгэгдсэн байгууллагууд).
import { h, pageHead } from '../../../core/dom.js';
import { listOrganizations } from '../../../data/admin-api.js';
import { emptyState } from '../../../components/empty-state.js';
import { searchBox } from '../../../components/filters.js';
import { liveList, rowCard } from '../../../components/list.js';
import { orgAvatar } from '../../../components/person.js';

export async function render() {
  const filters = { q: '' };
  const list = liveList({
    label: 'Байгууллагууд', noun: 'байгууллага', pageSize: 100,
    load: () => listOrganizations(filters),
    empty: () => emptyState('Байгууллага олдсонгүй', 'Хайлтаа өөрчилж үзнэ үү.', { icon: 'building' }),
    row: (o) => rowCard({
      lead: orgAvatar(o), title: o.name, href: `/admin/organizations/${o.id}`,
      lines: [o.field, [o.address, o.phone].filter(Boolean).join(' · ')], side: h('span', { class: 'chip' }, `РД ${o.register_no}`),
    }),
  });
  return h('div', { class: 'stack' }, pageHead('Байгууллага'),
    searchBox({ label: 'Байгууллага хайх', placeholder: 'Нэр, регистр, чиглэл', onSearch: (q) => { filters.q = q; list.reload(); } }), list);
}
