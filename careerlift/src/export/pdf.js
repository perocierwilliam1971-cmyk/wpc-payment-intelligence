// PDF writer: draws the layout engine's pages with pdf-lib. Real, selectable
// text with embedded fonts (good for ATS parsing) — never a screenshot.

import { PDFDocument, rgb, setCharacterSpacing, pushGraphicsState, popGraphicsState } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { fontBytes, FONT_FAMILIES } from '../design/fonts.js';
import { hexToRgb01 } from '../core/util.js';

const color = (hex) => {
  const { r, g, b } = hexToRgb01(hex || '#000000');
  return rgb(r, g, b);
};

function roundedRectPath(w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  return `M ${k} 0 L ${w - k} 0 Q ${w} 0 ${w} ${k} L ${w} ${h - k} Q ${w} ${h} ${w - k} ${h} L ${k} ${h} Q 0 ${h} 0 ${h - k} L 0 ${k} Q 0 0 ${k} 0 Z`;
}

/**
 * @param layout output of layoutResume() / layoutLetter()
 * @param meta { title, author, subject, keywords, language }
 * @returns Uint8Array
 */
export async function renderPdf(layout, meta = {}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts = new Map();
  const getFont = async (fam, v) => {
    const key = `${fam}-${v}`;
    if (!fonts.has(key)) {
      const bytes = await fontBytes(fam, v);
      fonts.set(key, await doc.embedFont(bytes, { subset: FONT_FAMILIES[fam]?.subset !== false }));
    }
    return fonts.get(key);
  };

  for (const page of layout.pages) {
    const p = doc.addPage([layout.width, layout.height]);
    const H = layout.height;
    // Explicit white page background so every viewer shows the same thing.
    p.drawRectangle({ x: 0, y: 0, width: layout.width, height: H, color: rgb(1, 1, 1) });
    for (const o of page.ops) {
      if (o.t === 'rect') {
        if (o.w <= 0 || o.h <= 0) continue;
        if (o.r) {
          p.drawSvgPath(roundedRectPath(o.w, o.h, o.r), { x: o.x, y: H - o.y, color: color(o.fill), borderWidth: 0 });
        } else {
          p.drawRectangle({ x: o.x, y: H - o.y - o.h, width: o.w, height: o.h, color: color(o.fill) });
        }
      } else if (o.t === 'line') {
        p.drawLine({ start: { x: o.x1, y: H - o.y1 }, end: { x: o.x2, y: H - o.y2 }, thickness: o.w, color: color(o.color) });
      } else if (o.t === 'circle') {
        if (o.ring) p.drawCircle({ x: o.cx, y: H - o.cy, size: o.r, borderColor: color(o.fill), borderWidth: Math.max(0.6, o.r * 0.45) });
        else p.drawCircle({ x: o.cx, y: H - o.cy, size: o.r, color: color(o.fill) });
      } else if (o.t === 'text') {
        if (!o.text) continue;
        const font = await getFont(o.fam, o.v);
        if (o.cs) p.pushOperators(pushGraphicsState(), setCharacterSpacing(o.cs));
        p.drawText(o.text, { x: o.x, y: H - o.y, size: o.size, font, color: color(o.color) });
        if (o.cs) p.pushOperators(setCharacterSpacing(0), popGraphicsState());
      }
    }
  }
  if (meta.embed) {
    // A copy of the structured resume so re-uploading this exact PDF to
    // CareerLift restores every field. Ignored by PDF viewers and ATS.
    const json = new TextEncoder().encode(JSON.stringify({ app: 'careerlift', v: 1, resume: meta.embed }));
    await doc.attach(json, 'careerlift-resume.json', { mimeType: 'application/json', description: 'CareerLift editable resume data' });
  }
  doc.setTitle(meta.title || 'Resume');
  if (meta.author) doc.setAuthor(meta.author);
  if (meta.subject) doc.setSubject(meta.subject);
  if (meta.keywords?.length) doc.setKeywords(meta.keywords);
  doc.setCreator('CareerLift Career Intelligence');
  doc.setProducer('CareerLift (pdf-lib)');
  if (meta.language) doc.setLanguage(meta.language === 'en' ? 'en-US' : meta.language === 'es-PR' ? 'es-PR' : 'es');
  return doc.save();
}
