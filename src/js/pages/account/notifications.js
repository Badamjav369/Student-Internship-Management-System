// Мэдэгдэл: бүх мэдэгдлийн жагсаалт (хонхонд сүүлийн хэдийг л харуулна).
import { h, pageHead } from '../../core/dom.js';
import { getRole, listNotifications } from '../../data/session-api.js';
import { backLink } from '../../components/back-link.js';
import { NOTICE_PAGE } from '../../components/notice-list.js';

export async function render() {
  const list = document.createElement('notice-list');
  list.initial = await listNotifications({ limit: NOTICE_PAGE });
  return h('section', {}, backLink(`/${getRole()}/home`), pageHead('Мэдэгдэл'), list);
}
