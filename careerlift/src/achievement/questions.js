// Profession-specific question bank for Achievement Detective™ Lite.
// Every template only uses words the customer typed into the fields — plus
// neutral connecting words. Bracketed parts disappear when left blank, so a
// statement never contains a number the customer did not provide.

const F = (k, en, es, phEn = '', phEs = '') => ({ k, label: { en, es }, ph: { en: phEn, es: phEs || phEn } });

const COMMON = [
  {
    id: 'gen-improve',
    q: { en: 'Did you improve a process, fix a recurring problem or make something faster?', es: '¿Mejoraste un proceso, resolviste un problema recurrente o hiciste algo más rápido?' },
    fields: [
      F('what', 'What did you improve or fix?', '¿Qué mejoraste o resolviste?', 'the monthly inventory count', 'el conteo mensual de inventario'),
      F('how', 'How did you do it?', '¿Cómo lo hiciste?', 'creating a shared checklist', 'creando una lista de cotejo compartida'),
      F('result', 'What changed as a result?', '¿Qué cambió como resultado?', 'cut counting time from 2 days to 1', 'redujo el tiempo de conteo de 2 días a 1'),
    ],
    tpl: {
      en: ['Improved {what}[ by {how}][, which {result}]', 'Improved {what}'],
      es: ['Mejoré {what}[ {how}][, lo que {result}]', 'Mejoré {what}'],
    },
  },
  {
    id: 'gen-train',
    q: { en: 'Did you train, coach or onboard other people?', es: '¿Adiestraste, orientaste o capacitaste a otras personas?' },
    fields: [
      F('count', 'How many people? (optional)', '¿Cuántas personas? (opcional)', '12'),
      F('who', 'Who were they?', '¿Quiénes eran?', 'new cashiers', 'empleados nuevos'),
      F('topic', 'On what?', '¿Sobre qué?', 'store procedures and the POS system', 'procedimientos y el sistema de caja'),
      F('result', 'Any result? (optional)', '¿Algún resultado? (opcional)', 'all passed their 90-day review', 'todos aprobaron su evaluación de 90 días'),
    ],
    tpl: {
      en: ['Trained[ {count}] {who}[ on {topic}][; {result}]'],
      es: ['Adiestré a[ {count}] {who}[ en {topic}][; {result}]'],
    },
  },
  {
    id: 'gen-recognition',
    q: { en: 'Were you recognized, promoted, selected or given extra responsibility?', es: '¿Te reconocieron, ascendieron, seleccionaron o te dieron más responsabilidades?' },
    fields: [
      F('what', 'What happened?', '¿Qué pasó?', 'Employee of the Month', 'Empleada del Mes'),
      F('why', 'Why? (optional)', '¿Por qué? (opcional)', 'for consistently high customer ratings', 'por evaluaciones altas de clientes'),
      F('times', 'How many times? (optional)', '¿Cuántas veces? (opcional)', '3'),
    ],
    tpl: {
      en: ['Recognized with {what}[ {times} times][ {why}]'],
      es: ['Recibí el reconocimiento de {what}[ en {times} ocasiones][ {why}]'],
    },
  },
  {
    id: 'gen-save',
    q: { en: 'Did you save money, time or resources?', es: '¿Ahorraste dinero, tiempo o recursos?' },
    fields: [
      F('saved', 'What did you save? (e.g. "$5,000 per year", "10 hours a week")', '¿Qué ahorraste? (ej. "$5,000 al año", "10 horas semanales")', '10 hours a week', '10 horas semanales'),
      F('how', 'How?', '¿Cómo?', 'automating the weekly report in Excel', 'automatizando el informe semanal en Excel'),
    ],
    tpl: {
      en: ['Saved {saved}[ by {how}]'],
      es: ['Ahorré {saved}[ {how}]'],
    },
  },
];

