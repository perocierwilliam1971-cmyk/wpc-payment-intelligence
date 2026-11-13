// Achievement Detective™ Lite — structured writing rules, no AI.
//
// Golden rule: the writer only REPHRASES what the customer supplied. It never
// adds numbers, employers, tools, results or qualifications. If there is no
// metric, it suggests the customer add one — it does not invent one.

// --- English verb tools ---------------------------------------------------
const IRREGULAR_PAST = {
  lead: 'led', build: 'built', run: 'ran', teach: 'taught', write: 'wrote', make: 'made', drive: 'drove', grow: 'grew',
  sell: 'sold', win: 'won', bring: 'brought', buy: 'bought', think: 'thought', keep: 'kept', hold: 'held', meet: 'met',
  set: 'set', cut: 'cut', put: 'put', give: 'gave', take: 'took', speak: 'spoke', handle: 'handled', oversee: 'oversaw',
  undertake: 'undertook', get: 'got', find: 'found', send: 'sent', spend: 'spent', begin: 'began', do: 'did', see: 'saw',
  feed: 'fed', deal: 'dealt', understand: 'understood', draw: 'drew', choose: 'chose', fight: 'fought', rebuild: 'rebuilt',
  shut: 'shut', split: 'split', spread: 'spread', forecast: 'forecast', mentor: 'mentored', co: 'co',
};
const PAST_TO_BASE = Object.fromEntries(Object.entries(IRREGULAR_PAST).map(([b, p]) => [p, b]));

function pastOf(base) {
  const b = base.toLowerCase();
  if (IRREGULAR_PAST[b]) return IRREGULAR_PAST[b];
  if (b.endsWith('e')) return `${b}d`;
  if (/[^aeiou]y$/.test(b)) return `${b.slice(0, -1)}ied`;
  if (/^(plan|ship|stop|drop|commit|control|equip|admit|transfer|occur|prefer|refer|submit|patrol)$/.test(b)) return `${b}${b.slice(-1)}ed`;
  return `${b}ed`;
}

/** "managing" -> "manage"; "manages" -> "manage"; best effort. */
function baseFromGerund(g) {
  const w = g.toLowerCase();
  const special = { leading: 'lead', building: 'build', running: 'run', planning: 'plan', shipping: 'ship', writing: 'write', making: 'make', driving: 'drive', handling: 'handle', managing: 'manage', coordinating: 'coordinate', creating: 'create', preparing: 'prepare', providing: 'provide', serving: 'serve', using: 'use', reducing: 'reduce', improving: 'improve', resolving: 'resolve', organizing: 'organize', scheduling: 'schedule', training: 'train', supervising: 'supervise', overseeing: 'oversee', developing: 'develop', processing: 'process', assisting: 'assist', supporting: 'support', answering: 'answer', maintaining: 'maintain', monitoring: 'monitor', ensuring: 'ensure', analyzing: 'analyze', implementing: 'implement', delivering: 'deliver', designing: 'design', negotiating: 'negotiate', operating: 'operate', administering: 'administer', conducting: 'conduct', directing: 'direct', executing: 'execute', facilitating: 'facilitate', generating: 'generate', helping: 'help', increasing: 'increase', launching: 'launch', mentoring: 'mentor', producing: 'produce', recruiting: 'recruit', selling: 'sell', teaching: 'teach', tracking: 'track', updating: 'update', working: 'work', partnering: 'partner', taking: 'take', giving: 'give', closing: 'close', opening: 'open', cleaning: 'clean', stocking: 'stock', greeting: 'greet', cooking: 'cook', caring: 'care', driving_: 'drive' };
  if (special[w]) return special[w];
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    if (/([bcdfghjklmnprstvz])\1$/.test(stem)) return stem.slice(0, -1);
    return stem;
  }
  return w;
}

function baseFromPast(w) {
  const candidates = [w.slice(0, -1), w.slice(0, -2), w.replace(/ied$/, 'y'), w.slice(0, -3)];
  return candidates.find((c) => c && pastOf(c) === w) || w.slice(0, -2);
}

