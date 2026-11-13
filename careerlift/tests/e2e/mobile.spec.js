// Touch-device flows on EMULATED iPad / iPhone (Chromium engine).
// This checks layout, touch targets and the download flow, not Safari itself.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { FIX, tmpdir, freshStart, upload, downloadKind, pdfInfo, pdfToPng, colorFraction } from './helpers.js';

test('mobile: upload, switch template, recolor, preview, download PDF', async ({ page }) => {
  const dir = tmpdir();
  await freshStart(page);
  await upload(page, path.join(FIX, 'plain.pdf'));
  await page.getByTestId('review-continue').click();
  await page.getByTestId('nav-design').click();

  const vw = page.viewportSize().width;
  if (vw < 960) {
    // Controls and preview are separate panes on small screens.
    await page.getByTestId('template-creative').tap();
    await page.getByTestId('palette-ocean').tap();
    await page.getByTestId('show-preview').tap();
  } else {
    await page.getByTestId('template-creative').click();
    await page.getByTestId('palette-ocean').click();
  }
  const pages = page.getByTestId('preview-pages');
  await expect(pages).toHaveAttribute('data-template', 'creative', { timeout: 15_000 });
  await expect(pages.locator('[fill="#1d4ed8"]').first()).toBeAttached();
  await expect(pages.locator('.preview-page').first()).toBeVisible();

  // No horizontal scrolling on any step.
  for (const step of ['start', 'edit', 'improve', 'design', 'download', 'toolkit']) {
    await page.getByTestId(`nav-${step}`).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${step}`).toBeLessThanOrEqual(1);
  }

  await page.getByTestId('nav-download').click();
  const pdf = await downloadKind(page, 'pdf', dir);
  expect(pdfInfo(pdf).width).toBeCloseTo(612, 0);
  expect(colorFraction(pdfToPng(pdf, path.join(dir, 'm'), 400), '#1d4ed8', 30)).toBeGreaterThan(0.005);
});

test('mobile: primary buttons are at least 44px tall', async ({ page }) => {
  await freshStart(page);
  const small = await page.$$eval('.btn, .step, .tab, select', (els) => els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 38).map((e) => e.textContent.trim().slice(0, 30)));
  expect(small).toEqual([]);
});
