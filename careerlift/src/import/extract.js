// File -> plain lines. Runs entirely in the browser: the resume never leaves
// the customer's device.
//
// Each returned line is { text, bullet:boolean, heading:boolean } where the
// flags are *hints* from the source format (Word list items, Word headings).

const BULLET_RE = /^\s*([•●▪■◦○◆◇►▸‣⁃∙·*–—-]|\d{1,2}[.)])\s+/;

export function detectKind(file) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf';
  if (name.endsWith('.docx') || type.includes('wordprocessingml')) return 'docx';
  if (name.endsWith('.txt') || name.endsWith('.text') || name.endsWith('.md') || type.startsWith('text/')) return 'txt';
  if (name.endsWith('.doc')) return 'doc';
  if (name.endsWith('.pages')) return 'pages';
  return 'unknown';
}

export class ExtractError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export async function extractFile(file) {
  const kind = detectKind(file);
  if (kind === 'doc') throw new ExtractError('legacy-doc', 'Older .doc files cannot be read in the browser. In Word, choose File › Save As › Word Document (.docx), or upload a PDF.');
  if (kind === 'pages') throw new ExtractError('pages', 'Apple Pages files cannot be read directly. In Pages, choose File › Export To › Word or PDF.');
  if (kind === 'unknown') throw new ExtractError('unknown', 'Please upload a PDF, Word (.docx) or plain-text (.txt) file.');
  if (file.size > 15 * 1024 * 1024) throw new ExtractError('too-big', 'That file is larger than 15 MB. Resumes are usually under 1 MB — try exporting it again as PDF or DOCX.');
  const buf = await readArrayBuffer(file);
  let lines;
  if (kind === 'txt') lines = textToLines(decodeText(buf));
  if (kind === 'docx') lines = await docxToLines(buf);
  if (kind === 'pdf') lines = await pdfToLines(buf);
  const embedded = lines.embedded;
  const usable = lines.filter((l) => l.text.trim());
  if (!usable.length) {
    throw new ExtractError(kind === 'pdf' ? 'no-text' : 'empty', kind === 'pdf'
      ? 'This PDF has no readable text — it is probably a scanned image or photo. Upload the original Word file, or enter your details manually.'
      : 'No text was found in this file.');
  }
  return { kind, lines: usable, embedded };
}

function readArrayBuffer(file) {
  if (file.arrayBuffer) return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsArrayBuffer(file);
  });
}

/** UTF-8 first; fall back to Windows-1252 for old Notepad files (á, ñ...). */
export function decodeText(buf) {
  const bytes = new Uint8Array(buf);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    try {
      return new TextDecoder('windows-1252').decode(bytes);
    } catch {
      return new TextDecoder('utf-8').decode(bytes);
    }
  }
}

export function textToLines(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((t) => ({ text: t.replace(/\t+/g, '  ').trimEnd(), bullet: BULLET_RE.test(t), heading: false }));
}

// ---------------------------------------------------------------------------
// DOCX via mammoth's HTML conversion, so Word bullets and headings survive.