export const PROFESSIONS = [
  { id: 'general', label: { en: 'Any profession', es: 'Cualquier profesión' }, questions: [] },
  {
    id: 'sales',
    label: { en: 'Sales & Business Development', es: 'Ventas y Desarrollo de Negocios' },
    questions: [
      { id: 'sales-quota', q: { en: 'Did you meet or exceed a sales goal or quota?', es: '¿Alcanzaste o superaste una meta o cuota de ventas?' },
        fields: [F('pct', 'By what % of goal? (optional)', '¿Qué % de la meta? (opcional)', '118'), F('period', 'Over what period?', '¿En qué período?', '2023', '2023'), F('amount', 'Total sales amount? (optional)', '¿Monto total de ventas? (opcional)', '1.2M')],
        tpl: { en: ['Achieved {pct}% of sales goal[ in {period}][, generating ${amount} in revenue]', 'Exceeded sales goal[ in {period}][, generating ${amount} in revenue]'], es: ['Alcancé el {pct}% de la meta de ventas[ en {period}][, generando ${amount} en ingresos]', 'Superé la meta de ventas[ en {period}][, generando ${amount} en ingresos]'] } },
      { id: 'sales-accounts', q: { en: 'Did you open new accounts, territories or clients?', es: '¿Abriste cuentas, territorios o clientes nuevos?' },
        fields: [F('count', 'How many?', '¿Cuántos?', '25'), F('kind', 'What kind?', '¿De qué tipo?', 'small-business accounts', 'cuentas comerciales'), F('value', 'Their value? (optional)', '¿Su valor? (opcional)', '$300K in annual revenue', '$300K en ingresos anuales')],
        tpl: { en: ['Opened {count} new {kind}[ worth {value}]'], es: ['Abrí {count} {kind} nuevas[ con un valor de {value}]'] } },
      { id: 'sales-retain', q: { en: 'Did you keep or grow existing customers?', es: '¿Retuviste o hiciste crecer clientes existentes?' },
        fields: [F('count', 'How many accounts?', '¿Cuántas cuentas?', '60'), F('result', 'Result (optional)', 'Resultado (opcional)', '95% renewal rate', '95% de renovación')],
        tpl: { en: ['Managed a portfolio of {count} accounts[, maintaining {result}]'], es: ['Manejé una cartera de {count} cuentas[, manteniendo {result}]'] } },
    ],
  },
  {
    id: 'customer',
    label: { en: 'Customer Service & Call Center', es: 'Servicio al Cliente y Centro de Llamadas' },
    questions: [
      { id: 'cs-volume', q: { en: 'How many customers, calls or tickets did you handle?', es: '¿Cuántos clientes, llamadas o casos atendías?' },
        fields: [F('count', 'How many?', '¿Cuántos?', '80'), F('per', 'Per what?', '¿Por cuánto tiempo?', 'day', 'día'), F('channel', 'Through what channels? (optional)', '¿Por qué medios? (opcional)', 'phone, chat and email', 'teléfono, chat y correo')],
        tpl: { en: ['Resolved {count}+ customer inquiries per {per}[ by {channel}]'], es: ['Atendí {count}+ consultas de clientes por {per}[ vía {channel}]'] } },
      { id: 'cs-score', q: { en: 'Did your satisfaction, quality or resolution scores improve or stay high?', es: '¿Tus puntuaciones de satisfacción, calidad o resolución mejoraron o se mantuvieron altas?' },
        fields: [F('metric', 'Which score?', '¿Qué puntuación?', 'customer satisfaction (CSAT)', 'satisfacción del cliente'), F('from', 'From (optional)', 'Desde (opcional)', '82%'), F('to', 'To / level', 'Hasta / nivel', '94%')],
        tpl: { en: ['Raised {metric} from {from} to {to}', 'Maintained {metric} of {to}'], es: ['Aumenté la {metric} de {from} a {to}', 'Mantuve una {metric} de {to}'] } },
      { id: 'cs-escalation', q: { en: 'Did you handle escalations or difficult situations?', es: '¿Manejaste escalaciones o situaciones difíciles?' },
        fields: [F('what', 'What kind?', '¿De qué tipo?', 'billing disputes', 'disputas de facturación'), F('result', 'Outcome (optional)', 'Resultado (opcional)', 'retaining the customer in most cases', 'reteniendo al cliente en la mayoría de los casos')],
        tpl: { en: ['Resolved escalated {what}[, {result}]'], es: ['Resolví {what} escaladas[, {result}]'] } },
    ],
  },
  {
    id: 'healthcare',
    label: { en: 'Healthcare & Nursing', es: 'Salud y Enfermería' },
    questions: [
      { id: 'hc-patients', q: { en: 'How many patients did you care for, and in what setting?', es: '¿A cuántos pacientes atendías y en qué entorno?' },
        fields: [F('count', 'How many patients?', '¿Cuántos pacientes?', '6'), F('per', 'Per what?', '¿Por qué período?', 'shift', 'turno'), F('setting', 'Setting', 'Entorno', 'a 30-bed medical-surgical unit', 'una unidad médico-quirúrgica de 30 camas')],
        tpl: { en: ['Provided care for {count} patients per {per}[ in {setting}]'], es: ['Brindé cuidado a {count} pacientes por {per}[ en {setting}]'] } },
      { id: 'hc-quality', q: { en: 'Did you help improve safety, quality or compliance?', es: '¿Contribuiste a mejorar la seguridad, calidad o cumplimiento?' },
        fields: [F('what', 'What?', '¿Qué?', 'medication reconciliation', 'la reconciliación de medicamentos'), F('result', 'Result (optional)', 'Resultado (opcional)', 'zero errors in the 2023 audit', 'cero errores en la auditoría de 2023')],
        tpl: { en: ['Strengthened {what}[, contributing to {result}]'], es: ['Fortalecí {what}[, contribuyendo a {result}]'] } },
      { id: 'hc-education', q: { en: 'Did you educate patients or families?', es: '¿Educaste a pacientes o familiares?' },
        fields: [F('topic', 'On what?', '¿Sobre qué?', 'diabetes self-management', 'el manejo de la diabetes'), F('lang', 'In which languages? (optional)', '¿En qué idiomas? (opcional)', 'English and Spanish', 'inglés y español')],
        tpl: { en: ['Educated patients and families on {topic}[ in {lang}]'], es: ['Eduqué a pacientes y familiares sobre {topic}[ en {lang}]'] } },
    ],
  },
  {
    id: 'education',
    label: { en: 'Education & Training', es: 'Educación y Adiestramiento' },
    questions: [
      { id: 'ed-students', q: { en: 'Whom did you teach?', es: '¿A quién enseñaste?' },
        fields: [F('count', 'How many students?', '¿Cuántos estudiantes?', '120'), F('who', 'Grade / level / subject', 'Grado / nivel / materia', '9th-grade algebra', 'álgebra de noveno grado')],
        tpl: { en: ['Taught {count} students in {who}'], es: ['Enseñé a {count} estudiantes de {who}'] } },
      { id: 'ed-results', q: { en: 'Did student results, attendance or engagement improve?', es: '¿Mejoraron los resultados, la asistencia o la participación de los estudiantes?' },
        fields: [F('metric', 'Which measure?', '¿Qué medida?', 'state exam pass rate', 'tasa de aprobación en pruebas'), F('from', 'From (optional)', 'Desde (opcional)', '61%'), F('to', 'To', 'Hasta', '78%')],
        tpl: { en: ['Raised {metric} from {from} to {to}', 'Improved {metric} to {to}'], es: ['Aumenté la {metric} de {from} a {to}', 'Mejoré la {metric} a {to}'] } },
      { id: 'ed-curriculum', q: { en: 'Did you create lessons, programs or materials?', es: '¿Creaste lecciones, programas o materiales?' },
        fields: [F('what', 'What did you create?', '¿Qué creaste?', 'a project-based science curriculum', 'un currículo de ciencias basado en proyectos'), F('used', 'Who used it? (optional)', '¿Quién lo usó? (opcional)', 'by all 4 grade-level teachers', 'por los 4 maestros del grado')],
        tpl: { en: ['Developed {what}[ adopted {used}]'], es: ['Desarrollé {what}[ adoptado {used}]'] } },
    ],
  },
  {
    id: 'admin',
    label: { en: 'Administrative & Office', es: 'Administración y Oficina' },
    questions: [
      { id: 'ad-support', q: { en: 'Whom did you support, and with what?', es: '¿A quién apoyabas y con qué?' },
        fields: [F('who', 'Who?', '¿A quién?', 'a 5-person executive team', 'un equipo ejecutivo de 5 personas'), F('what', 'With what?', '¿Con qué?', 'calendars, travel and board materials', 'agendas, viajes y documentos de junta')],
        tpl: { en: ['Supported {who} with {what}'], es: ['Apoyé a {who} con {what}'] } },
      { id: 'ad-records', q: { en: 'Did you manage records, data, billing or scheduling?', es: '¿Manejaste expedientes, datos, facturación o citas?' },
        fields: [F('what', 'What?', '¿Qué?', 'patient scheduling', 'citas de pacientes'), F('volume', 'Volume (optional)', 'Volumen (opcional)', '150 appointments a week', '150 citas semanales'), F('tool', 'Tools (optional)', 'Herramientas (opcional)', 'Excel and QuickBooks', 'Excel y QuickBooks')],
        tpl: { en: ['Managed {what}[ for {volume}][ using {tool}]'], es: ['Manejé {what}[ para {volume}][ utilizando {tool}]'] } },
    ],
  },
  {
    id: 'tech',
    label: { en: 'IT & Technology', es: 'Tecnología e Informática' },
    questions: [
      { id: 'it-build', q: { en: 'Did you build, deploy or migrate a system, app or feature?', es: '¿Construiste, implementaste o migraste un sistema, aplicación o función?' },
        fields: [F('what', 'What?', '¿Qué?', 'a customer self-service portal', 'un portal de autoservicio'), F('tech', 'Technologies (optional)', 'Tecnologías (opcional)', 'React and Node.js'), F('result', 'Result (optional)', 'Resultado (opcional)', 'reduced support calls by 20%', 'redujo las llamadas de soporte en 20%')],
        tpl: { en: ['Built {what}[ with {tech}][ that {result}]'], es: ['Desarrollé {what}[ con {tech}][ que {result}]'] } },
      { id: 'it-support', q: { en: 'Did you support users or keep systems running?', es: '¿Brindaste soporte a usuarios o mantuviste sistemas funcionando?' },
        fields: [F('count', 'How many users/devices?', '¿Cuántos usuarios/equipos?', '300'), F('result', 'Result (optional)', 'Resultado (opcional)', '99.9% uptime', '99.9% de disponibilidad')],
        tpl: { en: ['Supported {count} users[ while maintaining {result}]'], es: ['Brindé soporte a {count} usuarios[ manteniendo {result}]'] } },
    ],
  },
  {
    id: 'management',
    label: { en: 'Management & Leadership', es: 'Gerencia y Liderazgo' },
    questions: [
      { id: 'mg-team', q: { en: 'How large was the team you led?', es: '¿Qué tamaño tenía el equipo que dirigías?' },
        fields: [F('count', 'How many people?', '¿Cuántas personas?', '18'), F('who', 'What roles?', '¿Qué puestos?', 'sales and support staff', 'personal de ventas y servicio'), F('scope', 'Scope (optional)', 'Alcance (opcional)', 'across 3 locations', 'en 3 localidades')],
        tpl: { en: ['Led a team of {count} {who}[ {scope}]'], es: ['Dirigí un equipo de {count} {who}[ {scope}]'] } },
      { id: 'mg-budget', q: { en: 'Did you manage a budget or P&L?', es: '¿Administraste un presupuesto o estado de ganancias?' },
        fields: [F('amount', 'Size of budget', 'Tamaño del presupuesto', '2.1M'), F('result', 'Result (optional)', 'Resultado (opcional)', 'finishing 4% under budget', 'terminando 4% bajo presupuesto')],
        tpl: { en: ['Managed a ${amount} budget[, {result}]'], es: ['Administré un presupuesto de ${amount}[, {result}]'] } },
      { id: 'mg-change', q: { en: 'Did you lead a change, launch or turnaround?', es: '¿Dirigiste un cambio, lanzamiento o recuperación?' },
        fields: [F('what', 'What?', '¿Qué?', 'the move to a new scheduling system', 'la transición a un nuevo sistema de turnos'), F('result', 'Result (optional)', 'Resultado (opcional)', 'with no service interruptions', 'sin interrupciones del servicio')],
        tpl: { en: ['Led {what}[ {result}]'], es: ['Dirigí {what}[ {result}]'] } },
    ],
  },
  {
    id: 'hospitality',
    label: { en: 'Retail, Restaurants & Hospitality', es: 'Ventas al Detal, Restaurantes y Hospitalidad' },
    questions: [
      { id: 'hs-volume', q: { en: 'How busy was it? How many guests or transactions?', es: '¿Qué tan concurrido era? ¿Cuántos clientes o transacciones?' },
        fields: [F('count', 'How many?', '¿Cuántos?', '200'), F('what', 'Guests / transactions / covers', 'Clientes / transacciones', 'guests', 'clientes'), F('per', 'Per what?', '¿Por qué período?', 'shift', 'turno')],
        tpl: { en: ['Served {count}+ {what} per {per}'], es: ['Atendí {count}+ {what} por {per}'] } },
      { id: 'hs-upsell', q: { en: 'Did you increase sales, average tickets or reviews?', es: '¿Aumentaste ventas, el promedio de compra o las reseñas?' },
        fields: [F('what', 'What increased?', '¿Qué aumentó?', 'average check size', 'el promedio por cuenta'), F('by', 'By how much? (optional)', '¿Cuánto? (opcional)', '12%'), F('how', 'How? (optional)', '¿Cómo? (opcional)', 'recommending specials', 'recomendando especiales')],
        tpl: { en: ['Increased {what}[ by {by}][ by {how}]'], es: ['Aumenté {what}[ en {by}][ {how}]'] } },
      { id: 'hs-cash', q: { en: 'Did you handle cash, inventory or opening/closing?', es: '¿Manejaste efectivo, inventario o apertura/cierre?' },
        fields: [F('what', 'What?', '¿Qué?', 'cash drawers and nightly deposits', 'cajas registradoras y depósitos diarios'), F('result', 'Accuracy / result (optional)', 'Precisión / resultado (opcional)', 'with 100% accuracy', 'con 100% de precisión')],
        tpl: { en: ['Managed {what}[ {result}]'], es: ['Manejé {what}[ {result}]'] } },
    ],
  },
  {
    id: 'trades',
    label: { en: 'Trades, Manufacturing & Logistics', es: 'Oficios, Manufactura y Logística' },
    questions: [
      { id: 'tr-safety', q: { en: 'What is your safety record?', es: '¿Cuál es tu historial de seguridad?' },
        fields: [F('record', 'Record', 'Historial', '3 years without a recordable incident', '3 años sin incidentes reportables')],
        tpl: { en: ['Maintained {record}'], es: ['Mantuve {record}'] } },
      { id: 'tr-output', q: { en: 'Did you increase output, accuracy or on-time delivery?', es: '¿Aumentaste la producción, precisión o entregas a tiempo?' },
        fields: [F('metric', 'Which measure?', '¿Qué medida?', 'on-time shipments', 'despachos a tiempo'), F('from', 'From (optional)', 'Desde (opcional)', '88%'), F('to', 'To', 'Hasta', '97%')],
        tpl: { en: ['Raised {metric} from {from} to {to}', 'Achieved {to} {metric}'], es: ['Aumenté los {metric} de {from} a {to}', 'Logré {to} en {metric}'] } },
      { id: 'tr-equipment', q: { en: 'What equipment, vehicles or licenses do you work with?', es: '¿Con qué equipo, vehículos o licencias trabajas?' },
        fields: [F('what', 'Equipment', 'Equipo', 'forklifts, pallet jacks and RF scanners', 'montacargas, carretillas y escáneres RF')],
        tpl: { en: ['Operated {what}'], es: ['Operé {what}'] } },
    ],
  },
  {
    id: 'finance',
    label: { en: 'Finance & Accounting', es: 'Finanzas y Contabilidad' },
    questions: [
      { id: 'fi-close', q: { en: 'Did you handle closings, reconciliations or reporting?', es: '¿Manejaste cierres, reconciliaciones o informes?' },
        fields: [F('what', 'What?', '¿Qué?', 'month-end close for 4 entities', 'el cierre mensual de 4 entidades'), F('result', 'Result (optional)', 'Resultado (opcional)', 'cutting close time from 10 to 6 days', 'reduciendo el cierre de 10 a 6 días')],
        tpl: { en: ['Managed {what}[, {result}]'], es: ['Manejé {what}[, {result}]'] } },
      { id: 'fi-accuracy', q: { en: 'Did you find errors, savings or recover money?', es: '¿Encontraste errores, ahorros o recuperaste dinero?' },
        fields: [F('amount', 'Amount', 'Cantidad', '85,000'), F('how', 'How?', '¿Cómo?', 'auditing vendor invoices', 'auditando facturas de suplidores')],
        tpl: { en: ['Recovered ${amount}[ by {how}]'], es: ['Recuperé ${amount}[ {how}]'] } },
    ],
  },
  {
    id: 'marketing',
    label: { en: 'Marketing & Communications', es: 'Mercadeo y Comunicaciones' },
    questions: [
      { id: 'mk-campaign', q: { en: 'Did you run a campaign, event or content program?', es: '¿Dirigiste una campaña, evento o programa de contenido?' },
        fields: [F('what', 'What?', '¿Qué?', 'a back-to-school social media campaign', 'una campaña de regreso a clases en redes'), F('result', 'Result (optional)', 'Resultado (opcional)', 'reaching 40,000 people', 'alcanzando 40,000 personas')],
        tpl: { en: ['Launched {what}[, {result}]'], es: ['Lancé {what}[, {result}]'] } },
      { id: 'mk-growth', q: { en: 'Did followers, leads, traffic or conversions grow?', es: '¿Crecieron los seguidores, prospectos, tráfico o conversiones?' },
        fields: [F('metric', 'Which measure?', '¿Qué medida?', 'qualified leads', 'prospectos calificados'), F('by', 'By how much?', '¿Cuánto?', '35%'), F('period', 'Over what period? (optional)', '¿En qué período? (opcional)', 'in 6 months', 'en 6 meses')],
        tpl: { en: ['Grew {metric} by {by}[ {period}]'], es: ['Aumenté los {metric} en {by}[ {period}]'] } },
    ],
  },
];

