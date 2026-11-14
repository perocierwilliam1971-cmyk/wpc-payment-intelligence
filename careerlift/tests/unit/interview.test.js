import { describe, it, expect } from 'vitest';
import { parseDate, findGaps, predictQuestions, isCareerChange, isBilingual } from '../../src/interview/analyze.js';
import { PLAYBOOKS, buildScript, playbookComplete } from '../../src/interview/playbooks.js';
import { readiness, prepSheet, emptyInterviewState } from '../../src/interview/readiness.js';
import { sampleResume } from '../fixtures/sample-resume.js';
import { emptyExperience, emptyBullet } from '../../src/model/schema.js';
import { STRINGS } from '../../src/i18n/strings.js';

const NOW = new Date(2026, 10, 14); // Nov 2026

describe('dates', () => {
  it.each([
    ['Mar 2019', 2019 * 12 + 2], ['03/2019', 2019 * 12 + 2], ['Enero 2018', 2018 * 12], ['marzo de 2020', 2020 * 12 + 2], ['2015', 2015 * 12], ['', null],
  ])('%s', (s, v) => expect(parseDate(s)).toBe(v));
  it('bare end years mean December', () => expect(parseDate('2015', { end: true })).toBe(2015 * 12 + 11));
});

describe('predictQuestions', () => {
  it('asks about the customer’s own numbers, why they are leaving, salary and weakness', () => {
    const qs = predictQuestions(sampleResume(), { now: NOW });
    const metric = qs.filter((q) => q.kind === 'metric');
    expect(metric.length).toBeGreaterThan(0);
    expect(metric[0].q.en).toContain('Lead a team of 28 warehouse');
    expect(qs.find((q) => q.id === 'leaving').q.en).toContain('Caribe Logistics Group');
    expect(qs.map((q) => q.kind)).toEqual(expect.arrayContaining(['opening', 'salary', 'weakness', 'bilingual']));
    expect(qs.some((q) => q.kind === 'gap')).toBe(false); // sample has no gaps
  });

  it('detects gaps between jobs and since the last job', () => {
    const r = sampleResume();
    r.experience = [
      emptyExperience({ title: 'Clerk', company: 'B', startDate: 'Jan 2022', endDate: 'Jun 2024' }),
      emptyExperience({ title: 'Clerk', company: 'A', startDate: 'Jan 2018', endDate: 'Dec 2019' }),
    ];
    const gaps = findGaps(r, NOW);
    expect(gaps.map((g) => [g.open, g.months])).toEqual([[true, 29], [false, 24]]);
    const qs = predictQuestions(r, { now: NOW });
    const gapQs = qs.filter((q) => q.kind === 'gap');
    expect(gapQs).toHaveLength(2);
    expect(gapQs[1].q.en).toContain('2019–2022');
    expect(gapQs[1].q.es).toContain('2 años');
    expect(gapQs.every((q) => q.playbook === 'gap')).toBe(true);
  });

  it('flags short tenures and career changes', () => {
    const r = sampleResume();
    r.experience.push(emptyExperience({ title: 'Cashier', company: 'QuickMart', startDate: 'Feb 2010', endDate: 'Jul 2010', bullets: [emptyBullet('Handled the register')] }));
    const qs = predictQuestions(r, { targetRole: 'Registered Nurse', now: NOW });
    expect(qs.find((q) => q.kind === 'short').q.en).toContain('QuickMart for about 6 months');
    expect(qs.find((q) => q.kind === 'change').q.en).toContain('Registered Nurse');
    expect(isCareerChange(r, 'Operations Manager')).toBe(false);
    expect(isBilingual(r)).toBe(true);
  });

  it('has complete English and Spanish text for every question', () => {
    for (const q of predictQuestions(sampleResume(), { targetRole: 'Nurse', now: NOW })) {
      expect(q.q.en && q.q.es && q.why.en && q.why.es, q.id).toBeTruthy();
      expect(STRINGS.en[`iv.kind.${q.kind}`], q.kind).toBeTruthy();
      expect(STRINGS.es[`iv.kind.${q.kind}`], q.kind).toBeTruthy();
    }
  });
});

describe('playbooks', () => {
  it('every playbook is bilingual and uses only declared fields', () => {
    for (const pb of PLAYBOOKS) {
      const keys = new Set(pb.fields.map((f) => f.k));
      for (const L of ['en', 'es']) {
        expect(pb.title[L] && pb.when[L], `${pb.id} ${L}`).toBeTruthy();
        pb.principles.concat(pb.avoid).forEach((p) => expect(p[L]).toBeTruthy());
        pb.fields.forEach((f) => expect(f.label[L] && f.ph[L]).toBeTruthy());
        for (const s of pb.script[L]) for (const m of s.matchAll(/\{(\w+)\}/g)) expect(keys.has(m[1]), `${pb.id}:${m[1]}`).toBe(true);
      }
    }
  });

  it('scripts contain no numbers the customer did not type, and skip blank optional parts', () => {
    for (const pb of PLAYBOOKS) {
      const vals = Object.fromEntries(pb.fields.filter((f) => !f.optional).map((f) => [f.k, 'zzz']));
      for (const L of ['en', 'es']) {
        const s = buildScript(pb, vals, L);
        expect(s, `${pb.id} ${L}`).not.toMatch(/\d/);
        expect(s).not.toMatch(/\{|\}|\[|\]/);
        expect(s.length).toBeGreaterThan(5);
      }
    }
  });

  it('builds a natural gap answer', () => {
    const gap = PLAYBOOKS.find((p) => p.id === 'gap');
    expect(buildScript(gap, { reason: 'caring for my mother after her surgery', ready: 'I’m fully available to return to work' }, 'en'))
      .toBe('During that time I was caring for my mother after her surgery. That situation is behind me and I’m fully available to return to work.');
    const sal = PLAYBOOKS.find((p) => p.id === 'salary');
    expect(buildScript(sal, { moneyLow: '$42,000', moneyHigh: '48,000' }, 'en')).toBe('Based on my research, roles like this typically pay between $42,000 and $48,000. I’m looking for something in that range.');
  });
});

describe('readiness', () => {
  it('rises as answers and playbooks are completed, and the prep sheet includes them', () => {
    const r = sampleResume();
    const iv = emptyInterviewState();
    const before = readiness(r, iv, NOW).score;
    iv.answers.intro = { en: 'I lead operations teams…' };
    iv.answers.salary = { es: 'Según mi investigación…' };
    iv.playbooks.salary = { en: { moneyLow: '40,000', moneyHigh: '45,000' }, es: {} };
    iv.drills = 3;
    const after = readiness(r, iv, NOW);
    expect(after.score).toBeGreaterThan(before);
    expect(playbookComplete(PLAYBOOKS.find((p) => p.id === 'salary'), iv.playbooks.salary)).toBe(true);
    const sheet = prepSheet(r, iv, 'en', NOW);
    expect(sheet).toContain('EN: I lead operations teams…');
    expect(sheet).toContain('ES: Según mi investigación…');
    expect(sheet).toContain('$40,000 and $45,000');
    expect(sheet).toContain('[Prepare your answer]');
  });
});
