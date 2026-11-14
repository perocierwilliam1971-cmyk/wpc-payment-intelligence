// Difficult-situation playbooks. Each one turns the customer's own facts into
// a short, practiced answer. Sentences in [brackets] are left out when the
// related field is blank, so the script never claims anything they didn't say.

import { fillTemplate } from '../achievement/writer.js';

const P = (en, es) => ({ en, es });
const F = (k, en, es, phEn, phEs, opt = false) => ({ k, label: P(en, es), ph: P(phEn, phEs), optional: opt });

export const PLAYBOOKS = [
  {
    id: 'gap', title: P('Explaining an employment gap', 'Explicar una pausa en el empleo'),
    when: P('Any break of 6 months or more — caregiving, health, relocation, study, a hard job market.', 'Cualquier pausa de 6 meses o más: cuidado de familiares, salud, mudanza, estudios o un mercado difícil.'),
    principles: [P('Be honest and brief: 2–3 sentences, no apology.', 'Sé honesto/a y breve: 2 o 3 oraciones, sin disculparte.'), P('Share only what you are comfortable with — “a family health matter” is enough.', 'Comparte solo lo que te haga sentir cómodo/a: “un asunto de salud familiar” es suficiente.'), P('End on why you are ready now and what you want next.', 'Termina con por qué estás listo/a ahora y lo que buscas.')],
    fields: [
      F('reason', 'What were you doing during the gap?', '¿Qué hacías durante la pausa?', 'caring for my mother after her surgery', 'cuidando a mi madre después de su cirugía'),
      F('kept', 'How did you keep skills current? (optional)', '¿Cómo mantuviste tus destrezas al día? (opcional)', 'completing an online Excel course and volunteering at my church office', 'tomando un curso de Excel en línea y como voluntaria en la oficina de mi iglesia', true),
      F('ready', 'Why you are ready now', 'Por qué estás listo/a ahora', 'I’m fully available to return to work', 'tengo plena disponibilidad para regresar al trabajo'),
      F('interest', 'Why this role interests you (optional)', 'Por qué te interesa este puesto (opcional)', 'it uses my customer service and scheduling experience', 'aprovecha mi experiencia en servicio al cliente y coordinación', true),
    ],
    script: {
      en: ['During that time I was {reason}', '[I kept my skills current by {kept}]', 'That situation is behind me and {ready}', '[I’m excited about this role because {interest}]'],
      es: ['Durante ese tiempo estuve {reason}', '[Mantuve mis destrezas al día {kept}]', 'Esa etapa ya quedó atrás y {ready}', '[Me entusiasma este puesto porque {interest}]'],
    },
    avoid: [P('Long medical or family details.', 'Detalles médicos o familiares extensos.'), P('Sounding apologetic or defensive.', 'Sonar a la defensiva o pedir disculpas.')],
  },
  {
    id: 'fired', title: P('If you were fired', 'Si te despidieron'),
    when: P('You were terminated for performance, attendance or a mistake.', 'Te despidieron por desempeño, asistencia o un error.'),
    principles: [P('Never lie — references and background checks can reveal it.', 'Nunca mientas: las referencias y verificaciones pueden revelarlo.'), P('One factual sentence, then focus on what you learned and changed.', 'Una oración con los hechos y luego enfócate en lo que aprendiste y cambiaste.'), P('Do not blame your former boss or company.', 'No culpes a tu antiguo supervisor ni a la empresa.')],
    fields: [
      F('what', 'What happened (one factual line)', 'Qué pasó (una línea, solo hechos)', 'I didn’t meet the new sales targets after the territory changed', 'no alcancé las nuevas metas de ventas tras el cambio de territorio'),
      F('learned', 'What it taught you', 'Lo que aprendiste', 'to ask for help and training early instead of waiting', 'a pedir ayuda y adiestramiento a tiempo en lugar de esperar'),
      F('changed', 'What you do differently now', 'Lo que haces diferente ahora', 'set weekly goals and review them with my supervisor', 'establezco metas semanales y las reviso con mi supervisor', true),
      F('strength', 'Strength you bring to this role (optional)', 'Fortaleza que aportas a este puesto (opcional)', 'building long-term customer relationships', 'crear relaciones duraderas con los clientes', true),
    ],
    script: {
      en: ['I was let go from that position because {what}', 'It taught me {learned}', '[Since then I {changed}]', '[That’s why I’m confident in {strength} here]'],
      es: ['Me despidieron de ese puesto porque {what}', 'Esa experiencia me enseñó {learned}', '[Desde entonces {changed}]', '[Por eso confío en aportar {strength} aquí]'],
    },
    avoid: [P('Saying “it wasn’t my fault.”', 'Decir “no fue mi culpa”.'), P('Hiding it if they ask directly.', 'Ocultarlo si te lo preguntan directamente.')],
  },
  {
    id: 'laidoff', title: P('Laid off or position eliminated', 'Cesantía o puesto eliminado'),
    when: P('Restructuring, closures, budget cuts, a hurricane or economic downturn.', 'Reestructuración, cierre, recortes, un huracán o una crisis económica.'),
    principles: [P('Layoffs are business decisions, not performance — say so plainly.', 'Las cesantías son decisiones de negocio, no de desempeño: dilo con claridad.'), P('Mention how many people were affected if it helps.', 'Menciona cuántas personas fueron afectadas si ayuda.'), P('Pivot to a result you are proud of there.', 'Pasa a un resultado del que te sientas orgulloso/a.')],
    fields: [
      F('reason', 'What happened', 'Qué pasó', 'the company closed its Puerto Rico call center', 'la empresa cerró su centro de llamadas en Puerto Rico'),
      F('scope', 'Who else was affected (optional)', 'Quién más fue afectado (opcional)', 'along with 60 coworkers', 'junto a 60 compañeros', true),
      F('proud', 'A result you are proud of there', 'Un logro del que te sientas orgulloso/a', 'raised our team’s satisfaction score from 82% to 91%', 'aumenté la satisfacción de nuestro equipo de 82% a 91%', true),
      F('next', 'What you are looking for now', 'Lo que buscas ahora', 'a role where I can keep growing in customer operations', 'un puesto donde pueda seguir creciendo en operaciones de servicio', true),
    ],
    script: {
      en: ['My position was eliminated when {reason}[ {scope}]', '[Before that, I {proud}]', '[Now I’m looking for {next}]'],
      es: ['Mi puesto fue eliminado cuando {reason}[ {scope}]', '[Antes de eso, {proud}]', '[Ahora busco {next}]'],
    },
    avoid: [P('Sounding bitter about the company.', 'Sonar resentido/a con la empresa.')],
  },
  {
    id: 'short', title: P('Leaving a job after a short time', 'Salir de un empleo en poco tiempo'),
    when: P('You stayed less than a year somewhere.', 'Estuviste menos de un año en un empleo.'),
    principles: [P('Give one honest reason that is not about conflict.', 'Da una razón honesta que no sea un conflicto.'), P('Show what you now look for, so they believe you will stay.', 'Explica lo que buscas ahora para que confíen en que te quedarás.')],
    fields: [
      F('reason', 'Why you left', 'Por qué te fuiste', 'the role turned out to be mostly overnight shifts, which didn’t work with my family responsibilities', 'el puesto resultó ser mayormente de turnos nocturnos, lo cual no funcionaba con mis responsabilidades familiares'),
      F('learned', 'What you learned about what you need', 'Lo que aprendiste sobre lo que necesitas', 'to ask detailed questions about schedules before accepting', 'a preguntar detalles sobre los horarios antes de aceptar', true),
      F('looking', 'Why this job is a long-term fit', 'Por qué este empleo es para largo plazo', 'this role offers the daytime schedule and growth path I want', 'este puesto ofrece el horario diurno y el crecimiento que busco'),
    ],
    script: {
      en: ['I left because {reason}', '[It taught me {learned}]', 'I’m looking for a place to grow long-term, and {looking}'],
      es: ['Me fui porque {reason}', '[Aprendí {learned}]', 'Busco un lugar donde crecer a largo plazo y {looking}'],
    },
    avoid: [P('Criticizing the manager or coworkers.', 'Criticar al supervisor o a los compañeros.')],
  },
  {
    id: 'leaving', title: P('Why are you leaving your current job?', '¿Por qué dejas tu empleo actual?'),
    when: P('You are employed and looking.', 'Tienes empleo y estás buscando otro.'),
    principles: [P('Talk about what you are moving toward, not away from.', 'Habla de lo que buscas, no de lo que dejas.'), P('Mention one thing you value about your current job.', 'Menciona algo que valoras de tu empleo actual.')],
    fields: [
      F('proud', 'Something you accomplished there (optional)', 'Algo que lograste allí (opcional)', 'trained most of our new hires', 'adiestré a la mayoría del personal nuevo', true),
      F('growth', 'What you are looking for', 'Lo que buscas', 'more responsibility in operations and a path to supervision', 'más responsabilidad en operaciones y la oportunidad de supervisar'),
      F('why', 'Why this company (optional)', 'Por qué esta empresa (opcional)', 'your focus on promoting from within', 'su enfoque en promover desde adentro', true),
    ],
    script: {
      en: ['[I’ve learned a lot in my current job, where I {proud}]', 'I’m now looking for {growth}', '[Your company stands out to me because of {why}]'],
      es: ['[He aprendido mucho en mi empleo actual, donde {proud}]', 'Ahora busco {growth}', '[Su empresa me llama la atención por {why}]'],
    },
    avoid: [P('Complaining about pay, your boss or coworkers.', 'Quejarte del salario, tu supervisor o compañeros.')],
  },
  {
    id: 'change', title: P('Changing careers', 'Cambio de carrera'),
    when: P('The job is in a field different from your recent experience.', 'El empleo es en un campo distinto a tu experiencia reciente.'),
    principles: [P('Name 2–3 transferable skills and prove each with a real example.', 'Nombra 2 o 3 destrezas transferibles y demuéstralas con ejemplos reales.'), P('Show you have already invested in the new field (course, volunteering, certification).', 'Demuestra que ya invertiste en el nuevo campo (curso, voluntariado, certificación).')],
    fields: [
      F('from', 'Your current field', 'Tu campo actual', 'retail management', 'gerencia de ventas al detal'),
      F('to', 'The new field', 'El nuevo campo', 'logistics coordination', 'coordinación de logística'),
      F('skills', 'Transferable skills', 'Destrezas transferibles', 'scheduling teams, controlling inventory and solving problems under pressure', 'coordinar turnos, controlar inventario y resolver problemas bajo presión'),
      F('proof', 'Proof (one result)', 'Evidencia (un resultado)', 'I cut inventory shrink 18% with weekly cycle counts', 'reduje las pérdidas de inventario en 18% con conteos semanales', true),
      F('learning', 'How you are preparing (optional)', 'Cómo te estás preparando (opcional)', 'completing a supply chain certificate at the community college', 'completando un certificado en cadena de suministro', true),
    ],
    script: {
      en: ['My background in {from} gave me skills that transfer directly to {to}: {skills}', '[For example, {proof}]', '[I’ve been preparing by {learning}]', 'I’m making this move on purpose, and I’m ready to contribute from day one'],
      es: ['Mi experiencia en {from} me dio destrezas que aplican directamente a {to}: {skills}', '[Por ejemplo, {proof}]', '[Me he estado preparando {learning}]', 'Este cambio es una decisión pensada y estoy listo/a para aportar desde el primer día'],
    },
    avoid: [P('Apologizing for not having direct experience.', 'Disculparte por no tener experiencia directa.')],
  },
  {
    id: 'salary', title: P('The salary question', 'La pregunta del salario'),
    when: P('They ask your expectations — in the application, a phone screen or the interview.', 'Te preguntan tus expectativas en la solicitud, una llamada o la entrevista.'),
    principles: [P('Research first: job postings with pay, government wage data, people in the role.', 'Investiga primero: anuncios con salario, datos de salarios del gobierno y personas en el puesto.'), P('Give a range whose bottom is a number you would happily accept.', 'Da un rango cuyo mínimo sea una cifra que aceptarías con gusto.'), P('Puerto Rico’s pay-equity law (Ley 16-2017) and many U.S. states restrict employers from asking your salary history. You may decline to share it. (General information, not legal advice — check current law.)', 'La Ley 16-2017 de Igualdad Salarial de Puerto Rico y muchos estados limitan que el patrono pregunte tu historial salarial. Puedes no compartirlo. (Información general, no asesoría legal: verifica la ley vigente.)')],
    fields: [
      F('moneyLow', 'Low end of your researched range', 'Mínimo del rango investigado', '42,000', '28,000'),
      F('moneyHigh', 'High end', 'Máximo', '48,000', '32,000'),
      F('source', 'Where you researched (optional)', 'Dónde investigaste (opcional)', 'similar postings in the area', 'anuncios similares en el área', true),
      F('flex', 'What else matters to you (optional)', 'Qué más te importa (opcional)', 'health insurance and schedule', 'el plan médico y el horario', true),
    ],
    script: {
      en: ['Based on my research[ of {source}], roles like this typically pay between ${moneyLow} and ${moneyHigh}', 'I’m looking for something in that range[, and I’m open to discussing the full package, including {flex}]'],
      es: ['Según mi investigación[ de {source}], puestos como este suelen pagar entre ${moneyLow} y ${moneyHigh}', 'Busco algo dentro de ese rango[ y estoy abierto/a a conversar sobre el paquete completo, incluyendo {flex}]'],
    },
    avoid: [P('Naming a single number first without research.', 'Dar una sola cifra sin haber investigado.'), P('Saying “whatever you think is fair.”', 'Decir “lo que ustedes consideren justo”.')],
  },
  {
    id: 'weakness', title: P('“What is your greatest weakness?”', '“¿Cuál es tu mayor debilidad?”'),
    when: P('Almost every interview.', 'Casi todas las entrevistas.'),
    principles: [P('Choose something real that is not essential to the job.', 'Elige algo real que no sea esencial para el puesto.'), P('Spend most of the answer on what you are doing about it.', 'Dedica la mayor parte de la respuesta a lo que haces para mejorar.')],
    fields: [
      F('weakness', 'The weakness', 'La debilidad', 'I used to take on too much myself instead of delegating', 'solía hacer demasiado yo mismo/a en lugar de delegar'),
      F('action', 'What you are doing about it', 'Lo que haces para mejorar', 'I now assign tasks at the start of each shift and check in at midday', 'ahora asigno tareas al inicio de cada turno y doy seguimiento a mediodía'),
      F('progress', 'Evidence it is working (optional)', 'Evidencia de que funciona (opcional)', 'my team finishes closing tasks 30 minutes earlier', 'mi equipo termina el cierre 30 minutos antes', true),
    ],
    script: {
      en: ['Something I’ve worked on is that {weakness}', 'To improve, {action}', '[As a result, {progress}]'],
      es: ['Algo en lo que he trabajado es que {weakness}', 'Para mejorar, {action}', '[Como resultado, {progress}]'],
    },
    avoid: [P('“I’m a perfectionist” or “I work too hard.”', '“Soy perfeccionista” o “trabajo demasiado”.')],
  },
  {
    id: 'overqualified', title: P('“You seem overqualified”', '“Parece que estás sobrecualificado/a”'),
    when: P('Applying for a role below your past level, or after a career pause.', 'Solicitas un puesto de menor nivel que antes o después de una pausa.'),
    principles: [P('Address their real worry: that you will leave or be unhappy.', 'Atiende su verdadera preocupación: que te vayas o no estés satisfecho/a.'), P('Give a genuine reason for wanting this role.', 'Da una razón genuina para querer este puesto.')],
    fields: [
      F('why', 'Why you want this role', 'Por qué quieres este puesto', 'I want to focus on hands-on customer work instead of managing budgets', 'quiero enfocarme en el trabajo directo con clientes en lugar de manejar presupuestos'),
      F('value', 'Extra value you bring', 'Valor adicional que aportas', 'I can support newer team members with what I’ve learned', 'puedo apoyar al personal nuevo con lo que he aprendido', true),
      F('commit', 'Your commitment (optional)', 'Tu compromiso (opcional)', 'I’m looking for a long-term place to work', 'busco un lugar para trabajar a largo plazo', true),
    ],
    script: {
      en: ['I applied for this role on purpose: {why}', '[My experience is a plus here, because {value}]', '[{commit}]'],
      es: ['Solicité este puesto a propósito: {why}', '[Mi experiencia es una ventaja aquí, porque {value}]', '[{commit}]'],
    },
    avoid: [P('Saying you “just need any job.”', 'Decir que “necesitas cualquier empleo”.')],
  },
  {
    id: 'illegal', title: P('Questions they shouldn’t ask', 'Preguntas que no deberían hacerte'),
    when: P('Age, marital status, pregnancy or children, religion, national origin, disability, or similar personal questions.', 'Edad, estado civil, embarazo o hijos, religión, origen nacional, discapacidad u otras preguntas personales.'),
    principles: [
      P('Employers may ask whether you are authorized to work and whether you can perform the job’s essential duties — not about protected personal traits.', 'El patrono puede preguntar si estás autorizado/a a trabajar y si puedes realizar las funciones esenciales, no sobre características personales protegidas.'),
      P('You can answer the concern behind the question without sharing personal details.', 'Puedes contestar la preocupación detrás de la pregunta sin compartir detalles personales.'),
      P('Write down what was asked. In the U.S. you can contact the EEOC; in Puerto Rico, the Department of Labor’s Anti-Discrimination Unit. (General information, not legal advice.)', 'Anota lo que te preguntaron. En EE. UU. puedes comunicarte con la EEOC; en Puerto Rico, con la Unidad Antidiscrimen del Departamento del Trabajo. (Información general, no asesoría legal.)'),
    ],
    fields: [
      F('concern', 'What they are probably worried about', 'Lo que probablemente les preocupa', 'work the schedule, including some weekends', 'trabajar el horario, incluyendo algunos fines de semana'),
      F('assurance', 'Your reassurance', 'Tu respuesta', 'I have reliable arrangements in place and can meet the schedule', 'tengo todo organizado y puedo cumplir con el horario'),
    ],
    script: {
      en: ['If you’re asking whether I can {concern}, I can assure you that {assurance}'],
      es: ['Si la pregunta es si puedo {concern}, le aseguro que {assurance}'],
    },
    avoid: [P('Arguing during the interview — redirect calmly and decide later how to respond.', 'Discutir durante la entrevista: redirige con calma y decide luego cómo actuar.')],
  },
  {
    id: 'bilingual', title: P('Bilingual interviews', 'Entrevistas bilingües'),
    when: P('Your resume says bilingual, or the role serves Spanish- and English-speaking customers.', 'Tu resumé dice bilingüe o el puesto atiende clientes en español e inglés.'),
    principles: [
      P('Expect a switch without warning — often “tell me about a difficult customer.”', 'Espera un cambio de idioma sin aviso, a menudo “háblame de un cliente difícil”.'),
      P('Prepare the same 3 stories in both languages. Don’t translate word for word; tell the story naturally.', 'Prepara las mismas 3 historias en ambos idiomas. No traduzcas palabra por palabra; cuéntalas con naturalidad.'),
      P('Learn the industry terms in both languages (e.g., “claim / reclamación”, “billing / facturación”).', 'Aprende los términos del campo en ambos idiomas (ej. “claim / reclamación”, “billing / facturación”).'),
      P('Stay in the language they switch to until they switch back. It’s fine to ask them to repeat.', 'Mantente en el idioma al que cambiaron hasta que vuelvan a cambiar. Está bien pedir que repitan.'),
    ],
    fields: [
      F('story', 'Your difficult-customer story (key facts)', 'Tu historia de cliente difícil (datos clave)', 'a customer was charged twice and was very upset', 'un cliente tenía un cargo doble y estaba muy molesto'),
      F('action', 'What you did', 'Lo que hiciste', 'I listened, verified the charge and processed the refund on the call', 'escuché, verifiqué el cargo y procesé el reembolso durante la llamada'),
      F('result', 'The result', 'El resultado', 'he thanked me and stayed with the company', 'me dio las gracias y se quedó con la empresa', true),
    ],
    script: {
      en: ['One time, {story}', 'I {action}', '[In the end, {result}]'],
      es: ['En una ocasión, {story}', '{action}', '[Al final, {result}]'],
    },
    avoid: [P('Mixing languages mid-sentence in a formal interview.', 'Mezclar idiomas en la misma oración en una entrevista formal.')],
  },
];