function baseFromThird(w) {
  const x = w.toLowerCase();
  if (/ies$/.test(x)) return `${x.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes|zes)$/.test(x)) return x.slice(0, -2);
  if (/oes$/.test(x)) return x.slice(0, -2);
  if (/s$/.test(x) && !/ss$/.test(x)) return x.slice(0, -1);
  return x;
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// --- Verb strength ----------------------------------------------------------
export const STRONG_VERBS = {
  en: ['achieved', 'accelerated', 'built', 'championed', 'coached', 'completed', 'coordinated', 'created', 'cut', 'decreased', 'delivered', 'designed', 'developed', 'directed', 'drove', 'eliminated', 'established', 'exceeded', 'expanded', 'generated', 'grew', 'implemented', 'improved', 'increased', 'introduced', 'launched', 'led', 'managed', 'mentored', 'negotiated', 'organized', 'oversaw', 'planned', 'produced', 'raised', 'recruited', 'redesigned', 'reduced', 'resolved', 'restructured', 'saved', 'secured', 'simplified', 'streamlined', 'supervised', 'trained', 'transformed', 'won', 'wrote', 'analyzed', 'automated', 'administered', 'processed', 'served', 'handled', 'maintained', 'prepared', 'scheduled', 'recognized', 'selected', 'promoted', 'awarded', 'partnered', 'lead', 'manage', 'supervise', 'coordinate', 'train', 'develop', 'oversee', 'partner', 'direct', 'plan', 'build', 'design', 'deliver', 'create', 'improve', 'maintain', 'process', 'serve', 'prepare', 'analyze', 'handle', 'administer'],
  es: ['logré', 'aumenté', 'reduje', 'dirigí', 'gestioné', 'coordiné', 'supervisé', 'implementé', 'desarrollé', 'diseñé', 'creé', 'lancé', 'negocié', 'organicé', 'planifiqué', 'mejoré', 'optimicé', 'capacité', 'adiestré', 'entrené', 'establecí', 'generé', 'superé', 'resolví', 'administré', 'lideré', 'preparé', 'atendí', 'procesé', 'analicé', 'automaticé', 'ahorré', 'eliminé', 'simplifiqué', 'transformé', 'obtuve', 'completé', 'entregué', 'manejé', 'mantuve', 'recluté', 'fui seleccionado', 'fui seleccionada', 'recibí', 'gané', 'dirijo', 'gestiono', 'coordino', 'superviso', 'lidero', 'administro', 'desarrollo', 'atiendo', 'manejo', 'preparo'],
};

const WEAK_EN = [
  { re: /^(i\s+)?(was\s+)?responsible\s+for\s+/i, kind: 'responsible' },
  { re: /^(my\s+)?(duties|responsibilities|tasks)\s+(included|include|were|are)\s*:?\s*/i, kind: 'duties' },
  { re: /^(i\s+)?(was\s+)?in\s+charge\s+of\s+/i, kind: 'responsible' },
  { re: /^(i\s+)?worked\s+on\s+/i, kind: 'workedon' },
  { re: /^(i\s+)?helped\s+(to\s+)?/i, kind: 'helped' },
  { re: /^(i\s+)?assisted\s+with\s+/i, kind: 'helped' },
  { re: /^(i\s+)?was\s+tasked\s+with\s+/i, kind: 'responsible' },
  { re: /^(i\s+)?handled\s+/i, kind: 'handled' },
];

const WEAK_ES = [
  { re: /^(yo\s+)?(era\s+|fui\s+)?(el\s+|la\s+)?(responsable|encargad[oa])\s+de\s+(la\s+|el\s+|los\s+|las\s+)?/i, kind: 'responsible' },
  { re: /^(mis\s+)?(funciones|tareas|deberes|responsabilidades)\s+(inclu[ií]an|incluyen|eran|son)\s*:?\s*/i, kind: 'duties' },
  { re: /^(yo\s+)?ayud[eé]\s+(a\s+|con\s+)?/i, kind: 'helped' },
  { re: /^(yo\s+)?trabaj[eé]\s+en\s+/i, kind: 'workedon' },
  { re: /^(yo\s+)?estaba\s+a\s+cargo\s+de\s+/i, kind: 'responsible' },
];

const METRIC_RE = /(\d[\d,.]*\s*(%|percent|por\s?ciento|k\b|m\b|million|millones|mil\b)?|\$\s?\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|hundred|thousand|dozen|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|quince|veinte|cien|mil)\b)/i;

// --- Spanish conjugation (infinitive -> preterite, 1st person) --------------
const ES_IRREGULAR = {
  hacer: 'hice', reducir: 'reduje', conducir: 'conduje', producir: 'produje', traducir: 'traduje', introducir: 'introduje',
  tener: 'tuve', mantener: 'mantuve', obtener: 'obtuve', poner: 'puse', proponer: 'propuse', componer: 'compuse',
  dirigir: 'dirigí', ir: 'fui', ser: 'fui', dar: 'di', estar: 'estuve', poder: 'pude', saber: 'supe', traer: 'traje',
  decir: 'dije', venir: 'vine', querer: 'quise', construir: 'construí', distribuir: 'distribuí', contribuir: 'contribuí', incluir: 'incluí',
  atender: 'atendí', resolver: 'resolví', establecer: 'establecí', crecer: 'crecí', ofrecer: 'ofrecí', fortalecer: 'fortalecí',
};
export function esPreterite(inf) {
  const v = inf.toLowerCase();
  if (ES_IRREGULAR[v]) return ES_IRREGULAR[v];
  if (v.endsWith('car')) return `${v.slice(0, -3)}qué`;
  if (v.endsWith('gar')) return `${v.slice(0, -3)}gué`;
  if (v.endsWith('zar')) return `${v.slice(0, -3)}cé`;
  if (v.endsWith('ar')) return `${v.slice(0, -2)}é`;
  if (v.endsWith('er') || v.endsWith('ir')) return `${v.slice(0, -2)}í`;
  return v;
}
/** Preterite 1st person -> present 1st person for a current role (regular -ar/-er/-ir). */
function esPresentFromInf(inf) {
  const v = inf.toLowerCase();
  const irr = { dirigir: 'dirijo', hacer: 'hago', reducir: 'reduzco', conducir: 'conduzco', producir: 'produzco', tener: 'tengo', mantener: 'mantengo', obtener: 'obtengo', poner: 'pongo', atender: 'atiendo', resolver: 'resuelvo', establecer: 'establezco', ofrecer: 'ofrezco', construir: 'construyo', distribuir: 'distribuyo', incluir: 'incluyo', introducir: 'introduzco' };
  if (irr[v]) return irr[v];
  return `${v.slice(0, -2)}o`;
}

// --- Scoring ------------------------------------------------------------------
export function scoreBullet(text, lang = 'en') {
  const t = String(text || '').trim();
  const L = lang.startsWith('es') ? 'es' : 'en';
  const words = t.split(/\s+/).filter(Boolean);
  const first = (words[0] || '').toLowerCase().replace(/[^a-záéíóúñü]/g, '');
  const firstTwo = words.slice(0, 2).join(' ').toLowerCase();
  const weak = (L === 'es' ? WEAK_ES : WEAK_EN).find((w) => w.re.test(t));
  const strongVerb = STRONG_VERBS[L].includes(first) || STRONG_VERBS[L].includes(firstTwo);
  const hasMetric = METRIC_RE.test(t);
  const firstPerson = L === 'es' ? /^(yo)\b/i.test(t) : /^(i|my|me)\b/i.test(t);
  const len = words.length;
  let score = 40;
  if (strongVerb) score += 20;
  if (hasMetric) score += 25;
  if (len >= 8 && len <= 32) score += 15;
  if (weak) score -= 20;
  if (firstPerson) score -= 10;
  if (len < 5) score -= 15;
  if (len > 40) score -= 10;
  score = Math.max(0, Math.min(100, score));
  const tips = [];
  if (!hasMetric) tips.push('addMetric');
  if (!strongVerb && !weak) tips.push('startWithVerb');
  if (weak) tips.push('removeWeakPhrase');
  if (len > 32) tips.push('shorten');
  if (len < 6) tips.push('addResult');
  return { score, strongVerb, hasMetric, weak: weak?.kind || null, firstPerson, words: len, tips };
}

// --- Improve an existing bullet ---------------------------------------------
/**
 * Returns { improved, changed, changes:[codes], tips:[codes], before, after }
 * `current` = true uses present tense (convention for a current job).
 */
export function improveBullet(text, { lang = 'en', current = false } = {}) {
  const original = String(text || '').trim();
  const L = lang.startsWith('es') ? 'es' : 'en';
  let t = original.replace(/^[•●▪■◦\-–—*]+\s*/, '').replace(/\s+/g, ' ').trim();
  const changes = [];
  if (!t) return { improved: '', changed: false, changes, tips: [], before: scoreBullet(original, L), after: scoreBullet('', L) };

  if (L === 'en') {
    // First person
    if (/^i\s+/i.test(t)) { t = t.replace(/^i\s+/i, ''); changes.push('removedFirstPerson'); }
    // Weak openers
    for (const w of WEAK_EN) {
      const m = w.re.exec(t);
      if (!m) continue;
      let rest = t.slice(m[0].length);
      if (w.kind === 'responsible' || w.kind === 'duties' || w.kind === 'workedon') {
        // "Responsible for managing X" -> "Managed X"; "Responsible for payroll" -> "Managed payroll"
        const g = /^([a-z]+ing)\b\s*(.*)$/i.exec(rest);
        if (g) rest = `${verbForm(baseFromGerund(g[1]), current)} ${g[2]}`;
        else rest = `${verbForm('manage', current)} ${rest}`;
        changes.push('replacedWeakOpener');
      } else if (w.kind === 'helped') {
        // Keep the meaning: helping is supporting, not leading.
        rest = `${verbForm('support', current)} ${rest.replace(/^(with|in)\s+/i, '')}`;
        const g = /^(\w+)\s+([a-z]+ing)\b\s*(.*)$/i.exec(rest);
        if (g) rest = `${g[1]} ${g[2]} ${g[3]}`;
        changes.push('replacedWeakOpener');
      } else if (w.kind === 'handled') {
        rest = `${verbForm('manage', current)} ${rest}`;
        changes.push('replacedWeakOpener');
      }
      t = rest;
      break;
    }
    // Gerund / 3rd-person / tense consistency
    const fw = /^([A-Za-z]+)\b(.*)$/.exec(t);
    if (fw) {
      const [, w, rest] = fw;
      const lw = w.toLowerCase();
      let base = null;
      if (/ing$/.test(lw) && lw.length > 5) base = baseFromGerund(lw);
      else if (/s$/.test(lw) && STRONG_VERBS.en.includes(baseFromThird(lw))) base = baseFromThird(lw);
      else if (current && (PAST_TO_BASE[lw] || (/ed$/.test(lw) && STRONG_VERBS.en.includes(lw)))) base = PAST_TO_BASE[lw] || baseFromPast(lw);
      else if (!current && STRONG_VERBS.en.includes(lw) && !/ed$/.test(lw) && !Object.values(IRREGULAR_PAST).includes(lw)) base = lw;
      if (base) {
        const nv = verbForm(base, current);
        if (nv.toLowerCase() !== lw) { t = nv + rest; changes.push(current ? 'presentTense' : 'pastTense'); }
      }
    }
  } else {
    if (/^yo\s+/i.test(t)) { t = t.replace(/^yo\s+/i, ''); changes.push('removedFirstPerson'); }
    for (const w of WEAK_ES) {
      const m = w.re.exec(t);
      if (!m) continue;
      let rest = t.slice(m[0].length);
      const inf = /^([a-záéíóúñ]+(?:ar|er|ir))\b\s*(.*)$/i.exec(rest);
      if (inf) rest = `${current ? esPresentFromInf(inf[1]) : esPreterite(inf[1])} ${inf[2]}`;
      else if (w.kind === 'helped') rest = `${current ? 'Apoyo' : 'Apoyé'} ${rest.replace(/^(a|con|en)\s+/i, '')}`;
      else rest = `${current ? 'Gestiono' : 'Gestioné'} ${rest}`;
      t = rest;
      changes.push('replacedWeakOpener');
      break;
    }
    // Infinitive start ("Coordinar eventos") -> conjugated
    const inf = /^([A-Za-záéíóúñ]+(?:ar|er|ir))\b(.*)$/.exec(t);
    if (inf && !changes.includes('replacedWeakOpener') && inf[1].length > 4) {
      t = (current ? esPresentFromInf(inf[1]) : esPreterite(inf[1])) + inf[2];
      changes.push(current ? 'presentTense' : 'pastTense');
    }
  }

  t = t.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
  if (/\.$/.test(t) && !/\b(etc|inc|corp|ltd|co)\.$/i.test(t)) { t = t.slice(0, -1); if (!changes.includes('trimmedPeriod')) changes.push('trimmedPeriod'); }
  t = cap(t);
  const before = scoreBullet(original, L);
  const after = scoreBullet(t, L);
  return { improved: t, changed: t !== original, changes, tips: after.tips, before, after };
}

function verbForm(base, current) {
  return cap(current ? base : pastOf(base));
}

// --- Fill question templates -----------------------------------------------
/**
 * Template syntax: "Exceeded targets[ by {pct}%][ in {period}]"
 * Bracketed segments render only if every {field} inside is filled.
 * A bare {field} outside brackets is required; if empty, returns ''.
 */
export function fillTemplate(tpl, values = {}) {
  const val = (k) => cleanValue(k, values[k]);
  const segRe = /\[([^\]]*)\]/g;
  let out = tpl.replace(segRe, (m, inner) => {
    const keys = [...inner.matchAll(/\{(\w+)\}/g)].map((x) => x[1]);
    if (keys.some((k) => !val(k))) return '';
    return inner.replace(/\{(\w+)\}/g, (_, k) => val(k));
  });
  const required = [...out.matchAll(/\{(\w+)\}/g)].map((x) => x[1]);
  if (required.some((k) => !val(k))) return '';
  out = out.replace(/\{(\w+)\}/g, (_, k) => val(k));
  return cap(out.replace(/\s+/g, ' ').replace(/\s+([,.;:%])/g, '$1').replace(/\$\s+/g, '$').trim().replace(/[.,;]$/, ''));
}

function cleanValue(key, v) {
  let s = String(v ?? '').trim().replace(/[.]+$/, '');
  if (!s) return '';
  if (/pct|percent/i.test(key)) s = s.replace(/\s*(%|percent|por\s?ciento)$/i, '');
  if (/money|amount|revenue|savings|budget/i.test(key)) s = s.replace(/^\$\s*/, '');
  return s;
}

/** Statement generated from a question answer set. */
export function buildStatement(question, values, lang, current = false) {
  const L = lang.startsWith('es') ? 'es' : 'en';
  const tpls = question.tpl[L] || question.tpl.en;
  const list = Array.isArray(tpls) ? tpls : [tpls];
  for (const tp of list) {
    const s = fillTemplate(current && question.tplPresent?.[L] ? question.tplPresent[L] : tp, values);
    if (s) return current && !question.tplPresent ? improveBullet(s, { lang: L, current: true }).improved : s;
  }
  return '';
}
