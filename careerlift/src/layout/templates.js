// The six resume templates. Each one is real layout code — different header
// structures, column systems, heading treatments, entry formats and page
// decorations — not a color swap of a single design.

import { textItems, bulletItems, splitLineItems, spacer, ruleItem, chipItems, gluedItem } from './flow.js';
import { textWidth } from './text.js';
import { tint, readableOn } from '../core/util.js';
import { dateRange, sectionTitle, docLabels } from '../model/labels.js';
import { isBlank } from '../core/util.js';

export const PAGE_SIZES = {
  letter: { w: 612, h: 792, label: 'US Letter (8.5 × 11 in)' },
  a4: { w: 595.28, h: 841.89, label: 'A4 (210 × 297 mm)' },
};

// ---------------------------------------------------------------------------
// Template metadata (used by the UI and the DOCX exporter)

export const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic ATS',
    description: 'Traditional single column. The safest choice for online applications.',
    layout: 'single',
    colorRoles: { primary: 'Name & headings', text: 'Body text' },
    defaults: { colors: { primary: '#1f2937', accent: '#1f2937', text: '#1f2937', background: '#f3f4f6' }, headingFont: 'source-serif-4', bodyFont: 'source-serif-4', fontSize: 10.5, margins: 54, lineSpacing: 1.15, sectionSpacing: 12 },
  },
  {
    id: 'executive',
    name: 'Executive Pro',
    description: 'Full-width header band, executive summary panel and competency grid.',
    layout: 'single',
    colorRoles: { primary: 'Header band & headings', accent: 'Accent', text: 'Body text', background: 'Summary panel' },
    defaults: { colors: { primary: '#1b2a41', accent: '#b08d3c', text: '#222222', background: '#f4f1ea' }, headingFont: 'eb-garamond', bodyFont: 'lato', fontSize: 10, margins: 50, lineSpacing: 1.2, sectionSpacing: 14 },
  },
  {
    id: 'modern',
    name: 'Modern Professional',
    description: 'Two columns with a full-height color sidebar for contact, skills and education.',
    layout: 'sidebar',
    sidebarKeys: ['skills', 'languages', 'certifications', 'education'],
    colorRoles: { primary: 'Sidebar', accent: 'Accent', text: 'Body text' },
    defaults: { colors: { primary: '#0f4c5c', accent: '#e36414', text: '#1f2933', background: '#0f4c5c' }, headingFont: 'montserrat', bodyFont: 'open-sans', fontSize: 9.5, margins: 40, lineSpacing: 1.2, sectionSpacing: 13 },
  },
  {
    id: 'minimal',
    name: 'Minimalist',
    description: 'Generous white space, light typography and headings in a left margin column.',
    layout: 'single',
    colorRoles: { primary: 'Name', accent: 'Headings & details', text: 'Body text' },
    defaults: { colors: { primary: '#111111', accent: '#6b7280', text: '#2b2b2b', background: '#ffffff' }, headingFont: 'raleway', bodyFont: 'lato', fontSize: 10, margins: 58, lineSpacing: 1.3, sectionSpacing: 18 },
  },
  {
    id: 'creative',
    name: 'Creative Edge',
    description: 'Color stripe, two-tone name, timeline experience and skill tags.',
    layout: 'single',
    colorRoles: { primary: 'Stripe & headings', accent: 'Highlight', text: 'Body text', background: 'Skill tags' },
    defaults: { colors: { primary: '#6d28d9', accent: '#f59e0b', text: '#1f2937', background: '#ede9fe' }, headingFont: 'montserrat', bodyFont: 'roboto', fontSize: 9.5, margins: 44, lineSpacing: 1.2, sectionSpacing: 14 },
  },
  {
    id: 'corporate',
    name: 'Corporate Elite',
    description: 'Split header, double rule and a tinted side panel. Polished and conservative.',
    layout: 'sidebar',
    sidebarKeys: ['skills', 'languages', 'certifications', 'education'],
    defaultSidebar: 'right',
    colorRoles: { primary: 'Name & rules', accent: 'Accent', text: 'Body text', background: 'Side panel' },
    defaults: { colors: { primary: '#7f1d1d', accent: '#9ca3af', text: '#1f2937', background: '#f3f4f6' }, headingFont: 'source-serif-4', bodyFont: 'roboto', fontSize: 9.5, margins: 44, lineSpacing: 1.2, sectionSpacing: 13 },
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}

// ---------------------------------------------------------------------------
// Shared building blocks

