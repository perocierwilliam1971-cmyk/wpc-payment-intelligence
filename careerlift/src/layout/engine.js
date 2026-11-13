// Layout engine entry point: resume model -> positioned pages.
// The preview renderer and the PDF writer both consume this output, which is
// why the download matches what the customer saw.

import { BUILDERS, getTemplate, makeCtx, PAGE_SIZES } from './templates.js';
import { paginate, textItems } from './flow.js';
import { visibleSections, normalizeResume } from '../model/schema.js';
import { loadFamily } from '../design/fonts.js';
import { tint } from '../core/util.js';

/** Load every font the design needs. Must be awaited before layoutResume(). */
export async function prepareFonts(resume) {
  const fams = new Set([resume.design.headingFont, resume.design.bodyFont]);
  await Promise.all([...fams].map((f) => loadFamily(f)));
}

export function layoutResume(input) {
  const resume = normalizeResume(input);
  const tpl = getTemplate(resume.design.templateId);
  const ctx = makeCtx(resume);
  const sections = visibleSections(resume);
  const built = BUILDERS[tpl.id].build(ctx, sections, tpl);
  const { pw, ph, m } = ctx;
  const bottom = ph - m;

  const columnPages = built.columns.map((col) => paginate(col.items, {
    firstTop: col.firstTop ?? m,
    top: col.top ?? m,
    bottom,
  }));
  const pageCount = Math.max(1, ...columnPages.map((p) => p.length));
  const pages = [];
  for (let i = 0; i < pageCount; i += 1) {
    const ops = [];
    if (built.decorate) ops.push(...built.decorate(i, pageCount));
    if (i === 0 && built.header) ops.push(...built.header.ops);
    for (const cp of columnPages) if (cp[i]) ops.push(...cp[i]);
    if (pageCount > 1 && i > 0) ops.push(...footer(ctx, i, pageCount));
    pages.push({ ops });
  }
  return { width: pw, height: ph, pages, templateId: tpl.id, pageSize: resume.design.pageSize };
}

function footer(ctx, i, n) {
  const name = (ctx.r.contact.fullName || '').trim();
  const label = `${name ? `${name}  ·  ` : ''}${i + 1} / ${n}`;
  const it = textItems([ctx.run(label, { size: ctx.fs * 0.78, color: tint(ctx.c.text, 0.45) })], ctx.m, ctx.pw - 2 * ctx.m, ctx, { align: 'right' })[0];
  if (!it) return [];
  const y = ctx.ph - Math.min(ctx.m * 0.55, 26);
  return it.ops.map((o) => ({ ...o, y: o.y + y - it.h }));
}

/**
 * Cover-letter layout that reuses the resume's fonts and colors so the pair
 * looks like a matched set.
 */
export function layoutLetter(input, letter) {
  const resume = normalizeResume(input);
  const ctx = makeCtx(resume);
  const { pw, ph, m, c, fs } = ctx;
  const width = pw - 2 * m;
  const ct = resume.contact;
  const items = [];
  const accentBar = { h: 10, ops: [{ t: 'rect', x: m, y: 0, w: 40, h: 3, fill: c.accent === c.primary ? c.primary : c.accent }] };
  items.push(...textItems([ctx.run(ct.fullName, { heading: true, bold: true, size: fs * 2.1, color: c.primary })], m, width, ctx, { lsMul: 0.9 }));
  if (ct.headline) items.push(...textItems([ctx.run(ct.headline, { italic: true, color: c.muted })], m, width, ctx));
  const parts = [ct.email, ct.phone, ct.location, ct.linkedin].map((s) => (s || '').trim()).filter(Boolean);
  if (parts.length) items.push(...textItems([ctx.run(parts.join('  |  '), { size: fs * 0.92, color: c.text })], m, width, ctx));
  items.push({ h: 6, ops: [] }, accentBar, { h: fs * 1.2, ops: [] });
  const body = String(letter || '').replace(/\r\n/g, '\n');
  for (const para of body.split(/\n\s*\n/)) {
    const t = para.trim();
    if (!t) continue;
    items.push(...textItems([ctx.run(t)], m, width, ctx, { lsMul: 1.08 }));
    items.push({ h: fs * 0.85, ops: [], spacer: true });
  }
  const pagesOps = paginate(items, { firstTop: m, top: m, bottom: ph - m });
  return { width: pw, height: ph, pages: pagesOps.map((ops) => ({ ops })), pageSize: resume.design.pageSize };
}

export { PAGE_SIZES };
