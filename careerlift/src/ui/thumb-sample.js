// Placeholder content for template thumbnails when the resume is still empty.
import { emptyExperience, emptyBullet, emptyEducation } from '../model/schema.js';

export function sampleForThumbs(r) {
  const es = r.meta.language.startsWith('es');
  return {
    contact: { ...r.contact, fullName: 'Alex Rivera', headline: es ? 'Coordinador de Proyectos' : 'Project Coordinator', email: 'alex@example.com', phone: '(555) 010-2030', location: 'Orlando, FL', linkedin: '', website: '' },
    summary: es ? 'Profesional organizado con experiencia coordinando equipos y proyectos.' : 'Organized professional with experience coordinating teams, schedules and budgets.',
    experience: [
      emptyExperience({ title: es ? 'Coordinador' : 'Coordinator', company: 'Company A', startDate: '2021', current: true, bullets: ['Coordinated 30+ projects per year', 'Reduced delays by 15%', 'Trained 8 new team members'].map(emptyBullet) }),
      emptyExperience({ title: es ? 'Asistente' : 'Assistant', company: 'Company B', startDate: '2018', endDate: '2021', bullets: ['Managed schedules for 5 managers', 'Organized supplier records'].map(emptyBullet) }),
    ],
    education: [emptyEducation({ degree: 'B.A. Communications', school: 'State University', endDate: '2018' })],
    skills: ['Scheduling', 'Budgets', 'Excel', 'Teamwork', 'Customer Service'],
    languages: ['English', 'Spanish'],
  };
}