function makeCtx(resume) {
  const d = resume.design;
  const size = PAGE_SIZES[d.pageSize] || PAGE_SIZES.letter;
  const c = { ...d.colors };
  c.muted = tint(c.text, 0.38);
  const ctx = {
    r: resume,
    d,
    lang: resume.meta.language,
    pw: size.w,
    ph: size.h,
    m: d.margins,
    hf: d.headingFont,
    bf: d.bodyFont,
    fs: d.fontSize,
    lineSpacing: d.lineSpacing,
    ss: d.sectionSpacing,
    c,
  };
  ctx.run = (text, o = {}) => ({
    text: text ?? '',
    fam: o.fam || (o.heading ? ctx.hf : ctx.bf),
    v: o.v || (o.bold && o.italic ? 'bolditalic' : o.bold ? 'bold' : o.italic ? 'italic' : 'regular'),
    size: o.size || ctx.fs,
    color: o.color || c.text,
    // ATS safety: tracking above ~0.1em makes PDF text extractors (pdf.js,
    // pdftotext — and the ATS systems built on them) read "P R O F I L E".
    // Measured; capped at 0.08em for every template.
    cs: Math.min(o.cs || 0, (o.size || ctx.fs) * 0.08),
    upper: !!o.upper,
  });
  return ctx;
}

function contactParts(r) {
  const c = r.contact;
  const clean = (u) => u.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  return [c.email, c.phone, c.location, c.linkedin && clean(c.linkedin), c.website && clean(c.website)]
    .map((s) => (s || '').trim())
    .filter(Boolean);
}

/** Contact parts joined by a separator, wrapping only between parts. */
function joinedRuns(ctx, parts, sep, o = {}) {
  const runs = [];
  // Separator padding uses non-breaking spaces (the wrapper collapses normal
  // whitespace); one trailing normal space remains as the break opportunity.
  const safeSep = /\s$/.test(sep) ? `${sep.slice(0, -1).replace(/ /g, ' ')} ` : sep.replace(/ /g, ' ');
  parts.forEach((p, i) => {
    if (i > 0) runs.push(ctx.run(safeSep, { ...o, color: o.sepColor || o.color }));
    // Non-breaking spaces keep a single contact item on one line.
    runs.push(ctx.run(p.replace(/ /g, ' '), o));
  });
  return runs;
}

function nonEmptyBullets(e) {
  return e.bullets.map((b) => b.text.trim()).filter(Boolean);
}

/**
 * Body of a section in a column. `S` is the template's style object which
 * may override any renderer.
 */
function sectionBody(ctx, key, col, S) {
  const r = ctx.r;
  const T = col.theme;
  const out = [];
  if (key === 'summary') {
    return textItems([ctx.run(r.summary.trim(), { color: T.text })], col.x, col.w, ctx);
  }
  if (key === 'experience') {
    const list = r.experience.filter((e) => !isBlank(e.title) || !isBlank(e.company) || nonEmptyBullets(e).length);
    list.forEach((e, i) => {
      if (i > 0) out.push(spacer(ctx.fs * 0.75));
      const head = S.entryHeader(ctx, e, col);
      const bullets = nonEmptyBullets(e);
      head.forEach((h) => { h.keep = true; });
      if (!bullets.length && head.length) head[head.length - 1].keep = false;
      out.push(...head);
      bullets.forEach((b, bi) => {
        if (bi === 0) out.push(gluedSpace(ctx.fs * 0.2));
        out.push(...(S.bullet ? S.bullet(ctx, b, col) : bulletItems([ctx.run(b, { color: T.text })], col.x, col.w, ctx, { bulletColor: T.bullet || T.text })));
      });
    });
    return out;
  }
  if (key === 'education') {
    const list = r.education.filter((e) => !isBlank(e.degree) || !isBlank(e.school));
    list.forEach((e, i) => {
      if (i > 0) out.push(spacer(ctx.fs * 0.55));
      out.push(...(S.eduEntry ? S.eduEntry(ctx, e, col) : defaultEdu(ctx, e, col)));
    });
    return out;
  }
  if (key === 'certifications') {
    const list = r.certifications.filter((c) => !isBlank(c.name));
    list.forEach((c) => {
      const runs = [ctx.run(c.name, { bold: true, color: T.text })];
      const tail = [c.issuer, c.date].map((s) => s.trim()).filter(Boolean).join(', ');
      if (tail) runs.push(ctx.run(` — ${tail}`, { color: T.muted }));
      if (S.listAsBullets) out.push(...bulletItems(runs, col.x, col.w, ctx, { bulletColor: T.bullet || T.text, shape: S.bulletShape }));
      else out.push(...textItems(runs, col.x, col.w, ctx, { keepLines: true }));
    });
    return out;
  }
  if (key === 'skills' || key === 'languages') {
    const list = r[key];
    if (S.skills) return S.skills(ctx, list, col, key);
    return textItems(joinedRuns(ctx, list, '  •  ', { color: T.text, sepColor: T.muted }), col.x, col.w, ctx);
  }
  if (key.startsWith('custom:')) {
    const sec = r.custom.find((s) => `custom:${s.id}` === key);
    for (const it of sec.items) {
      out.push(...bulletItems([ctx.run(it, { color: T.text })], col.x, col.w, ctx, { bulletColor: T.bullet || T.text, shape: S.bulletShape }));
    }
    return out;
  }
  return out;
}

