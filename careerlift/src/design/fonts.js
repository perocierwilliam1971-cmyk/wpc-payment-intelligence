// Font registry + metrics.
//
// The same TTF files are used for (1) measuring text in the layout engine,
// (2) drawing the on-screen preview via @font-face, and (3) embedding in the
// PDF. Because measurement and the PDF use the *identical* pdf-lib font
// object, line breaks in the download match the preview exactly.

import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const FONT_FAMILIES = {
  lato: { label: 'Lato', kind: 'sans', css: 'sans-serif', docx: 'Lato', subset: true },
  roboto: { label: 'Roboto', kind: 'sans', css: 'sans-serif', docx: 'Roboto', subset: true },
  'open-sans': { label: 'Open Sans', kind: 'sans', css: 'sans-serif', docx: 'Open Sans', subset: true },
  montserrat: { label: 'Montserrat', kind: 'sans', css: 'sans-serif', docx: 'Montserrat', subset: true },
  raleway: { label: 'Raleway', kind: 'sans', css: 'sans-serif', docx: 'Raleway', subset: true },
  'source-serif-4': { label: 'Source Serif', kind: 'serif', css: 'serif', docx: 'Source Serif 4', subset: true },
  // pdf-lib's subsetter corrupts EB Garamond glyphs (verified visually), so it
  // is embedded whole. Do not flip this flag without re-running the font test.
  'eb-garamond': { label: 'EB Garamond', kind: 'serif', css: 'serif', docx: 'EB Garamond', subset: false },
};

export const VARIANTS = ['regular', 'bold', 'italic', 'bolditalic'];

export function variantOf(bold, italic) {
  if (bold && italic) return 'bolditalic';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'regular';
}

export function cssFamily(fam) {
  return `CL-${fam}`;
}

// ---------------------------------------------------------------------------
// Byte source. Browser: fetch from /fonts. Node tests: inject an fs reader.
let baseUrl = '/fonts/';
let byteSource = async (fam, variant) => {
  const res = await fetch(`${baseUrl}${fam}-${variant}.ttf`);
  if (!res.ok) throw new Error(`Font ${fam}-${variant} failed to load (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
};

export function setFontBaseUrl(url) {
  baseUrl = url.endsWith('/') ? url : `${url}/`;
}
export function setFontByteSource(fn) {
  byteSource = fn;
}

const bytesCache = new Map(); // key -> Promise<Uint8Array>
export function fontBytes(fam, variant) {
  const key = `${fam}-${variant}`;
  if (!bytesCache.has(key)) {
    const p = byteSource(fam, variant).catch((e) => {
      bytesCache.delete(key);
      throw e;
    });
    bytesCache.set(key, p);
  }
  return bytesCache.get(key);
}

// ---------------------------------------------------------------------------
// Metrics: one hidden "measuring" PDF document holds an embedded copy of each
// face. widthOfTextAtSize there === width pdf-lib uses when drawing.

let measureDocPromise = null;
function measureDoc() {
  if (!measureDocPromise) {
    measureDocPromise = PDFDocument.create().then((d) => {
      d.registerFontkit(fontkit);
      return d;
    });
  }
  return measureDocPromise;
}

const metrics = new Map(); // key -> {pdfFont, ascent, descent, has(cp)}

export async function loadFamily(fam) {
  if (!FONT_FAMILIES[fam]) throw new Error(`Unknown font family: ${fam}`);
  await Promise.all(VARIANTS.map((v) => loadFace(fam, v)));
}

async function loadFace(fam, variant) {
  const key = `${fam}-${variant}`;
  if (metrics.has(key)) return metrics.get(key);
  const bytes = await fontBytes(fam, variant);
  const doc = await measureDoc();
  const pdfFont = await doc.embedFont(bytes, { subset: FONT_FAMILIES[fam].subset });
  const fk = fontkit.create(bytes);
  const m = {
    pdfFont,
    ascent: fk.ascent / fk.unitsPerEm,
    descent: Math.abs(fk.descent / fk.unitsPerEm),
    has: (cp) => fk.hasGlyphForCodePoint(cp),
  };
  metrics.set(key, m);
  return m;
}

export function isFamilyLoaded(fam) {
  return VARIANTS.every((v) => metrics.has(`${fam}-${v}`));
}

function face(fam, variant) {
  const m = metrics.get(`${fam}-${variant}`);
  if (!m) throw new Error(`Font not loaded: ${fam}-${variant}. Call loadFamily() first.`);
  return m;
}

/** Width in points, including letter spacing applied after every glyph. */
export function measure(text, fam, variant, size, charSpace = 0) {
  if (!text) return 0;
  const w = face(fam, variant).pdfFont.widthOfTextAtSize(text, size);
  return w + charSpace * [...text].length;
}

export function fontMetrics(fam, variant) {
  const f = face(fam, variant);
  return { ascent: f.ascent, descent: f.descent };
}

// Typographic replacements for characters a font may not contain. Anything
// else unsupported (emoji, symbols) is dropped rather than drawn as a box.
const FALLBACKS = {
  '•': '·', '●': '•', '▪': '•', '◦': '•', '‣': '•', '⁃': '-',
  '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-',
  '…': '...', ' ': ' ', '‐': '-', '‑': '-', '‒': '-', '−': '-',
};

/** Returns text guaranteed to be drawable by the given face. */
export function sanitizeFor(text, fam, variant) {
  const f = face(fam, variant);
  let out = '';
  for (const ch of String(text ?? '')) {
    const cp = ch.codePointAt(0);
    if (cp === 9) { out += ' '; continue; }
    if (cp < 32) continue;
    if (f.has(cp)) { out += ch; continue; }
    const fb = FALLBACKS[ch];
    if (fb !== undefined && [...fb].every((c) => f.has(c.codePointAt(0)))) out += fb;
    // otherwise drop the glyph
  }
  return out;
}

/** Inject @font-face rules for the preview (browser only). */
export function injectFontFaces(doc = globalThis.document) {
  if (!doc || doc.getElementById('cl-font-faces')) return;
  const rules = [];
  for (const fam of Object.keys(FONT_FAMILIES)) {
    for (const v of VARIANTS) {
      const weight = v.includes('bold') ? 700 : 400;
      const style = v.includes('italic') ? 'italic' : 'normal';
      rules.push(`@font-face{font-family:'${cssFamily(fam)}';src:url('${baseUrl}${fam}-${v}.ttf') format('truetype');font-weight:${weight};font-style:${style};font-display:block;}`);
    }
  }
  const style = doc.createElement('style');
  style.id = 'cl-font-faces';
  style.textContent = rules.join('\n');
  doc.head.appendChild(style);
}

/** Wait until the browser can paint the family (so the preview never flashes a fallback). */
export async function ensureBrowserFont(fam) {
  const d = globalThis.document;
  if (!d?.fonts?.load) return;
  const name = cssFamily(fam);
  await Promise.all([
    d.fonts.load(`400 12px '${name}'`),
    d.fonts.load(`700 12px '${name}'`),
    d.fonts.load(`italic 400 12px '${name}'`),
    d.fonts.load(`italic 700 12px '${name}'`),
  ]).catch(() => {});
}
