// Section headings and small words used *inside the resume document*.
// The resume language is independent of the interface language: a Spanish-
// speaking user may still want an English resume, and vice-versa.

const LABELS = {
  en: {
    summary: 'Professional Summary',
    experience: 'Professional Experience',
    education: 'Education',
    certifications: 'Certifications',
    skills: 'Skills',
    languages: 'Languages',
    present: 'Present',
    contact: 'Contact',
    coreCompetencies: 'Core Competencies',
    executiveSummary: 'Executive Summary',
  },
  es: {
    summary: 'Resumen Profesional',
    experience: 'Experiencia Profesional',
    education: 'Educación',
    certifications: 'Certificaciones',
    skills: 'Habilidades',
    languages: 'Idiomas',
    present: 'Presente',
    contact: 'Contacto',
    coreCompetencies: 'Competencias Clave',
    executiveSummary: 'Perfil Ejecutivo',
  },
  // Puerto Rico: "destrezas" is the everyday word on the island; "Preparación
  // Académica" is the heading most local employers expect.
  'es-PR': {
    summary: 'Resumen Profesional',
    experience: 'Experiencia de Empleo',
    education: 'Preparación Académica',
    certifications: 'Certificaciones y Licencias',
    skills: 'Destrezas',
    languages: 'Idiomas',
    present: 'Presente',
    contact: 'Contacto',
    coreCompetencies: 'Destrezas Principales',
    executiveSummary: 'Perfil Ejecutivo',
  },
};

export function docLabels(language) {
  return LABELS[language] || LABELS.en;
}

export function sectionTitle(resume, key) {
  const L = docLabels(resume.meta.language);
  if (key.startsWith('custom:')) {
    const c = resume.custom.find((s) => `custom:${s.id}` === key);
    return c?.title || '';
  }
  return L[key] || key;
}

export function dateRange(item, language) {
  const L = docLabels(language);
  const start = (item.startDate || '').trim();
  const end = item.current ? L.present : (item.endDate || '').trim();
  if (start && end) return `${start} – ${end}`;
  return start || end;
}
