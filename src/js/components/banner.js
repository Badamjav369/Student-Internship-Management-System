// Хуудасны дээд талын мэдэгдлийн туг: info, warning, error, success.
import { h } from '../core/dom.js';
import { icon } from '../core/icons.js';

const ICONS = { info: 'info', warning: 'alert', error: 'alert', success: 'circle-check' };

export const banner = (tone, ...children) => h('div', { class: ['org-banner', tone], role: tone === 'error' ? 'alert' : null }, icon(ICONS[tone], 18), h('p', {}, ...children));
