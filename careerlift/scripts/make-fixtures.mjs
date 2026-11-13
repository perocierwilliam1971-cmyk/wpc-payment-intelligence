// Builds "third-party" test resumes that do NOT come from CareerLift, so the
// importer is tested against formats it didn't create:
//   plain.docx        - a typical Word resume (headings, real Word bullets, tabs)
//   plain.pdf         - the same converted by LibreOffice (a real external PDF)
//   spanish-pr.txt    - Puerto Rico Spanish resume as plain text (Windows-1252!)
//   scanned.pdf       - image-only PDF (no text layer) -> must show a clear error
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, TabStopType, LevelFormat, AlignmentType } from 'docx';
import { PDFDocument, rgb } from 'pdf-lib';

const out = 'tests/fixtures/files';
fs.mkdirSync(out, { recursive: true });

const P = (text, o = {}) => new Paragraph({ children: [new TextRun({ text, bold: o.bold, italics: o.italic, size: o.size })], heading: o.heading, alignment: o.align, numbering: o.bullet ? { reference: 'b', level: 0 } : undefined, tabStops: o.tab ? [{ type: TabStopType.RIGHT, position: 9360 }] : undefined });
const T = (left, right) => new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], children: [new TextRun({ text: left, bold: true }), new TextRun({ text: `\t${right}` })] });

const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
  sections: [{ children: [
    P('JORDAN T. WILLIAMS', { bold: true, size: 36, align: AlignmentType.CENTER }),
    P('Orlando, FL 32801 • (407) 555-0199 • jordan.williams@example.net • linkedin.com/in/jordantwilliams', { align: AlignmentType.CENTER }),
    P('SUMMARY', { heading: HeadingLevel.HEADING_2 }),
    P('Retail team lead with 7 years of experience in high-volume stores. Strong at training new associates, inventory control and customer service. Looking to move into operations or logistics coordination.'),
    P('WORK EXPERIENCE', { heading: HeadingLevel.HEADING_2 }),
    T('Team Lead, Sunshine Market Inc.', 'June 2019 – Present'),
    P('Orlando, FL', { italic: true }),
    P('Responsible for scheduling 22 associates across morning and evening shifts', { bullet: true }),
    P('Reduced inventory shrink 18% by introducing weekly cycle counts', { bullet: true }),
    P('Trained over 40 new hires on register, safety and customer service procedures', { bullet: true }),
    T('Sales Associate, Big Box Electronics', 'Aug 2016 – May 2019'),
    P('Kissimmee, FL', { italic: true }),
    P('Helped customers choose computers and home theater equipment', { bullet: true }),
    P('Ranked in top 10% of district for protection-plan sales in 2018', { bullet: true }),
    P('EDUCATION', { heading: HeadingLevel.HEADING_2 }),
    T('Associate of Science, Supply Chain Management', '2021'),
    P('Valencia College, Orlando, FL'),
    P('CERTIFICATIONS', { heading: HeadingLevel.HEADING_2 }),
    P('Forklift Operator Certification - OSHA, 2022', { bullet: true }),
    P('SKILLS', { heading: HeadingLevel.HEADING_2 }),
    P('Scheduling, Inventory Control, Point of Sale Systems, Microsoft Excel, Team Training, Conflict Resolution'),
    P('VOLUNTEER', { heading: HeadingLevel.HEADING_2 }),
    P('Second Harvest Food Bank — warehouse volunteer, 2020–present', { bullet: true }),
  ] }],
});
fs.writeFileSync(path.join(out, 'plain.docx'), await Packer.toBuffer(doc));
try {
  execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', out, path.join(out, 'plain.docx')], { stdio: 'ignore', timeout: 120000 });
  console.log('plain.pdf via LibreOffice');
} catch (e) { console.log('LibreOffice unavailable; plain.pdf not rebuilt'); }

const es = `Carmen L. Ortiz Vélez
Bayamón, Puerto Rico | (939) 555-0110 | carmen.ortiz@example.com

RESUMEN PROFESIONAL
Enfermera graduada con 9 años de experiencia en hospitales de Puerto Rico. Bilingüe, con experiencia en sala de emergencias y educación a pacientes.

EXPERIENCIA DE EMPLEO
Enfermera Graduada – Hospital San Pablo, Bayamón, PR
Enero 2018 – Presente
• Responsable de coordinar el cuidado de 6 pacientes por turno en sala de emergencias
• Eduqué a pacientes y familiares sobre manejo de diabetes en español e inglés
• Adiestré a 12 enfermeras nuevas en protocolos de triage

Enfermera Práctica – Centro Médico Municipal, Cataño, PR
Junio 2014 – Diciembre 2017
• Administré medicamentos y documenté signos vitales en expedientes electrónicos

PREPARACIÓN ACADÉMICA
Bachillerato en Ciencias de Enfermería – Universidad del Este, Carolina, PR, 2014

CERTIFICACIONES Y LICENCIAS
Licencia de Enfermera Generalista, Junta Examinadora de Enfermería de PR, 2014
BLS y ACLS – American Heart Association, 2023

DESTREZAS
Triage, Educación a pacientes, Expedientes electrónicos (EHR), Manejo de crisis

IDIOMAS
Español (nativo), Inglés (avanzado)
`;
// Windows-1252 bytes, like an old Notepad file.
fs.writeFileSync(path.join(out, 'spanish-pr.txt'), Buffer.from([...es.replace(/\n/g, '\r\n')].map((ch) => {
  const map = { '–': 0x96, '•': 0x95, '“': 0x93, '”': 0x94, '’': 0x92 };
  return map[ch] ?? ch.charCodeAt(0);
})));

// Image-only PDF (simulated scan): draw shapes, no text.
const scan = await PDFDocument.create();
const pg = scan.addPage([612, 792]);
for (let y = 700; y > 100; y -= 18) pg.drawRectangle({ x: 60, y, width: 300 + ((y * 7) % 180), height: 8, color: rgb(0.2, 0.2, 0.2) });
fs.writeFileSync(path.join(out, 'scanned.pdf'), await scan.save());
console.log('fixtures written to', out);
