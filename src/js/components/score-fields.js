// Шалгуур бүрийн оноо оруулах талбарууд: нийт оноо, шалгалт (дээд хязгаараас хэтрэхгүй, хоёр орны нарийвчлал).
// Байгууллагын үнэлгээ (дадлага удирдагч), комиссын оноо (гишүүн) хоёр ашиглана.
// const sf = scoreFields(criteria, saved); form = h('form', {}, ...sf.nodes, ...); sf.bind(form); const { scores, errors } = sf.collect(form);
import { h } from '../core/dom.js';
import { field, formRow } from '../core/forms.js';
import { num } from '../core/format.js';

const sum = (list, key) => list.reduce((a, x) => a + x[key], 0);

/** criteria: [{id, name, max_score}], saved: Map(criterion_id → оноо). */
export function scoreFields(criteria, saved = new Map()) {
  const total = h('strong', {}, '0');
  const nodes = [
    formRow(...criteria.map((c) => field({ label: c.name, unit: `/ ${num(c.max_score)}`, name: `score-${c.id}`, type: 'number', value: saved.has(c.id) ? String(saved.get(c.id)) : '',
      min: 0, max: c.max_score, step: 0.5, inputmode: 'decimal', required: true }))),
    h('p', { class: 'result-count', role: 'status' }, 'Нийт: ', total, ` / ${num(sum(criteria, 'max_score'))} оноо`),
  ];
  const read = (form, c) => form.elements[`score-${c.id}`].value.trim().replace(',', '.');
  const refresh = (form) => { total.textContent = num(criteria.reduce((a, c) => a + (read(form, c) !== '' && Number.isFinite(Number(read(form, c))) ? Number(read(form, c)) : 0), 0)); };
  return {
    nodes,
    bind(form) { form.addEventListener('input', () => refresh(form)); refresh(form); },
    collect(form) {
      const errors = {};
      const scores = [];
      for (const c of criteria) {
        const raw = read(form, c);
        const value = Number(raw);
        if (raw === '' || !Number.isFinite(value)) errors[`score-${c.id}`] = 'Оноогоо бичнэ үү.';
        else if (value < 0 || value > c.max_score) errors[`score-${c.id}`] = `Оноо 0–${num(c.max_score)} хооронд байна.`;
        else if (Math.round(value * 100) !== value * 100) errors[`score-${c.id}`] = 'Бутархай хоёр орноос ихгүй.';
        else scores.push({ criterion_id: c.id, value });
      }
      return { scores, errors };
    },
  };
}
