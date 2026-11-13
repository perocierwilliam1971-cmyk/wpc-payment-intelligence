// Renders the sample resume in every template to PDF (and PNG via pdftoppm
// when available) so a human can visually review each design.
// Usage: node scripts/render-samples.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { useNodeFonts } from '../tests/node-fonts.js';
import { sampleResume } from '../tests/fixtures/sample-resume.js';
import { TEMPLATES } from '../src/layout/templates.js';
import { applyTemplate } from '../src/design/apply.js';
import { prepareFonts, layoutResume } from '../src/layout/engine.js';
import { renderPdf } from '../src/export/pdf.js';

useNodeFonts();
const out = process.argv[2] || 'scratch/samples';
fs.mkdirSync(out, { recursive: true });
for (const t of TEMPLATES) {
  const r = applyTemplate(sampleResume(), t.id);
  await prepareFonts(r);
  const layout = layoutResume(r);
  const bytes = await renderPdf(layout, { title: r.contact.fullName });
  const file = path.join(out, `${t.id}.pdf`);
  fs.writeFileSync(file, bytes);
  try {
    execFileSync('pdftoppm', ['-r', '60', '-png', file, path.join(out, t.id)]);
  } catch { /* pdftoppm optional */ }
  console.log(t.id, layout.pages.length, 'page(s)', bytes.length, 'bytes');
}