function gluedSpace(h) {
  return { h, ops: [], keep: true };
}

function defaultEdu(ctx, e, col) {
  const T = col.theme;
  const items = splitLineItems(
    [ctx.run(e.degree || e.school, { bold: true, color: T.text })],
    [ctx.run(dateRange(e, ctx.lang), { color: T.muted, size: ctx.fs * 0.95 })],
    col.x, col.w, ctx,
  );
  const second = [e.degree ? e.school : '', e.location].map((s) => (s || '').trim()).filter(Boolean).join(', ');
  if (second) items.push(...textItems([ctx.run(second, { italic: true, color: T.text })], col.x, col.w, ctx, { keepLines: true }));
  if (!isBlank(e.details)) items.push(...textItems([ctx.run(e.details.trim(), { color: T.muted, size: ctx.fs * 0.95 })], col.x, col.w, ctx, { keepLines: true }));
  items.forEach((it, i) => { it.keep = i < items.length - 1; });
  return items;
}

/** Render a list of section keys into a column's item list. */
function columnItems(ctx, keys, col, S) {
  const items = [];
  keys.forEach((key, i) => {
    if (i > 0 || col.leadSpace) items.push(spacer(ctx.ss));
    const body = sectionBody(ctx, key, col, S);
    if (!body.length) return;
    const head = S.heading(ctx, sectionTitle(ctx.r, key), col, key);
    head.forEach((h) => { h.keep = true; });
    if (S.wrapSection) items.push(...S.wrapSection(ctx, key, head, body, col));
    else items.push(...head, ...body);
  });
  return items;
}

const mainTheme = (ctx) => ({ text: ctx.c.text, muted: ctx.c.muted, heading: ctx.c.primary, bullet: ctx.c.text });

// ---------------------------------------------------------------------------
// 1. Classic ATS

const classic = {
  build(ctx, sections) {
    const { m, pw, c, fs } = ctx;
    const col = { x: m, w: pw - 2 * m, theme: mainTheme(ctx) };
    const head = [];
    const ct = ctx.r.contact;
    head.push(...textItems([ctx.run(ct.fullName, { heading: true, bold: true, size: fs * 2.3, color: c.primary })], col.x, col.w, ctx, { align: 'center', lsMul: 0.9 }));
    if (ct.headline) head.push(...textItems([ctx.run(ct.headline, { italic: true, color: c.muted, size: fs * 1.05 })], col.x, col.w, ctx, { align: 'center' }));
    const parts = contactParts(ctx.r);
    if (parts.length) head.push(...textItems(joinedRuns(ctx, parts, '  |  ', { size: fs * 0.95, color: c.text, sepColor: c.muted }), col.x, col.w, ctx, { align: 'center' }));
    head.push(spacer(fs * 0.4));
    const S = {
      heading: (cx, title, cl) => [
        ...textItems([cx.run(title, { heading: true, bold: true, upper: true, cs: 1, size: fs * 1.12, color: c.primary })], cl.x, cl.w, cx),
        ruleItem(cl.x, cl.w, c.primary, 0.8, 1, 5),
      ],
      entryHeader: (cx, e, cl) => {
        const items = splitLineItems(
          [cx.run(e.title || e.company, { bold: true })],
          [cx.run(dateRange(e, cx.lang), { color: c.text })],
          cl.x, cl.w, cx,
        );
        const second = [e.title ? e.company : '', e.location].map((s) => (s || '').trim()).filter(Boolean).join(', ');
        if (second) items.push(...textItems([cx.run(second, { italic: true })], cl.x, cl.w, cx, { keepLines: true }));
        return items;
      },
      listAsBullets: true,
    };
    return { columns: [{ ...col, items: [...head, ...columnItems(ctx, sections, col, S)] }] };
  },
};

// ---------------------------------------------------------------------------
// 2. Executive Pro

