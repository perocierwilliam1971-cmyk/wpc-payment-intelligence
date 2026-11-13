// Upload pipeline: file -> lines -> resume (+ a review report).
import { extractFile } from './extract.js';
import { parseResume } from './parse.js';
import { normalizeResume } from '../model/schema.js';

const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * A CareerLift PDF carries its own structured data. Use it only if it still
 * matches the visible text (so an edited/altered PDF falls back to parsing).
 */
export function embeddedMatches(embedded, lines) {
  const text = squash(lines.map((l) => l.text).join(' '));
  const r = normalizeResume(embedded);
  const probes = [r.contact.fullName, ...r.experience.flatMap((e) => e.bullets.map((b) => b.text))].map(squash).filter(Boolean);
  if (!probes.length) return false;
  // Probe on word prefixes (wrapped lines change spacing, not words).
  return probes.every((p) => text.includes(p.split(' ').slice(0, 5).join(' ')));
}

export async function importResumeFile(file, opts = {}) {
  const { kind, lines, embedded } = await extractFile(file);
  if (embedded && embeddedMatches(embedded, lines)) {
    const resume = normalizeResume(embedded);
    resume.meta.source = 'careerlift-pdf';
    return { resume, report: { restored: true, warnings: [], unplaced: [], flags: {}, rawText: lines.map((l) => l.text).join('\n'), kind } };
  }
  const { resume, report } = parseResume(lines, { language: opts.language, source: kind });
  report.kind = kind;
  return { resume, report };
}
