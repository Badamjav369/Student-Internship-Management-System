// Хүсэлт шийдэх: оюутны CV, танилцуулгыг үзээд хүлээн авах эсвэл татгалзах. :id — хүсэлтийн дугаар.
import { h } from '../../../core/dom.js';
import { fileButton } from '../../../core/files.js';
import { formatDate } from '../../../core/format.js';
import { nameOf } from '../../../core/labels.js';
import { acceptApplication, getApplication, rejectApplication } from '../../../data/org-rep-api.js';
import { actionButton } from '../../../components/action-button.js';
import { backLink } from '../../../components/back-link.js';
import { banner } from '../../../components/banner.js';
import { missing } from '../../../components/empty-state.js';
import { factTile } from '../../../components/facts.js';
import { badge } from '../../../components/status-badge.js';
import { studentHead } from '../../../components/student-head.js';
import { APPLICATION_LABELS, APPLICATION_TONES } from '../shared.js';

const day = (iso) => formatDate(iso.slice(0, 10));

export async function render({ params, refresh }) {
  let a;
  try { a = await getApplication(params.id); } catch { return missing('Хүсэлт олдсонгүй', '/org_rep/applications'); }
  const name = nameOf(a.student);
  const notice = a.status === 'accepted' ? banner('success', `Хүсэлтийг ${day(a.decided_at)}-нд хүлээн авсан.`)
    : a.status === 'rejected' ? banner('info', `Хүсэлтийг ${day(a.decided_at)}-нд татгалзсан.`)
      : a.status === 'cancelled' ? banner('info', 'Хүсэлт цуцлагдсан.') : null;
  const decide = a.status === 'pending' ? h('section', { class: 'panel', 'aria-labelledby': 'h-decision' }, h('h2', { id: 'h-decision' }, 'Шийдвэр'),
    h('div', { class: 'actions' },
      actionButton('Хүлээн авах', {
        variant: 'primary', iconName: 'check', run: () => acceptApplication(a.id), done: 'Хүлээн авлаа.', after: refresh,
        confirm: { title: 'Хүсэлтийг хүлээн авах уу?', body: [`${name}-ийг «${a.posting.title}» зарын дадлагажигчаар хүлээн авна. Оюутны бусад хүлээгдэж буй хүсэлт цуцлагдана.`] },
      }),
      actionButton('Татгалзах', {
        variant: 'danger', iconName: 'close', run: () => rejectApplication(a.id), done: 'Татгалзлаа.', after: refresh,
        confirm: { title: 'Хүсэлтээс татгалзах уу?', body: [`${name}-ийн «${a.posting.title}» зарт илгээсэн хүсэлтээс татгалзана.`] },
      }))) : null;
  return h('div', { class: 'stack' }, backLink('/org_rep/applications', 'Оюутны хүсэлт'),
    studentHead(a.student, badge(APPLICATION_LABELS[a.status], APPLICATION_TONES[a.status]),
      a.internship_id ? h('a', { class: 'button secondary', href: `#/org_rep/interns/${a.internship_id}` }, 'Дадлагажигч') : null),
    notice,
    h('div', { class: 'fact-grid' },
      factTile('megaphone', 'violet', 'Зар', h('strong', {}, h('a', { href: `#/org_rep/postings/${a.posting.id}` }, a.posting.title))),
      factTile('calendar', 'amber', 'Илгээсэн', h('strong', {}, day(a.submitted_at)))),
    h('section', { class: 'panel', 'aria-labelledby': 'h-cv' }, h('h2', { id: 'h-cv' }, 'CV, танилцуулга'),
      a.letter ? h('p', { class: 'prose' }, a.letter) : h('p', { class: 'muted' }, 'Танилцуулга бичээгүй.'),
      a.cv_name ? h('div', { class: 'actions' }, fileButton({ id: a.cv_file_id ?? null, name: a.cv_name })) : null),
    decide);
}
