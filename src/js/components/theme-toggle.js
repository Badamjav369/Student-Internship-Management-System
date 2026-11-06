// <theme-toggle> — гэрэл/харанхуй горим солих товч.
import { h, replace } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { getTheme, toggleTheme } from '../core/theme.js';

class ThemeToggle extends HTMLElement {
  connectedCallback() {
    this.button = h('button', { class: 'icon-button', type: 'button', on: { click: toggleTheme } });
    this.append(this.button);
    this.update = () => {
      const dark = getTheme() === 'dark';
      this.button.setAttribute('aria-label', dark ? 'Гэрэл горим руу шилжих' : 'Харанхуй горим руу шилжих');
      replace(this.button, icon(dark ? 'sun' : 'moon'));
    };
    addEventListener('theme-changed', this.update);
    this.update();
  }

  disconnectedCallback() {
    removeEventListener('theme-changed', this.update);
    this.replaceChildren();
  }
}
customElements.define('theme-toggle', ThemeToggle);
