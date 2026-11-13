import './styles/landing.css';

// Set VITE_PURCHASE_URL (e.g. a Stripe Payment Link, Lemon Squeezy or Gumroad
// checkout) in Netlify's environment variables to turn the Buy button on.
const PURCHASE_URL = import.meta.env.VITE_PURCHASE_URL || '';

const ES = {
  'nav.features': 'Funciones', 'nav.compare': 'Comparar', 'nav.pricing': 'Precio',
  'hero.eyebrow': 'Mejora de resumé + herramientas profesionales',
  'hero.title': 'No solo crees un resumé. Construye tu próxima oportunidad.',
  'hero.lead': 'Sube el resumé que tienes, convierte tus tareas diarias en resultados claros, elige un diseño profesional y descarga archivos PDF y Word impecables, en español o inglés.',
  'hero.cta': 'Comenzar', 'hero.price': 'Pago único de $9.99 · sin suscripción',
  'hero.privacy': '🔒 Tu resumé se procesa en tu navegador. No se sube a nuestros servidores.',
  'hero.before': 'Antes: “Responsable de las quejas de clientes”', 'hero.after': 'Después: “Resolví más de 40 casos de clientes al día” — con tus cifras reales',
  'features.title': 'Lo que obtienes',
  'f1.t': 'Sube y autocompleta', 'f1.d': 'PDF, Word o texto. Extraemos tus datos de contacto, empleos, logros, educación y destrezas en campos editables, sin eliminar ninguna línea en silencio.',
  'f2.t': 'Achievement Detective™ Lite', 'f2.d': 'Preguntas guiadas según tu campo te ayudan a encontrar resultados medibles. Compara el original con la mejora y acepta, edita o rechaza. Nunca inventamos cifras.',
  'f3.t': 'Seis diseños realmente distintos', 'f3.d': 'Classic ATS, Executive Pro, Modern Professional, Minimalist, Creative Edge y Corporate Elite. Personaliza colores, tipografías, espaciado, orden de secciones y tamaño de página con vista previa en vivo.',
  'f4.t': 'Descargas iguales a la vista previa', 'f4.d': 'PDF con texto real y seleccionable y tu diseño exacto. Archivo Word editable con tu diseño. Texto limpio para formularios. Compatible con guardar/compartir en iPhone y iPad.',
  'f5.t': 'Herramientas profesionales', 'f5.d': 'Cartas de presentación, mensajes para reclutadores y LinkedIn, correos de seguimiento, lista ATS y comparador de palabras clave, preparación para entrevistas, hojas STAR y guías de cambio de carrera.',
  'f6.t': 'Bilingüe, incluido Puerto Rico', 'f6.d': 'Interfaz y documentos completos en español e inglés, con preferencias de Puerto Rico como “resumé”, “destrezas” y “preparación académica”.',
  'who.title': 'Hecho para carreras reales',
  'who.1': 'Profesionales con experiencia listos para el próximo paso', 'who.2': 'Personas en cambio de carrera que traducen sus destrezas', 'who.3': 'Madres, padres, cuidadores y veteranos que regresan al empleo', 'who.4': 'Recién graduados que escriben su primer resumé sólido', 'who.5': 'Candidatos bilingües que solicitan en español e inglés',
  'compare.title': 'Cómo se compara CareerLift', 'compare.tpl': 'Sitio típico de plantillas', 'compare.sub': 'Constructor típico por suscripción',
  'c.price': 'Precio', 'c.price.cl': '$9.99 una vez', 'c.price.t': 'Gratis–$5, limitado', 'c.price.s': 'A menudo $20–$30+/mes',
  'c.improve': 'Ayuda a mejorar tu contenido', 'c.upload': 'Subir tu resumé actual', 'c.toolkit': 'Cartas, entrevistas y LinkedIn', 'c.spanish': 'Español profesional (incl. Puerto Rico)', 'c.private': 'Tu resumé se queda en tu dispositivo',
  'c.varies': 'Varía', 'c.often': 'A menudo', 'c.rare': 'Poco común', 'c.usually': 'Usualmente en la nube',
  'compare.note': 'La comparación refleja patrones comunes del mercado, no una empresa en particular. Verifica los precios actuales antes de comprar.',
  'pricing.title': 'Precio sencillo', 'pricing.once': 'pago único', 'pricing.cta': 'Obtener CareerLift',
  'p.1': 'Las seis plantillas y personalización', 'p.2': 'Descargas ilimitadas en PDF, Word y texto', 'p.3': 'Achievement Detective™ Lite', 'p.4': 'Herramientas profesionales bilingües completas', 'p.5': 'Sin suscripción ni renovación automática',
  'faq.title': 'Respuestas honestas',
  q1: '¿Esto me conseguirá una entrevista?', a1: 'Ninguna herramienta puede prometerlo. CareerLift te ayuda a presentar tu experiencia real con claridad y profesionalismo; las entrevistas dependen del mercado, de tu perfil y de muchos otros factores.',
  q2: '¿Está “aprobado para ATS”?', a2: 'No existe una aprobación oficial de ATS. CareerLift crea PDF con texto real y seleccionable y títulos estándar, e incluye una versión de texto y una lista ATS. La plantilla Classic ATS es la opción más segura para portales grandes.',
  q3: '¿Usa inteligencia artificial?', a3: 'No. Achievement Detective™ Lite usa reglas de redacción y tus propias respuestas. Nunca inventa logros, patronos, cifras ni cualificaciones.',
  q4: '¿Dónde se guarda mi información?', a4: 'En tu propio navegador, en tu dispositivo. Puedes descargar una copia de seguridad cuando quieras. Borrar los datos del navegador, la navegación privada o largos periodos sin uso (Safari puede borrar datos tras 7 días sin visitas) pueden eliminarla: guarda una copia.',
  q5: '¿Funciona en iPhone y iPad?', a5: 'Sí. Está diseñado para Safari y Chrome en iPhone y iPad, además de Android, Windows y Mac. En iOS, usa “Compartir / Guardar en Archivos” para guardar tus documentos.',
  foot: 'Hecho para quienes buscan empleo. No garantiza empleo, entrevistas ni resultados de ATS.',
};

