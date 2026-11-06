// <app-logo size="42"> — логоны шат (дадлагын шатлал) ба шар цэг (оюутан).
import { svg } from '../core/dom.js';

class AppLogo extends HTMLElement {
  connectedCallback() {
    if (this.firstChild) return;
    const size = Number(this.getAttribute('size') ?? 42);
    this.style.setProperty('--logo-size', `${size}px`);
    this.append(svg('svg', { width: Math.round(size * 0.72), height: Math.round(size * 0.72), viewBox: '0 0 40 40', fill: 'none', 'aria-hidden': 'true' },
      svg('path', { d: 'M10 30V24.5H17V18.5H24V12.5H30', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      svg('circle', { cx: 30, cy: 12.5, r: 3.6, fill: '#ffc83d' })));
  }
}
customElements.define('app-logo', AppLogo);
