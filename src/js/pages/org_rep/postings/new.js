// Шинэ зар нийтлэх.
import { h, pageHead } from '../../../core/dom.js';
import { createPosting, orgRepToday } from '../../../data/org-rep-api.js';
import { backLink } from '../../../components/back-link.js';
import { toast } from '../../../components/toast-region.js';
import { postingForm } from './form.js';

export async function render({ navigate }) {
  const form = postingForm({
    today: orgRepToday(),
    onSave: async (data) => {
      const { id } = await createPosting(data);
      toast('Зар нийтлэгдлээ.');
      navigate(`/org_rep/postings/${id}`);
    },
  });
  return h('div', { class: 'stack' }, backLink('/org_rep/postings', 'Дадлагын зар'), pageHead('Шинэ зар'), h('section', { class: 'panel' }, form));
}
