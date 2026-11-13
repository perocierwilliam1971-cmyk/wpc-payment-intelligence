// The single shared document model. The editor, the live preview, and every
// exporter (PDF, DOCX, TXT) read from this exact structure — nothing else.

import { uid, deepClone, isBlank, normalizeHex } from '../core/util.js';

export const SCHEMA_VERSION = 1;

export const CORE_SECTIONS = ['summary', 'experience', 'education', 'certifications', 'skills', 'languages'];

export function emptyExperience(partial = {}) {
  return {
    id: uid('exp'),
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    current: false,
    bullets: [],
    ...partial,
  };
}

export function emptyBullet(text = '') {
  return { id: uid('b'), text };
}

export function emptyEducation(partial = {}) {
  return { id: uid('edu'), degree: '', school: '', location: '', startDate: '', endDate: '', details: '', ...partial };
}

export function emptyCertification(partial = {}) {
  return { id: uid('cert'), name: '', issuer: '', date: '', ...partial };
}

export function emptyCustomSection(partial = {}) {
  return { id: uid('sec'), title: '', items: [], ...partial };
}

export function defaultDesign() {
  return {
    templateId: 'classic',
    colors: { primary: '#1f2937', accent: '#2563eb', text: '#1f2937', background: '#f3f4f6' },
    headingFont: 'source-serif-4',
    bodyFont: 'source-serif-4',
    fontSize: 10.5,
    margins: 54, // points (0.75in)
    lineSpacing: 1.2,
    sectionSpacing: 14,
    sectionOrder: [...CORE_SECTIONS],
    hidden: {},
    sidebarPosition: 'left',
    pageSize: 'letter',
  };
}

export function createEmptyResume(language = 'en') {
  return {
    version: SCHEMA_VERSION,
    meta: { language, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source: 'scratch' },
    contact: { fullName: '', headline: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    summary: '',
    experience: [],
    education: [],
    certifications: [],
    skills: [],
    languages: [],
    custom: [],
    design: defaultDesign(),
  };
}

const str = (v) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
const strList = (v) => (Array.isArray(v) ? v.map(str).map((s) => s.trim()).filter(Boolean) : []);

/**
 * Normalizes any (possibly old, partial or hand-edited) object into a valid
 * resume. This is the guard that keeps a corrupt localStorage entry or JSON
 * backup from crashing the preview or exports.
 */
export function normalizeResume(input) {
  const base = createEmptyResume(input?.meta?.language || 'en');
  if (!input || typeof input !== 'object') return base;
  const r = deepClone(input);
  const out = base;
  out.meta = { ...base.meta, ...(r.meta || {}) };
  out.contact = { ...base.contact };
  for (const k of Object.keys(base.contact)) out.contact[k] = str(r.contact?.[k]);
  out.summary = str(r.summary);
  out.experience = (Array.isArray(r.experience) ? r.experience : []).map((e) => ({
    ...emptyExperience(),
    id: str(e?.id) || uid('exp'),
    title: str(e?.title),
    company: str(e?.company),
    location: str(e?.location),
    startDate: str(e?.startDate),
    endDate: str(e?.endDate),
    current: !!e?.current,
    bullets: (Array.isArray(e?.bullets) ? e.bullets : [])
      .map((b) => (typeof b === 'string' ? emptyBullet(b) : { id: str(b?.id) || uid('b'), text: str(b?.text) })),
  }));
  out.education = (Array.isArray(r.education) ? r.education : []).map((e) => ({
    ...emptyEducation(),
    id: str(e?.id) || uid('edu'),
    degree: str(e?.degree),
    school: str(e?.school),
    location: str(e?.location),
    startDate: str(e?.startDate),
    endDate: str(e?.endDate),
    details: str(e?.details),
  }));
  out.certifications = (Array.isArray(r.certifications) ? r.certifications : []).map((c) => ({
    ...emptyCertification(),
    id: str(c?.id) || uid('cert'),
    name: str(c?.name),
    issuer: str(c?.issuer),
    date: str(c?.date),
  }));
  out.skills = strList(r.skills);
  out.languages = strList(r.languages);
  out.custom = (Array.isArray(r.custom) ? r.custom : []).map((c) => ({
    id: str(c?.id) || uid('sec'),
    title: str(c?.title),
    items: strList(c?.items),
  }));

  const d = r.design || {};
  const bd = base.design;
  out.design = {
    templateId: str(d.templateId) || bd.templateId,
    colors: {
      primary: normalizeHex(d.colors?.primary, bd.colors.primary),
      accent: normalizeHex(d.colors?.accent, bd.colors.accent),
      text: normalizeHex(d.colors?.text, bd.colors.text),
      background: normalizeHex(d.colors?.background, bd.colors.background),
    },
    headingFont: str(d.headingFont) || bd.headingFont,
    bodyFont: str(d.bodyFont) || bd.bodyFont,
    fontSize: num(d.fontSize, bd.fontSize, 8, 13),
    margins: num(d.margins, bd.margins, 24, 90),
    lineSpacing: num(d.lineSpacing, bd.lineSpacing, 1, 1.8),
    sectionSpacing: num(d.sectionSpacing, bd.sectionSpacing, 4, 30),
    sectionOrder: normalizeOrder(d.sectionOrder, out.custom),
    hidden: d.hidden && typeof d.hidden === 'object' ? { ...d.hidden } : {},
    sidebarPosition: d.sidebarPosition === 'right' ? 'right' : 'left',
    pageSize: d.pageSize === 'a4' ? 'a4' : 'letter',
    saved: d.saved && typeof d.saved === 'object' ? deepClone(d.saved) : {},
  };
  return out;
}

function num(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Section keys: core keys plus `custom:<id>` for every custom section. */
export function normalizeOrder(order, custom = []) {
  const valid = new Set([...CORE_SECTIONS, ...custom.map((c) => `custom:${c.id}`)]);
  const seen = new Set();
  const out = [];
  for (const k of Array.isArray(order) ? order : []) {
    if (valid.has(k) && !seen.has(k)) {
      out.push(k);
      seen.add(k);
    }
  }
  for (const k of valid) if (!seen.has(k)) out.push(k);
  return out;
}

/** True when a section has any content worth rendering. */
export function sectionHasContent(resume, key) {
  if (key === 'summary') return !isBlank(resume.summary);
  if (key === 'experience') return resume.experience.some((e) => !isBlank(e.title) || !isBlank(e.company) || e.bullets.some((b) => !isBlank(b.text)));
  if (key === 'education') return resume.education.some((e) => !isBlank(e.degree) || !isBlank(e.school));
  if (key === 'certifications') return resume.certifications.some((c) => !isBlank(c.name));
  if (key === 'skills') return resume.skills.length > 0;
  if (key === 'languages') return resume.languages.length > 0;
  if (key.startsWith('custom:')) {
    const c = resume.custom.find((s) => `custom:${s.id}` === key);
    return !!c && c.items.length > 0;
  }
  return false;
}

/** Sections in display order, skipping hidden and empty ones. */
export function visibleSections(resume) {
  const order = normalizeOrder(resume.design.sectionOrder, resume.custom);
  return order.filter((k) => !resume.design.hidden[k] && sectionHasContent(resume, k));
}
