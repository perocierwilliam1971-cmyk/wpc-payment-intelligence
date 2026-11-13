import { describe, it, expect } from 'vitest';
import { improveBullet, scoreBullet, fillTemplate, buildStatement, esPreterite } from '../../src/achievement/writer.js';
import { PROFESSIONS, questionsFor } from '../../src/achievement/questions.js';

const numbers = (s) => (s.match(/\d[\d,.]*/g) || []).map((n) => n.replace(/[.,]$/, ''));

describe('improveBullet (English)', () => {
  it.each([
    ['Responsible for managing a team of 8 cashiers', false, 'Managed a team of 8 cashiers'],
    ['Responsible for payroll for 40 employees.', false, 'Managed payroll for 40 employees'],
    ['Duties included answering phones and scheduling appointments', false, 'Answered phones and scheduling appointments'],
    ['Helped customers with returns', false, 'Supported customers with returns'],
    ['I trained new hires on safety', false, 'Trained new hires on safety'],
    ['Managing the front desk', false, 'Managed the front desk'],
    ['Managed the front desk', true, 'Manage the front desk'],
    ['Coordinates weekly deliveries', false, 'Coordinated weekly deliveries'],
    ['Lead daily huddles', false, 'Led daily huddles'],
  ])('%s', (input, current, expected) => {
    expect(improveBullet(input, { lang: 'en', current }).improved).toBe(expected);
  });

  it('never upgrades "helped" into a leadership claim', () => {
    const r = improveBullet('Helped the manager with inventory', { lang: 'en' }).improved;
    expect(r).not.toMatch(/^(Led|Managed|Directed|Spearheaded)/);
  });

  it('never adds numbers that were not in the original', () => {
    const inputs = ['Responsible for customer complaints', 'Helped with the move to a new office', 'Duties included filing', 'Worked on marketing emails', 'Handling returns'];
    for (const i of inputs) expect(numbers(improveBullet(i, { lang: 'en' }).improved)).toEqual(numbers(i));
  });

  it('suggests adding a metric instead of inventing one', () => {
    const r = improveBullet('Responsible for customer complaints', { lang: 'en' });
    expect(r.tips).toContain('addMetric');
  });

  it('scores strong, measurable bullets higher than weak ones', () => {
    expect(scoreBullet('Reduced order errors by 32% in 12 months by redesigning the checklist').score)
      .toBeGreaterThan(scoreBullet('Responsible for orders').score);
  });
});

describe('improveBullet (Spanish)', () => {
  it.each([
    ['Responsable de coordinar los eventos del hotel', false, 'Coordiné los eventos del hotel'],
    ['Encargada de organizar el archivo', false, 'Organicé el archivo'],
    ['Responsable de reducir costos', false, 'Reduje costos'],
    ['Coordinar el inventario semanal', false, 'Coordiné el inventario semanal'],
    ['Responsable de dirigir el equipo', true, 'Dirijo el equipo'],
  ])('%s', (input, current, expected) => {
    expect(improveBullet(input, { lang: 'es', current }).improved).toBe(expected);
  });
  it('conjugates spelling-change verbs', () => {
    expect(esPreterite('organizar')).toBe('organicé');
    expect(esPreterite('verificar')).toBe('verifiqué');
    expect(esPreterite('entregar')).toBe('entregué');
  });
});

describe('fillTemplate', () => {
  it('drops optional segments when blank', () => {
    expect(fillTemplate('Trained[ {count}] {who}[ on {topic}]', { who: 'new cashiers' })).toBe('Trained new cashiers');
    expect(fillTemplate('Trained[ {count}] {who}[ on {topic}]', { who: 'new cashiers', count: '12', topic: 'POS' })).toBe('Trained 12 new cashiers on POS');
  });
  it('returns empty when a required field is blank', () => {
    expect(fillTemplate('Opened {count} new {kind}', { kind: 'accounts' })).toBe('');
  });
  it('does not double % or $', () => {
    expect(fillTemplate('Achieved {pct}% of goal', { pct: '118%' })).toBe('Achieved 118% of goal');
    expect(fillTemplate('Managed a ${amount} budget', { amount: '$2.1M' })).toBe('Managed a $2.1M budget');
  });
});

describe('question bank', () => {
  it('every question template uses only its declared fields', () => {
    for (const p of PROFESSIONS) {
      for (const q of questionsFor(p.id)) {
        const keys = new Set(q.fields.map((f) => f.k));
        for (const lang of ['en', 'es']) {
          expect(q.q[lang], `${q.id} prompt ${lang}`).toBeTruthy();
          for (const t of q.tpl[lang]) for (const m of t.matchAll(/\{(\w+)\}/g)) expect(keys.has(m[1]), `${q.id}:${m[1]}`).toBe(true);
          for (const f of q.fields) expect(f.label[lang], `${q.id}.${f.k} label ${lang}`).toBeTruthy();
        }
      }
    }
  });
  it('statements contain only numbers the customer typed (never fabricated)', () => {
    for (const p of PROFESSIONS) {
      for (const q of questionsFor(p.id)) {
        // Only text answers, no numbers.
        const vals = Object.fromEntries(q.fields.map((f) => [f.k, 'sample words']));
        for (const lang of ['en', 'es']) {
          const s = buildStatement(q, vals, lang);
          expect(numbers(s), `${q.id} ${lang}: ${s}`).toEqual([]);
        }
      }
    }
  });
  it('uses present tense for a current role', () => {
    const q = questionsFor('management').find((x) => x.id === 'mg-team');
    expect(buildStatement(q, { count: '18', who: 'agents' }, 'en', true)).toBe('Lead a team of 18 agents');
    expect(buildStatement(q, { count: '18', who: 'agents' }, 'en', false)).toBe('Led a team of 18 agents');
  });
});
