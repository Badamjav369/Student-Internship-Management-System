// Нэг зарлал: нийтэлсэн багшийн нэрийн үсэг, гарчиг, огноо, бичвэр, хавсралт. Оюутан харна, удирдагч багш өөрийнхөө зарлалыг устгана (actions).
import { h } from '../core/dom.js';
import { fileButton } from '../core/files.js';
import { formatDateTime } from '../core/format.js';

export const announcementCard = (a, actions = null) => h('article', { class: 'contact-card comment announcement', 'aria-labelledby': `a-${a.id}` },
  h('span', { class: 'contact-avatar', 'aria-hidden': 'true' }, a.author.first_name[0]),
  h('div', { class: 'contact-body' },
    h('h2', { id: `a-${a.id}` }, a.title),
    h('span', { class: 'contact-role' }, `${a.author.last_name[0]}. ${a.author.first_name}, `, h('time', { datetime: a.created_at }, formatDateTime(a.created_at))),
    h('p', { class: 'prose' }, a.body),
    a.file ? h('ul', { class: 'files', 'aria-label': 'Хавсралт' }, h('li', {}, fileButton(a.file))) : null,
    actions));
