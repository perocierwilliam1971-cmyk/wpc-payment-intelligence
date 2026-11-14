// Interview Readiness: personalized questions, playbooks, bilingual drill, prep sheet.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { FIX, tmpdir, freshStart, upload, getState, downloadKind, pdfText } from './helpers.js';

test('interview readiness from an uploaded resume', async ({ page }) => {
  const dir = tmpdir();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install();
  await freshStart(page);
  await upload(page, path.join(FIX, 'plain.docx'));
  await page.getByTestId('review-continue').click();
  await page.getByTestId('nav-interview').click();

  // Career change target triggers a tailored question.
  await page.getByTestId('iv-target').fill('Logistics Coordinator');
  await page.getByTestId('iv-target').press('Tab');
  const questions = page.getByTestId('iv-question');
  await expect(questions.filter({ hasText: 'Reduced inventory shrink 18%' })).toHaveCount(1);
  await expect(questions.filter({ hasText: 'Why Logistics Coordinator' })).toHaveCount(1);
  await expect(questions.filter({ hasText: 'leave Sunshine Market Inc.' })).toHaveCount(1);

  const score0 = Number((await page.getByTestId('readiness-score').textContent()).replace('%', ''));
  await questions.first().getByTestId('iv-answer-en').fill('I’ve led retail teams for 7 years and want to apply that to logistics.');
  const score1 = Number((await page.getByTestId('readiness-score').textContent()).replace('%', ''));
  expect(score1).toBeGreaterThan(score0);

  // Jump from a question into its playbook, build a Spanish answer.
  await questions.filter({ hasText: 'Why Logistics Coordinator' }).getByTestId('iv-open-change').click();
  await page.getByTestId('pb-lang-change').selectOption('es');
  await page.getByTestId('pb-change-from').fill('gerencia de tiendas');
  await page.getByTestId('pb-change-to').fill('logística');
  await page.getByTestId('pb-change-skills').fill('coordinar turnos y controlar inventario');
  await expect(page.getByTestId('pb-output-change')).toHaveValue(/^Mi experiencia en gerencia de tiendas me dio destrezas que aplican directamente a logística: coordinar turnos y controlar inventario\./);

  // Timer counts down (fake clock).
  await page.getByTestId('iv-tab-questions').click();
  await page.getByTestId('iv-timer-intro').click();
  await page.clock.runFor(5000);
  await expect(page.locator('.timer-out').first()).toContainText(/8[0-5]s/);

  // Bilingual drill completes and is counted.
  await page.getByTestId('iv-tab-bilingual').click();
  await page.getByTestId('drill-start').click();
  await page.clock.runFor(46_000);
  await expect(page.getByTestId('drill-stage')).toContainText(/SWITCH|CAMBIO/);
  await page.clock.runFor(46_000);
  await expect(page.getByTestId('drill-count')).toContainText('1');

  const st = await getState(page);
  expect(st.toolkit.iv.drills).toBe(1);
  expect(st.toolkit.iv.playbooks.change.es.from).toBe('gerencia de tiendas');

  // Prep sheet download contains the answers.
  const pdf = await downloadKind(page, 'prep-pdf', dir);
  const text = pdfText(pdf).replace(/\s+/g, ' ');
  expect(text).toContain('INTERVIEW PREP SHEET');
  expect(text).toContain('Reduced inventory shrink 18%');
  expect(text).toContain('led retail teams for 7 years');
  expect(text).toContain('Mi experiencia en gerencia de tiendas');
  expect(errors).toEqual([]);
});

test('Spanish interface shows questions in Spanish', async ({ page }) => {
  await freshStart(page);
  await page.getByTestId('ui-lang').selectOption('es-PR');
  await upload(page, path.join(FIX, 'spanish-pr.txt'));
  await page.getByTestId('review-continue').click();
  await page.getByTestId('nav-interview').click();
  await expect(page.getByRole('heading', { name: 'Preparación para Entrevistas', level: 1 })).toBeVisible();
  await expect(page.getByTestId('iv-question').filter({ hasText: '¿Por qué quieres dejar Hospital San Pablo?' })).toHaveCount(1);
  await expect(page.locator('[data-testid=iv-question][data-kind=bilingual]')).toContainText('Tell me in English');
});
