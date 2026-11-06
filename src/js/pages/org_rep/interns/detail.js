// Дадлагажигч: дадлагын хугацаа, дадлага удирдагч. Дадлага эхлэхээс өмнө дадлага удирдагч томилно/солино. :id — дадлагын дугаар.
import { h } from '../../../core/dom.js';
import { field, formRow, EMAIL, onSubmit, setFieldError, showErrors, values } from '../../../core/forms.js';
import { formatRange } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { nameOf } from '../../../core/labels.js';
import { assignMentor, getIntern, listMentorCandidates } from '../../../data/org-rep-api.js';
import { backLink } from '../../../components/back-link.js';
import { banner } from '../../../components/banner.js';
import { missing } from '../../../components/empty-state.js';
import { factTile } from '../../../components/facts.js';
import { statusBadge } from '../../../components/status-badge.js';
import { studentHead } from '../../../components/student-head.js';
import { toast } from '../../../components/toast-region.js';

const NEW = 'new';
const labelOf = (u) => (u.self ? `Би өөрөө (${nameOf(u)})` : [nameOf(u), u.position].filter(Boolean).join(' · '));

function assignPanel(i, people, refresh) {
  const options = [...(i.mentor ? [] : [{ value: '', label: 'Сонгоно уу' }]), ...people.map((u) => ({ value: String(u.id), label: labelOf(u) })), { value: NEW, label: 'Шинэ хүн урих' }];
  const pick = field({ label: 'Дадлага удирдагч', name: 'mentor_id', type: 'select', options, value: String(i.mentor?.id ?? '') });
  const fresh = h('div', { class: 'stack-tight', hidden: true },
    formRow(field({ label: 'Овог', name: 'last_name', maxlength: 60, autocomplete: 'off' }), field({ label: 'Нэр', name: 'first_name', maxlength: 60, autocomplete: 'off' })),
    formRow(field({ label: 'И-мэйл', name: 'email', type: 'email', maxlength: 120, autocomplete: 'off' }), field({ label: 'Албан тушаал', name: 'position', maxlength: 100, autocomplete: 'off' })));
  pick.querySelector('select').addEventListener('change', (e) => { fresh.hidden = e.target.value !== NEW; });
  const submit = h('button', { class: 'button', type: 'submit' }, icon('check', 18), i.mentor ? 'Солих' : 'Томилох');
  const form = h('form', { class: 'form', novalidate: true, 'aria-label': 'Дадлага удирдагч томилох' },
    pick, fresh,
    h('div', { class: 'actions form-submit' }, submit));
  onSubmit(form, submit, async () => {
    const v = values(form);
    if (!v.mentor_id) { setFieldError(form, 'mentor_id', 'Дадлага удирдагчаа сонгоно уу.'); form.elements.mentor_id.focus(); return; }
    if (v.mentor_id !== NEW) {
      if (Number(v.mentor_id) === i.mentor?.id) { toast('Өөрчлөлт алга.'); return; }
      await assignMentor(i.id, { mentor_id: Number(v.mentor_id) });
      toast('Дадлага удирдагч томилогдлоо.');
      refresh();
      return;
    }
    const errors = {};
    if (!v.last_name.trim()) errors.last_name = 'Овог бичнэ үү.';
    if (!v.first_name.trim()) errors.first_name = 'Нэр бичнэ үү.';
    if (!EMAIL.test(v.email.trim())) errors.email = 'И-мэйл хаяг буруу байна.';
    if (Object.keys(errors).length) { showErrors(form, errors); return; }
    await assignMentor(i.id, { person: { last_name: v.last_name, first_name: v.first_name, email: v.email, position: v.position } });
    toast('Дадлага удирдагч томилогдлоо. Урилга илгээгдсэн.');
    refresh();
  });
  return h('section', { class: 'panel', 'aria-labelledby': 'h-mentor' }, h('h2', { id: 'h-mentor' }, i.mentor ? 'Дадлага удирдагч солих' : 'Дадлага удирдагч томилох'), form);
}

export async function render({ params, refresh }) {
  let i;
  try { i = await getIntern(params.id); } catch { return missing('Дадлагажигч олдсонгүй', '/org_rep/interns'); }
  const people = i.assignable ? await listMentorCandidates() : [];
  return h('div', { class: 'stack' }, backLink('/org_rep/interns', 'Дадлагажигчид'), studentHead(i.student, statusBadge(i.status)),
    h('div', { class: 'fact-grid' },
      factTile('calendar', 'amber', 'Дадлагын хугацаа', h('strong', {}, i.start_date ? formatRange(i.start_date, i.end_date) : '—')),
      factTile('user', 'blue', 'Дадлага удирдагч', i.mentor ? h('strong', {}, nameOf(i.mentor)) : h('strong', { class: 'muted' }, 'Томилоогүй'),
        i.mentor?.position ? h('span', { class: 'muted' }, i.mentor.position) : null)),
    i.assignable ? assignPanel(i, people, refresh) : (i.mentor ? null : banner('info', 'Дадлага эхэлсэн тул дадлага удирдагч томилох боломжгүй.')));
}
