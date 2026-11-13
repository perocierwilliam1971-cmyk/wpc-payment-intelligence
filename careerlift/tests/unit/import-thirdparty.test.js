// Import tests against resumes CareerLift did NOT create.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import mammoth from 'mammoth';
import { htmlToLines, pdfToLines, textToLines, decodeText, detectKind } from '../../src/import/extract.js';
import { parseResume, findDateRange } from '../../src/import/parse.js';

const dir = 'tests/fixtures/files';
const buf = (f) => fs.readFileSync(`${dir}/${f}`);
const ab = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

function expectJordan(resume, report) {
  expect(resume.contact.fullName).toBe('Jordan T. Williams');
  expect(resume.contact.email).toBe('jordan.williams@example.net');
  expect(resume.contact.phone).toBe('(407) 555-0199');
  expect(resume.contact.location).toMatch(/^Orlando, FL/);
  expect(resume.experience).toHaveLength(2);
  const [a, b] = resume.experience;
  expect(a.title).toBe('Team Lead');
  expect(a.company).toBe('Sunshine Market Inc.');
  expect(a.current).toBe(true);
  expect(a.startDate).toBe('June 2019');
  expect(a.bullets.map((x) => x.text)).toEqual([
    'Responsible for scheduling 22 associates across morning and evening shifts',
    'Reduced inventory shrink 18% by introducing weekly cycle counts',
    'Trained over 40 new hires on register, safety and customer service procedures',
  ]);
  expect(b.title).toBe('Sales Associate');
  expect(b.company).toBe('Big Box Electronics');
  expect(b.endDate).toBe('May 2019');
  expect(b.bullets).toHaveLength(2);
  expect(resume.education[0].degree).toBe('Associate of Science, Supply Chain Management');
  expect(resume.education[0].school).toMatch(/Valencia College/);
  expect(resume.certifications[0].name).toBe('Forklift Operator Certification');
  expect(resume.skills).toEqual(['Scheduling', 'Inventory Control', 'Point of Sale Systems', 'Microsoft Excel', 'Team Training', 'Conflict Resolution']);
  expect(resume.custom.map((c) => c.title)).toContain('Volunteer');
  expect(report.unplaced).toEqual([]);
}

describe('third-party DOCX', () => {
  it('extracts every field from a typical Word resume', async () => {
    const html = (await mammoth.convertToHtml({ buffer: buf('plain.docx') })).value;
    const { resume, report } = parseResume(htmlToLines(html));
    expectJordan(resume, report);
  });
});

describe('third-party PDF (LibreOffice export)', () => {
  it('extracts every field', async () => {
    const lines = await pdfToLines(ab(buf('plain.pdf')));
    const { resume, report } = parseResume(lines);
    expectJordan(resume, report);
  });
});

describe('Puerto Rico Spanish TXT in Windows-1252', () => {
  it('decodes accents and parses Spanish headings', () => {
    const text = decodeText(ab(buf('spanish-pr.txt')));
    expect(text).toContain('Vélez');
    expect(text).toContain('PREPARACIÓN ACADÉMICA');
    const { resume, report } = parseResume(textToLines(text));
    expect(report.detectedLanguage).toBe('es');
    expect(resume.contact.fullName).toBe('Carmen L. Ortiz Vélez');
    expect(resume.contact.phone).toBe('(939) 555-0110');
    expect(resume.contact.location).toBe('Bayamón, Puerto Rico');
    expect(resume.experience).toHaveLength(2);
    expect(resume.experience[0]).toMatchObject({ title: 'Enfermera Graduada', company: 'Hospital San Pablo', location: 'Bayamón, PR', startDate: 'Enero 2018', current: true });
    expect(resume.experience[0].bullets).toHaveLength(3);
    expect(resume.experience[1].endDate).toBe('Diciembre 2017');
    expect(resume.education[0].degree).toBe('Bachillerato en Ciencias de Enfermería');
    expect(resume.certifications).toHaveLength(2);
    expect(resume.skills).toContain('Triage');
    expect(resume.languages).toEqual(['Español (nativo)', 'Inglés (avanzado)']);
    expect(report.unplaced).toEqual([]);
  });
});

describe('scanned PDF', () => {
  it('yields no text so the UI can explain OCR is not available', async () => {
    const lines = await pdfToLines(ab(buf('scanned.pdf')));
    expect(lines.filter((l) => l.text.trim())).toHaveLength(0);
  });
});

describe('helpers', () => {
  it('detects file kinds', () => {
    expect(detectKind({ name: 'a.PDF' })).toBe('pdf');
    expect(detectKind({ name: 'a.docx' })).toBe('docx');
    expect(detectKind({ name: 'a.doc' })).toBe('doc');
    expect(detectKind({ name: 'a.txt' })).toBe('txt');
    expect(detectKind({ name: 'a.pages' })).toBe('pages');
  });
  it.each([
    ['Jan 2020 - Present', 'Jan 2020', '', true],
    ['01/2019 – 03/2021', '01/2019', '03/2021', false],
    ['2015 to 2018', '2015', '2018', false],
    ['marzo de 2019 – actualidad', 'Marzo de 2019', '', true],
    ['Sept. 2017 — Dec. 2019', 'Sept. 2017', 'Dec. 2019', false],
  ])('date range %s', (s, start, end, current) => {
    expect(findDateRange(s)).toMatchObject({ start, end, current });
  });
});