export function questionsFor(professionId) {
  const p = PROFESSIONS.find((x) => x.id === professionId) || PROFESSIONS[0];
  return [...p.questions, ...COMMON];
}

/** Action verbs grouped by purpose — truthful synonyms, never "upgrades". */
export const VERB_BANK = {
  en: {
    lead: ['Led', 'Directed', 'Supervised', 'Managed', 'Coordinated', 'Oversaw'],
    improve: ['Improved', 'Streamlined', 'Simplified', 'Redesigned', 'Upgraded', 'Standardized'],
    grow: ['Increased', 'Grew', 'Expanded', 'Raised', 'Boosted'],
    reduce: ['Reduced', 'Cut', 'Decreased', 'Lowered', 'Eliminated'],
    create: ['Created', 'Developed', 'Designed', 'Built', 'Launched', 'Introduced'],
    support: ['Supported', 'Assisted', 'Served', 'Resolved', 'Advised', 'Guided'],
    teach: ['Trained', 'Coached', 'Mentored', 'Taught', 'Onboarded'],
  },
  es: {
    lead: ['Dirigí', 'Supervisé', 'Gestioné', 'Coordiné', 'Lideré', 'Administré'],
    improve: ['Mejoré', 'Optimicé', 'Simplifiqué', 'Rediseñé', 'Estandaricé'],
    grow: ['Aumenté', 'Incrementé', 'Amplié', 'Expandí'],
    reduce: ['Reduje', 'Disminuí', 'Eliminé', 'Recorté'],
    create: ['Creé', 'Desarrollé', 'Diseñé', 'Establecí', 'Lancé', 'Implementé'],
    support: ['Apoyé', 'Atendí', 'Asesoré', 'Resolví', 'Orienté'],
    teach: ['Adiestré', 'Capacité', 'Orienté', 'Enseñé', 'Entrené'],
  },
};
