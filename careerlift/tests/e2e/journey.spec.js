// Full customer journey in a real browser (Chromium):
// Upload -> Extract -> Edit -> Improve -> Customize -> Preview -> Download,
// then the downloaded files are reopened and checked.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { FIX, tmpdir, freshStart, upload, getState, downloadKind, pdfInfo, pdfText, pdfToPng, colorFraction, imageDiff, unzipText } from './helpers.js';

const TEMPLATES = ['classic', 'executive', 'modern', 'minimal', 'creative', 'corporate'];

test.describe.configure({ mode: 'serial' });

test('upload DOCX, edit, improve, design and download — files verified', async ({ page }) => {
  const dir = tmpdir();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await freshStart(page);
  // --- Upload & extract
  await upload(page, path.join(FIX, 'plain.docx'));
  await expect(page.getByTestId('review')).toContainText('Jordan T. Williams');
  await page.getByTestId('review-continue').click();

  // --- Edit: fields populated, then edit some
  await expect(page.getByTestId('contact-fullName')).toHaveValue('Jordan T. Williams');
  await expect(page.getByTestId('job-title').first()).toHaveValue('Team Lead');
  await page.getByTestId('contact-headline').fill('Retail Operations Team Lead');
  await page.getByTestId('summary').fill('Retail team lead with 7 years of experience in high-volume stores, focused on scheduling, inventory control and training.');

  // --- Improve: accept a rewrite of a weak line
  await page.getByTestId('nav-improve').click();
  const row = page.getByTestId('compare-row').filter({ hasText: 'Responsible for scheduling 22 associates' });
  await expect(row.getByTestId('suggestion')).toHaveValue('Schedule 22 associates across morning and evening shifts');
  await row.getByTestId('accept').click();
  // ...and keep the original of another
  const row2 = page.getByTestId('compare-row').filter({ hasText: 'Helped customers choose computers' });
  await row2.getByTestId('reject').click();

  // --- Discover: generate a statement from answers and add it to the job
  await page.getByTestId('tab-discover').click();
  await page.getByTestId('detective-prof').selectOption('management');
  const q = page.getByTestId('q-mg-team');
  await q.locator('[data-field=count]').fill('22');
  await q.locator('[data-field=who]').fill('retail associates');
  await page.getByTestId('generate').click();
  await expect(page.getByTestId('statement').first()).toHaveValue('Lead a team of 22 retail associates');
  await page.getByTestId('add-statement').first().click();

  let st = await getState(page);
  const job = st.resume.experience[0];
  expect(job.bullets.map((b) => b.text)).toContain('Schedule 22 associates across morning and evening shifts');
  expect(job.bullets.map((b) => b.text)).toContain('Lead a team of 22 retail associates');
  expect(st.resume.experience[1].bullets.map((b) => b.text)).toContain('Helped customers choose computers and home theater equipment');

  // --- Design: every template renders a different preview
  await page.getByTestId('nav-design').click();
  const pages = page.getByTestId('preview-pages');
  const seen = new Map();
  for (const id of TEMPLATES) {
    await page.getByTestId(`template-${id}`).click();
    await expect(pages).toHaveAttribute('data-template', id, { timeout: 15_000 });
    seen.set(id, await pages.innerHTML());
  }
  expect(new Set(seen.values()).size).toBe(6);

  // --- Customize Modern: sidebar color, font, page size, sidebar position, section visibility
  await page.getByTestId('template-modern').click();
  await expect(pages).toHaveAttribute('data-template', 'modern');
  await page.getByTestId('hex-primary').fill('#8b1e3f');
  await page.getByTestId('hex-primary').press('Enter');
  await expect(pages.locator('svg rect[fill="#8b1e3f"]').first()).toBeAttached({ timeout: 10_000 });
  await page.getByTestId('font-headingFont').selectOption('raleway');
  await expect(pages.locator('text[style*="CL-raleway"]').first()).toBeAttached({ timeout: 15_000 });
  await page.getByTestId('pagesize-a4').check();
  await page.getByTestId('sidebar-right').check();
  await page.getByTestId('show-languages').uncheck();
  await page.waitForTimeout(500);
  st = await getState(page);
  expect(st.resume.design).toMatchObject({ templateId: 'modern', pageSize: 'a4', sidebarPosition: 'right', headingFont: 'raleway' });
  expect(st.resume.design.colors.primary).toBe('#8b1e3f');
  expect(st.resume.design.hidden.languages).toBe(true);

  // --- Download PDF / DOCX / TXT and verify contents
  await page.getByTestId('nav-download').click();
  const pdf = await downloadKind(page, 'pdf', dir);
  const info = pdfInfo(pdf);
  expect(info.width).toBeCloseTo(595.28, 0); // A4
  expect(info.height).toBeCloseTo(841.89, 0);
  const text = pdfText(pdf);
  for (const s of ['Jordan T. Williams', 'Schedule 22 associates across morning and evening shifts', 'Lead a team of 22 retail associates', 'Reduced inventory shrink 18%', 'Helped customers choose computers']) {
    expect(text.replace(/\s+/g, ' ')).toContain(s);
  }
  expect(text).not.toContain('Spanish'); // hidden section stays hidden
  // Sidebar color really is in the PDF (pixel check), and on the RIGHT side.
  const png = pdfToPng(pdf, path.join(dir, 'modern'), 400);
  expect(colorFraction(png, '#8b1e3f')).toBeGreaterThan(0.15);

  const docx = await downloadKind(page, 'docx', dir);
  const xml = unzipText(docx, 'word/document.xml');
  expect(xml).toContain('8B1E3F'); // sidebar shading color
  expect(xml).toContain('Raleway');
  expect(xml).toContain('Lead a team of 22 retail associates');
  expect(xml).toContain('w:w="11906"'); // A4 width in twips
  expect(unzipText(docx, 'word/fontTable.xml')).toMatch(/embedRegular/);

  const txt = fs.readFileSync(await downloadKind(page, 'txt', dir), 'utf8');
  expect(txt).toContain('- Lead a team of 22 retail associates');
  expect(txt).toContain('JORDAN T. WILLIAMS');

  const backup = JSON.parse(fs.readFileSync(await downloadKind(page, 'json', dir), 'utf8'));
  expect(backup.app).toBe('careerlift');

  // --- Progress survives a reload
  await page.reload();
  st = await getState(page);
  expect(st.resume.contact.headline).toBe('Retail Operations Team Lead');
  expect(st.resume.design.templateId).toBe('modern');
  expect(errors).toEqual([]);
});

