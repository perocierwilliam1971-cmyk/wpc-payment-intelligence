// JSON API behind the CRM page (/crm/). Every route needs "Authorization: Bearer <CRM_ADMIN_TOKEN>",
// except /api/crm/inbound which authenticates with ?key=<CRM_INBOUND_SECRET> (for inbound-email webhooks).
import { getCrmStore } from '../crm-lib/store.mjs';
import * as crm from '../crm-lib/core.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

async function body(req) {
  try { return await req.json(); } catch { throw crm.httpError(400, 'Invalid JSON body'); }
}

export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/crm\/?/, '').split('/').filter(Boolean);
  const method = req.method;
  const cfg = crm.config();
  try {
    const store = await getCrmStore();

    // Inbound reply webhook (Resend Inbound, Zapier, Make, a mail forwarder...).
    if (parts[0] === 'inbound' && method === 'POST') {
      if (!cfg.inboundSecret || !crm.safeEqual(url.searchParams.get('key') || '', cfg.inboundSecret)) return json(401, { error: 'Bad inbound key' });
      const b = await body(req);
      const d = b.data && typeof b.data === 'object' ? b.data : b; // Resend wraps the email in "data"
      const from = Array.isArray(d.from) ? d.from[0] : d.from;
      const result = await crm.recordReply(store, {
        from: typeof from === 'object' ? from?.address || from?.email : from,
        subject: d.subject || '',
        messageId: d.message_id || d.messageId || d.email_id || d.id || '',
        auto: Boolean(d.auto),
        source: 'webhook',
      });
      return json(200, result);
    }

    if (!cfg.adminToken) return json(503, { error: 'CRM_ADMIN_TOKEN is not configured on Netlify. See CRM-SETUP.md.' });
    const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!auth || !crm.safeEqual(auth, cfg.adminToken)) return json(401, { error: 'Wrong or missing access code' });

    const [resource, id, action] = parts;

    if (resource === 'status' && method === 'GET') {
      return json(200, {
        resend: Boolean(cfg.resendKey), from: Boolean(cfg.from), replyTo: Boolean(cfg.replyTo),
        mailingAddress: Boolean(cfg.mailingAddress), publicUrl: cfg.publicUrl,
        imap: Boolean(cfg.imap.host && cfg.imap.user && cfg.imap.pass), inbound: Boolean(cfg.inboundSecret),
        dryRun: cfg.dryRun, imapState: await store.get('meta/imap'), lastRun: await store.get('meta/lastRun'),
        syncRunning: await store.get('meta/syncRunning'),
      });
    }

    if (resource === 'run' && method === 'POST') {
      // Gmail can take longer than a normal request is allowed, so the work runs in the background.
      // The page then watches /status until lastRun is newer than this start time.
      const requestedAt = Date.now();
      try {
        await crm.startBackgroundSync(new URL(req.url).origin, 'button');
        return json(202, { started: true, requestedAt });
      } catch (e) {
        console.error(e.message);
        return json(200, { ...(await crm.runSync(store, 'button')), requestedAt });
      }
    }

    if (resource === 'leads') {
      if (!id && method === 'GET') {
        const [leads, summaries] = await Promise.all([crm.listLeads(store), crm.eventSummaries(store)]);
        return json(200, { leads: leads.map((l) => ({ ...l, activity: summaries[l.id] || { counts: {}, last: {} } })) });
      }
      if (!id && method === 'POST') return json(201, { lead: await crm.createLead(store, await body(req)) });
      if (id && !action && method === 'GET') {
        const lead = await crm.getLead(store, id);
        if (!lead) return json(404, { error: 'Lead not found' });
        return json(200, { lead, events: await crm.leadEvents(store, id) });
      }
      if (id && !action && method === 'PATCH') return json(200, { lead: await crm.updateLead(store, id, await body(req)) });
      if (id && !action && method === 'DELETE') { await crm.deleteLead(store, id); return json(200, { ok: true }); }
      if (id && action === 'email' && method === 'POST') {
        const lead = await crm.getLead(store, id);
        if (!lead) return json(404, { error: 'Lead not found' });
        const b = await body(req);
        return json(200, await crm.sendToLead(store, lead, { subject: b.subject, body: b.body, kind: 'manual' }));
      }
      if (id && action === 'enroll' && method === 'POST') return json(200, { lead: await crm.enroll(store, id, (await body(req)).sequenceId) });
      if (id && action === 'unenroll' && method === 'POST') {
        const lead = await crm.getLead(store, id);
        if (!lead) return json(404, { error: 'Lead not found' });
        await crm.stopSequence(store, lead, 'Stopped manually');
        return json(200, { lead: await crm.saveLead(store, lead) });
      }
      if (id && action === 'reply' && method === 'POST') {
        const lead = await crm.getLead(store, id);
        if (!lead?.email) return json(400, { error: 'Lead has no email address' });
        await crm.recordReply(store, { from: lead.email, subject: 'Marked as replied manually', source: 'manual' });
        return json(200, { lead: await crm.getLead(store, id) });
      }
    }

    if (resource === 'sequences') {
      if (!id && method === 'GET') return json(200, { sequences: await crm.listSequences(store) });
      if (!id && method === 'POST') return json(201, { sequence: await crm.saveSequence(store, null, await body(req)) });
      if (id && method === 'PUT') return json(200, { sequence: await crm.saveSequence(store, id, await body(req)) });
      if (id && method === 'DELETE') {
        const inUse = (await crm.listLeads(store)).filter((l) => l.sequence?.state === 'active' && l.sequence.sequenceId === id);
        if (inUse.length) return json(409, { error: `${inUse.length} lead(s) are still in this sequence. Stop them first.` });
        await store.delete(`seq/${id}`);
        return json(200, { ok: true });
      }
    }

    return json(404, { error: 'Not found' });
  } catch (err) {
    if (!err.status) console.error(err);
    return json(err.status || 500, { error: err.message || 'Server error' });
  }
};

export const config = { path: '/api/crm/*' };
