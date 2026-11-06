// <progress-path> — дадлагын үе шатуудыг зөөлөн муруй зам дээр цэгээр харуулна.
// el.stages = ['Газар олох', ...]; el.current = 3 (0..n; n = бүгд дууссан). Үе шатын нэр дэлгэц уншигчид уншигдана.
import { h, replace, svg } from '../core/dom.js';

const W = 260;
const H = 96;
const P = [[14, 82], [92, 98], [124, 6], [246, 16]];
const bez = (s) => {
  const [a, b, c, d] = P; const u = 1 - s;
  return [u ** 3 * a[0] + 3 * u * u * s * b[0] + 3 * u * s * s * c[0] + s ** 3 * d[0], u ** 3 * a[1] + 3 * u * u * s * b[1] + 3 * u * s * s * c[1] + s ** 3 * d[1]];
};
const D = `M${P[0]} C${P[1]} ${P[2]} ${P[3]}`;

// Муруйн урт хэмжээгээр жигд тархсан цэгүүдийн байрлал.
const SAMPLES = Array.from({ length: 401 }, (_, i) => bez(i / 400));
const LENGTHS = SAMPLES.reduce((acc, p, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + Math.hypot(p[0] - SAMPLES[i - 1][0], p[1] - SAMPLES[i - 1][1])); return acc; }, []);
const TOTAL = LENGTHS.at(-1);
const pointAt = (f) => SAMPLES[LENGTHS.findIndex((l) => l >= f * TOTAL)] ?? SAMPLES.at(-1);

class ProgressPath extends HTMLElement {
  #stages = [];
  #current = 0;

  set stages(value) { this.#stages = value; this.#render(); }
  set current(value) { this.#current = value; this.#render(); }

  connectedCallback() { this.#render(); }

  #render() {
    if (!this.isConnected || this.#stages.length === 0) return;
    const n = this.#stages.length;
    const cur = this.#current;
    const done = Math.min(cur, n - 1) / (n - 1);
    const nodes = this.#stages.map((_, i) => {
      const [x, y] = pointAt(i / (n - 1));
      if (i === cur) return [svg('circle', { cx: x, cy: y, r: 18, class: 'pp-glow' }), svg('circle', { cx: x, cy: y, r: 12, class: 'pp-now' }),
        svg('text', { x, y: y + 0.5, class: 'pp-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, String(i + 1))];
      return svg('circle', { cx: x, cy: y, r: i < cur ? 6.5 : 5, class: i < cur ? 'pp-done' : 'pp-todo' });
    });
    replace(this,
      svg('svg', { viewBox: `0 0 ${W} ${H}`, fill: 'none', 'aria-hidden': 'true', class: 'pp-svg' },
        svg('path', { d: D, class: 'pp-track' }),
        svg('path', { d: D, class: 'pp-fill', 'stroke-dasharray': `${(TOTAL * done).toFixed(1)} ${TOTAL.toFixed(1)}` }),
        ...nodes.flat()),
      h('ol', { class: 'sr-only', 'aria-label': 'Дадлагын үе шат' }, this.#stages.map((name, i) =>
        h('li', { 'aria-current': i === cur ? 'step' : null }, name, i < cur ? ' (дууссан)' : i === cur ? ' (одоогийн шат)' : ''))));
  }
}
customElements.define('progress-path', ProgressPath);
