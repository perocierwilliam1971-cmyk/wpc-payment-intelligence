// Writes a DOCX per template, then (if LibreOffice is installed) converts each
// to PDF + PNG so the Word output can be reviewed visually.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { useNodeFonts } from '../tests/node-fonts.js';
import { sampleResume } from '../tests/fixtures/sample-resume.js';
import { TEMPLATES } from '../src/layout/templates.js';
import { applyTemplate } from '../src/design/apply.js';
import { renderDocx } from '../src/export/docx.js';
import { resumeToText } from '../src/export/txt.js';

useNodeFonts();
const out = process.argv[2] || 'scratch/docx';
fs.mkdirSync(out, { recursive: true });
for (const t of TEMPLATES) {
  const r = applyTemplate(sampleResume(), t.id);
  const bytes = await renderDocx(r);
  const file = path.join(out, `${t.id}.docx`);
  fs.writeFileSync(file, bytes);
  console.log(t.id, bytes.length, 'bytes');
}
fs.writeFileSync(path.join(out, 'resume.txt'), resumeToText(sampleResume()));
try {
  execFileSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', out, ...TEMPLATES.map((t) => path.join(out, `${t.id}.docx`))], { stdio: 'ignore', timeout: 180000 });
  for (const t of TEMPLATES) execFileSync('pdftoppm', ['-r', '60', '-png', '-f', '1', '-l', '1', path.join(out, `${t.id}.pdf`), path.join(out, t.id)]);
  console.log('converted with LibreOffice');
} catch (e) { console.log('LibreOffice conversion skipped:', e.message); }
