// Оюутны толгой хэсэг: дугуй тэмдэг, нэр, код, баруун талд төлөв. Удирдагч багш, дадлага удирдагч хоёр ашиглана.
import { h } from '../core/dom.js';
import { nameOf, studentLine } from '../core/labels.js';
import { personAvatar } from './person.js';

export const studentHead = (student, badge, aside = null) => h('section', { class: 'panel profile-head', 'aria-label': 'Оюутан' },
  personAvatar(student, 'lg'),
  h('div', { class: 'profile-text' }, h('h1', { tabindex: '-1' }, nameOf(student)), h('p', { class: 'muted' }, studentLine(student)), badge),
  aside);
