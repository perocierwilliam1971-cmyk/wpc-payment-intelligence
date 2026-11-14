// Readiness score + exportable prep sheet.
import { predictQuestions } from './analyze.js';
import { getPlaybook, buildScript, playbookComplete, langComplete } from './playbooks.js';

export function emptyInterviewState() {
  return { targetRole: '', company: '', answers: {}, playbooks: {}, drills: 0 };
}

const filled = (a) => !!(a && (String(a.en || '').trim() || String(a.es || '').trim()));

/** 0–100 readiness: nothing prepared = 0, everything prepared = 100. */
export function readiness(resume, iv, now) {
  const qs = predictQuestions(resume, { targetRole: iv.targetRole, now });
  const answered = qs.filter((q) => filled(iv.answers[q.id])).length;
  const needed = [...new Set(qs.map((q) => q.playbook).filter(Boolean))];
  const done = needed.filter((id) => playbookComplete(getPlaybook(id), iv.playbooks[id])).length;
  const bilingualQ = qs.some((q) => q.kind === 'bilingual');
  // Weights: questions 70, playbooks 20, bilingual drills 10 (only for bilingual resumes).
  const parts = [[70, qs.length ? answered / qs.length : 0]];
  if (needed.length) parts.push([20, done / needed.length]);
  if (bilingualQ) parts.push([10, Math.min(1, (iv.drills || 0) / 3)]);
  const total = parts.reduce((a, [w]) => a + w, 0);
  const score = Math.round((parts.reduce((a, [w, v]) => a + w * v, 0) / total) * 100);
  return { score, questions: qs.length, answered, playbooksNeeded: needed.length, playbooksDone: done, bilingual: bilingualQ };
}

export function prepSheet(resume, iv, lang, now) {
  const es = lang.startsWith('es');
  const qs = predictQuestions(resume, { targetRole: iv.targetRole, now });
  const out = [];
  out.push(es ? 'HOJA DE PREPARACIÓN PARA LA ENTREVISTA' : 'INTERVIEW PREP SHEET');
  const target = [iv.targetRole, iv.company].filter(Boolean).join(es ? ' — ' : ' — ');
  if (target) out.push(target);
  out.push('');
  qs.forEach((q, i) => {
    out.push(`${i + 1}. ${es ? q.q.es : q.q.en}`);
    out.push(`   ${es ? 'Por qué lo preguntan' : 'Why they ask'}: ${es ? q.why.es : q.why.en}`);
    const a = iv.answers[q.id] || {};
    if (String(a.en || '').trim()) out.push(`   EN: ${a.en.trim()}`);
    if (String(a.es || '').trim()) out.push(`   ES: ${a.es.trim()}`);
    if (!filled(a)) out.push(`   ${es ? '[Prepara tu respuesta]' : '[Prepare your answer]'}`);
    out.push('');
  });
  const used = Object.entries(iv.playbooks || {}).filter(([id, v]) => getPlaybook(id) && playbookComplete(getPlaybook(id), v));
  if (used.length) {
    out.push(es ? 'MIS RESPUESTAS PARA SITUACIONES DIFÍCILES' : 'MY ANSWERS FOR DIFFICULT SITUATIONS', '');
    for (const [id, v] of used) {
      const pb = getPlaybook(id);
      out.push(es ? pb.title.es : pb.title.en);
      if (langComplete(pb, v.en)) out.push(`EN: ${buildScript(pb, v.en, 'en')}`);
      if (langComplete(pb, v.es)) out.push(`ES: ${buildScript(pb, v.es, 'es')}`);
      out.push('');
    }
  }
  return out.join('\n').trim();
}
