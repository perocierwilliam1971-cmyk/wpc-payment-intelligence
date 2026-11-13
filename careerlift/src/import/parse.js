// Lines -> resume model. Rule-based (no AI), English + Spanish.
//
// Design rule: NOTHING the customer wrote is silently dropped. Every input
// line is either placed in a field or listed as "unplaced" and kept in an
// "Additional Information" section for the customer to review.

import {
  createEmptyResume, emptyExperience, emptyBullet, emptyEducation, emptyCertification, emptyCustomSection, normalizeOrder,
} from '../model/schema.js';
import { BULLET_RE } from './extract.js';

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const norm = (s) => strip(s).replace(/[^a-z& ]+/g, ' ').replace(/\s+/g, ' ').trim();

// --- Section headings -------------------------------------------------------
const HEADINGS = [
  ['summary', ['summary', 'professional summary', 'career summary', 'executive summary', 'profile', 'professional profile', 'career profile', 'objective', 'career objective', 'about me', 'about', 'qualifications summary', 'summary of qualifications', 'professional overview', 'overview', 'resumen', 'resumen profesional', 'perfil', 'perfil profesional', 'perfil ejecutivo', 'objetivo', 'objetivo profesional', 'sobre mi', 'acerca de mi', 'resumen de cualificaciones', 'resumen de calificaciones']],
  ['experience', ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history', 'relevant experience', 'professional background', 'experiencia', 'experiencia laboral', 'experiencia profesional', 'experiencia de empleo', 'experiencia de trabajo', 'historial laboral', 'historial de empleo', 'trayectoria profesional', 'empleos']],
  ['education', ['education', 'education & training', 'education and training', 'academic background', 'academic history', 'educational background', 'educacion', 'formacion', 'formacion academica', 'preparacion academica', 'estudios', 'historial academico', 'educacion y formacion']],
  ['certifications', ['certifications', 'certification', 'certificates', 'licenses', 'licenses & certifications', 'licenses and certifications', 'certifications & licenses', 'certifications and licenses', 'professional certifications', 'credentials', 'certificaciones', 'certificaciones y licencias', 'licencias', 'licencias y certificaciones', 'certificados']],
  ['skills', ['skills', 'core competencies', 'competencies', 'key skills', 'technical skills', 'areas of expertise', 'expertise', 'skills & abilities', 'skills and abilities', 'core skills', 'professional skills', 'skills summary', 'qualifications', 'strengths', 'destrezas', 'destrezas principales', 'habilidades', 'competencias', 'competencias clave', 'conocimientos', 'aptitudes', 'habilidades tecnicas', 'destrezas tecnicas']],
  ['languages', ['languages', 'language skills', 'language', 'idiomas', 'lenguajes', 'idioma']],
  ['contact', ['contact', 'contact information', 'contact info', 'contacto', 'informacion de contacto', 'datos personales', 'personal information', 'personal details']],
];
const CUSTOM_HEADINGS = ['volunteer', 'volunteer experience', 'volunteer work', 'volunteering', 'community involvement', 'awards', 'honors', 'awards & honors', 'honors & awards', 'achievements', 'accomplishments', 'projects', 'key projects', 'publications', 'presentations', 'professional affiliations', 'affiliations', 'memberships', 'professional memberships', 'activities', 'interests', 'hobbies', 'references', 'training', 'professional development', 'courses', 'military service', 'military experience', 'leadership', 'additional information', 'voluntariado', 'trabajo voluntario', 'servicio comunitario', 'premios', 'reconocimientos', 'logros', 'proyectos', 'publicaciones', 'afiliaciones', 'membresias', 'asociaciones profesionales', 'actividades', 'intereses', 'referencias', 'adiestramientos', 'cursos', 'talleres', 'desarrollo profesional', 'servicio militar', 'informacion adicional', 'liderazgo'];

const HEADING_MAP = new Map();
for (const [key, list] of HEADINGS) for (const h of list) HEADING_MAP.set(h, key);

const SPANISH_HINTS = /\b(experiencia|educaci[oó]n|destrezas|habilidades|idiomas|presente|actualidad|universidad|bachillerato|maestr[ií]a|resumen|perfil|logr[eé]|gestion[eé]|coordin[eé]|supervis[eé]|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi;

function headingKey(text) {
  const raw = text.replace(BULLET_RE, '').replace(/^[■▪●◆]\s*/, '').replace(/[:：]\s*$/, '').trim();
  if (raw.length > 48) return null;
  const n = norm(raw);
  if (!n) return null;
  if (HEADING_MAP.has(n)) return { key: HEADING_MAP.get(n), title: raw };
  if (CUSTOM_HEADINGS.includes(n)) return { key: 'custom', title: titleCase(raw) };
  return null;
}

// --- Dates -------------------------------------------------------------------
const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|ene(?:ro)?|febrero|marzo|abr(?:il)?|mayo|junio|julio|ago(?:sto)?|sept?iembre|set|octubre|noviembre|dic(?:iembre)?)\\.?';
const DATE = `(?:${MONTH}\\s*(?:de\\s+|del\\s+|,\\s*)?\\d{4}|\\d{1,2}\\s*[/.-]\\s*\\d{4}|(?:19|20)\\d{2})`;
const PRESENT = '(?:present|current|currently|now|today|ongoing|presente|actual(?:idad|mente)?|al\\s+presente|a\\s+la\\s+fecha|hoy)';
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|through|until|a|al|hasta|\\u2013)\\s*(${DATE}|${PRESENT})`, 'i');
const SINGLE_DATE_RE = new RegExp(`(?:^|[\\s(,|])((?:${MONTH}\\s*(?:de\\s+)?)?(?:19|20)\\d{2})(?=$|[\\s),|])`, 'i');
const PRESENT_RE = new RegExp(`^${PRESENT}$`, 'i');

export function findDateRange(text) {
  const m = RANGE_RE.exec(text);
  if (!m) return null;
  const current = PRESENT_RE.test(m[2].trim());
  return {
    start: tidyDate(m[1]),
    end: current ? '' : tidyDate(m[2]),
    current,
    rest: (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/[(\[]\s*[)\]]/g, ' ').replace(/\s{2,}/g, '   ').trim(),
  };
}

function findSingleDate(text) {
  const m = SINGLE_DATE_RE.exec(text);
  if (!m) return null;
  const idx = m.index + m[0].indexOf(m[1]);
  return { date: tidyDate(m[1]), rest: (text.slice(0, idx) + text.slice(idx + m[1].length)).replace(/[(\[]\s*[)\]]/g, ' ').trim() };
}

function tidyDate(s) {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// --- Contact -----------------------------------------------------------------
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[^\s|,•·]+/i;
const URL_RE = /(?:https?:\/\/|www\.)[^\s|,•·]+|\b[a-z0-9-]+\.(?:com|net|org|io|dev|me|co|pr)(?:\/[^\s|,•·]*)?\b/i;
const US_STATES = 'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|PR|VI|GU';
const COUNTRIES = 'Puerto Rico|USA|U\\.S\\.A?\\.?|United States|España|Spain|M[eé]xico|Colombia|Venezuela|Per[uú]|Chile|Argentina|Ecuador|Panam[aá]|Costa Rica|Guatemala|Honduras|El Salvador|Nicaragua|Cuba|Rep[uú]blica Dominicana|Dominican Republic|Canada|Canad[aá]|UK|United Kingdom|Brasil|Brazil';
const LOCATION_RE = new RegExp(`^(?:[A-ZÁÉÍÓÚÑ][\\p{L}.'’-]*(?: [\\p{L}.'’-]+){0,3}),\\s*(?:${US_STATES}|${COUNTRIES})(?:\\s+\\d{5})?$`, 'u');
const REMOTE_RE = /^(remote|remoto|hybrid|h[ií]brido|on-?site)$/i;
const TRAILING_LOC_RE = new RegExp(`,\\s*((?:[A-ZÁÉÍÓÚÑ][\\p{L}.'’ -]{1,30}),\\s*(?:${US_STATES}|Puerto Rico))\\s*$`, 'u');

const isLocation = (s) => LOCATION_RE.test(s.trim()) || REMOTE_RE.test(s.trim());

const SEP_RE = /\s{3,}|\s+[|•·◆●▪]\s+|\s+[–—]\s+|\s+-\s+|\t/;

function segments(text) {
  return text
    .replace(/\(([^()]*)\)/g, '   $1   ')
    .split(SEP_RE)
    .map((s) => s.replace(/^[\s|•·,;–—-]+|[\s|•·,;–—-]+$/g, '').trim())
    .filter(Boolean);
}

// --- Title/company heuristics -------------------------------------------------
const COMPANY_HINT = /\b(inc|llc|l\.l\.c|corp|corporation|co\.|company|ltd|group|grupo|hospital|clinic|cl[ií]nica|university|universidad|college|bank|banco|cooperativa|coop|department|departamento|agency|agencia|services|servicios|solutions|soluciones|systems|technologies|partners|associates|foundation|fundaci[oó]n|municipio|gobierno|government|school|escuela|store|tienda|restaurant|restaurante|hotel|resort|s\.a\.|s\.e\.|psc|csp|pr|labs?|logistics|telecom|industries|international|enterprises|center|centro|walmart|amazon|google|microsoft)\b/i;
const TITLE_HINT = /\b(manager|supervisor|representative|rep|assistant|director|specialist|analyst|engineer|coordinator|technician|tech|nurse|teacher|associate|clerk|officer|consultant|developer|lead|leader|intern|cashier|driver|operator|administrator|admin|agent|advisor|executive|accountant|designer|president|vp|head|owner|founder|instructor|therapist|pharmacist|mechanic|electrician|chef|cook|server|bartender|receptionist|secretary|auditor|planner|buyer|recruiter|programmer|scientist|architect|editor|writer|paralegal|attorney|lawyer|gerente|supervisora?|representante|asistente|directora?|especialista|analista|ingenier[oa]|coordinadora?|t[eé]cnic[oa]|enfermer[oa]|maestr[oa]|profesora?|oficial|consultora?|cajer[oa]|chofer|operadora?|administradora?|agente|asesora?|contadora?|diseñadora?|presidenta?|due[ñn][oa]|instructora?|terapista|farmac[eé]utic[oa]|mec[aá]nic[oa]|electricista|cociner[oa]|recepcionista|secretari[oa]|auditora?|reclutadora?|programadora?|abogad[oa]|vendedora?|empleado|empleada|auxiliar)\b/i;

const DEGREE_HINT = /\b(bachelor|master|associate|doctor|ph\.?d|mba|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?|b\.?b\.?a|m\.?ed|diploma|degree|ged|high school|certificate|licentiate|bachillerato|maestr[ií]a|grado asociado|asociado|doctorado|licenciatura|diplomado|t[eé]cnico|certificado|escuela superior|cuarto a[ñn]o|juris doctor)\b/i;
const SCHOOL_HINT = /\b(university|universidad|college|colegio|institute|instituto|school|escuela|academy|academia|recinto|campus|polytechnic|polit[eé]cnic[oa]|seminary|seminario)\b/i;

function titleCase(s) {
  const small = new Set(['and', 'of', 'the', 'for', 'in', 'at', 'de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'el']);
  return s.toLowerCase().split(/(\s+)/).map((w, i) => {
    if (/^\s+$/.test(w)) return w;
    if (i > 0 && small.has(w)) return w;
    if (/^(llc|inc|usa|pr|csp|psc|it|hr|ii|iii|iv|ups|ibm|bpo)\.?$/i.test(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join('');
}

const isAllCaps = (s) => /[A-ZÁÉÍÓÚÑ]/.test(s) && s === s.toUpperCase() && /[A-Z]{3}/.test(strip(s).toUpperCase());

/**
 * Did `prev` wrap onto `next`? True only when the next line's first word
 * would NOT have fit at the end of the previous line (what a word-wrapper
 * does) AND the next line does not start like a new sentence.
 */
function isWrapContinuation(prev, next, maxRight) {
  if (!prev) return false;
  const t = next.text.trim();
  // A line ending in a joiner always continues, whatever the next case.
  if (/(\s[—–-]|,|&|\s(and|of|for|the|de|del|y|en|la|el|with|con))$/i.test(prev.text.trim())) return true;
  if (!/^[a-zà-ÿ0-9(%$&,;]/.test(t)) return false;
  if (typeof prev.right !== 'number' || typeof prev.x !== 'number') {
    return !/[.!?:]$/.test(prev.text.trim());
  }
  const avg = (prev.right - prev.x) / Math.max(1, prev.text.length);
  const firstWord = t.split(/\s+/)[0] || '';
  return prev.right + avg * (firstWord.length + 1) > maxRight - 1;
}

function cleanBullet(text) {
  return text.replace(BULLET_RE, '').replace(/\s+/g, ' ').trim();
}

// --- Main ----------------------------------------------------------------------

/**
 * @param lines  [{ text, bullet, heading, x?, right?, size?, gapBefore? }]
 * @returns { resume, report }
 */
export function parseResume(inputLines, opts = {}) {
  const lines = inputLines
    .map((l, i) => ({ ...l, text: (l.text || '').replace(/ /g, ' ').replace(/\s+$/, ''), idx: i }))
    .filter((l) => l.text.trim())
    .filter((l) => !isPageArtifact(l.text))
    .filter((l) => !/^[\s\-=_*~.·•▬■━─]{2,}$/.test(l.text)); // underline/separator rules
  splitMarginHeadings(lines);
  const used = new Set();
  const take = (l) => used.add(l.idx);

  const rawText = lines.map((l) => l.text).join('\n');
  const spanishHits = (rawText.match(SPANISH_HINTS) || []).length;
  const language = opts.language || (spanishHits >= 4 ? 'es' : 'en');
  const resume = createEmptyResume(language);
  resume.meta.source = opts.source || 'upload';
  const report = { warnings: [], unplaced: [], rawText, flags: {}, detectedLanguage: spanishHits >= 4 ? 'es' : 'en', sectionsFound: [] };

  // 0. Contact-only lines anywhere (e.g. a right-aligned contact block that a
  //    column reader places after the main column).
  const contactOnly = new Set();
  const full = (re, t) => { const m = re.exec(t); return m && m[0].trim().length >= t.trim().length - 1; };
  lines.forEach((l, i) => {
    const t = l.text.trim();
    if (full(EMAIL_RE, t) || full(PHONE_RE, t) || full(LINKEDIN_RE, t)) contactOnly.add(i);
  });
  lines.forEach((l, i) => {
    if (contactOnly.has(i)) return;
    if (isLocation(l.text.trim()) && (contactOnly.has(i - 1) || contactOnly.has(i + 1))) contactOnly.add(i);
  });
  const lateContact = [];
  for (const i of [...contactOnly].sort((a, b) => a - b)) if (i > 6) lateContact.push(lines[i]);

  // 1. Split into blocks by heading.
  const blocks = [{ key: 'header', title: '', lines: [] }];
  const late = new Set(lateContact);
  for (const l of lines) {
    if (late.has(l)) continue;
    const inline = /^([^:]{3,40}):\s+(.+)$/.exec(l.text.trim());
    let hk = headingKey(l.text.trim());
    if (!hk && inline) {
      const k2 = headingKey(inline[1]);
      if (k2 && k2.key !== 'custom') {
        blocks.push({ key: k2.key, title: k2.title, lines: [] });
        take(l);
        blocks[blocks.length - 1].lines.push({ ...l, text: inline[2], idx: l.idx });
        continue;
      }
    }
    if (!hk && isUnknownHeading(l, lines)) hk = { key: 'custom', title: titleCase(l.text.trim().replace(/:$/, '')) };
    if (hk) {
      take(l);
      blocks.push({ key: hk.key, title: hk.title, lines: [] });
    } else {
      blocks[blocks.length - 1].lines.push(l);
    }
  }
  report.sectionsFound = blocks.filter((b) => b.key !== 'header').map((b) => b.key);

  // 2. Header & contact (header block + any "Contact" block).
  const headerLines = [...blocks.filter((b) => b.key === 'header' || b.key === 'contact').flatMap((b) => b.lines), ...lateContact];
  parseHeader(headerLines, resume, take, report);
  // Contact details found anywhere else (e.g. in a footer).
  for (const l of lines) {
    if (!resume.contact.email) {
      const m = EMAIL_RE.exec(l.text);
      if (m) { resume.contact.email = m[0]; if (l.text.trim() === m[0]) take(l); }
    }
    if (!resume.contact.linkedin) {
      const m = LINKEDIN_RE.exec(l.text);
      if (m) { resume.contact.linkedin = m[0]; if (l.text.trim() === m[0]) take(l); }
    }
  }

  // 3. Sections.
  const order = [];
  const customSeen = new Map();
  for (const b of blocks) {
    if (b.key === 'header' || b.key === 'contact') continue;
    if (!b.lines.length) continue;
    if (b.key === 'summary') {
      const t = joinParagraph(b.lines);
      resume.summary = resume.summary ? `${resume.summary}\n\n${t}` : t;
      b.lines.forEach(take);
    } else if (b.key === 'experience') {
      const entries = parseExperience(b.lines, take);
      resume.experience.push(...entries);
    } else if (b.key === 'education') {
      resume.education.push(...parseEducation(b.lines, take));
    } else if (b.key === 'certifications') {
      resume.certifications.push(...parseCertifications(b.lines, take));
    } else if (b.key === 'skills' || b.key === 'languages') {
      const items = parseList(b.lines, take);
      for (const it of items) if (!resume[b.key].includes(it)) resume[b.key].push(it);
    } else if (b.key === 'custom') {
      const title = b.title;
      let sec = customSeen.get(title);
      if (!sec) {
        sec = emptyCustomSection({ title });
        customSeen.set(title, sec);
        resume.custom.push(sec);
        order.push(`custom:${sec.id}`);
      }
      sec.items.push(...parseItems(b.lines, take));
      continue;
    }
    if (!order.includes(b.key)) order.push(b.key);
  }

  // 4. Anything not placed is kept, never dropped.
  const unplaced = lines.filter((l) => !used.has(l.idx));
  if (unplaced.length) {
    report.unplaced = unplaced.map((l) => l.text.trim());
    const title = language.startsWith('es') ? 'Información Adicional' : 'Additional Information';
    const sec = emptyCustomSection({ title, items: unplaced.map((l) => cleanBullet(l.text)).filter(Boolean) });
    resume.custom.push(sec);
    order.push(`custom:${sec.id}`);
    report.warnings.push({ code: 'unplaced', count: unplaced.length });
  }

  resume.design.sectionOrder = normalizeOrder(order, resume.custom);

  // 5. Review flags.
  if (!resume.contact.fullName) report.warnings.push({ code: 'no-name' });
  if (!resume.contact.email) report.warnings.push({ code: 'no-email' });
  if (!resume.experience.length) report.warnings.push({ code: 'no-experience' });
  for (const e of resume.experience) {
    const missing = [];
    if (!e.title) missing.push('title');
    if (!e.company) missing.push('company');
    if (!e.startDate && !e.endDate && !e.current) missing.push('dates');
    if (missing.length) report.flags[e.id] = missing;
  }
  report.stats = {
    lines: lines.length,
    placed: lines.length - unplaced.length,
    experience: resume.experience.length,
    bullets: resume.experience.reduce((a, e) => a + e.bullets.length, 0),
  };
  return { resume, report };
}

/**
 * Layouts with headings in a left margin column produce lines like
 * "EXPERIENCE   Operations Manager ...". Split the heading out (also when it
 * wraps over two lines: "PROFESSIONAL   ..." / "SUMMARY   ...").
 */
function splitMarginHeadings(lines) {
  const firstSeg = (l) => {
    const m = /^(\S.*?)\s{3,}(\S.*)$/.exec(l.text.trim());
    return m ? { head: m[1], rest: m[2] } : null;
  };
  for (let i = 0; i < lines.length; i += 1) {
    const a = firstSeg(lines[i]);
    if (!a || a.head.length > 40) continue;
    const b = lines[i + 1] ? firstSeg(lines[i + 1]) : null;
    const pair = b && headingKey(`${a.head} ${b.head}`);
    const single = headingKey(a.head);
    const mk = (src, text) => ({ ...src, text, x: undefined, right: undefined, idx: src.idx + 0.5 });
    if (pair && !single) {
      const h = { ...lines[i], text: `${a.head} ${b.head}`, bullet: false };
      lines.splice(i, 2, h, mk(lines[i], a.rest), mk(lines[i + 1], b.rest));
      i += 2;
    } else if (single) {
      const h = { ...lines[i], text: a.head, bullet: false };
      lines.splice(i, 1, h, mk(lines[i], a.rest));
      i += 1;
    }
  }
}

function isPageArtifact(t) {
  const s = t.trim();
  return /^(page|p[aá]gina|pg\.?)\s*\d+(\s*(of|de)\s*\d+)?$/i.test(s)
    || /^\d+\s*(\/|of|de)\s*\d+$/i.test(s)
    || /^.{0,60}\s·\s+\d+\s*\/\s*\d+$/.test(s)
    || /^-\s*\d+\s*-$/.test(s);
}

function isUnknownHeading(l, all) {
  const t = l.text.trim().replace(/:$/, '');
  if (t.length < 4 || t.length > 40) return false;
  if (/\d|@|\/|,/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 5) return false;
  if (!(isAllCaps(t) || (l.heading && words.length <= 4))) return false;
  if (l.bullet) return false;
  // An all-caps company name is followed by dates; a heading is not.
  const i = all.indexOf(l);
  for (let k = i + 1; k <= i + 2 && k < all.length; k += 1) if (findDateRange(all[k].text)) return false;
  if (findDateRange(t)) return false;
  // Ignore the very first lines (the name is often in caps).
  if (i < 3) return false;
  return true;
}

function joinParagraph(lines) {
  let out = '';
  lines.forEach((l, i) => {
    const t = cleanBullet(l.text);
    if (!t) return;
    if (i > 0 && l.gapBefore !== undefined && l.gapBefore > (l.size || 10) * 0.9) out += '\n\n';
    else if (out) out += out.endsWith('-') ? '' : ' ';
    out += t;
  });
  return out.trim();
}

function parseHeader(lines, resume, take, report) {
  const c = resume.contact;
  const leftovers = [];
  for (const l of lines) {
    let t = l.text;
    const grab = (re, field) => {
      const m = re.exec(t);
      if (m && !c[field]) {
        c[field] = m[0].trim();
        t = t.replace(m[0], ' ');
      } else if (m) t = t.replace(m[0], ' ');
    };
    grab(EMAIL_RE, 'email');
    grab(LINKEDIN_RE, 'linkedin');
    grab(PHONE_RE, 'phone');
    // Website (after email/linkedin removed)
    const u = URL_RE.exec(t);
    if (u && !/@/.test(u[0])) {
      if (!c.website) c.website = u[0];
      t = t.replace(u[0], ' ');
    }
    const segs = segments(t.replace(/^(e-?mail|correo|tel(?:[eé]fono)?|phone|cell|celular|m[oó]vil|linkedin|web|website|address|direcci[oó]n)\s*:?\s*/gi, ''))
      .map((s) => s.replace(/^[|•·,\s]+|[|•·,\s]+$/g, '').trim())
      .filter(Boolean);
    const rest = [];
    for (const s of segs) {
      if (!c.location && isLocation(s)) c.location = s;
      else if (/^(e-?mail|phone|tel|cell|linkedin|website|address)$/i.test(s)) continue;
      else rest.push(s);
    }
    take(l);
    if (rest.length) leftovers.push({ line: l, text: rest.join(' | ') });
  }
  // Name: first short, letters-only leftover.
  const nameIdx = leftovers.findIndex((x) => /^[\p{L}][\p{L}.'’ -]{1,48}$/u.test(x.text) && x.text.split(/\s+/).length >= 2 && x.text.split(/\s+/).length <= 6);
  const pickIdx = nameIdx >= 0 ? nameIdx : leftovers.findIndex((x) => x.text.length < 50);
  if (pickIdx >= 0) {
    let nm = leftovers[pickIdx].text;
    // Names wrapped onto two lines in a narrow sidebar ("María Elena" / "Rodríguez").
    const nx = leftovers[pickIdx + 1];
    const nameWords = nm.split(/\s+/).length;
    if (nx && nameWords <= 3 && /^[\p{Lu}][\p{L}'’-]+( [\p{Lu}][\p{L}'’-]+)?$/u.test(nx.text) && !TITLE_HINT.test(nx.text)
      && typeof nx.line.x === 'number' && Math.abs(nx.line.x - leftovers[pickIdx].line.x) < 2 && Math.abs((nx.line.size || 0) - (leftovers[pickIdx].line.size || 0)) < 1) {
      nm = `${nm} ${nx.text}`;
      leftovers.splice(pickIdx + 1, 1);
    }
    c.fullName = isAllCaps(nm) ? titleCase(nm) : nm;
    leftovers.splice(pickIdx, 1);
  }
  // Headline: next short leftover(s); long text becomes the summary.
  const headlineParts = [];
  const summaryParts = [];
  for (const x of leftovers) {
    if (x.text.length > 90 || /[.!?]$/.test(x.text) && x.text.length > 60) summaryParts.push(x.text);
    else if (headlineParts.length < 2 && !summaryParts.length) headlineParts.push(x.text);
    else summaryParts.push(x.text);
  }
  c.headline = headlineParts.map((h) => (isAllCaps(h) ? titleCase(h) : h)).join(' | ');
  if (summaryParts.length) resume.summary = summaryParts.join(' ');
  if (!c.fullName) report.warnings.push({ code: 'name-guess-failed' });
}

/** Group lines into entries: header lines + bullets. Shared by experience/education. */
function groupEntries(lines) {
  const xs = lines.filter((l) => typeof l.x === 'number').map((l) => l.x);
  const minX = xs.length ? Math.min(...xs) : null;
  const maxRight = Math.max(0, ...lines.filter((l) => typeof l.right === 'number').map((l) => l.right));
  const colW = minX !== null ? maxRight - minX : 0;
  const entries = [];
  let cur = null;
  let lastBulletLine = null;
  const startEntry = () => {
    cur = { head: [], bullets: [], hasDate: false };
    entries.push(cur);
    lastBulletLine = null;
  };
  for (const l of lines) {
    const t = l.text.trim();
    const hasRange = !!findDateRange(t);
    // A date range means an entry header, even if Word marked it as a list item.
    const explicit = (l.bullet || BULLET_RE.test(t)) && !hasRange;
    const indented = minX !== null && typeof l.x === 'number' && l.x > minX + 4;
    const isBulletish = explicit || (indented && !hasRange);
    if (!cur) startEntry();
    if (isBulletish) {
      const looksContinuation = !explicit && isWrapContinuation(lastBulletLine, l, maxRight);
      if (looksContinuation && cur.bullets.length) {
        cur.bullets[cur.bullets.length - 1].text += ` ${t}`;
        cur.bullets[cur.bullets.length - 1].lines.push(l);
      } else {
        cur.bullets.push({ text: cleanBullet(t), lines: [l] });
      }
      lastBulletLine = l;
      continue;
    }
    // Plain line.
    const long = t.length > 110 || (t.length > 70 && /[.;]$/.test(t));
    if (cur.bullets.length && !long) {
      // Wrapped continuation of a bullet in plain-text sources.
      const prev = cur.bullets[cur.bullets.length - 1];
      if (minX === null && /^[a-zà-ÿ]/.test(t) && !/[.!?]$/.test(prev.text)) {
        prev.text += ` ${t}`;
        prev.lines.push(l);
        continue;
      }
      startEntry();
    } else if (long && (cur.head.length || cur.bullets.length)) {
      cur.bullets.push({ text: cleanBullet(t), lines: [l] });
      lastBulletLine = l;
      continue;
    } else if ((hasRange && cur.hasDate) || cur.head.length >= 3) {
      startEntry();
    }
    cur.head.push(l);
    if (hasRange) cur.hasDate = true;
  }
  return entries.filter((e) => e.head.length || e.bullets.length);
}

function parseExperience(lines, take) {
  return groupEntries(lines).map((g) => {
    const e = emptyExperience();
    const texts = [];
    for (const l of g.head) {
      take(l);
      let t = l.text.trim().replace(BULLET_RE, '');
      const dr = findDateRange(t);
      if (dr && !e.startDate && !e.current) {
        e.startDate = dr.start;
        e.endDate = dr.end;
        e.current = dr.current;
        t = dr.rest;
      }
      texts.push(...segments(t));
    }
    // Pull location out of segments (also trailing ", City, ST").
    const rest = [];
    for (let s of texts) {
      if (!e.location && isLocation(s)) { e.location = s; continue; }
      const tl = TRAILING_LOC_RE.exec(s);
      if (!e.location && tl) {
        e.location = tl[1];
        s = s.slice(0, tl.index).trim();
      }
      if (/^(at|en)\s/i.test(s)) s = s.replace(/^(at|en)\s+/i, '');
      // "Title at Company" / "Title, Company"
      const at = /^(.+?)\s+(?:at|@|en)\s+(.+)$/i.exec(s);
      if (at && TITLE_HINT.test(at[1])) { rest.push(at[1], at[2]); continue; }
      if (s) rest.push(s);
    }
    if (rest.length === 1 && rest[0].includes(', ')) {
      const [a, ...b] = rest[0].split(', ');
      if (TITLE_HINT.test(a) || COMPANY_HINT.test(b.join(', '))) rest.splice(0, 1, a, b.join(', '));
    }
    let [a = '', b = '', ...more] = rest;
    const aIsCompany = COMPANY_HINT.test(a) && !TITLE_HINT.test(a);
    const bIsTitle = TITLE_HINT.test(b) && !COMPANY_HINT.test(b);
    if ((aIsCompany || isAllCaps(a)) && (bIsTitle || (b && !isAllCaps(b) && !TITLE_HINT.test(a)))) [a, b] = [b, a];
    e.title = isAllCaps(a) ? titleCase(a) : a;
    e.company = isAllCaps(b) ? titleCase(b) : b;
    if (more.length) {
      const extra = more.join(', ');
      if (!e.location && isLocation(extra)) e.location = extra;
      else e.company = [e.company, extra].filter(Boolean).join(', ');
    }
    for (const b2 of g.bullets) {
      b2.lines.forEach(take);
      if (b2.text) e.bullets.push(emptyBullet(b2.text));
    }
    return e;
  });
}

function parseEducation(lines, take) {
  const out = [];
  let cur = null;
  const flush = () => { if (cur) out.push(cur); cur = null; };
  for (const l of lines) {
    take(l);
    let t = cleanBullet(l.text);
    const hasDegree = DEGREE_HINT.test(t);
    const hasSchool = SCHOOL_HINT.test(t);
    if (!cur || (hasDegree && cur.degree) || (hasSchool && cur.school && !hasDegree && cur.degree)) {
      flush();
      cur = emptyEducation();
    }
    const dr = findDateRange(t);
    if (dr) {
      if (!cur.startDate && !cur.endDate) { cur.startDate = dr.start; cur.endDate = dr.current ? '' : dr.end; }
      t = dr.rest;
    } else {
      const sd = findSingleDate(t);
      if (sd && !cur.endDate) { cur.endDate = sd.date; t = sd.rest; }
    }
    const segs = segments(t);
    for (let s of segs) {
      s = s.replace(/^[,;\s]+|[,;\s]+$/g, '');
      if (!s) continue;
      const tl = TRAILING_LOC_RE.exec(s);
      if (tl && !cur.location) { cur.location = tl[1]; s = s.slice(0, tl.index).trim(); }
      if (DEGREE_HINT.test(s) && !cur.degree) { cur.degree = s; continue; }
      if (!cur.location && isLocation(s)) { cur.location = s; continue; }
      if (SCHOOL_HINT.test(s) && !cur.school) cur.school = s;
      else if (!cur.degree && !SCHOOL_HINT.test(s) && s.length < 90 && !/^(gpa|honors|cum laude|promedio)/i.test(s)) cur.degree = s;
      else if (!cur.school && s.length < 90 && !/^(gpa|honors|promedio)/i.test(s)) cur.school = s;
      else cur.details = [cur.details, s].filter(Boolean).join('; ');
    }
  }
  flush();
  return out.filter((e) => e.degree || e.school || e.details);
}

function parseCertifications(lines, take) {
  return parseItems(lines, take).map((t) => {
    const c = emptyCertification();
    let s = t;
    const dr = findDateRange(s);
    if (dr) { c.date = dr.current ? dr.start : `${dr.start} – ${dr.end}`; s = dr.rest; } else {
      const sd = findSingleDate(s);
      if (sd) { c.date = sd.date; s = sd.rest; }
    }
    s = s.replace(/[,(\s–—-]+$/, '').replace(/\(\s*\)/g, '').trim();
    const parts = s.split(/\s+[–—-]\s+|\s*\|\s*/);
    if (parts.length >= 2) {
      c.name = parts[0].trim();
      c.issuer = parts.slice(1).join(' - ').replace(/^[,\s]+|[,\s]+$/g, '');
    } else {
      const comma = s.lastIndexOf(', ');
      if (comma > 0 && s.length - comma < 40) {
        c.name = s.slice(0, comma).trim();
        c.issuer = s.slice(comma + 2).trim();
      } else c.name = s;
    }
    return c;
  }).filter((c) => c.name);
}

/** Bullet-or-line items with continuation merging. */
function parseItems(lines, take) {
  const items = [];
  const xs = lines.filter((l) => typeof l.x === 'number').map((l) => l.x);
  const minX = xs.length ? Math.min(...xs) : null;
  const maxRight = Math.max(0, ...lines.filter((l) => typeof l.right === 'number').map((l) => l.right));
  let prev = null;
  for (const l of lines) {
    take(l);
    const t = l.text.trim();
    const explicit = l.bullet || BULLET_RE.test(t);
    if (items.length && !explicit && isWrapContinuation(prev, l, maxRight)) items[items.length - 1] += ` ${t}`;
    else items.push(cleanBullet(t));
    prev = l;
  }
  return items.filter(Boolean);
}

function parseList(lines, take) {
  const out = [];
  for (const l of lines) {
    take(l);
    let t = l.text.replace(BULLET_RE, '').trim();
    // Drop short "Category:" prefixes but keep the items.
    t = t.replace(/^([\p{L} &/]{2,30}):\s+/u, (m, p) => (p.split(/\s+/).length <= 3 ? '' : m));
    for (const part of t.split(/\s*[,;•|·▪●]\s*|\s{3,}|\s+\/\s+/)) {
      const s = part.replace(/^[-–—\s/]+|[.\s/|]+$/g, '').trim();
      if (s && !out.includes(s)) out.push(s);
    }
  }
  return out;
}
