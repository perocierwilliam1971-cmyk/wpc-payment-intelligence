// DOCX writer. Produces a genuinely editable Word document per template:
// real paragraphs, real Word bullet lists, tab-stop aligned dates, and
// borderless tables for bands / sidebars / margin headings. The template's
// fonts are embedded so the document looks right on machines without them.

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, TabStopType, LevelFormat, TableLayoutType, VerticalAlign, CharacterSet,
} from 'docx';
import { normalizeResume, visibleSections } from '../model/schema.js';
import { sectionTitle, dateRange, docLabels } from '../model/labels.js';
import { getTemplate, PAGE_SIZES, contactParts } from '../layout/templates.js';
import { FONT_FAMILIES, fontBytes } from '../design/fonts.js';
import { tint, readableOn, isBlank } from '../core/util.js';

const TW = 20; // twips per point
const hex = (c) => String(c || '#000000').replace('#', '').toUpperCase();
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const NO_CELL_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE };

function makeKit(r) {
  const d = r.design;
  const c = { ...d.colors, muted: tint(d.colors.text, 0.38) };
  const hf = FONT_FAMILIES[d.headingFont]?.docx || 'Calibri';
  const bf = FONT_FAMILIES[d.bodyFont]?.docx || 'Calibri';
  const fs = d.fontSize;
  const line = Math.round(240 * d.lineSpacing * 1.04);
  const K = { r, d, c, hf, bf, fs, line, lang: r.meta.language };

  K.run = (text, o = {}) => new TextRun({
    text: String(text ?? ''),
    bold: !!o.bold,
    italics: !!o.italic,
    color: hex(o.color || c.text),
    size: Math.round((o.size || fs) * 2),
    font: o.heading ? hf : (o.font || bf),
    allCaps: !!o.upper,
    characterSpacing: o.cs ? Math.round(Math.min(o.cs, (o.size || fs) * 0.08) * TW) : undefined,
    shading: o.shade ? { type: ShadingType.CLEAR, fill: hex(o.shade), color: 'auto' } : undefined,
  });
  K.tab = () => new TextRun({ text: '\t' });
  K.para = (children, o = {}) => new Paragraph({
    children,
    alignment: o.align === 'center' ? AlignmentType.CENTER : o.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
    spacing: { before: Math.round((o.before || 0) * TW), after: Math.round((o.after ?? 0) * TW), line: o.line || line },
    border: o.border,
    shading: o.shading ? { type: ShadingType.CLEAR, fill: hex(o.shading), color: 'auto' } : undefined,
    tabStops: o.rightTab ? [{ type: TabStopType.RIGHT, position: Math.round(o.rightTab) }] : undefined,
    keepNext: !!o.keepNext,
    keepLines: true,
    indent: o.indent,
    numbering: o.bullet ? { reference: o.bullet, level: 0 } : undefined,
  });
  return K;
}

/** Title + right-aligned dates on one line via a right tab stop. */
function splitLine(K, left, right, widthTw, o = {}) {
  const kids = [...left];
  if (right && right.length) kids.push(K.tab(), ...right);
  return K.para(kids, { rightTab: widthTw, keepNext: true, ...o });
}