const executive = {
  build(ctx, sections) {
    const { m, pw, c, fs } = ctx;
    const onBand = readableOn(c.primary);
    const bandInner = { x: m, w: pw - 2 * m };
    // Header band ops (absolute, page 1 only)
    const lines = [];
    lines.push(...textItems([ctx.run(ctx.r.contact.fullName, { heading: true, bold: true, size: fs * 2.7, color: onBand })], bandInner.x, bandInner.w, ctx, { lsMul: 0.85 }));
    if (ctx.r.contact.headline) lines.push(...textItems([ctx.run(ctx.r.contact.headline, { upper: true, cs: 1.4, bold: true, size: fs * 0.92, color: c.accent })], bandInner.x, bandInner.w, ctx));
    const parts = contactParts(ctx.r);
    if (parts.length) {
      lines.push({ h: fs * 0.35, ops: [] });
      lines.push(...textItems(joinedRuns(ctx, parts, '   ·   ', { size: fs * 0.92, color: tint(onBand === '#ffffff' ? '#ffffff' : '#111827', 0.12), sepColor: c.accent }), bandInner.x, bandInner.w, ctx));
    }
    const padTop = Math.max(26, m * 0.7);
    let y = padTop;
    const bandOps = [];
    for (const l of lines) {
      bandOps.push(...l.ops.map((o) => ({ ...o, y: o.y + y })));
      y += l.h;
    }
    const bandH = y + padTop * 0.75;
    const header = [
      { t: 'rect', x: 0, y: 0, w: pw, h: bandH, fill: c.primary },
      { t: 'rect', x: 0, y: bandH, w: pw, h: 3, fill: c.accent },
      ...bandOps,
    ];

    const col = { x: m, w: pw - 2 * m, theme: mainTheme(ctx) };
    const S = {
      heading: (cx, title, cl) => [
        ...textItems([cx.run(title, { heading: true, bold: true, upper: true, cs: 1.6, size: fs * 1.2, color: c.primary })], cl.x, cl.w, cx),
        { h: 7, ops: [{ t: 'rect', x: cl.x, y: 1, w: 34, h: 2, fill: c.accent }], keep: true },
      ],
      entryHeader: (cx, e, cl) => [
        ...splitLineItems(
          [cx.run(e.company || e.title, { bold: true, upper: true, cs: 0.6, color: c.primary })],
          [cx.run(e.location, { color: c.muted, size: fs * 0.95 })],
          cl.x, cl.w, cx,
        ),
        ...(e.company && e.title ? splitLineItems(
          [cx.run(e.title, { bold: true, italic: true })],
          [cx.run(dateRange(e, cx.lang), { color: c.muted, size: fs * 0.95 })],
          cl.x, cl.w, cx,
        ) : textItems([cx.run(dateRange(e, cx.lang), { color: c.muted, size: fs * 0.95 })], cl.x, cl.w, cx, { keepLines: true })),
      ],
      bullet: (cx, b, cl) => bulletItems([cx.run(b)], cl.x, cl.w, cx, { shape: 'square', bulletColor: c.accent }),
      bulletShape: 'square',
      listAsBullets: true,
      skills: (cx, list, cl, key) => {
        if (key === 'languages') return textItems(joinedRuns(cx, list, '   ·   ', { sepColor: c.accent }), cl.x, cl.w, cx);
        return gridItems(cx, list, cl, 3, c.accent);
      },
      wrapSection: (cx, key, head, body, cl) => {
        if (key !== 'summary') return [...head, ...body];
        // Shaded executive summary panel. Each line paints its own slice of
        // the panel so it stays continuous across a page break.
        const pad = 9;
        const inner = textItems([cx.run(cx.r.summary.trim(), { italic: false })], cl.x + pad, cl.w - pad * 2, cx);
        const bg = (h) => ({ t: 'rect', x: cl.x, y: 0, w: cl.w, h, fill: c.background });
        const bar = (h) => ({ t: 'rect', x: cl.x, y: 0, w: 2.5, h, fill: c.accent });
        const panel = [
          { h: pad, ops: [bg(pad), bar(pad)], keep: true },
          ...inner.map((it) => ({ ...it, ops: [bg(it.h), bar(it.h), ...it.ops] })),
          { h: pad, ops: [bg(pad), bar(pad)] },
        ];
        return [...head, ...panel];
      },
    };
    return {
      header: { ops: header, h: bandH + 3 },
      columns: [{ ...col, firstTop: bandH + 3 + Math.max(18, m * 0.5), items: columnItems(ctx, sections, col, S) }],
    };
  },
};

function gridItems(ctx, list, col, n, markColor) {
  const gap = 10;
  const cw = (col.w - gap * (n - 1)) / n;
  const items = [];
  for (let i = 0; i < list.length; i += n) {
    const row = list.slice(i, i + n);
    let h = 0;
    const ops = [];
    row.forEach((s, j) => {
      const x = col.x + j * (cw + gap);
      const t = bulletItems([ctx.run(s, { color: col.theme.text })], x, cw, ctx, { shape: 'square', bulletColor: markColor, indent: 10 });
      let y = 0;
      for (const it of t) {
        ops.push(...it.ops.map((o) => (o.t === 'circle' ? { ...o, cy: o.cy + y } : o.t === 'line' ? { ...o, y1: o.y1 + y, y2: o.y2 + y } : { ...o, y: o.y + y })));
        y += it.h;
      }
      h = Math.max(h, y);
    });
    items.push({ h, ops });
  }
  return items;
}

// ---------------------------------------------------------------------------
// 3. Modern Professional (sidebar)

