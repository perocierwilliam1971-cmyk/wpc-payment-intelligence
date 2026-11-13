// Flow items + pagination.
//
// An item is a horizontal slice of a column: { h, ops, keep?, spacer? }.
// Op y-coordinates are relative to the item's top; pagination shifts them.
// `keep` glues an item to the next one so headings never end a page alone.
//
// Op types (all units are PDF points, origin top-left):
//   { t:'text', x, y, text, fam, v, size, color, cs }   (y = baseline)
//   { t:'rect', x, y, w, h, fill, r? }                  (r = corner radius)
//   { t:'line', x1, y1, x2, y2, w, color }
//   { t:'circle', cx, cy, r, fill }

import { wrapRuns, lineBox, textWidth } from './text.js';

export function shiftOps(ops, dy) {
  return ops.map((o) => {
    if (o.t === 'line') return { ...o, y1: o.y1 + dy, y2: o.y2 + dy };
    if (o.t === 'circle') return { ...o, cy: o.cy + dy };
    return { ...o, y: o.y + dy };
  });
}

/**
 * Paginate a column's items.
 * opts: { firstTop, top, bottom }
 * Returns an array (one per page) of absolute ops.
 */
export function paginate(items, { firstTop, top, bottom }) {
  const pages = [[]];
  let y = firstTop;
  let empty = true;
  const maxChain = (bottom - top) * 0.45;
  const newPage = () => {
    pages.push([]);
    y = top;
    empty = true;
  };

  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    if (it.spacer) {
      if (empty) continue;
      y += it.h;
      if (y > bottom) newPage();
      continue;
    }
    // Height of this item plus everything glued to it.
    let chain = it.h;
    for (let j = i; items[j]?.keep && j + 1 < items.length && chain < maxChain; j += 1) {
      chain += items[j + 1].h;
    }
    if (!empty && y + chain > bottom + 0.01) newPage();
    if (!empty && y + it.h > bottom + 0.01) newPage();
    pages[pages.length - 1].push(...shiftOps(it.ops, y));
    if (it.h > 0) empty = false;
    y += it.h;
  }
  return pages;
}

/**
 * Text helpers bound to a design context.
 * ctx: { lineSpacing }
 */
export function textItems(runs, x, width, ctx, opts = {}) {
  const { align = 'left', keepLines = false, lsMul = 1, indentFirst = 0 } = opts;
  const lines = wrapRuns(runs, width - indentFirst);
  return lines.map((ln, idx) => {
    const { h, baseline } = lineBox(ln, ctx.lineSpacing * lsMul);
    let ox = x + (idx === 0 ? indentFirst : 0);
    if (align === 'center') ox = x + (width - ln.width) / 2;
    if (align === 'right') ox = x + width - ln.width;
    const ops = ln.segs.map((s) => ({
      t: 'text', x: ox + s.x, y: baseline, text: s.text, fam: s.fam, v: s.v, size: s.size, color: s.color, cs: s.cs || 0,
    }));
    return { h, ops, keep: keepLines && idx < lines.length - 1, line: ln, baseline };
  });
}

/** Bulleted paragraph with a hanging indent. */
export function bulletItems(runs, x, width, ctx, opts = {}) {
  // Bullets are drawn as shapes, not glyphs, so they look identical in every
  // font and can never go missing from a font that lacks "•".
  const { shape = 'dot', bulletColor, indent = 11 } = opts;
  const items = textItems(runs, x + indent, width - indent, ctx, { keepLines: true });
  if (items.length) {
    const first = items[0];
    const size = runs[0].size;
    const color = bulletColor || runs[0].color;
    const cy = first.baseline - size * 0.32;
    const bx = x + 2.5;
    let op;
    if (shape === 'square') op = { t: 'rect', x: bx - size * 0.15, y: cy - size * 0.15, w: size * 0.3, h: size * 0.3, fill: color };
    else if (shape === 'dash') op = { t: 'line', x1: bx - size * 0.2, y1: cy, x2: bx + size * 0.3, y2: cy, w: Math.max(0.7, size * 0.07), color };
    else if (shape === 'ring') op = { t: 'circle', cx: bx, cy, r: size * 0.15, fill: color, ring: true };
    else op = { t: 'circle', cx: bx, cy, r: size * 0.14, fill: color };
    first.ops.unshift(op);
  }
  return items;
}

