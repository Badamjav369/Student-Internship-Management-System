// Оюутны хуудсуудад давтагддаг жижиг хэсгүүд.
import { h, pageHead } from '../../core/dom.js';
import { emptyState } from '../../components/empty-state.js';
import { badge, toneOf } from '../../components/status-badge.js';

export { docTile, fileDate } from '../../components/doc-tile.js';

export function noInternship(title, icon = 'inbox') {
  return h('section', {}, pageHead(title), emptyState('Бүртгэлтэй дадлага алга', null, { icon }));
}

/** Өргөдлийн төлөв: нэр нь картын тэмдэглэгээ болон хураангуйн хавтан дээр нэг (өнгө нь toneOf-оос). */
export const APPLICATION_STATUSES = { pending: 'Хүлээгдэж буй', accepted: 'Зөвшөөрсөн', rejected: 'Татгалзсан' };
export const applicationBadge = (status, labels = APPLICATION_STATUSES) => badge(labels[status], toneOf(status));
/** Оюутны өөрөө цуцалсан хүсэлт жагсаалтад орохгүй — тэр зар хүсэл илгээгээгүй зартай ижил төлөвт буцна. */
export const sentApplications = (apps) => apps.filter((a) => a.status !== 'cancelled');
