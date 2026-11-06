// Байгууллагын мэдээлэл: байгууллага өөрөө лого, нэр, холбоо барих мэдээлэл, танилцуулгаа засна (админтай ижил маягт).
import { h, pageHead } from '../../core/dom.js';
import { getMyOrganization, removeLogo, updateOrganization, uploadLogo } from '../../data/org-rep-api.js';
import { emptyState } from '../../components/empty-state.js';
import { orgEditor } from '../../components/org-editor.js';

export async function render() {
  const { organization } = await getMyOrganization();
  if (!organization) return h('div', { class: 'stack' }, pageHead('Байгууллага'), emptyState('Байгууллага холбогдоогүй', 'Тэнхимд хандаж өөрийн эрхийг байгууллагатай холбуулна уу.', { icon: 'building' }));
  return orgEditor({ org: organization, api: { update: updateOrganization, uploadLogo, removeLogo, reload: async () => (await getMyOrganization()).organization } });
}