const modern = {
  build(ctx, sections, tpl) {
    const { m, pw, ph, c, fs } = ctx;
    const sw = Math.round(pw * 0.335);
    const left = ctx.d.sidebarPosition !== 'right';
    const sbX = left ? 0 : pw - sw;
    const pad = Math.max(18, m * 0.6);
    const sbText = readableOn(c.primary);
    const sbMuted = tint(sbText === '#ffffff' ? '#ffffff' : '#111827', sbText === '#ffffff' ? 0.22 : 0.3);
    const sb = { x: sbX + pad, w: sw - pad * 2, theme: { text: sbText, muted: sbMuted, heading: sbText, bullet: c.accent } };
    const mainX = left ? sw + m * 0.8 : m;
    const main = { x: mainX, w: pw - sw - m * 1.8, theme: mainTheme(ctx) };

    const sideKeys = sections.filter((k) => tpl.sidebarKeys.includes(k));
    const mainKeys = sections.filter((k) => !tpl.sidebarKeys.includes(k));

    const sideHeading = (cx, title, cl) => [
      ...textItems([cx.run(title, { heading: true, bold: true, upper: true, cs: 1.3, size: fs * 1.02, color: cl.theme.heading })], cl.x, cl.w, cx),
      ruleItem(cl.x, cl.w, tint(c.primary, 0.35), 0.6, 1, 5),
    ];
    const mainHeading = (cx, title, cl) => {
      const items = textItems([cx.run(title, { heading: true, bold: true, upper: true, cs: 1.3, size: fs * 1.18, color: c.primary })], cl.x, cl.w, cx);
      const first = items[0];
      if (first && items.length === 1) {
        const tw = first.line.width;
        const yMid = first.baseline - first.line.size * 0.33;
        first.ops.push({ t: 'line', x1: cl.x + tw + 8, y1: yMid, x2: cl.x + cl.w, y2: yMid, w: 0.8, color: c.accent });
      }
      return [...items, gluedItem(4, [])];
    };

    const Sside = {
      heading: sideHeading,
      entryHeader: () => [],
      listAsBullets: true,
      eduEntry: (cx, e, cl) => {
        const T = cl.theme;
        const items = [];
        if (e.degree) items.push(...textItems([cx.run(e.degree, { bold: true, color: T.text })], cl.x, cl.w, cx, { keepLines: true }));
        if (e.school) items.push(...textItems([cx.run(e.school, { color: T.text })], cl.x, cl.w, cx, { keepLines: true }));
        const tail = [e.location, dateRange(e, cx.lang)].filter((s) => s && s.trim()).join(' · ');
        if (tail) items.push(...textItems([cx.run(tail, { color: T.muted, size: fs * 0.92 })], cl.x, cl.w, cx, { keepLines: true }));
        if (!isBlank(e.details)) items.push(...textItems([cx.run(e.details.trim(), { color: T.muted, size: fs * 0.92 })], cl.x, cl.w, cx));
        items.forEach((it, i) => { it.keep = i < items.length - 1; });
        return items;
      },
      skills: (cx, list, cl) => list.flatMap((s) => bulletItems([cx.run(s, { color: cl.theme.text })], cl.x, cl.w, cx, { bulletColor: c.accent })),
    };
    const Smain = {
      heading: mainHeading,
      entryHeader: (cx, e, cl) => {
        const items = splitLineItems(
          [cx.run(e.title || e.company, { heading: true, bold: true, size: fs * 1.08, color: c.text })],
          [cx.run(dateRange(e, cx.lang), { color: c.muted, size: fs * 0.92 })],
          cl.x, cl.w, cx,
        );
        const sub = [];
        if (e.title && e.company) sub.push(cx.run(e.company, { bold: true, color: c.accent }));
        if (e.location) {
          if (sub.length) sub.push(cx.run('  ·  ', { color: c.muted }));
          sub.push(cx.run(e.location, { color: c.muted }));
        }
        if (sub.length) items.push(...textItems(sub, cl.x, cl.w, cx, { keepLines: true }));
        return items;
      },
      bullet: (cx, b, cl) => bulletItems([cx.run(b)], cl.x, cl.w, cx, { bulletColor: c.accent }),
      listAsBullets: true,
      skills: (cx, list, cl) => textItems(joinedRuns(cx, list, '  •  ', { sepColor: c.accent }), cl.x, cl.w, cx),
    };

    // Sidebar starts with the identity block + contact details.
    const ct = ctx.r.contact;
    const sideItems = [];
    sideItems.push(...textItems([ctx.run(ct.fullName, { heading: true, bold: true, size: fs * 2.05, color: sbText })], sb.x, sb.w, ctx, { lsMul: 0.9 }));
    if (ct.headline) {
      sideItems.push(gluedItem(3, []));
      sideItems.push(...textItems([ctx.run(ct.headline, { color: sbMuted, size: fs * 1.0, cs: 0.3 })], sb.x, sb.w, ctx));
    }
    sideItems.push({ h: 10, ops: [{ t: 'rect', x: sb.x, y: 5, w: 28, h: 2.5, fill: c.accent }] });
    const parts = contactParts(ctx.r);
    if (parts.length) {
      sideItems.push(spacer(ctx.ss * 0.6));
      sideItems.push(...sideHeading(ctx, labelsFor(ctx).contact, sb));
      for (const p of parts) sideItems.push(...textItems([ctx.run(p, { color: sbText, size: fs * 0.95 })], sb.x, sb.w, ctx, { lsMul: 1.08 }));
    }
    sideItems.push(...columnItems(ctx, sideKeys, { ...sb, leadSpace: true }, Sside));

    return {
      decorate: () => [{ t: 'rect', x: sbX, y: 0, w: sw, h: ph, fill: c.primary }],
      columns: [
        { ...sb, items: sideItems, firstTop: Math.max(30, m * 0.9), top: Math.max(30, m * 0.9) },
        { ...main, items: columnItems(ctx, mainKeys, main, Smain), firstTop: Math.max(30, m * 0.9) },
      ],
    };
  },
};

