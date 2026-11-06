// <auth-shell> — нэвтрээгүй үеийн хуудасны бүтэц (нэвтрэх, нууц үг, зөвшөөрөл): зүүн талд дадлагын долоон үе шат,
// баруун талд маягтын карт, баруун дээд буланд гэрэл/харанхуй горим. Өмнөх Project-ийн auth-layout.js-тэй ижил бүтэц.
import { h, svg } from '../core/dom.js';
import './app-logo.js';
import './theme-toggle.js';

const STAGES = ['Газар олох', 'Гуравласан гэрээ', 'Ажлын төлөвлөгөө', 'Дадлага хийх, дэвтэр хөтлөх', 'Тайлан', 'Хамгаалалт', 'Дүн'];

// Зүүн хавтангийн чимэглэл: логоны шат, том хэмжээтэй, бүдэг.
const art = () => svg('svg', { class: 'auth-art', viewBox: '0 0 40 40', fill: 'none', 'aria-hidden': 'true', focusable: 'false' },
  svg('path', { class: 'art-steps', d: 'M10 30V24.5H17V18.5H24V12.5H30' }), svg('circle', { class: 'art-dot', cx: 30, cy: 12.5, r: 3.6 }));

class AuthShell extends HTMLElement {
  connectedCallback() {
    if (this.firstChild) return;
    this.outlet = h('main', { class: 'auth-main', id: 'main', tabindex: '-1' });
    this.append(h('div', { class: 'auth' },
      h('aside', { class: 'auth-side' },
        h('a', { class: 'brand', href: '#/login' }, h('app-logo', { size: 42 }), h('span', {}, 'Дадлагын нэгдсэн удирдлага')),
        h('div', { class: 'auth-intro' },
          h('h2', {}, 'Дадлагын бүх үе шат нэг дор'),
          h('ol', { class: 'path', 'aria-label': 'Дадлагын үе шат' }, STAGES.map((s) => h('li', {}, s)))),
        art()),
      h('div', { class: 'auth-body' }, h('div', { class: 'auth-top' }, document.createElement('theme-toggle')), this.outlet)));
  }
}
customElements.define('auth-shell', AuthShell);