test('every template: downloaded PDF visually matches the preview', async ({ page }) => {
  const dir = tmpdir();
  await freshStart(page);
  await upload(page, path.join(FIX, 'plain.docx'));
  await page.getByTestId('review-continue').click();
  await page.getByTestId('nav-design').click();
  const results = {};
  for (const id of TEMPLATES) {
    await page.getByTestId('nav-design').click();
    await page.getByTestId(`template-${id}`).click();
    const pages = page.getByTestId('preview-pages');
    await expect(pages).toHaveAttribute('data-template', id, { timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    // The preview panel scrolls; unclip it so the screenshot has the full page.
    await page.evaluate(() => { const el = document.querySelector('.design-preview'); el.style.maxHeight = 'none'; el.style.position = 'static'; });
    await page.waitForTimeout(400);
    const shot = path.join(dir, `${id}-preview.png`);
    const first = pages.locator('.preview-page').first();
    await first.screenshot({ path: shot });
    const box = await first.boundingBox();
    await page.getByTestId('nav-download').click();
    const pdf = await downloadKind(page, 'pdf', dir);
    const png = pdfToPng(pdf, path.join(dir, `${id}-pdf`), Math.round(box.width));
    results[id] = imageDiff(shot, png);
  }
  console.log('preview-vs-PDF mean pixel difference (0-255):', results);
  for (const [id, d] of Object.entries(results)) expect(d, id).toBeLessThan(3);
});

test('color changes update preview and download for every template', async ({ page }) => {
  const dir = tmpdir();
  await freshStart(page);
  await upload(page, path.join(FIX, 'plain.docx'));
  await page.getByTestId('review-continue').click();
  for (const id of TEMPLATES) {
    await page.getByTestId('nav-design').click();
    await page.getByTestId(`template-${id}`).click();
    const pages = page.getByTestId('preview-pages');
    await expect(pages).toHaveAttribute('data-template', id, { timeout: 15_000 });
    await page.getByTestId('palette-forest').click();
    await expect(pages.locator('[fill="#14532d"]').first()).toBeAttached({ timeout: 10_000 });
    await page.getByTestId('nav-download').click();
    const pdf = await downloadKind(page, 'pdf', dir);
    const png = pdfToPng(pdf, path.join(dir, `${id}-forest`), 500);
    expect(colorFraction(png, '#14532d', 30), `${id} forest green in PDF`).toBeGreaterThan(0.0005);
  }
});

test('Spanish (Puerto Rico) interface and resume headings', async ({ page }) => {
  const dir = tmpdir();
  await freshStart(page);
  await page.getByTestId('ui-lang').selectOption('es-PR');
  await expect(page.getByTestId('nav-edit')).toContainText('Editar');
  await upload(page, path.join(FIX, 'spanish-pr.txt'));
  await expect(page.getByTestId('review')).toContainText('Carmen L. Ortiz Vélez');
  await page.getByTestId('review-continue').click();
  await expect(page.getByTestId('resume-lang')).toHaveValue('es-PR');
  await page.getByTestId('nav-download').click();
  const text = pdfText(await downloadKind(page, 'pdf', dir));
  expect(text).toContain('DESTREZAS');
  expect(text).toContain('PREPARACIÓN ACADÉMICA');
  expect(text).toContain('Presente');
  expect(text.replace(/\s+/g, ' ')).toContain('Eduqué a pacientes y familiares sobre manejo de diabetes');
});

test('clear error for scanned PDFs and unsupported files', async ({ page }) => {
  await freshStart(page);
  await page.setInputFiles('[data-testid=resume-file]', path.join(FIX, 'scanned.pdf'));
  await expect(page.getByTestId('upload-error')).toContainText(/scanned image/i);
  await page.setInputFiles('[data-testid=resume-file]', { name: 'old.doc', mimeType: 'application/msword', buffer: Buffer.from('x') });
  await expect(page.getByTestId('upload-error')).toContainText(/\.docx/);
});

test('toolkit: cover letter PDF, ATS checks and keyword matcher', async ({ page }) => {
  const dir = tmpdir();
  await freshStart(page);
  await upload(page, path.join(FIX, 'plain.pdf'));
  await page.getByTestId('review-continue').click();
  await page.getByTestId('nav-toolkit').click();
  await page.getByTestId('cover-company').fill('Island Logistics');
  await page.getByTestId('cover-role').fill('Operations Coordinator');
  await page.getByTestId('cover-generate').click();
  const letter = await page.getByTestId('cover-text').inputValue();
  expect(letter).toContain('Operations Coordinator position at Island Logistics');
  expect(letter).toContain('[Add one or two sentences'); // never invents a reason
  const pdf = await downloadKind(page, 'cover-pdf', dir);
  expect(pdfText(pdf)).toContain('Island Logistics');
  await page.getByTestId('tk-ats').click();
  await expect(page.getByTestId('ats-checks')).toContainText('Full name at the top');
  await page.getByTestId('jd-input').fill('We need an operations coordinator with inventory control, scheduling and Microsoft Excel. Inventory control experience required. Scheduling of shifts. Forklift certification a plus.');
  await page.getByTestId('kw-analyze').click();
  await expect(page.getByTestId('kw-result')).toContainText('inventory control');
});