export async function docxToLines(buf) {
  const mammoth = (await import('mammoth')).default || (await import('mammoth'));
  const res = await mammoth.convertToHtml({ arrayBuffer: buf });
  return htmlToLines(res.value);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Minimal HTML -> lines converter (works in browsers and Node). */
export function htmlToLines(html) {
  const lines = [];
  // Only leaf blocks (p, headings, list items). Table cells contain <p>s, so
  // matching <td> would glue a whole sidebar into one line.
  const src = html.replace(/<\/?(ul|ol)\b[^>]*>/gi, '</li>');
  const re = /<(p|h[1-6]|li)\b[^>]*>([\s\S]*?)(?=<\/?(?:p|h[1-6]|li)\b[^>]*>|$)/gi;
  let m;
  while ((m = re.exec(src))) {
    const tag = m[1].toLowerCase();
    const inner = m[2]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    for (const part of decodeEntities(inner).split('\n')) {
      const text = part.replace(/\t/g, ' \u0001 ').replace(/[ \u00A0]+/g, ' ').replace(/ ?\u0001 ?/g, '   ').trim();
      if (!text) continue;
      lines.push({ text, bullet: tag === 'li' || BULLET_RE.test(text), heading: /^h[1-6]$/.test(tag) });
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// PDF via pdf.js (legacy build for older iPad Safari support).

let pdfjsPromise = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      if (typeof window !== 'undefined') {
        const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      }
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function pdfToLines(buf, pdfjsOverride) {
  const pdfjs = pdfjsOverride || (await loadPdfjs());
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, useSystemFonts: false }).promise;
  const all = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items
      .filter((it) => typeof it.str === 'string' && it.str.length)
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: vp.height - it.transform[5],
        w: it.width,
        h: Math.abs(it.transform[3]) || it.height || 10,
      }));
    all.push(...pageItemsToLines(items, vp.width));
  }
  try {
    const att = await doc.getAttachments();
    const entries = att instanceof Map ? [...att.entries()] : Object.entries(att || {});
    const hit = entries.find(([, a]) => /careerlift-resume\.json$/.test(a?.filename || ''));
    if (hit) {
      // pdf.js >= 6 loads attachment bytes lazily; older versions inline them.
      const content = hit[1].content || (doc.getAttachmentContent ? await doc.getAttachmentContent(hit[0]) : null);
      const data = content ? JSON.parse(new TextDecoder().decode(content)) : null;
      if (data?.app === 'careerlift' && data.resume) all.embedded = data.resume;
    }
  } catch { /* no usable attachment */ }
  await doc.destroy?.();
  return all;
}

/**
 * Group positioned text fragments into reading-order lines. Detects a
 * two-column layout (a vertical gutter) and reads each column separately.
 */
export function pageItemsToLines(items, pageWidth) {
  if (!items.length) return [];
  const columns = splitColumns(items, pageWidth);
  const out = [];
  for (const col of columns) out.push(...groupLines(col));
  return out;
}

function splitColumns(items, pageWidth) {
  // Coverage histogram across x in 2pt buckets.
  const bucket = 2;
  const n = Math.ceil(pageWidth / bucket) + 1;
  const cover = new Array(n).fill(0);
  const textItems = items.filter((i) => i.str.trim());
  for (const it of textItems) {
    const a = Math.max(0, Math.floor(it.x / bucket));
    const b = Math.min(n - 1, Math.ceil((it.x + it.w) / bucket));
    for (let k = a; k <= b; k += 1) cover[k] += 1;
  }
  // Find the widest empty band between 22% and 78% of the page.
  let best = null;
  let start = -1;
  for (let k = Math.floor(n * 0.22); k <= Math.floor(n * 0.78); k += 1) {
    if (cover[k] === 0) {
      if (start < 0) start = k;
    } else if (start >= 0) {
      if (!best || k - start > best.len) best = { start, len: k - start };
      start = -1;
    }
  }
  if (start >= 0) {
    const k = Math.floor(n * 0.78);
    if (!best || k - start > best.len) best = { start, len: k - start };
  }
  if (!best || best.len * bucket < 8) return [items];
  const gx = (best.start + best.len / 2) * bucket;
  const left = items.filter((i) => i.x + i.w / 2 < gx);
  const right = items.filter((i) => i.x + i.w / 2 >= gx);
  // Both sides must carry real content for this to be a column layout.
  if (left.length < 5 || right.length < 5) return [items];
  return [left, right];
}

function groupLines(items) {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - it.y) <= Math.max(2, Math.min(last.h, it.h) * 0.45)) {
      last.items.push(it);
      last.h = Math.max(last.h, it.h);
    } else {
      lines.push({ y: it.y, h: it.h, items: [it] });
    }
  }
  const out = [];
  let prev = null;
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    let text = '';
    let end = null;
    for (const it of l.items) {
      if (end !== null) {
        const gap = it.x - end;
        if (gap > it.h * 1.0) text += '   ';
        else if (gap > it.h * 0.15 && !text.endsWith(' ') && !it.str.startsWith(' ')) text += ' ';
      }
      text += it.str;
      end = it.x + it.w;
    }
    text = text.replace(/\s+$/, '');
    if (!text.trim()) continue;
    // A large vertical gap before the line is a paragraph break.
    const gapBefore = prev ? l.y - prev.y - prev.h : 0;
    out.push({ text: text.replace(/^\s+/, ''), bullet: BULLET_RE.test(text), heading: false, x: l.items[0].x, right: end, size: l.h, gapBefore });
    prev = l;
  }
  return out;
}

export { BULLET_RE };