function sectionParas(K, key, ctx) {
  const { r, c, fs } = K;
  const T = ctx.theme;
  const W = ctx.widthTw;
  const out = [];
  const bullet = ctx.bullet;
  if (key === 'summary') {
    out.push(K.para([K.run(r.summary.trim(), { color: T.text })], { after: 2 }));
  } else if (key === 'experience') {
    const list = r.experience.filter((e) => !isBlank(e.title) || !isBlank(e.company) || e.bullets.some((b) => b.text.trim()));
    list.forEach((e, i) => {
      out.push(...ctx.entry(K, e, W, i));
      const bl = e.bullets.map((b) => b.text.trim()).filter(Boolean);
      bl.forEach((b, bi) => out.push(K.para([K.run(b, { color: T.text })], { bullet, after: bi === bl.length - 1 ? fs * 0.7 : 1 })));
      if (!bl.length) out.push(K.para([], { after: fs * 0.4 }));
    });
  } else if (key === 'education') {
    r.education.filter((e) => !isBlank(e.degree) || !isBlank(e.school)).forEach((e) => {
      if (ctx.stackEdu) {
        if (e.degree) out.push(K.para([K.run(e.degree, { bold: true, color: T.text })], { keepNext: true }));
        if (e.school) out.push(K.para([K.run(e.school, { color: T.accentText || T.text })], { keepNext: true }));
        const tail = [e.location, dateRange(e, K.lang)].filter((s) => s && s.trim()).join(' · ');
        if (tail) out.push(K.para([K.run(tail, { color: T.muted, size: fs * 0.92 })]));
      } else {
        out.push(splitLine(K, [K.run(e.degree || e.school, { bold: true, color: T.text })], [K.run(dateRange(e, K.lang), { color: T.muted })], W));
        const second = [e.degree ? e.school : '', e.location].map((s) => (s || '').trim()).filter(Boolean).join(', ');
        if (second) out.push(K.para([K.run(second, { italic: true, color: T.text })]));
      }
      if (!isBlank(e.details)) out.push(K.para([K.run(e.details.trim(), { color: T.muted, size: fs * 0.95 })]));
      out.push(K.para([], { after: fs * 0.3, line: 120 }));
    });
  } else if (key === 'certifications') {
    r.certifications.filter((x) => !isBlank(x.name)).forEach((x) => {
      const tail = [x.issuer, x.date].map((s) => s.trim()).filter(Boolean).join(', ');
      out.push(K.para([K.run(x.name, { bold: true, color: T.text }), ...(tail ? [K.run(` — ${tail}`, { color: T.muted })] : [])], { bullet, after: 1 }));
    });
  } else if (key === 'skills' || key === 'languages') {
    out.push(...ctx.skills(K, r[key], key));
  } else if (key.startsWith('custom:')) {
    const sec = r.custom.find((s) => `custom:${s.id}` === key);
    sec.items.forEach((it) => out.push(K.para([K.run(it, { color: T.text })], { bullet, after: 1 })));
  }
  return out;
}

const joinSkills = (K, list, sep, color, sepColor) => {
  const kids = [];
  list.forEach((s, i) => {
    if (i) kids.push(K.run(sep, { color: sepColor }));
    kids.push(K.run(s, { color }));
  });
  return [K.para(kids)];
};

function cell(children, o = {}) {
  return new TableCell({
    children: children.length ? children : [new Paragraph({})],
    width: { size: Math.round(o.width), type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: hex(o.fill), color: 'auto' } : undefined,
    margins: o.margins || { top: 0, bottom: 0, left: 0, right: 0 },
    borders: NO_CELL_BORDERS,
    verticalAlign: o.vAlign || VerticalAlign.TOP,
  });
}

function table(rows, widths) {
  return new Table({
    rows,
    width: { size: Math.round(widths.reduce((a, b) => a + b, 0)), type: WidthType.DXA },
    columnWidths: widths.map(Math.round),
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
  });
}

// ---------------------------------------------------------------------------

function contactLine(K, sep, color, sepColor, size) {
  const parts = contactParts(K.r);
  const kids = [];
  parts.forEach((p, i) => {
    if (i) kids.push(K.run(sep, { color: sepColor, size }));
    kids.push(K.run(p, { color, size }));
  });
  return kids;
}

