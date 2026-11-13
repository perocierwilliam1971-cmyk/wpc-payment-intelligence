// Career Toolkit content (English + Spanish). Generators only use what the
// customer typed or what is already on their resume; anything we can't know
// is left as a visible [bracketed placeholder] instead of being invented.

import { isBlank } from '../core/util.js';

const lcFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const P = (en, es) => ({ en, es });

function latestJob(r) {
  return r.experience.find((e) => e.title || e.company) || null;
}

// ---------------------------------------------------------------------------
// Cover letter
export function coverLetter(r, input, lang) {
  const es = lang.startsWith('es');
  const name = r.contact.fullName || (es ? '[Tu nombre]' : '[Your name]');
  const company = input.company?.trim() || (es ? '[Empresa]' : '[Company]');
  const role = input.role?.trim() || (es ? '[Puesto]' : '[Position]');
  const manager = input.manager?.trim();
  const job = latestJob(r);
  const highlights = (input.highlights || []).filter((h) => !isBlank(h)).slice(0, 3);
  const why = input.why?.trim();
  const source = input.source?.trim();
  const date = new Date().toLocaleDateString(es ? (lang === 'es-PR' ? 'es-PR' : 'es') : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const out = [date, ''];
  if (es) {
    out.push(manager ? `Estimado/a ${manager}:` : 'Estimado equipo de reclutamiento:', '');
    out.push(`Le escribo para solicitar el puesto de ${role} en ${company}${source ? `, publicado en ${source}` : ''}.${r.contact.headline ? ` Como ${lcFirst(r.contact.headline)},` : ''}${job ? ` actualmente ${job.current ? 'me desempeño' : 'me desempeñé'} como ${job.title || '[puesto]'}${job.company ? ` en ${job.company}` : ''},` : ''} y me interesa aportar mi experiencia a su equipo.`.replace(/,\s*y me/, ' y me'));
    if (highlights.length) {
      out.push('', 'Algunos resultados de mi trayectoria:');
      for (const h of highlights) out.push(`• ${h}`);
    }
    out.push('', why ? `Me interesa ${company} porque ${lcFirst(why).replace(/\.$/, '')}.` : '[Añade una o dos oraciones sobre por qué te interesa esta empresa o este puesto.]');
    out.push('', 'Me encantaría conversar sobre cómo mi experiencia puede contribuir a los objetivos de su equipo. Gracias por su tiempo y consideración.', '', 'Atentamente,', '', name);
  } else {
    out.push(manager ? `Dear ${manager},` : 'Dear Hiring Manager,', '');
    out.push(`I am writing to apply for the ${role} position at ${company}${source ? `, which I found through ${source}` : ''}.${r.contact.headline ? ` As a ${r.contact.headline.replace(/\s*\|\s*/g, ' and ')},` : ''}${job ? ` I ${job.current ? 'currently work' : 'most recently worked'} as ${/^[aeiou]/i.test(job.title || '') ? 'an' : 'a'} ${job.title || '[title]'}${job.company ? ` at ${job.company}` : ''},` : ''} and I would welcome the chance to bring that experience to your team.`.replace(/,\s*and I would/, ' and I would'));
    if (highlights.length) {
      out.push('', 'A few results I am proud of:');
      for (const h of highlights) out.push(`• ${h}`);
    }
    out.push('', why ? `I am drawn to ${company} because ${lcFirst(why).replace(/\.$/, '')}.` : '[Add one or two sentences about why this company or role interests you.]');
    out.push('', 'I would appreciate the opportunity to discuss how my experience can support your goals. Thank you for your time and consideration.', '', 'Sincerely,', '', name);
  }
  if (r.contact.email || r.contact.phone) out.push([r.contact.phone, r.contact.email].filter(Boolean).join(' | '));
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Messages & follow-ups (templates with {placeholders} filled from inputs)
export const MESSAGES = [
  { id: 'connect', title: P('LinkedIn connection request (under 300 characters)', 'Solicitud de conexión en LinkedIn (menos de 300 caracteres)'), limit: 300,
    body: P('Hi {person}, I’m a {headline} interested in {company}. I’d value connecting and learning more about your team. Thank you!',
      'Hola, {person}: soy {headline} y me interesa {company}. Me encantaría conectar y conocer más sobre su equipo. ¡Gracias!') },
  { id: 'recruiter', title: P('Message to a recruiter', 'Mensaje a un reclutador'),
    body: P('Hi {person},\n\nI recently applied for the {role} position at {company} and wanted to introduce myself. I bring experience as a {headline}, and I believe my background fits what your team is looking for.\n\nI’ve attached my resume and would welcome a brief conversation at your convenience.\n\nThank you,\n{name}',
      'Hola, {person}:\n\nRecientemente solicité el puesto de {role} en {company} y quería presentarme. Cuento con experiencia como {headline} y creo que mi perfil encaja con lo que su equipo busca.\n\nAdjunto mi resumé y me encantaría conversar brevemente cuando le sea conveniente.\n\nGracias,\n{name}') },
  { id: 'referral', title: P('Ask a contact for a referral', 'Pedir un referido a un contacto'),
    body: P('Hi {person},\n\nI hope you’re doing well. I noticed {company} is hiring for a {role} and I’m very interested. Would you be comfortable referring me, or pointing me to the right person? I’m happy to send my resume and a short summary to make it easy.\n\nThanks so much,\n{name}',
      'Hola, {person}:\n\nEspero que estés bien. Vi que {company} busca un/a {role} y me interesa mucho. ¿Te sentirías cómodo/a refiriéndome o indicándome con quién hablar? Con gusto te envío mi resumé y un breve resumen para facilitarlo.\n\nMuchas gracias,\n{name}') },
  { id: 'informational', title: P('Request an informational conversation', 'Solicitar una conversación informativa'),
    body: P('Hi {person},\n\nI’m exploring a move into {role} roles and admire the work you do at {company}. Would you be open to a 15-minute call to share how you got started? I’d really appreciate your perspective.\n\nBest regards,\n{name}',
      'Hola, {person}:\n\nEstoy explorando un cambio hacia puestos de {role} y admiro tu trabajo en {company}. ¿Estarías dispuesto/a a una llamada de 15 minutos para contarme cómo comenzaste? Valoraría mucho tu perspectiva.\n\nSaludos cordiales,\n{name}') },
];

export const FOLLOWUPS = [
  { id: 'after-apply', title: P('One week after applying', 'Una semana después de solicitar'),
    body: P('Subject: Following up — {role} application\n\nHello {person},\n\nI applied for the {role} position at {company} on {date} and wanted to confirm my continued interest. I’m confident my experience as a {headline} would allow me to contribute quickly.\n\nPlease let me know if I can provide anything else.\n\nThank you,\n{name}',
      'Asunto: Seguimiento — solicitud para {role}\n\nSaludos, {person}:\n\nSolicité el puesto de {role} en {company} el {date} y quería reiterar mi interés. Estoy convencido/a de que mi experiencia como {headline} me permitiría aportar rápidamente.\n\nQuedo a su disposición para cualquier información adicional.\n\nGracias,\n{name}') },
  { id: 'thank-you', title: P('Thank-you note (within 24 hours of an interview)', 'Nota de agradecimiento (dentro de 24 horas de la entrevista)'),
    body: P('Subject: Thank you — {role} interview\n\nDear {person},\n\nThank you for taking the time to speak with me today about the {role} position. I enjoyed learning about [something specific you discussed], and our conversation confirmed my enthusiasm for joining {company}.\n\nPlease don’t hesitate to contact me if you need any additional information.\n\nBest regards,\n{name}',
      'Asunto: Gracias — entrevista para {role}\n\nEstimado/a {person}:\n\nGracias por su tiempo hoy para conversar sobre el puesto de {role}. Disfruté conocer más sobre [algo específico que conversaron] y nuestra conversación confirmó mi entusiasmo por unirme a {company}.\n\nNo dude en comunicarse conmigo si necesita información adicional.\n\nSaludos cordiales,\n{name}') },
  { id: 'status', title: P('Checking on status after an interview', 'Preguntar por el estatus después de la entrevista'),
    body: P('Subject: {role} — checking in\n\nHello {person},\n\nI wanted to follow up on my interview for the {role} position. I remain very interested in the opportunity and would be grateful for any update on your timeline.\n\nThank you again,\n{name}',
      'Asunto: {role} — seguimiento\n\nSaludos, {person}:\n\nLe escribo para dar seguimiento a mi entrevista para el puesto de {role}. Sigo muy interesado/a en la oportunidad y agradecería cualquier actualización sobre el proceso.\n\nGracias nuevamente,\n{name}') },
  { id: 'accept', title: P('Accepting an offer', 'Aceptar una oferta'),
    body: P('Subject: Offer acceptance — {role}\n\nDear {person},\n\nThank you for the offer for the {role} position. I am pleased to accept and look forward to starting on [start date]. Please let me know what you need from me before then.\n\nSincerely,\n{name}',
      'Asunto: Aceptación de oferta — {role}\n\nEstimado/a {person}:\n\nGracias por la oferta para el puesto de {role}. Me complace aceptarla y espero comenzar el [fecha de inicio]. Por favor, indíqueme qué necesita de mi parte antes de esa fecha.\n\nAtentamente,\n{name}') },
  { id: 'decline', title: P('Declining an offer politely', 'Rechazar una oferta con cortesía'),
    body: P('Subject: {role} offer\n\nDear {person},\n\nThank you very much for offering me the {role} position. After careful consideration, I have decided to decline. I truly appreciate your time and hope our paths cross again.\n\nBest wishes,\n{name}',
      'Asunto: Oferta para {role}\n\nEstimado/a {person}:\n\nMuchas gracias por ofrecerme el puesto de {role}. Luego de considerarlo cuidadosamente, he decidido declinar la oferta. Agradezco sinceramente su tiempo y espero que nuestros caminos vuelvan a cruzarse.\n\nMis mejores deseos,\n{name}') },
];

export function fillMessage(tpl, vals, lang) {
  const es = lang.startsWith('es');
  const ph = (k) => (es ? { person: '[nombre]', company: '[empresa]', role: '[puesto]', headline: '[tu título profesional]', name: '[tu nombre]', date: '[fecha]' } : { person: '[name]', company: '[company]', role: '[position]', headline: '[your professional title]', name: '[your name]', date: '[date]' })[k] || `[${k}]`;
  let s = tpl.replace(/\{(\w+)\}/g, (_, k) => (isBlank(vals[k]) ? ph(k) : String(vals[k]).trim()));
  // PR uses "resumé"; general Spanish "currículum".
  if (lang === 'es') s = s.replace(/resumé/g, 'currículum');
  return s;
}

// ---------------------------------------------------------------------------
// ATS checklist (automatic checks + manual items)
export function atsChecks(r, pageCount) {
  const bullets = r.experience.flatMap((e) => e.bullets.map((b) => b.text.trim()).filter(Boolean));
  const withNum = bullets.filter((b) => /\d/.test(b)).length;
  const jobsComplete = r.experience.length > 0 && r.experience.every((e) => e.title && e.company && (e.startDate || e.endDate || e.current));
  const first = bullets.filter((b) => /^(i|my|yo|mi)\b/i.test(b)).length;
  const checks = [
    { id: 'name', ok: !isBlank(r.contact.fullName), label: P('Full name at the top', 'Nombre completo al principio') },
    { id: 'email', ok: /@/.test(r.contact.email), label: P('Professional email address', 'Correo electrónico profesional') },
    { id: 'phone', ok: /\d{3}/.test(r.contact.phone), label: P('Phone number', 'Número de teléfono') },
    { id: 'location', ok: !isBlank(r.contact.location), label: P('City and state (no full street address needed)', 'Ciudad y estado/país (no hace falta la dirección completa)') },
    { id: 'summary', ok: r.summary.trim().split(/\s+/).length >= 15, label: P('A 2–4 sentence professional summary', 'Un resumen profesional de 2 a 4 oraciones') },
    { id: 'jobs', ok: jobsComplete, label: P('Every job has a title, employer and dates', 'Cada empleo tiene puesto, patrono y fechas') },
    { id: 'bullets', ok: r.experience.length > 0 && r.experience.every((e) => e.bullets.filter((b) => b.text.trim()).length >= 2), label: P('At least 2 achievement lines per job', 'Al menos 2 líneas de logros por empleo') },
    { id: 'metrics', ok: bullets.length > 0 && withNum / bullets.length >= 0.3, label: P('Numbers in at least 30% of achievement lines', 'Cifras en al menos el 30% de las líneas de logros'), detail: bullets.length ? `${withNum}/${bullets.length}` : '' },
    { id: 'firstperson', ok: first === 0, label: P('No “I” or “my” at the start of lines', 'Sin “yo” o “mi” al comienzo de las líneas') },
    { id: 'skills', ok: r.skills.length >= 6, label: P('At least 6 relevant skills listed', 'Al menos 6 habilidades relevantes') },
    { id: 'length', ok: pageCount <= 2, label: P('Two pages or fewer', 'Dos páginas o menos'), detail: pageCount ? `${pageCount}` : '' },
  ];
  return checks;
}

export const ATS_MANUAL = [
  P('Use words from the job posting for skills you truly have (use the keyword matcher below).', 'Usa palabras del anuncio para las destrezas que realmente tienes (usa el comparador de palabras clave).'),
  P('Upload PDF unless the employer asks for Word. Use Classic ATS for large company portals.', 'Sube PDF a menos que pidan Word. Usa Classic ATS para portales de empresas grandes.'),
  P('Name the file clearly, e.g. Maria-Rodriguez-Resume.pdf.', 'Nombra el archivo claramente, ej. Maria-Rodriguez-Resume.pdf.'),
  P('Spell out abbreviations once: “Certified Nursing Assistant (CNA)”.', 'Escribe completas las siglas una vez: “Asistente de Enfermería Certificado (CNA)”.'),
  P('Keep dates in one consistent format (e.g., “Mar 2021 – Present”).', 'Mantén las fechas en un mismo formato (ej. “mar. 2021 – Presente”).'),
  P('Tailor your headline to the job title you are applying for.', 'Ajusta tu título profesional al puesto que solicitas.'),
  P('No ATS is guaranteed: some systems read files differently. Paste the .txt version into forms when asked.', 'Ningún ATS es garantizado: algunos sistemas leen los archivos de forma distinta. Pega la versión .txt en los formularios cuando lo pidan.'),
];

const STOP = new Set('a an the and or of to in on for with by at from as is are be this that will you your our we they their it its into over about per via using use other able ability work working including include etc job role position team strong excellent skills skill experience years year required preferred plus must have has should can within across new all any more such who what when where which while de la el los las y o en con por para un una que se del al su sus es son como más mas sobre entre sin experiencia años requisitos preferible'.split(' '));

/** Keyword match between a job description and the resume. */
export function keywordMatch(jobText, r) {
  const resumeText = [r.contact.headline, r.summary, ...r.experience.flatMap((e) => [e.title, ...e.bullets.map((b) => b.text)]), ...r.skills, ...r.certifications.map((c) => c.name), ...r.education.map((e) => e.degree)].join(' ').toLowerCase();
  const words = jobText.toLowerCase().replace(/[^a-z0-9áéíóúñü+#./ -]+/gi, ' ').split(/\s+/).map((w) => w.replace(/^[./-]+|[./-]+$/g, '')).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  const counts = new Map();
  for (let i = 0; i < words.length; i += 1) {
    counts.set(words[i], (counts.get(words[i]) || 0) + 1);
    if (i + 1 < words.length && !STOP.has(words[i + 1])) {
      const bg = `${words[i]} ${words[i + 1]}`;
      counts.set(bg, (counts.get(bg) || 0) + 1);
    }
  }
  const terms = [...counts.entries()].filter(([w, c]) => (w.includes(' ') ? c >= 2 : c >= 2 || w.length > 7)).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([w]) => w);
  const found = terms.filter((w) => resumeText.includes(w));
  const missing = terms.filter((w) => !resumeText.includes(w));
  return { terms, found, missing, pct: terms.length ? Math.round((found.length / terms.length) * 100) : 0 };
}

// ---------------------------------------------------------------------------
// Interview prep
export const INTERVIEW_QUESTIONS = [
  { q: P('Tell me about yourself.', 'Háblame de ti.'), tip: P('90 seconds: present (current role + strength), past (1–2 relevant results), future (why this job).', '90 segundos: presente (puesto actual y fortaleza), pasado (1 o 2 resultados relevantes), futuro (por qué este empleo).') },
  { q: P('Why do you want to work here?', '¿Por qué quieres trabajar aquí?'), tip: P('Name something specific about the company (product, values, growth) and connect it to what you do well.', 'Menciona algo específico de la empresa (producto, valores, crecimiento) y conéctalo con lo que haces bien.') },
  { q: P('What is your greatest strength?', '¿Cuál es tu mayor fortaleza?'), tip: P('One strength + a short STAR example that proves it.', 'Una fortaleza + un breve ejemplo STAR que la demuestre.') },
  { q: P('Tell me about a weakness.', 'Háblame de una debilidad.'), tip: P('A real, non-critical weakness and the concrete steps you are taking to improve.', 'Una debilidad real, no crítica, y los pasos concretos que tomas para mejorar.') },
  { q: P('Describe a conflict with a coworker or customer.', 'Describe un conflicto con un compañero o cliente.'), tip: P('Stay neutral, focus on listening, the action you took and what you learned.', 'Mantente neutral; enfócate en escuchar, la acción que tomaste y lo que aprendiste.') },
  { q: P('Tell me about a time you made a mistake.', 'Cuéntame de una vez que cometiste un error.'), tip: P('Own it briefly, explain how you fixed it, and what you changed so it won’t happen again.', 'Reconócelo brevemente, explica cómo lo corregiste y qué cambiaste para que no se repita.') },
  { q: P('Why are you leaving your current job? / Why the gap in employment?', '¿Por qué dejas tu empleo actual? / ¿Por qué hay una pausa en tu historial?'), tip: P('Be honest and brief, stay positive, then pivot to what you are looking for now. Caregiving, health, study and relocation are legitimate reasons.', 'Sé honesto/a y breve, mantente positivo/a y luego enfócate en lo que buscas ahora. Cuidar a familiares, salud, estudios o mudanza son razones legítimas.') },
  { q: P('Where do you see yourself in five years?', '¿Dónde te ves en cinco años?'), tip: P('Show you want to grow in this field and with this kind of company.', 'Demuestra que quieres crecer en este campo y con este tipo de empresa.') },
  { q: P('What salary are you looking for?', '¿Qué salario buscas?'), tip: P('Research the range first. Give a range based on that research and say you are flexible for the right total package.', 'Investiga el rango primero. Da un rango basado en esa investigación y di que eres flexible según el paquete completo.') },
  { q: P('Do you have any questions for us?', '¿Tienes alguna pregunta para nosotros?'), tip: P('Always yes — see the list of questions to ask below.', 'Siempre di que sí; mira la lista de preguntas abajo.') },
];

export const QUESTIONS_TO_ASK = [
  P('What does success look like in this role after 90 days?', '¿Cómo se ve el éxito en este puesto después de 90 días?'),
  P('What are the biggest challenges for the team right now?', '¿Cuáles son los mayores retos del equipo en este momento?'),
  P('How would you describe the team’s culture and how people work together?', '¿Cómo describiría la cultura del equipo y la forma de colaborar?'),
  P('What training or development opportunities are available?', '¿Qué oportunidades de adiestramiento o desarrollo ofrecen?'),
  P('What are the next steps in the hiring process?', '¿Cuáles son los próximos pasos del proceso de selección?'),
];

export const INTERVIEW_TIPS = [
  P('Prepare 4–6 STAR stories (use the STAR worksheet) that you can adapt to many questions.', 'Prepara de 4 a 6 historias STAR (usa la hoja STAR) que puedas adaptar a muchas preguntas.'),
  P('Practice out loud — record yourself on your phone once.', 'Practica en voz alta; grábate una vez con tu celular.'),
  P('For bilingual roles, expect part of the interview in each language. Practice your summary in both.', 'Para puestos bilingües, espera parte de la entrevista en cada idioma. Practica tu resumen en ambos.'),
  P('Video interviews: test your camera and audio 15 minutes early, light in front of you, neutral background.', 'Entrevistas por video: prueba cámara y audio 15 minutos antes, luz de frente y fondo neutral.'),
  P('Bring (or have open) copies of your resume and a list of references.', 'Lleva (o ten abiertas) copias de tu resumé y una lista de referencias.'),
];

// ---------------------------------------------------------------------------
// Career change / returning to work / transferable skills
export const CHANGE_STEPS = [
  P('Pick 1–2 target roles. Read 10 real job postings for each and list the skills that repeat.', 'Elige 1 o 2 puestos meta. Lee 10 anuncios reales de cada uno y anota las destrezas que se repiten.'),
  P('Map your experience to those skills using the transferable-skills table below.', 'Relaciona tu experiencia con esas destrezas usando la tabla de destrezas transferibles.'),
  P('Rewrite your headline and summary toward the new role (“Customer service leader transitioning into healthcare administration”).', 'Reescribe tu título y resumen hacia el nuevo puesto (“Líder de servicio al cliente en transición a administración de salud”).'),
  P('Lead each job with the bullets most relevant to the new field — move the rest down or remove them.', 'Coloca primero en cada empleo los logros más relevantes para el nuevo campo; baja o elimina el resto.'),
  P('Close real gaps with short, recognized training (community college, free online certificates, union/trade programs).', 'Cubre brechas reales con adiestramientos cortos y reconocidos (colegios técnicos, certificados gratuitos en línea, programas de oficio).'),
  P('Talk to 3 people already in the role (use the informational-conversation message).', 'Habla con 3 personas que ya trabajen en ese puesto (usa el mensaje de conversación informativa).'),
];

export const RETURNING_TIPS = [
  P('List the gap honestly as a short line if it helps (e.g., “Family caregiver, 2019–2023”). Don’t apologize for it.', 'Si ayuda, incluye la pausa honestamente en una línea breve (ej. “Cuidado de familiar, 2019–2023”). No te disculpes por ello.'),
  P('Volunteer work, school activities, community roles and freelance work count as experience.', 'El voluntariado, las actividades escolares, los roles comunitarios y el trabajo independiente cuentan como experiencia.'),
  P('Refresh one or two skills with a recent course and list it under Certifications or Training.', 'Actualiza una o dos destrezas con un curso reciente y menciónalo en Certificaciones o Adiestramientos.'),
  P('Recent graduates: put Education first and add projects, internships and part-time jobs with results.', 'Recién graduados: coloca Educación primero y añade proyectos, internados y empleos a tiempo parcial con resultados.'),
];

export const TRANSFERABLE = [
  { from: P('Retail & sales floor', 'Ventas al detal'), skills: [
    [P('Customer service & de-escalation', 'Servicio al cliente y manejo de situaciones difíciles'), P('Call centers, patient access, hospitality, banking', 'Centros de llamadas, registro de pacientes, hospitalidad, banca')],
    [P('Cash handling & reconciliation', 'Manejo y cuadre de efectivo'), P('Bank teller, bookkeeping, accounts receivable', 'Cajero bancario, contabilidad, cuentas por cobrar')],
    [P('Inventory & merchandising', 'Inventario y exhibición'), P('Warehouse, purchasing, supply chain', 'Almacén, compras, cadena de suministro')],
    [P('Sales targets & upselling', 'Metas de ventas y ventas adicionales'), P('Inside sales, account management', 'Ventas internas, manejo de cuentas')] ] },
  { from: P('Restaurants & hospitality', 'Restaurantes y hospitalidad'), skills: [
    [P('Working fast under pressure', 'Trabajo rápido bajo presión'), P('Healthcare support, logistics, emergency dispatch', 'Apoyo en salud, logística, despacho de emergencias')],
    [P('Food safety & compliance', 'Seguridad alimentaria y cumplimiento'), P('Quality assurance, manufacturing, lab support', 'Control de calidad, manufactura, apoyo de laboratorio')],
    [P('Shift coordination & training', 'Coordinación de turnos y adiestramiento'), P('Operations supervisor, team lead', 'Supervisor de operaciones, líder de equipo')] ] },
  { from: P('Teaching & education', 'Educación'), skills: [
    [P('Training design & presentation', 'Diseño de adiestramientos y presentaciones'), P('Corporate trainer, instructional design, HR', 'Adiestrador corporativo, diseño instruccional, recursos humanos')],
    [P('Assessment & data tracking', 'Evaluación y seguimiento de datos'), P('Program coordinator, analyst', 'Coordinador de programas, analista')],
    [P('Parent & stakeholder communication', 'Comunicación con padres y comunidad'), P('Customer success, community relations', 'Éxito del cliente, relaciones comunitarias')] ] },
  { from: P('Military service', 'Servicio militar'), skills: [
    [P('Leadership of teams & accountability', 'Liderazgo de equipos y responsabilidad'), P('Operations management, supervision', 'Gerencia de operaciones, supervisión')],
    [P('Logistics & equipment maintenance', 'Logística y mantenimiento de equipo'), P('Supply chain, facilities, technician roles', 'Cadena de suministro, instalaciones, técnicos')],
    [P('Security clearance & procedures', 'Autorización de seguridad y procedimientos'), P('Government contracting, compliance, security', 'Contratación gubernamental, cumplimiento, seguridad')] ] },
  { from: P('Healthcare support', 'Apoyo en servicios de salud'), skills: [
    [P('Patient communication & empathy', 'Comunicación y empatía con pacientes'), P('Customer success, social services, insurance', 'Éxito del cliente, servicios sociales, seguros')],
    [P('Medical records & privacy (HIPAA)', 'Expedientes médicos y privacidad (HIPAA)'), P('Medical billing, health IT, compliance', 'Facturación médica, tecnología en salud, cumplimiento')] ] },
  { from: P('Administrative & office', 'Administración y oficina'), skills: [
    [P('Scheduling & coordination', 'Coordinación y agendas'), P('Project coordination, event planning', 'Coordinación de proyectos, planificación de eventos')],
    [P('Spreadsheets & data entry', 'Hojas de cálculo y entrada de datos'), P('Operations analyst, payroll, procurement', 'Analista de operaciones, nómina, compras')] ] },
  { from: P('Caregiving / home (returning to work)', 'Cuidado de familia / hogar (regreso al empleo)'), skills: [
    [P('Budgeting & household management', 'Presupuesto y administración del hogar'), P('Office administration, bookkeeping', 'Administración de oficina, contabilidad básica')],
    [P('Coordinating care, appointments & benefits', 'Coordinación de cuidados, citas y beneficios'), P('Patient coordinator, case management support', 'Coordinador de pacientes, apoyo en manejo de casos')],
    [P('Community & school volunteering', 'Voluntariado comunitario y escolar'), P('Event coordination, nonprofit programs', 'Coordinación de eventos, programas sin fines de lucro')] ] },
];

// ---------------------------------------------------------------------------
// LinkedIn
export function linkedinHeadline(r, lang) {
  const es = lang.startsWith('es');
  const title = r.experience[0]?.title || r.contact.headline || (es ? '[Tu puesto]' : '[Your title]');
  const skills = r.skills.slice(0, 3).join(' • ');
  const bilingual = r.languages.length >= 2 ? (es ? 'Bilingüe (español/inglés)' : 'Bilingual (English/Spanish)') : '';
  return [title, skills, bilingual].filter(Boolean).join(' | ').slice(0, 220);
}

export function linkedinAbout(r, lang) {
  const es = lang.startsWith('es');
  const bullets = r.experience.flatMap((e) => e.bullets.map((b) => b.text)).filter((b) => /\d/.test(b)).slice(0, 3);
  const parts = [r.summary || (es ? '[Escribe 2 o 3 oraciones sobre quién eres y qué te apasiona de tu trabajo.]' : '[Write 2–3 sentences about who you are and what you enjoy about your work.]')];
  if (bullets.length) parts.push((es ? 'Algunos resultados:' : 'A few results:') + '\n' + bullets.map((b) => `• ${b}`).join('\n'));
  if (r.skills.length) parts.push((es ? 'Destrezas: ' : 'Skills: ') + r.skills.slice(0, 10).join(', '));
  parts.push(es ? '[Cierra con lo que buscas: “Abierta a oportunidades en…” o cómo contactarte.]' : '[Close with what you’re looking for: “Open to opportunities in…” or how to reach you.]');
  return parts.join('\n\n');
}

export const LINKEDIN_CHECKLIST = [
  P('Professional photo: face clearly visible, plain background, natural light.', 'Foto profesional: rostro visible, fondo sencillo, luz natural.'),
  P('Headline says what you do and what you’re targeting — not just your current title.', 'El título dice qué haces y qué buscas, no solo tu puesto actual.'),
  P('About section in first person, 3 short paragraphs.', 'Sección “Acerca de” en primera persona, 3 párrafos cortos.'),
  P('Experience matches your resume (titles and dates identical).', 'La experiencia coincide con tu resumé (puestos y fechas idénticos).'),
  P('Add at least 5 skills that appear in job postings you want.', 'Añade al menos 5 destrezas que aparezcan en los anuncios que te interesan.'),
  P('Turn on “Open to Work” (visible to recruiters only, if you prefer privacy).', 'Activa “Open to Work” (visible solo para reclutadores, si prefieres privacidad).'),
  P('Bilingual? Add a second-language profile so recruiters can find you in both.', '¿Bilingüe? Añade un perfil en un segundo idioma para que te encuentren en ambos.'),
  P('Customize your public URL (linkedin.com/in/first-last).', 'Personaliza tu URL pública (linkedin.com/in/nombre-apellido).'),
  P('Ask 2 former coworkers or supervisors for a recommendation.', 'Pide una recomendación a 2 ex compañeros o supervisores.'),
];

// ---------------------------------------------------------------------------
// STAR
export function starToText(stories, lang) {
  const es = lang.startsWith('es');
  const H = es ? ['Situación', 'Tarea', 'Acción', 'Resultado'] : ['Situation', 'Task', 'Action', 'Result'];
  return stories.map((s, i) => [`${i + 1}. ${s.title || (es ? 'Historia' : 'Story')}`, `${H[0]}: ${s.s || ''}`, `${H[1]}: ${s.t || ''}`, `${H[2]}: ${s.a || ''}`, `${H[3]}: ${s.r || ''}`].join('\n')).join('\n\n');
}

export function starToBullet(s) {
  const a = (s.a || '').trim().replace(/\.$/, '');
  const r = (s.r || '').trim().replace(/\.$/, '');
  if (!a) return '';
  const action = a.charAt(0).toUpperCase() + a.slice(1);
  return r ? `${action}, ${lcFirst(r)}` : action;
}
