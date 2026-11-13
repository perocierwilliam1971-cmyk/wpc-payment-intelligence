// Small, dependency-free helpers shared by every module.

let counter = 0;
export function uid(prefix = 'id') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function deepClone(v) {
  return v === undefined ? v : JSON.parse(JSON.stringify(v));
}

export function isBlank(s) {
  return s === undefined || s === null || String(s).trim() === '';
}

/** "#1e3a5f" -> {r,g,b} in 0..1 */
export function hexToRgb01(hex) {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

export function normalizeHex(hex, fallback = '#000000') {
  if (typeof hex !== 'string') return fallback;
  let h = hex.trim();
  if (!h.startsWith('#')) h = `#${h}`;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : fallback;
}

/** Mix a color with white. amount 0 = original, 1 = white. */
export function tint(hex, amount) {
  const { r, g, b } = hexToRgb01(hex);
  const m = (c) => Math.round((c + (1 - c) * amount) * 255).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

/** Relative luminance (WCAG). */
export function luminance(hex) {
  const { r, g, b } = hexToRgb01(hex);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Pick white or near-black text for a given background. */
export function readableOn(bg) {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#111827') ? '#ffffff' : '#111827';
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(s) {
  return String(s || 'resume')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'resume';
}