/** One line with left content and right-aligned content (e.g. title + dates). */
export function splitLineItems(leftRuns, rightRuns, x, width, ctx, opts = {}) {
  const hasRight = rightRuns && rightRuns.some((r) => r.text && String(r.text).trim());
  if (!hasRight) return textItems(leftRuns, x, width, ctx, { keepLines: true, ...opts });
  const rw = textWidth(rightRuns);
  const gap = 10;
  const leftHas = leftRuns.some((r) => r.text && String(r.text).trim());
  if (!leftHas) return textItems(rightRuns, x, width, ctx, { align: 'right', keepLines: true });
  if (rw > width * 0.45) {
    // Too wide to share a line: stack them.
    return [
      ...textItems(leftRuns, x, width, ctx, { keepLines: true }),
      ...textItems(rightRuns, x, width, ctx, { keepLines: true }),
    ].map((it) => ({ ...it, keep: true }));
  }
  const left = textItems(leftRuns, x, width - rw - gap, ctx, { keepLines: true });
  const right = textItems(rightRuns, x, width, ctx, { align: 'right' })[0];
  if (left.length && right) {
    const L = left[0];
    // Align baselines when sizes differ.
    const dy = L.baseline - right.baseline;
    L.ops.push(...right.ops.map((o) => ({ ...o, y: o.y + dy })));
  }
  return left.map((it) => ({ ...it, keep: true }));
}

export function spacer(h) {
  return { h, ops: [], spacer: true };
}

export function ruleItem(x, width, color, thickness = 0.75, before = 2, after = 4) {
  const y = before + thickness / 2;
  return { h: before + thickness + after, ops: [{ t: 'line', x1: x, y1: y, x2: x + width, y2: y, w: thickness, color }], keep: true };
}

export function gluedItem(h, ops) {
  return { h, ops, keep: true };
}

/** Wrap chips (tags) into rows. */
export function chipItems(labels, x, width, ctx, style) {
  const { fam, v = 'regular', size, color, fill, padX = 5, padY = 2.5, gap = 4, radius = 3, rowGap = 4 } = style;
  const rows = [];
  let row = [];
  let rowW = 0;
  for (const label of labels) {
    const w = textWidth([{ text: label, fam, v, size }]) + padX * 2;
    const cw = Math.min(w, width);
    if (row.length && rowW + gap + cw > width) {
      rows.push(row);
      row = [];
      rowW = 0;
    }
    row.push({ label, w: cw });
    rowW += (row.length > 1 ? gap : 0) + cw;
  }
  if (row.length) rows.push(row);
  return rows.map((r) => {
    let cx = x;
    const ops = [];
    let rowH = 0;
    for (const c of r) {
      // Long labels wrap inside their chip instead of being cut off.
      const lines = textItems([{ text: c.label, fam, v, size, color }], cx + padX, c.w - padX * 2 + 0.5, { lineSpacing: 1 });
      const textH = lines.reduce((a, l) => a + l.h, 0);
      const chipH = textH + padY * 2;
      ops.push({ t: 'rect', x: cx, y: 0, w: c.w, h: chipH, fill, r: radius });
      let ty = padY;
      for (const l of lines) {
        ops.push(...l.ops.map((o) => ({ ...o, y: o.y + ty })));
        ty += l.h;
      }
      rowH = Math.max(rowH, chipH);
      cx += c.w + gap;
    }
    return { h: rowH + rowGap, ops };
  });
}
