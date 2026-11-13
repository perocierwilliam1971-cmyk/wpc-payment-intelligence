// Rich-text line wrapping. All widths come from fonts.measure(), which is the
// same function pdf-lib uses to draw — so lines break identically everywhere.

import { measure, sanitizeFor, fontMetrics } from '../design/fonts.js';

export const LINE_HEIGHT = 1.24;

/**
 * A run: { text, fam, v, size, color, cs?, upper? }
 * Returns lines: [{ segs:[{...run, text, x, w}], width, size, asc, desc }]
 */
export function wrapRuns(runs, maxWidth) {
  const lines = [];
  // Split into paragraphs on hard newlines.
  let paragraph = [];
  const paragraphs = [paragraph];
  for (const r of runs) {
    if (!r || r.text === undefined || r.text === null) continue;
    let text = String(r.text);
    if (r.upper) text = text.toLocaleUpperCase();
    const parts = text.split('\n');
    parts.forEach((p, i) => {
      if (i > 0) {
        paragraph = [];
        paragraphs.push(paragraph);
      }
      const clean = sanitizeFor(p, r.fam, r.v);
      if (clean) paragraph.push({ ...r, text: clean });
    });
  }
  for (const p of paragraphs) lines.push(...wrapParagraph(p, maxWidth));
  return lines;
}

function wrapParagraph(runs, maxWidth) {
  // Words are sequences of non-space pieces (possibly spanning runs);
  // breaks only happen at whitespace.
  const words = [];
  let cur = null;
  let pendingSpace = null;
  for (const r of runs) {
    const tokens = r.text.split(/([ \t\r\f\v]+)/); // NBSP is NOT a break
    for (const t of tokens) {
      if (!t) continue;
      if (/^[ \t\r\f\v]+$/.test(t)) {
        if (cur) words.push(cur);
        cur = null;
        pendingSpace = { run: r };
      } else {
        if (!cur) {
          cur = { pieces: [], space: words.length || pendingSpace ? pendingSpace : null };
          pendingSpace = null;
        }
        cur.pieces.push({ run: r, text: t });
      }
    }
  }
  if (cur) words.push(cur);
  if (!words.length) return [];

  const pieceW = (p) => measure(p.text, p.run.fam, p.run.v, p.run.size, p.run.cs || 0);
  const spaceW = (s) => (s ? measure(' ', s.run.fam, s.run.v, s.run.size, s.run.cs || 0) : 0);

  const lines = [];
  let line = { items: [], width: 0 };
  const flush = () => {
    if (line.items.length) lines.push(line);
    line = { items: [], width: 0 };
  };

  for (const w of words) {
    const ww = w.pieces.reduce((a, p) => a + pieceW(p), 0);
    const sw = line.items.length ? spaceW(w.space) : 0;
    if (line.items.length && line.width + sw + ww > maxWidth + 0.01) flush();
    if (!line.items.length && ww > maxWidth) {
      // A single word longer than the line (e.g. a long URL): hard-break it.
      for (const p of w.pieces) {
        let chunk = '';
        for (const ch of [...p.text]) {
          const test = chunk + ch;
          const tw = measure(test, p.run.fam, p.run.v, p.run.size, p.run.cs || 0);
          if (line.width + tw > maxWidth && (chunk || line.items.length)) {
            if (chunk) line.items.push({ kind: 'piece', run: p.run, text: chunk, w: pieceW({ run: p.run, text: chunk }) });
            line.width += chunk ? pieceW({ run: p.run, text: chunk }) : 0;
            flush();
            chunk = ch;
          } else chunk = test;
        }
        if (chunk) {
          const cw = pieceW({ run: p.run, text: chunk });
          line.items.push({ kind: 'piece', run: p.run, text: chunk, w: cw });
          line.width += cw;
        }
      }
      continue;
    }
    if (line.items.length && w.space) {
      line.items.push({ kind: 'space', run: w.space.run, text: ' ', w: sw });
      line.width += sw;
    }
    for (const p of w.pieces) {
      const pw = pieceW(p);
      line.items.push({ kind: 'piece', run: p.run, text: p.text, w: pw });
      line.width += pw;
    }
  }
  flush();

  // Merge adjacent items of the same run into positioned segments.
  return lines.map((l) => {
    const segs = [];
    let x = 0;
    for (const it of l.items) {
      const last = segs[segs.length - 1];
      if (last && last.run === it.run) {
        last.text += it.text;
        last.w += it.w;
      } else {
        segs.push({ run: it.run, text: it.text, x, w: it.w });
      }
      x += it.w;
    }
    let size = 0;
    let asc = 0;
    let desc = 0;
    for (const s of segs) {
      const m = fontMetrics(s.run.fam, s.run.v);
      size = Math.max(size, s.run.size);
      asc = Math.max(asc, m.ascent * s.run.size);
      desc = Math.max(desc, m.descent * s.run.size);
    }
    return {
      segs: segs.map((s) => ({ ...s.run, text: s.text, x: s.x, w: s.w })),
      width: l.width,
      size,
      asc,
      desc,
    };
  });
}

/** Height of a line box and the baseline offset inside it. */
export function lineBox(line, lineSpacing = 1.2) {
  const h = line.size * LINE_HEIGHT * lineSpacing;
  const glyphH = line.asc + line.desc;
  const baseline = (h - glyphH) / 2 + line.asc;
  return { h, baseline };
}

export function textWidth(runs) {
  return runs.reduce((a, r) => {
    const t = sanitizeFor(r.upper ? String(r.text ?? '').toLocaleUpperCase() : r.text, r.fam, r.v);
    return a + measure(t, r.fam, r.v, r.size, r.cs || 0);
  }, 0);
}
