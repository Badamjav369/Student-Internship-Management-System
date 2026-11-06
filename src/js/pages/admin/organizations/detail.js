// Байгууллагын дэлгэрэнгүй: лого, мэдээлэл засах (байгууллагын төлөөлөгчтэй ижил маягт), устгах.
import { h } from '../../../core/dom.js';
import { deleteOrganization, getOrganization, removeOrganizationLogo, updateOrganization, uploadOrganizationLogo } from '../../../data/admin-api.js';
import { actionButton } from '../../../components/action-button.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { orgEditor } from '../../../components/org-editor.js';

export async function render({ params, navigate }) {
  let org;
  try { org = await getOrganization(params.id); } catch { return missing('Байгууллага олдсонгүй', '/admin/organizations'); }
  const remove = actionButton('Устгах', { variant: 'danger', iconName: 'trash', confirm: { title: 'Байгууллагыг устгах уу?', body: [org.name], confirmLabel: 'Устгах' }, run: () => deleteOrganization(org.id), done: 'Байгууллага устгагдлаа.', after: () => navigate('/admin/organizations') });
  return h('div', { class: 'stack' }, backLink('/admin/organizations', 'Байгууллагууд'),
    orgEditor({ org, actions: [remove], api: {
      update: (body) => updateOrganization(org.id, body), uploadLogo: (file) => uploadOrganizationLogo(org.id, file),
      removeLogo: () => removeOrganizationLogo(org.id), reload: () => getOrganization(org.id) } }));
}
