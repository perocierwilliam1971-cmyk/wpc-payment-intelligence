// A realistic two-page resume used across unit, export and e2e tests.
import { createEmptyResume, emptyExperience, emptyBullet, emptyEducation, emptyCertification, emptyCustomSection } from '../../src/model/schema.js';

export function sampleResume(language = 'en') {
  const r = createEmptyResume(language);
  r.contact = {
    fullName: 'María Elena Rodríguez',
    headline: 'Operations Manager | Bilingual Customer Experience Leader',
    email: 'maria.rodriguez@example.com',
    phone: '(787) 555-0142',
    location: 'San Juan, PR',
    linkedin: 'https://www.linkedin.com/in/mariaerodriguez',
    website: '',
  };
  r.summary = 'Bilingual operations manager with 12 years of experience leading customer service and logistics teams in high-volume environments. Known for building training programs, improving service metrics and partnering with finance to control costs.';
  r.experience = [
    emptyExperience({
      title: 'Operations Manager', company: 'Caribe Logistics Group', location: 'Bayamón, PR', startDate: 'Mar 2019', current: true,
      bullets: [
        'Lead a team of 28 warehouse and customer service associates across two shifts',
        'Reduced order fulfillment errors by 32% in 12 months by redesigning the pick-and-pack checklist',
        'Introduced a cross-training program that cut overtime costs by $48,000 per year',
        'Partner with finance on a $2.1M annual operating budget and monthly variance reporting',
        'Selected to lead the 2023 migration to a new warehouse management system with zero shipping downtime',
      ].map(emptyBullet),
    }),
    emptyExperience({
      title: 'Customer Service Supervisor', company: 'Banco Isla Federal', location: 'San Juan, PR', startDate: 'Jun 2014', endDate: 'Feb 2019',
      bullets: [
        'Supervised 15 bilingual call-center representatives handling 1,200+ calls per day',
        'Raised customer satisfaction scores from 78% to 91% through coaching and quality reviews',
        'Wrote the Spanish/English scripts used for fraud-alert calls across the contact center',
      ].map(emptyBullet),
    }),
    emptyExperience({
      title: 'Customer Service Representative', company: 'Island Telecom', location: 'Carolina, PR', startDate: 'Jan 2011', endDate: 'May 2014',
      bullets: [
        'Resolved billing and technical inquiries for residential and small-business accounts',
        'Recognized as Representative of the Quarter three times for first-call resolution',
      ].map(emptyBullet),
    }),
  ];
  r.education = [
    emptyEducation({ degree: 'Bachelor of Business Administration, Management', school: 'Universidad de Puerto Rico, Río Piedras', location: 'San Juan, PR', endDate: '2010' }),
  ];
  r.certifications = [
    emptyCertification({ name: 'Lean Six Sigma Green Belt', issuer: 'ASQ', date: '2021' }),
    emptyCertification({ name: 'OSHA 30-Hour General Industry', issuer: 'OSHA', date: '2020' }),
  ];
  r.skills = ['Team Leadership', 'Process Improvement', 'Budget Management', 'Warehouse Management Systems', 'Training & Coaching', 'Microsoft Excel', 'Customer Experience', 'KPI Reporting'];
  r.languages = ['Spanish (Native)', 'English (Professional)'];
  const vol = emptyCustomSection({ title: 'Volunteer Work', items: ['Board member, Junior Achievement of Puerto Rico (2020–present)', 'Hurricane María relief logistics coordinator, 2017'] });
  r.custom = [vol];
  r.design.sectionOrder = ['summary', 'experience', 'education', 'certifications', 'skills', 'languages', `custom:${vol.id}`];
  return r;
}
