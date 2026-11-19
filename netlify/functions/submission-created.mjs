// Netlify calls this automatically after every form submission.
// Website "merchant-leads" submissions become NEW CRM leads; "analysis-results" (a merchant who
// ran a statement analysis) creates or upgrades the lead to WARM. Never fails the submission.
import { connectLambda } from '@netlify/blobs';
import { getCrmStore } from '../crm-lib/store.mjs';
import { createLead, findLeadByEmail, setStatus, saveLead, addEvent } from '../crm-lib/core.mjs';

export const handler = async (event) => {
  try {
    if (!process.env.CRM_STORE_DIR) connectLambda(event);
    const { payload } = JSON.parse(event.body || '{}');
    const form = payload?.form_name;
    const d = payload?.data || {};
    if (form !== 'merchant-leads' && form !== 'analysis-results') return { statusCode: 200, body: 'ignored' };
    const store = await getCrmStore();
    const email = d.business_email || d.email;
    const fields = {
      business_name: d.business_name, contact_name: d.contact_name, email, phone: d.phone,
      business_type: d.business_type, monthly_volume: d.monthly_volume, current_processor: d.current_processor,
    };
    let lead = email ? await findLeadByEmail(store, email) : null;
    if (!lead) {
      lead = await createLead(store, { ...fields, status: form === 'analysis-results' ? 'warm' : 'new' }, { source: 'Website form' });
    } else {
      for (const [k, v] of Object.entries(fields)) if (v && !lead[k]) lead[k] = String(v).trim();
    }
    if (form === 'analysis-results') {
      lead.analysis = {
        analysis_id: d.analysis_id, statement_grade: d.statement_grade, effective_rate: d.effective_rate,
        pricing_model: d.pricing_model, estimated_monthly_opportunity: d.estimated_monthly_opportunity,
        estimated_annual_opportunity: d.estimated_annual_opportunity, recommendation: d.recommendation,
      };
      await addEvent(store, lead.id, 'analysis', { analysis_id: d.analysis_id, grade: d.statement_grade });
      if (lead.status === 'new') await setStatus(store, lead, 'warm', 'Ran a statement analysis');
    }
    await saveLead(store, lead);
  } catch (e) {
    console.error('CRM sync from form failed', e);
  }
  return { statusCode: 200, body: 'ok' };
};