function labelsFor(ctx) {
  return docLabels(ctx.lang);
}

// ---------------------------------------------------------------------------
// 4. Minimalist (headings in a left gutter)

const minimal = {
  build(ctx, sections) {
    const { m, pw, c, fs } = ctx;
    const full = { x: m, w: pw - 2 * m };
    const gutter = Math.min(118, full.w * 0.24);
    const col = { x: m + gutter, w: full.w - gutter, theme: { text: c.text, muted: c.accent, heading: c.accent, bullet: c.accent } };
    const ct = ctx.r.contact;
    const head = [];
    head.push(...textItems([ctx.run(ct.fullName, { heading: true, upper: true, cs: fs * 0.42, size: fs * 2.4, color: c.primary })], full.x, full.w, ctx, { lsMul: 0.95 }));
    if (ct.headline) head.push(...textItems([ctx.run(ct.headline, { heading: true, cs: 0.9, size: fs * 1.05, color: c.accent })], full.x, full.w, ctx));
    const parts = contactParts(ctx.r);
    if (parts.length) {
      head.push({ h: 4, ops: [] });
      head.push(...textItems(joinedRuns(ctx, parts, '    ', { size: fs * 0.92, color: c.accent }), full.x, full.w, ctx));
    }
    head.push(ruleItem(full.x, full.w, tint(c.accent, 0.55), 0.5, 10, 4));

    const S = {
      // Zero-height heading drawn in the gutter beside the first content line.
      heading: (cx, title, cl) => {
        const t = textItems([cx.run(title, { heading: true, bold: true, upper: true, cs: 1.6, size: fs * 0.82, color: c.accent })], full.x, gutter - 12, cx, { lsMul: 1.05 });
        const firstLine = textItems([cx.run('X')], cl.x, cl.w, cx)[0];
        const dy = firstLine ? firstLine.baseline - (t[0]?.baseline || 0) : 0;
        const ops = [];
        let y = 0;
        for (const it of t) {
          ops.push(...it.ops.map((o) => ({ ...o, y: o.y + y + dy })));
          y += it.h;
        }
        return [{ h: 0, ops, keep: true }];
      },
      entryHeader: (cx, e, cl) => {
        const left = [cx.run(e.title || e.company, { bold: true })];
        if (e.title && e.company) left.push(cx.run(`, ${e.company}`, { color: c.text }));
        const items = splitLineItems(left, [cx.run(dateRange(e, cx.lang), { color: c.accent, size: fs * 0.9 })], cl.x, cl.w, cx);
        if (e.location) items.push(...textItems([cx.run(e.location, { color: c.accent, size: fs * 0.9 })], cl.x, cl.w, cx, { keepLines: true }));
        return items;
      },
      bullet: (cx, b, cl) => bulletItems([cx.run(b)], cl.x, cl.w, cx, { shape: 'dash', bulletColor: c.accent, indent: 12 }),
      bulletShape: 'dash',
      listAsBullets: false,
      skills: (cx, list, cl) => textItems(joinedRuns(cx, list, '   /   ', { sepColor: tint(c.accent, 0.35) }), cl.x, cl.w, cx),
    };
    return { columns: [{ ...col, items: [...head.map((h) => ({ ...h, keep: false })), spacer(0.1), ...columnItems(ctx, sections, { ...col, leadSpace: true }, S)] }] };
  },
};

// ---------------------------------------------------------------------------
// 5. Creative Edge

