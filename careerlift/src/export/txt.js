// Plain-text export: clean, structured content for pasting into online
// application forms. No hard line-wrapping (forms reflow text themselves).

import { normalizeResume, visibleSections } from '../model/schema.js';
import { sectionTitle, dateRange } from '../model/labels.js';

export function resumeToText(input) {
  const r = normalizeResume(input);
  const out = [];
  const ct = r.contact;
  if (ct.fullName) out.push(ct.fullName.toUpperCase());
  if (ct.headline) out.push(ct.headline);
  const contact = [ct.email, ct.phone, ct.location, ct.linkedin, ct.website].map((s) => s.trim()).filter(Boolean);
  if (contact.length) out.push(contact.join(' | '));

  for (const key of visibleSections(r)) {
    const title = sectionTitle(r, key).toUpperCase();
    out.push('', title, '-'.repeat(Math.max(3, title.length)));
    if (key === 'summary') out.push(r.summary.trim());
    if (key === 'experience') {
      r.experience.forEach((e, i) => {
        if (!e.title && !e.company && !e.bullets.some((b) => b.text.trim())) return;
        if (i > 0) out.push('');
        const head = [e.title, e.company].map((s) => s.trim()).filter(Boolean).join(' — ');
        if (head) out.push(head);
        const sub = [e.location.trim(), dateRange(e, r.meta.language)].filter(Boolean).join(' | ');
        if (sub) out.push(sub);
        for (const b of e.bullets) if (b.text.trim()) out.push(`- ${b.text.trim()}`);
      });
    }
    if (key === 'education') {
      r.education.forEach((e) => {
        if (!e.degree && !e.school) return;
        const head = [e.degree, e.school].map((s) => s.trim()).filter(Boolean).join(' — ');
        const sub = [e.location.trim(), dateRange(e, r.meta.language)].filter(Boolean).join(' | ');
        out.push(head + (sub ? ` (${sub})` : ''));
        if (e.details.trim()) out.push(`  ${e.details.trim()}`);
      });
    }
    if (key === 'certifications') {
      r.certifications.forEach((c) => {
        if (!c.name.trim()) return;
        const tail = [c.issuer, c.date].map((s) => s.trim()).filter(Boolean).join(', ');
        out.push(`- ${c.name.trim()}${tail ? ` — ${tail}` : ''}`);
      });
    }
    if (key === 'skills' || key === 'languages') out.push(r[key].join(', '));
    if (key.startsWith('custom:')) {
      const sec = r.custom.find((s) => `custom:${s.id}` === key);
      for (const it of sec.items) out.push(`- ${it}`);
    }
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
