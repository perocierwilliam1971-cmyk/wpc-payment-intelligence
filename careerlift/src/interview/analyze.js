// Reads the customer's own resume the way an interviewer would and predicts
// the questions they are most likely to be pushed on: their numbers, their
// gaps, short jobs, a career change, why they're leaving, bilingual checks.
// Pure rules over the resume model — no AI, nothing leaves the device.

const MONTHS = {
  jan: 1, january: 1, ene: 1, enero: 1, feb: 2, february: 2, febrero: 2, mar: 3, march: 3, marzo: 3,
  apr: 4, april: 4, abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, june: 6, junio: 6, jul: 7, july: 7, julio: 7,
  aug: 8, august: 8, ago: 8, agosto: 8, sep: 9, sept: 9, september: 9, septiembre: 9, setiembre: 9, set: 9,
  oct: 10, october: 10, octubre: 10, nov: 11, november: 11, noviembre: 11, dec: 12, december: 12, dic: 12, diciembre: 12,
};

/** "Mar 2019" | "03/2019" | "2019" | "Enero de 2018" -> months since year 0, or null. */
export function parseDate(s, { end = false } = {}) {
  const t = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (!t) return null;
  let m = /(\d{1,2})\s*[/.-]\s*((?:19|20)\d{2})/.exec(t);
  if (m) return Number(m[2]) * 12 + (Number(m[1]) - 1);
  m = /([a-z]+)\.?\s*(?:de\s+|del\s+|,\s*)?((?:19|20)\d{2})/.exec(t);
  if (m && MONTHS[m[1]]) return Number(m[2]) * 12 + (MONTHS[m[1]] - 1);
  m = /((?:19|20)\d{2})/.exec(t);
  // A bare year: assume the start of the year for start dates, the end for end dates.
  if (m) return Number(m[1]) * 12 + (end ? 11 : 0);
  return null;
}

const nowMonths = (now = new Date()) => now.getFullYear() * 12 + now.getMonth();
const fmtMonths = (n, es) => {
  const y = Math.floor(n / 12);
  const mo = n % 12;
  const parts = [];
  if (y) parts.push(es ? `${y} año${y > 1 ? 's' : ''}` : `${y} year${y > 1 ? 's' : ''}`);
  if (mo) parts.push(es ? `${mo} mes${mo > 1 ? 'es' : ''}` : `${mo} month${mo > 1 ? 's' : ''}`);
  return parts.join(es ? ' y ' : ' and ') || (es ? 'menos de un mes' : 'less than a month');
};
const yearOf = (m) => Math.floor(m / 12);

/** Jobs with parsed spans, newest first. */
export function jobSpans(resume, now = new Date()) {
  return resume.experience
    .map((e) => {
      const start = parseDate(e.startDate);
      const end = e.current ? nowMonths(now) : parseDate(e.endDate, { end: true });
      return { e, start, end: end ?? start };
    })
    .filter((j) => j.start !== null)
    .sort((a, b) => b.start - a.start);
}

/** Gaps of 6+ months between jobs, and since the last job ended. */
export function findGaps(resume, now = new Date(), minMonths = 6) {
  const spans = jobSpans(resume, now);
  if (!spans.length) return [];
  const gaps = [];
  const latestEnd = Math.max(...spans.map((s) => s.end));
  const since = nowMonths(now) - latestEnd;
  if (!spans.some((s) => s.e.current) && since >= minMonths) gaps.push({ from: latestEnd, to: nowMonths(now), months: since, open: true });
  // Merge overlapping jobs, then look for holes.
  const asc = [...spans].sort((a, b) => a.start - b.start);
  let coveredTo = asc[0].end;
  for (const s of asc.slice(1)) {
    const hole = s.start - coveredTo - 1;
    if (hole >= minMonths) gaps.push({ from: coveredTo, to: s.start, months: hole, open: false, before: s.e });
    coveredTo = Math.max(coveredTo, s.end);
  }
  return gaps;
}

const STOP = new Set('and or of the a an for to in at with y de del la el los las en para con un una senior junior sr jr i ii iii'.split(' '));
const words = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** True when the target role shares no meaningful words with recent job titles. */
export function isCareerChange(resume, targetRole) {
  if (!targetRole?.trim() || !resume.experience.length) return false;
  const target = new Set(words(targetRole));
  if (!target.size) return false;
  const recent = resume.experience.slice(0, 3).flatMap((e) => words(e.title));
  return !recent.some((w) => target.has(w));
}