function buildBody(K, tplId, contentW) {
  const { r, c, fs } = K;
  const sections = visibleSections(r);
  const ct = r.contact;
  const L = docLabels(K.lang);
  const mainTheme = { text: c.text, muted: c.muted };
  const ruleBelow = (color, size = 6) => ({ bottom: { style: BorderStyle.SINGLE, size, color: hex(color), space: 2 } });

  if (tplId === 'classic') {
    const kids = [
      K.para([K.run(ct.fullName, { heading: true, bold: true, size: fs * 2.3, color: c.primary })], { align: 'center', line: 240 }),
    ];
    if (ct.headline) kids.push(K.para([K.run(ct.headline, { italic: true, color: c.muted })], { align: 'center' }));
    kids.push(K.para(contactLine(K, '  |  ', c.text, c.muted, fs * 0.95), { align: 'center', after: 4 }));
    const ctx = {
      theme: mainTheme, widthTw: contentW, bullet: 'b-text',
      entry: (K2, e, W) => {
        const p = [splitLine(K2, [K2.run(e.title || e.company, { bold: true })], [K2.run(dateRange(e, K2.lang))], W)];
        const second = [e.title ? e.company : '', e.location].map((s) => (s || '').trim()).filter(Boolean).join(', ');
        if (second) p.push(K2.para([K2.run(second, { italic: true })], { keepNext: true }));
        return p;
      },
      skills: (K2, list) => joinSkills(K2, list, '  •  ', c.text, c.muted),
    };
    for (const key of sections) {
      kids.push(K.para([K.run(sectionTitle(r, key), { heading: true, bold: true, upper: true, cs: 1, size: fs * 1.12, color: c.primary })], { before: K.d.sectionSpacing, after: 4, keepNext: true, border: ruleBelow(c.primary, 6) }));
      kids.push(...sectionParas(K, key, ctx));
    }
    return { children: kids };
  }

  if (tplId === 'executive') {
    const onBand = readableOn(c.primary);
    const band = [
      K.para([K.run(ct.fullName, { heading: true, bold: true, size: fs * 2.7, color: onBand })], { line: 264 }),
    ];
    if (ct.headline) band.push(K.para([K.run(ct.headline, { bold: true, upper: true, cs: 1.4, size: fs * 0.92, color: c.accent })]));
    band.push(K.para(contactLine(K, '   ·   ', onBand, c.accent, fs * 0.92), { before: 3 }));
    const kids = [
      table([new TableRow({ children: [cell(band, { width: contentW, fill: c.primary, margins: { top: 300, bottom: 260, left: 300, right: 300 } })] })], [contentW]),
      K.para([], { border: { top: { style: BorderStyle.SINGLE, size: 24, color: hex(c.accent), space: 0 } }, after: 6 }),
    ];
    const ctx = {
      theme: mainTheme, widthTw: contentW, bullet: 'b-accent-sq',
      entry: (K2, e, W) => {
        const p = [splitLine(K2, [K2.run(e.company || e.title, { bold: true, upper: true, cs: 0.6, color: c.primary })], [K2.run(e.location, { color: c.muted })], W)];
        if (e.company && e.title) p.push(splitLine(K2, [K2.run(e.title, { bold: true, italic: true })], [K2.run(dateRange(e, K2.lang), { color: c.muted })], W));
        else p.push(K2.para([K2.run(dateRange(e, K2.lang), { color: c.muted })], { keepNext: true }));
        return p;
      },
      skills: (K2, list, key) => {
        if (key === 'languages') return joinSkills(K2, list, '   ·   ', c.text, c.accent);
        // 3-column competency grid as a borderless table.
        const colW = contentW / 3;
        const rows = [];
        for (let i = 0; i < list.length; i += 3) {
          rows.push(new TableRow({ children: [0, 1, 2].map((j) => cell(list[i + j] ? [K2.para([K2.run('■  ', { color: c.accent, size: fs * 0.7 }), K2.run(list[i + j])], { after: 2 })] : [], { width: colW })) }));
        }
        return [table(rows, [colW, colW, colW])];
      },
    };
    for (const key of sections) {
      kids.push(K.para([K.run(sectionTitle(r, key), { heading: true, bold: true, upper: true, cs: 1.6, size: fs * 1.2, color: c.primary })], { before: K.d.sectionSpacing, after: 0, keepNext: true }));
      kids.push(K.para([K.run('▬▬', { color: c.accent, size: fs * 0.8 })], { after: 3, keepNext: true, line: 200 }));
      if (key === 'summary') {
        kids.push(table([new TableRow({ children: [cell([K.para([K.run(r.summary.trim())])], { width: contentW, fill: c.background, margins: { top: 160, bottom: 160, left: 200, right: 200 } })] })], [contentW]));
      } else kids.push(...sectionParas(K, key, ctx));
    }
    return { children: kids };
  }

  if (tplId === 'modern' || tplId === 'corporate') {
    const tpl = getTemplate(tplId);
    const isModern = tplId === 'modern';
    const sideRight = isModern ? K.d.sidebarPosition === 'right' : K.d.sidebarPosition !== 'left';
    const sideW = contentW * (isModern ? 0.34 : 0.31);
    const gap = 360;
    const mainW = contentW - sideW;
    const sideFill = isModern ? c.primary : c.background;
    const sbText = readableOn(sideFill);
    const sideTheme = isModern
      ? { text: sbText, muted: tint(sbText === '#ffffff' ? '#ffffff' : '#111827', 0.25), accentText: sbText }
      : { text: c.text, muted: c.muted, accentText: c.primary };
    const sidePad = 200;
    const innerSide = sideW - sidePad * 2;
    const innerMain = mainW - gap;
    const sideKeys = sections.filter((k) => tpl.sidebarKeys.includes(k));
    const mainKeys = sections.filter((k) => !tpl.sidebarKeys.includes(k));

    const sideHead = (title) => K.para([K.run(title, { heading: true, bold: true, upper: true, cs: 1.2, size: fs * 1.02, color: isModern ? sbText : c.primary })], { before: 10, after: 4, keepNext: true, border: ruleBelow(isModern ? tint(c.primary, 0.35) : tint(c.accent, 0.4), 4) });
    const mainHead = (title) => (isModern
      ? K.para([K.run(title, { heading: true, bold: true, upper: true, cs: 1.3, size: fs * 1.18, color: c.primary })], { before: K.d.sectionSpacing, after: 4, keepNext: true, border: ruleBelow(c.accent, 6) })
      : K.para([K.run('■ ', { color: c.primary, size: fs * 0.8 }), K.run(title, { heading: true, bold: true, upper: true, cs: 1.1, size: fs * 1.08, color: c.primary })], { before: K.d.sectionSpacing, after: 4, keepNext: true, border: ruleBelow(tint(c.accent, 0.4), 4) }));

    const sideCtx = {
      theme: sideTheme, widthTw: innerSide, bullet: isModern ? 'b-accent' : 'b-primary-sq', stackEdu: true,
      entry: () => [],
      skills: (K2, list) => list.map((s) => K2.para([K2.run(s, { color: sideTheme.text })], { bullet: isModern ? 'b-accent' : 'b-primary-sq', after: 1 })),
    };
    const mainCtx = {
      theme: mainTheme, widthTw: innerMain, bullet: isModern ? 'b-accent' : 'b-primary-sq',
      entry: (K2, e, W) => {
        const p = [splitLine(K2, [K2.run(e.title || e.company, { bold: true, heading: isModern, size: fs * 1.06 })], [K2.run(dateRange(e, K2.lang), { color: c.muted, italic: !isModern })], W)];
        const sub = [];
        if (e.title && e.company) sub.push(K2.run(e.company, { bold: true, color: isModern ? c.accent : c.primary }));
        if (e.location) sub.push(K2.run(`${sub.length ? (isModern ? '  ·  ' : ', ') : ''}${e.location}`, { color: c.muted }));
        if (sub.length) p.push(K2.para(sub, { keepNext: true }));
        return p;
      },
      skills: (K2, list) => joinSkills(K2, list, '  •  ', c.text, c.accent),
    };

    const side = [];
    const top = [];
    if (isModern) {
      side.push(K.para([K.run(ct.fullName, { heading: true, bold: true, size: fs * 2.05, color: sbText })], { line: 264 }));
      if (ct.headline) side.push(K.para([K.run(ct.headline, { color: sideTheme.muted })], { after: 4 }));
      side.push(K.para([K.run('▬▬', { color: c.accent, size: fs * 0.8 })], { after: 4 }));
      const parts = contactParts(r);
      if (parts.length) {
        side.push(sideHead(L.contact));
        parts.forEach((p) => side.push(K.para([K.run(p, { color: sbText, size: fs * 0.95 })], { after: 1 })));
      }
    } else {
      // Corporate split header.
      const left = [K.para([K.run(ct.fullName, { heading: true, bold: true, size: fs * 2.45, color: c.primary })], { line: 264 })];
      if (ct.headline) left.push(K.para([K.run(ct.headline, { heading: true, italic: true, size: fs * 1.15 })]));
      const right = contactParts(r).map((p) => K.para([K.run(p, { size: fs * 0.92 })], { align: 'right' }));
      top.push(table([new TableRow({ children: [cell(left, { width: contentW * 0.6, vAlign: VerticalAlign.CENTER }), cell(right, { width: contentW * 0.4, vAlign: VerticalAlign.CENTER })] })], [contentW * 0.6, contentW * 0.4]));
      top.push(K.para([], { after: 8, border: { bottom: { style: BorderStyle.DOUBLE, size: 12, color: hex(c.primary), space: 4 } } }));
    }
    for (const key of sideKeys) {
      side.push(sideHead(sectionTitle(r, key)));
      side.push(...sectionParas(K, key, sideCtx));
    }
    const main = [];
    for (const key of mainKeys) {
      main.push(mainHead(sectionTitle(r, key)));
      main.push(...sectionParas(K, key, mainCtx));
    }
    const sideCell = cell(side, { width: sideW, fill: sideFill, margins: { top: 260, bottom: 260, left: sidePad, right: sidePad } });
    const mainCell = cell(main, { width: mainW, margins: { top: 0, bottom: 0, left: sideRight ? 0 : gap, right: sideRight ? gap : 0 } });
    const row = new TableRow({ children: sideRight ? [mainCell, sideCell] : [sideCell, mainCell] });
    const widths = sideRight ? [mainW, sideW] : [sideW, mainW];
    if (!top.length) return { children: [table([row], widths)] };
    // Header lives in a spanning first row of the same table: LibreOffice
    // otherwise pushes the whole body table to page 2 (verified).
    const headRow = new TableRow({
      children: [new TableCell({ children: top, columnSpan: 2, width: { size: Math.round(contentW), type: WidthType.DXA }, borders: NO_CELL_BORDERS, margins: { top: 0, bottom: 160, left: 0, right: 0 } })],
    });
    return { children: [table([headRow, row], widths)] };
  }

  if (tplId === 'minimal') {
    const gutter = Math.min(118 * TW, contentW * 0.24);
    const kids = [
      K.para([K.run(ct.fullName, { heading: true, upper: true, cs: fs * 0.42, size: fs * 2.4, color: c.primary })], { line: 264 }),
    ];
    if (ct.headline) kids.push(K.para([K.run(ct.headline, { heading: true, cs: 0.9, size: fs * 1.05, color: c.accent })]));
    kids.push(K.para(contactLine(K, '     ', c.accent, c.accent, fs * 0.92), { after: 10, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: hex(tint(c.accent, 0.55)), space: 10 } } }));
    const ctx = {
      theme: { text: c.text, muted: c.accent }, widthTw: contentW - gutter, bullet: 'b-accent-dash',
      entry: (K2, e, W) => {
        const left = [K2.run(e.title || e.company, { bold: true })];
        if (e.title && e.company) left.push(K2.run(`, ${e.company}`));
        const p = [splitLine(K2, left, [K2.run(dateRange(e, K2.lang), { color: c.accent, size: fs * 0.9 })], W)];
        if (e.location) p.push(K2.para([K2.run(e.location, { color: c.accent, size: fs * 0.9 })], { keepNext: true }));
        return p;
      },
      skills: (K2, list) => joinSkills(K2, list, '   /   ', c.text, tint(c.accent, 0.35)),
    };
    const rows = sections.map((key) => new TableRow({
      cantSplit: false,
      children: [
        cell([K.para([K.run(sectionTitle(r, key), { heading: true, bold: true, upper: true, cs: 1.6, size: fs * 0.82, color: c.accent })], { line: 260 })], { width: gutter, margins: { top: K.d.sectionSpacing * TW * 0.5, bottom: K.d.sectionSpacing * TW * 0.5, left: 0, right: 160 } }),
        cell(sectionParas(K, key, ctx), { width: contentW - gutter, margins: { top: K.d.sectionSpacing * TW * 0.5, bottom: K.d.sectionSpacing * TW * 0.5, left: 0, right: 0 } }),
      ],
    }));
    kids.push(table(rows, [gutter, contentW - gutter]));
    return { children: kids };
  }

  // creative
  const name = (ct.fullName || '').trim();
  const sp = name.lastIndexOf(' ');
  const kids = [
    K.para([
      K.run(sp > 0 ? name.slice(0, sp) : name, { heading: true, bold: true, size: fs * 2.9, color: c.primary }),
      K.run(sp > 0 ? ` ${name.slice(sp + 1)}` : '', { heading: true, bold: true, size: fs * 2.9, color: c.accent }),
    ], { line: 264 }),
  ];
  if (ct.headline) kids.push(K.para([K.run(ct.headline, { heading: true, bold: true, upper: true, cs: 1.5, size: fs * 0.95 })]));
  kids.push(K.para(contactLine(K, '  /  ', c.muted, c.accent, fs * 0.92), { after: 6 }));
  kids.push(K.para([K.run('▬▬▬▬', { color: c.accent, size: fs * 0.8 }), K.run(' ▬', { color: c.primary, size: fs * 0.8 })], { after: 4 }));
  const onP = readableOn(c.primary);
  const ctx = {
    theme: mainTheme, widthTw: contentW, bullet: 'b-primary',
    entry: (K2, e, W) => {
      const p = [splitLine(K2, [K2.run('● ', { color: c.accent }), K2.run(e.title || e.company, { heading: true, bold: true, size: fs * 1.05 })], [K2.run(dateRange(e, K2.lang), { bold: true, color: c.accent, size: fs * 0.9 })], W)];
      const sub = [e.title ? e.company : '', e.location].filter((s) => s && s.trim()).join('  ·  ');
      if (sub) p.push(K2.para([K2.run(sub, { italic: true, color: c.primary })], { keepNext: true, indent: { left: 220 } }));
      return p;
    },
    skills: (K2, list) => {
      const kids2 = [];
      list.forEach((s, i) => {
        if (i) kids2.push(K2.run('  ·  ', { color: tint(c.primary, 0.55) }));
        kids2.push(K2.run(` ${s} `, { bold: true, color: c.primary, size: fs * 0.92, shade: c.background }));
      });
      return [K2.para(kids2, { line: Math.round(K.line * 1.35) })];
    },
  };
  for (const key of sections) {
    kids.push(K.para([K.run(`  ${sectionTitle(r, key)}  `, { heading: true, bold: true, upper: true, cs: 1.2, size: fs * 1.02, color: onP, shade: c.primary })], { before: K.d.sectionSpacing, after: 6, keepNext: true }));
    kids.push(...sectionParas(K, key, ctx));
  }
  return { children: kids, pageBorderLeft: c.primary };
}