const creative = {
  build(ctx, sections) {
    const { m, pw, ph, c, fs } = ctx;
    const stripe = 14;
    const x0 = Math.max(m, stripe + 22);
    const col = { x: x0, w: pw - x0 - m, theme: mainTheme(ctx) };
    const ct = ctx.r.contact;
    const name = (ct.fullName || '').trim();
    const sp = name.lastIndexOf(' ');
    const first = sp > 0 ? name.slice(0, sp) : name;
    const last = sp > 0 ? name.slice(sp + 1) : '';
    const head = [];
    head.push(...textItems([
      ctx.run(first, { heading: true, bold: true, size: fs * 2.9, color: c.primary }),
      ctx.run(last ? ` ${last}` : '', { heading: true, bold: true, size: fs * 2.9, color: c.accent }),
    ], col.x, col.w, ctx, { lsMul: 0.85 }));
    if (ct.headline) head.push(...textItems([ctx.run(ct.headline, { heading: true, upper: true, cs: 1.5, size: fs * 0.95, color: c.text, bold: true })], col.x, col.w, ctx));
    const parts = contactParts(ctx.r);
    if (parts.length) {
      head.push({ h: 3, ops: [] });
      head.push(...textItems(joinedRuns(ctx, parts, '  /  ', { size: fs * 0.92, color: c.muted, sepColor: c.accent }), col.x, col.w, ctx));
    }
    head.push({ h: 12, ops: [{ t: 'rect', x: col.x, y: 6, w: 46, h: 3, fill: c.accent }, { t: 'rect', x: col.x + 50, y: 6, w: 12, h: 3, fill: c.primary }] });

    const tlX = col.x + 4; // timeline axis
    const tlCol = { ...col, x: col.x + 18, w: col.w - 18 };
    const S = {
      heading: (cx, title, cl) => {
        const run = cx.run(title, { heading: true, bold: true, upper: true, cs: 1.2, size: fs * 1.02, color: readableOn(c.primary) });
        const tw = textWidth([run]);
        const t = textItems([run], col.x + 8, Math.max(tw + 2, 20), cx)[0];
        const h = t.h + 6;
        return [
          { h, ops: [{ t: 'rect', x: col.x, y: 0, w: tw + 16, h, fill: c.primary, r: 3 }, ...t.ops.map((o) => ({ ...o, y: o.y + 3 }))], keep: true },
          gluedItem(6, []),
        ];
      },
      entryHeader: (cx, e) => {
        const items = splitLineItems(
          [cx.run(e.title || e.company, { heading: true, bold: true, size: fs * 1.05 })],
          [cx.run(dateRange(e, cx.lang), { bold: true, color: c.accent, size: fs * 0.9 })],
          tlCol.x, tlCol.w, cx,
        );
        const sub = [e.title ? e.company : '', e.location].filter((s) => s && s.trim()).join('  ·  ');
        if (sub) items.push(...textItems([cx.run(sub, { color: c.primary, italic: true })], tlCol.x, tlCol.w, cx, { keepLines: true }));
        if (items[0]) {
          const cy = items[0].baseline - fs * 0.38;
          items[0].ops.unshift({ t: 'circle', cx: tlX, cy, r: 3.6, fill: c.accent });
          items[0].ops.unshift({ t: 'circle', cx: tlX, cy, r: 5.6, fill: tint(c.accent, 0.65) });
        }
        return items;
      },
      bullet: (cx, b) => bulletItems([cx.run(b)], tlCol.x, tlCol.w, cx, { bulletColor: c.primary, shape: 'ring' }),
      bulletShape: 'dot',
      listAsBullets: true,
      skills: (cx, list, cl) => chipItems(list, cl.x, cl.w, cx, { fam: cx.bf, size: fs * 0.92, color: c.primary, fill: c.background, v: 'bold' }),
      wrapSection: (cx, key, head, body) => {
        if (key !== 'experience') return [...head, ...body];
        // Timeline axis: every item in the section paints its slice of the line.
        return [...head, ...body.map((it) => ({ ...it, ops: [{ t: 'rect', x: tlX - 0.6, y: 0, w: 1.2, h: it.h, fill: tint(c.primary, 0.7) }, ...it.ops] }))];
      },
    };
    return {
      decorate: () => [
        { t: 'rect', x: 0, y: 0, w: stripe, h: ph, fill: c.primary },
        { t: 'rect', x: 0, y: 0, w: stripe, h: Math.min(130, ph * 0.16), fill: c.accent },
      ],
      columns: [{ ...col, items: [...head, ...columnItems(ctx, sections, col, S)] }],
    };
  },
};

// ---------------------------------------------------------------------------
// 6. Corporate Elite (split header + side panel)

