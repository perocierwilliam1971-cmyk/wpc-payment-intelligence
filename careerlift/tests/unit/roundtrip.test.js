// Export -> re-import roundtrip for every template and format.
// This is the test for "missing work achievements": every bullet the customer
// wrote must survive export and come back when the file is uploaded again.
import { describe, it, expect, beforeAll } from 'vitest';
import mammoth from 'mammoth';
import { useNodeFonts } from '../node-fonts.js';
import { sampleResume } from '../fixtures/sample-resume.js';
import { TEMPLATES } from '../../src/layout/templates.js';
import { applyTemplate } from '../../src/design/apply.js';
import { prepareFonts, layoutResume } from '../../src/layout/engine.js';
import { renderPdf } from '../../src/export/pdf.js';
import { renderDocx } from '../../src/export/docx.js';
import { resumeToText } from '../../src/export/txt.js';
import { pdfToLines, htmlToLines, textToLines } from '../../src/import/extract.js';
import { parseResume } from '../../src/import/parse.js';
import { embeddedMatches } from '../../src/import/index.js';

beforeAll(() => useNodeFonts());

const squash = (s) => s.replace(/\s+/g, ' ').trim();

function expectCoreFields(parsed, src, strictSide = true) {
  const { resume } = parsed;
  expect(resume.contact.fullName).toBe(src.contact.fullName);
  expect(resume.contact.email).toBe(src.contact.email);
  expect(resume.contact.phone).toContain('555-0142');
  expect(resume.experience.length).toBe(src.experience.length);
  const gotBullets = resume.experience.flatMap((e) => e.bullets.map((b) => squash(b.text)));
  const wantBullets = src.experience.flatMap((e) => e.bullets.map((b) => squash(b.text)));
  // Every original achievement must be present verbatim.
  for (const w of wantBullets) expect(gotBullets).toContain(w);
  expect(gotBullets.length).toBe(wantBullets.length);
  resume.experience.forEach((e, i) => {
    expect(e.title).toBe(src.experience[i].title);
    expect(e.company).toBe(src.experience[i].company);
    expect(e.startDate).toBe(src.experience[i].startDate);
    expect(e.current).toBe(src.experience[i].current);
  });
  if (strictSide) {
    expect(resume.skills).toEqual(expect.arrayContaining(src.skills));
    expect(resume.education[0]?.degree).toContain('Bachelor of Business Administration');
    expect(resume.certifications.map((c) => c.name)).toEqual(expect.arrayContaining(['Lean Six Sigma Green Belt', 'OSHA 30-Hour General Industry']));
  } else {
    // Narrow sidebars wrap lines; field boundaries may be imperfect, but no
    // word may be lost.
    const all = squash(JSON.stringify(resume)).toLowerCase();
    const words = [...src.skills, ...src.certifications.map((c) => c.name), src.education[0].degree, src.education[0].school]
      .join(' ').split(/\s+/).map((w) => w.replace(/[(),]/g, '').toLowerCase()).filter(Boolean);
    for (const w of words) expect(all).toContain(w);
  }
}

describe('TXT roundtrip', () => {
  it('re-imports every field from the TXT export', () => {
    const src = sampleResume();
    const parsed = parseResume(textToLines(resumeToText(src)));
    expectCoreFields(parsed, src);
    expect(parsed.report.unplaced).toEqual([]);
  });
});

describe.each(TEMPLATES.map((t) => t.id))('PDF roundtrip — %s', (id) => {
  it('keeps every achievement bullet and core field', async () => {
    const src = applyTemplate(sampleResume(), id);
    await prepareFonts(src);
    const bytes = await renderPdf(layoutResume(src));
    const lines = await pdfToLines(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const parsed = parseResume(lines);
    expectCoreFields(parsed, src, !['modern', 'corporate'].includes(id));
  });
});

describe('PDF with embedded CareerLift data', () => {
  it('restores the exact resume when the opt-in data is present', async () => {
    const src = applyTemplate(sampleResume(), 'modern');
    await prepareFonts(src);
    const bytes = await renderPdf(layoutResume(src), { embed: src });
    const lines = await pdfToLines(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    expect(lines.embedded).toBeTruthy();
    expect(embeddedMatches(lines.embedded, lines)).toBe(true);
    expect(lines.embedded.experience[0].bullets.map((b) => b.text)).toEqual(src.experience[0].bullets.map((b) => b.text));
  });
  it('ignores embedded data that no longer matches the visible text', () => {
    const src = sampleResume();
    expect(embeddedMatches(src, [{ text: 'Somebody Else' }])).toBe(false);
  });
});

describe.each(TEMPLATES.map((t) => t.id))('DOCX roundtrip — %s', (id) => {
  it('keeps every achievement bullet and core field', async () => {
    const src = applyTemplate(sampleResume(), id);
    const bytes = await renderDocx(src, { embedFonts: false });
    const html = (await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })).value;
    const parsed = parseResume(htmlToLines(html));
    expectCoreFields(parsed, src);
  });
});