export function getPlaybook(id) {
  return PLAYBOOKS.find((p) => p.id === id);
}

/** Build the practice script from the customer's answers. */
export function buildScript(playbook, values, lang) {
  const L = lang.startsWith('es') ? 'es' : 'en';
  const sentences = playbook.script[L].map((tpl) => fillTemplate(tpl, values)).filter(Boolean);
  return sentences.map((s) => (/[.!?]$/.test(s) ? s : `${s}.`)).join(' ');
}

/** values for one language: { field: text } */
export function langComplete(playbook, values = {}) {
  return playbook.fields.filter((f) => !f.optional).every((f) => String(values[f.k] || '').trim());
}

/** Stored per language: { en: {...}, es: {...} }. Complete if either language is. */
export function playbookComplete(playbook, stored = {}) {
  return langComplete(playbook, stored.en) || langComplete(playbook, stored.es);
}

/** Useful interview phrases in both languages. */
export const PHRASES = [
  [P('Could you repeat the question, please?', '¿Podría repetir la pregunta, por favor?')],
  [P('That’s a great question. Let me think for a moment.', 'Excelente pregunta. Permítame pensarlo un momento.')],
  [P('In my previous role, I was responsible for…', 'En mi puesto anterior, me encargaba de…')],
  [P('One example that comes to mind is…', 'Un ejemplo que me viene a la mente es…')],
  [P('As a result, we were able to…', 'Como resultado, logramos…')],
  [P('I’m very interested in this position because…', 'Me interesa mucho este puesto porque…')],
  [P('What does a typical day look like in this role?', '¿Cómo es un día típico en este puesto?')],
  [P('Thank you for your time. I look forward to hearing from you.', 'Gracias por su tiempo. Quedo en espera de su respuesta.')],
].map(([p]) => p);