function bulletConfig(K) {
  const { c } = K;
  const mk = (reference, text, color, font) => ({
    reference,
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text,
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: { indent: { left: 260, hanging: 200 } },
        run: { color: hex(color), font: font || K.bf },
      },
    }],
  });
  return [
    mk('b-text', '•', c.text),
    mk('b-accent', '•', c.accent),
    mk('b-primary', '◦', c.primary),
    mk('b-accent-sq', '▪', c.accent),
    mk('b-primary-sq', '▪', c.primary),
    mk('b-accent-dash', '–', c.accent),
  ];
}

async function embeddedFonts(d) {
  const fams = [...new Set([d.headingFont, d.bodyFont])].filter((f) => FONT_FAMILIES[f]);
  const out = [];
  for (const f of fams) {
    const [regular, bold, italic, bolditalic] = await Promise.all(['regular', 'bold', 'italic', 'bolditalic'].map((v) => fontBytes(f, v)));
    out.push({ name: FONT_FAMILIES[f].docx, data: regular, bold, italic, boldItalic: bolditalic, characterSet: CharacterSet.ANSI });
  }
  return out;
}

/**
 * @returns {Promise<Blob|Uint8Array>} Blob in the browser, Uint8Array in Node.
 */
export async function renderDocx(input, { embedFonts = true } = {}) {
  const r = normalizeResume(input);
  const K = makeKit(r);
  const tpl = getTemplate(r.design.templateId);
  const size = PAGE_SIZES[r.design.pageSize] || PAGE_SIZES.letter;
  const m = r.design.margins;
  const contentW = (size.w - 2 * m) * TW;
  const body = buildBody(K, tpl.id, contentW);
  const page = {
    size: { width: Math.round(size.w * TW), height: Math.round(size.h * TW) },
    margin: { top: Math.round(m * TW), bottom: Math.round(m * TW), left: Math.round(m * TW), right: Math.round(m * TW), header: 360, footer: 360 },
  };
  if (body.pageBorderLeft) {
    page.borders = {
      pageBorderLeft: { style: BorderStyle.SINGLE, size: 48, color: hex(body.pageBorderLeft), space: 24 },
      pageBorders: { display: 'allPages', offsetFrom: 'page' },
    };
  }
  const fonts = embedFonts ? await embeddedFonts(r.design) : undefined;
  const doc = new Document({
    creator: 'CareerLift Career Intelligence',
    title: r.contact.fullName ? `${r.contact.fullName} — Resume` : 'Resume',
    description: `Template: ${tpl.name}`,
    fonts,
    styles: {
      default: {
        document: { run: { font: K.bf, size: Math.round(K.fs * 2), color: hex(K.c.text) } },
      },
    },
    numbering: { config: bulletConfig(K) },
    sections: [{ properties: { page }, children: body.children }],
  });
  if (typeof window !== 'undefined' && typeof Blob !== 'undefined') return Packer.toBlob(doc);
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}

