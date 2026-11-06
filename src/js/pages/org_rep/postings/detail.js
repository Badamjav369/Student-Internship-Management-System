// Зарын дэлгэрэнгүй: мэдээлэл харах, засах, хаах. Зарт ирсэн хүсэлтүүд доор.
import { h } from '../../../core/dom.js';
import { formatDate, formatRange } from '../../../core/format.js';
import { icon } from '../../../core/icons.js';
import { nameOf, studentLine } from '../../../core/labels.js';
import { closePosting, getPosting, listApplications, orgRepToday, updatePosting } from '../../../data/org-rep-api.js';
import { actionButton } from '../../../components/action-button.js';
import { backLink } from '../../../components/back-link.js';
import { missing } from '../../../components/empty-state.js';
import { factTile } from '../../../components/facts.js';
import { leadIcon, rowCard, rowList } from '../../../components/list.js';
import { personAvatar } from '../../../components/person.js';
import { badge } from '../../../components/status-badge.js';
import { toast } from '../../../components/toast-region.js';
import { APPLICATION_LABELS, APPLICATION_TONES, POSTING_LABELS, POSTING_TONES } from '../shared.js';
import { postingForm } from './form.js';

const applicants = (list) => h('section', { class: 'panel', 'aria-labelledby': 'h-apps' }, h('h2', { id: 'h-apps' }, 'Ирсэн хүсэлт'),
  list.length ? rowList('Ирсэн хүсэлт', list.map((a) => rowCard({
    lead: personAvatar(a.student), title: nameOf(a.student), href: `/org_rep/applications/${a.id}`, lines: [studentLine(a.student), formatDate(a.submitted_at.slice(0, 10))],
    side: badge(APPLICATION_LABELS[a.status], APPLICATION_TONES[a.status]),
  }))) : h('p', { class: 'muted' }, 'Хүсэлт ирээгүй байна.'));

export async function render({ params, refresh }) {
  let p;
  try { p = await getPosting(params.id); } catch { return missing('Зар олдсонгүй', '/org_rep/postings'); }
  const list = (await listApplications()).filter((a) => a.posting.id === p.id);
  const open = p.status === 'open';

  const view = h('div', { class: 'stack' },
    h('div', { class: 'fact-grid' },
      factTile('users', 'blue', 'Орон тоо', h('strong', {}, `${p.accepted_count} / ${p.positions}`)),
      factTile('calendar', 'amber', 'Дадлагын хугацаа', h('strong', {}, formatRange(p.start_date, p.end_date))),
      factTile('clock', 'rose', 'Хүсэлт авах эцсийн өдөр', h('strong', {}, formatDate(p.apply_deadline))),
      factTile('tag', 'green', 'Хөтөлбөр', h('strong', {}, p.programs.length ? p.programs.join(', ') : 'Бүх хөтөлбөр'))),
    p.requirements ? h('section', { class: 'panel', 'aria-labelledby': 'h-req' }, h('h2', { id: 'h-req' }, 'Шаардлага, хийх ажил'), h('p', { class: 'prose' }, p.requirements)) : null);

  const form = open ? postingForm({
    posting: p, today: orgRepToday(), onCancel: () => setEdit(false),
    onSave: async (data) => { await updatePosting(p.id, data); toast('Зарын өөрчлөлт хадгалагдлаа.'); refresh(); },
  }) : null;
  const wrap = form ? h('section', { class: 'panel', hidden: true, 'aria-label': 'Зар засах' }, form) : null;
  const edit = h('button', { class: 'button secondary', type: 'button', on: { click: () => setEdit(true) } }, icon('edit', 18), 'Засах');
  function setEdit(on) { wrap.hidden = !on; view.hidden = on; edit.hidden = on; if (on) form.querySelector('input').focus(); }

  const close = actionButton('Хаах', {
    variant: 'danger', iconName: 'close', run: () => closePosting(p.id), done: 'Зар хаагдлаа.', after: refresh,
    confirm: { title: 'Зарыг хаах уу?', body: [`«${p.title}» зар оюутнуудад харагдахаа болино. Ирсэн хүсэлтүүд хэвээр үлдэнэ.`], confirmLabel: 'Хаах' },
  });
  const head = h('section', { class: 'panel profile-head', 'aria-label': 'Зар' }, leadIcon('megaphone', open ? 'violet' : 'blue'),
    h('div', { class: 'profile-text' }, h('h1', { tabindex: '-1' }, p.title), p.field ? h('p', { class: 'muted' }, p.field) : null, badge(POSTING_LABELS[p.status], POSTING_TONES[p.status])),
    open ? h('div', { class: 'actions' }, edit, close) : null);
  return h('div', { class: 'stack' }, backLink('/org_rep/postings', 'Дадлагын зар'), head, view, wrap, applicants(list));
}