const corporate = {
  build(ctx, sections, tpl) {
    const { m, pw, ph, c, fs } = ctx;
    const ct = ctx.r.contact;
    const full = { x: m, w: pw - 2 * m };
    // Split header: identity left, contact block right.
    const parts = contactParts(ctx.r);
    const rightW = Math.min(full.w * 0.42, Math.max(0, ...parts.map((p) => textWidth([ctx.run(p, { size: fs * 0.92 })]))) + 2);
    const leftW = full.w - rightW - 16;
    const L = [];
    L.push(...textItems([ctx.run(ct.fullName, { heading: true, bold: true, size: fs * 2.45, color: c.primary })], full.x, leftW, ctx, { lsMul: 0.9 }));
    if (ct.headline) L.push(...textItems([ctx.run(ct.headline, { heading: true, italic: true, size: fs * 1.15, color: c.text })], full.x, leftW, ctx));
    const R = parts.flatMap((p) => textItems([ctx.run(p, { size: fs * 0.92, color: c.text })], full.x + full.w - rightW, rightW, ctx, { align: 'right', lsMul: 1.05 }));
    const top = m;
    const stack = (items) => {
      let y = 0;
      const ops = [];
      for (const it of items) {
        ops.push(...it.ops.map((o) => ({ ...o, y: o.y + y })));
        y += it.h;
      }
      return { ops, h: y };
    };
    const ls = stack(L);
    const rs = stack(R);
    const hh = Math.max(ls.h, rs.h);
    const ruleY = top + hh + 8;
    const header = [
      ...ls.ops.map((o) => ({ ...o, y: o.y + top + (hh - ls.h) / 2 })),
      ...rs.ops.map((o) => ({ ...o, y: o.y + top + (hh - rs.h) / 2 })),
      { t: 'rect', x: full.x, y: ruleY, w: full.w, h: 2.2, fill: c.primary },
      { t: 'rect', x: full.x, y: ruleY + 4, w: full.w, h: 0.7, fill: c.accent },
    ];
    const bodyTop = ruleY + 4.7;

    const right = ctx.d.sidebarPosition !== 'left';
    const panelW = Math.round(full.w * 0.31);
    const gap = 18;
    const panelX = right ? full.x + full.w - panelW : full.x;
    const pPad = 11;
    const side = { x: panelX + pPad, w: panelW - pPad * 2, theme: { text: readableOn(c.background) === '#ffffff' ? '#ffffff' : c.text, muted: c.muted, heading: c.primary, bullet: c.primary } };
    const main = { x: right ? full.x : full.x + panelW + gap, w: full.w - panelW - gap, theme: mainTheme(ctx) };

    const heading = (cx, title, cl) => {
      const t = textItems([cx.run(title, { heading: true, bold: true, upper: true, cs: 1.1, size: fs * 1.08, color: c.primary })], cl.x + 10, cl.w - 10, cx);
      if (t[0]) t[0].ops.unshift({ t: 'rect', x: cl.x, y: t[0].baseline - fs * 0.62, w: 5, h: 5, fill: c.primary });
      return [...t, ruleItem(cl.x, cl.w, tint(c.accent, 0.4), 0.5, 2, 5)];
    };
    const S = {
      heading,
      entryHeader: (cx, e, cl) => {
        const items = splitLineItems(
          [cx.run(e.title || e.company, { bold: true, size: fs * 1.05 })],
          [cx.run(dateRange(e, cx.lang), { italic: true, color: c.muted })],
          cl.x, cl.w, cx,
        );
        const sub = [];
        if (e.title && e.company) sub.push(cx.run(e.company, { bold: true, color: c.primary }));
        if (e.location) sub.push(cx.run(`${sub.length ? ', ' : ''}${e.location}`, { color: c.muted }));
        if (sub.length) items.push(...textItems(sub, cl.x, cl.w, cx, { keepLines: true }));
        return items;
      },
      bullet: (cx, b, cl) => bulletItems([cx.run(b)], cl.x, cl.w, cx, { bulletColor: c.primary, shape: 'square' }),
      listAsBullets: true,
      bulletShape: 'square',
    };
    const Sside = {
      ...S,
      skills: (cx, list, cl) => list.flatMap((s) => bulletItems([cx.run(s, { color: cl.theme.text })], cl.x, cl.w, cx, { bulletColor: c.primary, shape: 'square' })),
      eduEntry: (cx, e, cl) => {
        const items = [];
        if (e.degree) items.push(...textItems([cx.run(e.degree, { bold: true })], cl.x, cl.w, cx, { keepLines: true }));
        if (e.school) items.push(...textItems([cx.run(e.school, { color: c.primary })], cl.x, cl.w, cx, { keepLines: true }));
        const tail = [e.location, dateRange(e, cx.lang)].filter((s) => s && s.trim()).join(' · ');
        if (tail) items.push(...textItems([cx.run(tail, { color: c.muted, size: fs * 0.92 })], cl.x, cl.w, cx, { keepLines: true }));
        if (!isBlank(e.details)) items.push(...textItems([cx.run(e.details.trim(), { color: c.muted, size: fs * 0.92 })], cl.x, cl.w, cx));
        items.forEach((it, i) => { it.keep = i < items.length - 1; });
        return items;
      },
    };
    const sideKeys = sections.filter((k) => tpl.sidebarKeys.includes(k));
    const mainKeys = sections.filter((k) => !tpl.sidebarKeys.includes(k));
    const startY = bodyTop + 14;
    return {
      header: { ops: header, h: bodyTop },
      decorate: (pageIndex) => [{ t: 'rect', x: panelX, y: pageIndex === 0 ? bodyTop + 6 : 0, w: panelW, h: pageIndex === 0 ? ph - bodyTop - 6 : ph, fill: c.background }],
      columns: [
        { ...main, items: columnItems(ctx, mainKeys, main, S), firstTop: startY },
        { ...side, items: columnItems(ctx, sideKeys, side, Sside), firstTop: startY + 4, top: m * 0.8 },
      ],
    };
  },
};

export const BUILDERS = { classic, executive, modern, minimal, creative, corporate };
export { makeCtx, contactParts };