/** Simple letter DOCX (cover letters, emails) sharing the resume's fonts/colors. */
export async function renderLetterDocx(input, text, { embedFonts = true } = {}) {
  const r = normalizeResume(input);
  const K = makeKit(r);
  const size = PAGE_SIZES[r.design.pageSize] || PAGE_SIZES.letter;
  const m = r.design.margins;
  const ct = r.contact;
  const kids = [K.para([K.run(ct.fullName, { heading: true, bold: true, size: K.fs * 2.1, color: K.c.primary })], { line: 264 })];
  if (ct.headline) kids.push(K.para([K.run(ct.headline, { italic: true, color: K.c.muted })]));
  const parts = [ct.email, ct.phone, ct.location, ct.linkedin].map((s) => (s || '').trim()).filter(Boolean);
  if (parts.length) kids.push(K.para([K.run(parts.join('  |  '), { size: K.fs * 0.92 })], { after: 14, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: hex(K.c.accent), space: 6 } } }));
  for (const para of String(text || '').replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const lines = para.split('\n');
    const runs = [];
    lines.forEach((ln, i) => runs.push(new TextRun({ text: ln, break: i > 0 ? 1 : 0, font: K.bf, size: Math.round(K.fs * 2), color: hex(K.c.text) })));
    if (para.trim()) kids.push(K.para(runs, { after: K.fs }));
  }
  const fonts = embedFonts ? await embeddedFonts(r.design) : undefined;
  const doc = new Document({
    creator: 'CareerLift Career Intelligence',
    fonts,
    sections: [{ properties: { page: { size: { width: Math.round(size.w * TW), height: Math.round(size.h * TW) }, margin: { top: m * TW, bottom: m * TW, left: m * TW, right: m * TW } } }, children: kids }],
  });
  if (typeof window !== 'undefined' && typeof Blob !== 'undefined') return Packer.toBlob(doc);
  return new Uint8Array(await Packer.toBuffer(doc));
}