const original = new Map();
document.querySelectorAll('[data-i18n]').forEach((el) => original.set(el, el.textContent));
let lang = (() => { try { return localStorage.getItem('careerlift:landing-lang') || (navigator.language || '').slice(0, 2); } catch { return 'en'; } })() === 'es' ? 'es' : 'en';
const toggle = document.getElementById('lang-toggle');

function apply() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n;
    el.textContent = lang === 'es' && ES[k] ? ES[k] : original.get(el);
  });
  toggle.textContent = lang === 'es' ? 'EN' : 'ES';
  toggle.setAttribute('aria-label', lang === 'es' ? 'English' : 'Español');
  const buy = document.getElementById('buy');
  const note = document.getElementById('buy-note');
  if (PURCHASE_URL) {
    buy.href = PURCHASE_URL;
    note.textContent = lang === 'es' ? 'Pago seguro procesado por nuestro proveedor de pagos.' : 'Secure checkout handled by our payment provider.';
  } else {
    buy.href = 'app.html';
    buy.textContent = lang === 'es' ? 'Probar la versión de lanzamiento' : 'Try the launch preview';
    note.textContent = lang === 'es' ? 'El pago aún no está activado en este sitio.' : 'Checkout is not enabled on this site yet.';
  }
}
toggle.addEventListener('click', () => {
  lang = lang === 'es' ? 'en' : 'es';
  try { localStorage.setItem('careerlift:landing-lang', lang); } catch { /* ignore */ }
  apply();
});
document.getElementById('yr').textContent = new Date().getFullYear();
apply();
