// <toast-region> — богино мэдэгдлийн бүс (aria-live). toast('Текст', 'error'|'info')
import { h } from '../core/dom.js';

class ToastRegion extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
  }

  show(message, tone) {
    const item = h('div', { class: ['toast', tone === 'error' && 'error'] }, message);
    this.append(item);
    setTimeout(() => item.remove(), tone === 'error' ? 7000 : 4500);
  }
}
customElements.define('toast-region', ToastRegion);

export function toast(message, tone = 'info') {
  let region = document.querySelector('toast-region');
  if (!region) { region = document.createElement('toast-region'); document.body.append(region); }
  region.show(message, tone);
}