const hasLang = (resume, re) => resume.languages.some((l) => re.test(l));
export function isBilingual(resume) {
  return hasLang(resume, /(spanish|español|espanol)/i) && hasLang(resume, /(english|inglés|ingles)/i);
}

const Q = (id, kind, en, es, whyEn, whyEs, extra = {}) => ({ id, kind, q: { en, es }, why: { en: whyEn, es: whyEs }, ...extra });
const short = (s, n = 90) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);

/**
 * Predict personalized questions.
 * @param resume normalized resume
 * @param opts { targetRole, company, now }
 * @returns [{ id, kind, q:{en,es}, why:{en,es}, playbook?, source? }]
 */
export function predictQuestions(resume, opts = {}) {
  const now = opts.now || new Date();
  const out = [];
  const target = opts.targetRole?.trim();
  const roleEn = target || 'this role';
  const roleEs = target || 'este puesto';
  const latest = resume.experience.find((e) => e.title || e.company);

  // 1. Opening — tailored to their headline and latest job.
  if (latest) {
    out.push(Q('intro', 'opening',
      `Tell me about yourself — and how your time as ${latest.title || 'a'}${latest.company ? ` at ${latest.company}` : ''} prepares you for ${roleEn}.`,
      `Háblame de ti y de cómo tu experiencia como ${latest.title || '[puesto]'}${latest.company ? ` en ${latest.company}` : ''} te prepara para ${roleEs}.`,
      'Almost every interview opens with this. They want a 60–90 second story: present, past, future.',
      'Casi toda entrevista comienza así. Esperan una historia de 60 a 90 segundos: presente, pasado y futuro.'));
  }

  // 2. Your numbers — interviewers test every metric on the page.
  const metricBullets = [];
  const plainBullets = [];
  resume.experience.forEach((e) => e.bullets.forEach((b) => {
    const t = b.text.trim();
    if (!t) return;
    (/\d/.test(t) ? metricBullets : plainBullets).push({ e, t });
  }));
  metricBullets.slice(0, 4).forEach(({ e, t }, i) => out.push(Q(`metric-${i}`, 'metric',
    `Your resume says: “${short(t)}”. How did you measure that, and what was your personal role versus the team’s?`,
    `Tu resumé dice: “${short(t)}”. ¿Cómo lo mediste y cuál fue tu papel personal frente al del equipo?`,
    'Every number on your resume is a question waiting to happen. Know the before, the after, how it was measured, and exactly what YOU did.',
    'Cada cifra en tu resumé es una pregunta. Debes saber el antes, el después, cómo se midió y qué hiciste TÚ exactamente.',
    { source: e.company || e.title })));
  plainBullets.slice(0, metricBullets.length >= 3 ? 1 : 3).forEach(({ e, t }, i) => out.push(Q(`detail-${i}`, 'detail',
    `Walk me through this: “${short(t)}”. What was the situation and what was the result?`,
    `Explícame esto: “${short(t)}”. ¿Cuál era la situación y cuál fue el resultado?`,
    'Lines without a result invite follow-up. Prepare a STAR story with a concrete outcome.',
    'Las líneas sin resultado provocan preguntas. Prepara una historia STAR con un resultado concreto.',
    { source: e.company || e.title })));

  // 3. Gaps
  const es = false;
  for (const [i, g] of findGaps(resume, now).entries()) {
    const len = fmtMonths(g.months, es);
    const lenEs = fmtMonths(g.months, true);
    out.push(Q(`gap-${i}`, 'gap',
      g.open ? `I see you haven’t been working for about ${len}. What have you been doing?` : `There’s a gap of about ${len} around ${yearOf(g.from)}–${yearOf(g.to)}. What happened during that time?`,
      g.open ? `Veo que llevas cerca de ${lenEs} sin trabajar. ¿Qué has estado haciendo?` : `Hay una pausa de cerca de ${lenEs} entre ${yearOf(g.from)} y ${yearOf(g.to)}. ¿Qué pasó en ese tiempo?`,
      'Gaps are normal; unexplained gaps worry employers. A calm 2–3 sentence answer that ends on why you are ready now removes the concern.',
      'Las pausas son normales; las que no se explican preocupan. Una respuesta tranquila de 2 o 3 oraciones que termine en por qué estás listo/a ahora elimina la duda.',
      { playbook: 'gap' }));
  }

  // 4. Short tenures (< 12 months, finished)
  jobSpans(resume, now).filter((s) => !s.e.current && s.end - s.start + 1 < 12).slice(0, 2).forEach((s, i) => out.push(Q(`short-${i}`, 'short',
    `You were at ${s.e.company || 'that job'} for about ${fmtMonths(s.end - s.start + 1, false)}. Why did you leave so soon?`,
    `Estuviste en ${s.e.company || 'ese empleo'} cerca de ${fmtMonths(s.end - s.start + 1, true)}. ¿Por qué te fuiste tan pronto?`,
    'They are checking whether you will stay. Give an honest, brief reason, never criticize the employer, and show what you look for now.',
    'Quieren saber si te quedarás. Da una razón honesta y breve, nunca critiques al patrono y explica lo que buscas ahora.',
    { playbook: 'short' })));

  // 5. Why leaving the current job
  const current = resume.experience.find((e) => e.current);
  if (current) {
    out.push(Q('leaving', 'leaving',
      `Why are you looking to leave ${current.company || 'your current job'}?`,
      `¿Por qué quieres dejar ${current.company || 'tu empleo actual'}?`,
      'Focus on what you are moving toward (growth, the role, the company), not what you are running from.',
      'Enfócate en lo que buscas (crecimiento, el puesto, la empresa), no en lo que dejas atrás.',
      { playbook: 'leaving' }));
  }

  // 6. Career change
  if (isCareerChange(resume, target)) {
    out.push(Q('change', 'change',
      `Your background is in ${latest?.title || 'a different field'}. Why ${target}, and why should we take a chance on you?`,
      `Tu experiencia es como ${latest?.title || 'otro campo'}. ¿Por qué ${target} y por qué deberíamos darte la oportunidad?`,
      'Connect 2–3 transferable skills to the new role with proof, and show you have already invested in learning it.',
      'Conecta 2 o 3 destrezas transferibles con el nuevo puesto, con evidencia, y demuestra que ya has invertido en aprenderlo.',
      { playbook: 'change' }));
  }

  // 7. Bilingual verification
  if (isBilingual(resume)) {
    out.push(Q('bilingual', 'bilingual',
      '(Asked in Spanish) “Cuéntame en español sobre un cliente difícil y cómo lo atendiste.”',
      '(En inglés) “Tell me in English about a difficult customer and how you handled them.”',
      'If your resume says bilingual, expect them to switch languages without warning. Practice the same story in both languages.',
      'Si tu resumé dice bilingüe, espera que cambien de idioma sin aviso. Practica la misma historia en ambos idiomas.',
      { playbook: 'bilingual' }));
  }

  // 8. Always: salary and weakness — the two most-dreaded questions.
  out.push(Q('salary', 'salary', 'What are your salary expectations?', '¿Cuáles son tus expectativas salariales?',
    'Research the range first. Answering with a researched range protects you from underselling.',
    'Investiga el rango primero. Contestar con un rango investigado evita que te subestimes.',
    { playbook: 'salary' }));
  out.push(Q('weakness', 'weakness', 'What is your greatest weakness?', '¿Cuál es tu mayor debilidad?',
    'They test self-awareness. A real, non-critical weakness plus what you are doing about it.',
    'Evalúan tu autoconocimiento. Una debilidad real, no crítica, y lo que haces para mejorarla.',
    { playbook: 'weakness' }));

  // No experience at all: recent graduate path.
  if (!resume.experience.length) {
    out.push(Q('nograd', 'detail',
      'You don’t have much work experience yet. Tell me about a project, class or volunteer role where you solved a real problem.',
      'Aún no tienes mucha experiencia laboral. Háblame de un proyecto, clase o voluntariado donde resolviste un problema real.',
      'School, volunteer and family responsibilities count. Use STAR and a concrete result.',
      'La escuela, el voluntariado y las responsabilidades familiares cuentan. Usa STAR y un resultado concreto.'));
  }
  return out;
}
