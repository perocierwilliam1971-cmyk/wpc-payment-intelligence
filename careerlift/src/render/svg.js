// Preview renderer: draws the layout engine's pages as SVG. SVG places text
// on its baseline exactly like PDF does, so the preview and the PDF share the
// same coordinates, fonts and line breaks.

import { cssFamily } from '../design/fonts.js';
import { escapeHtml } from '../core/util.js';

const n = (v) => Math.round(v * 100) / 100;

export function pageToSvg(layout, page, { title = '' } = {}) {
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(layout.width)} ${n(layout.height)}" width="100%" role="img" aria-label="${escapeHtml(title)}" style="display:block;background:#fff;font-kerning:none;font-variant-ligatures:none;text-rendering:geometricPrecision">`);
  parts.push(`<rect x="0" y="0" width="${n(layout.width)}" height="${n(layout.height)}" fill="#ffffff"/>`);
  for (const o of page.ops) {
    if (o.t === 'rect') {
      if (o.w <= 0 || o.h <= 0) continue;
      parts.push(`<rect x="${n(o.x)}" y="${n(o.y)}" width="${n(o.w)}" height="${n(o.h)}"${o.r ? ` rx="${n(o.r)}"` : ''} fill="${o.fill}"/>`);
    } else if (o.t === 'line') {
      parts.push(`<line x1="${n(o.x1)}" y1="${n(o.y1)}" x2="${n(o.x2)}" y2="${n(o.y2)}" stroke="${o.color}" stroke-width="${n(o.w)}"/>`);
    } else if (o.t === 'circle') {
      if (o.ring) parts.push(`<circle cx="${n(o.cx)}" cy="${n(o.cy)}" r="${n(o.r)}" fill="none" stroke="${o.fill}" stroke-width="${n(Math.max(0.6, o.r * 0.45))}"/>`);
      else parts.push(`<circle cx="${n(o.cx)}" cy="${n(o.cy)}" r="${n(o.r)}" fill="${o.fill}"/>`);
    } else if (o.t === 'text') {
      const weight = o.v.includes('bold') ? 700 : 400;
      const style = o.v.includes('italic') ? 'italic' : 'normal';
      const ls = o.cs ? `;letter-spacing:${n(o.cs)}px` : '';
      parts.push(`<text x="${n(o.x)}" y="${n(o.y)}" fill="${o.color}" style="font-family:'${cssFamily(o.fam)}';font-size:${n(o.size)}px;font-weight:${weight};font-style:${style};white-space:pre${ls}">${escapeHtml(o.text)}</text>`);
    }
  }
  parts.push('</svg>');
  return parts.join('');
}

export function layoutToSvgPages(layout, opts) {
  return layout.pages.map((p) => pageToSvg(layout, p, opts));
}
