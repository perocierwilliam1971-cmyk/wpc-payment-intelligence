// WPC CRM core: leads, events, email building/sending, tracking tokens,
// reply detection (IMAP + inbound webhook) and the email-sequence runner.
import crypto from 'node:crypto';

export const STATUSES = ['new', 'warm', 'sale'];
export const LEAD_FIELDS = [
  'business_name', 'contact_name', 'email', 'phone', 'business_type',
  'monthly_volume', 'current_processor', 'notes', 'source',
];
export const TEMPLATE_VARS = [
  'first_name', 'contact_name', 'business_name', 'business_type', 'current_processor', 'sender_name',
];
const DAY = 86400000;
const AUTO_OPEN_WINDOW_MS = 2 * 60 * 1000; // opens this soon after sending are probably scanners/prefetch
const MAX_SENDS_PER_RUN = 40;

const env = (k, d = '') => (process.env[k] ?? d).toString().trim();

export function config() {
  return {
    publicUrl: env('CRM_PUBLIC_URL') || env('URL') || 'http://localhost:8888',
    adminToken: env('CRM_ADMIN_TOKEN'),
    trackingSecret: env('CRM_TRACKING_SECRET') || env('CRM_ADMIN_TOKEN'),
    resendKey: env('RESEND_API_KEY'),
    from: env('CRM_FROM_EMAIL') || env('WPC_FROM_EMAIL'),
    replyTo: env('CRM_REPLY_TO'),
    senderName: env('CRM_SENDER_NAME', 'WPC Merchant Advantage'),
    mailingAddress: env('CRM_MAILING_ADDRESS'),
    inboundSecret: env('CRM_INBOUND_SECRET'),
    dryRun: env('CRM_EMAIL_DRY_RUN') === '1',
    imap: {
      host: env('CRM_IMAP_HOST'),
      port: Number(env('CRM_IMAP_PORT', '993')) || 993,
      user: env('CRM_IMAP_USER'),
      pass: env('CRM_IMAP_PASS'),
      mailbox: env('CRM_IMAP_MAILBOX', 'INBOX'),
      sentMailbox: env('CRM_IMAP_SENT_MAILBOX'),
    },
  };
}

export const normEmail = (e) => String(e || '').trim().toLowerCase();
export function parseAddress(raw) {
  const s = String(raw || '');
  const m = s.match(/<([^>]+)>/);
  return normEmail(m ? m[1] : s);
}
const newId = () => crypto.randomUUID();
const rand = () => crypto.randomBytes(4).toString('hex');

// ---------- tracking tokens (HMAC-signed so nobody can forge opens/clicks/unsubscribes) ----------
const b64u = (buf) => Buffer.from(buf).toString('base64url');
function sign(payload) {
  const secret = config().trackingSecret;
  if (!secret) throw new Error('CRM_TRACKING_SECRET (or CRM_ADMIN_TOKEN) is not configured');
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 22);
}
export function makeToken(data) {
  const payload = b64u(JSON.stringify(data));
  return `${payload}.${sign(payload)}`;
}
export function readToken(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
}

// ---------- events (append-only keys: ev/<leadId>/<ts>_<type>_<rand>) ----------
// Type and time live in the key so the lead list can be summarised from a single list() call.
export async function addEvent(store, leadId, type, data = {}, at = Date.now()) {
  const key = `ev/${leadId}/${String(at).padStart(13, '0')}_${type}_${rand()}`;
  await store.set(key, { type, at, ...data });
  return key;
}
function parseEventKey(key) {
  const [, leadId, rest] = key.split('/');
  const [ts, type] = (rest || '').split('_');
  return { leadId, at: Number(ts), type };
}
export async function eventSummaries(store) {
  const out = {};
  for (const key of await store.list('ev/')) {
    const { leadId, at, type } = parseEventKey(key);
    const s = (out[leadId] ||= { counts: {}, last: {} });
    s.counts[type] = (s.counts[type] || 0) + 1;
    if (!s.last[type] || at > s.last[type]) s.last[type] = at;
  }
  return out;
}
export async function leadEvents(store, leadId, limit = 200) {
  const keys = (await store.list(`ev/${leadId}/`)).slice(-limit).reverse();
  const events = await Promise.all(keys.map((k) => store.get(k)));
  return events.filter(Boolean);
}

// ---------- leads ----------
export async function getLead(store, id) { return id ? store.get(`lead/${id}`) : null; }
export async function saveLead(store, lead) {
  lead.updatedAt = Date.now();
  await store.set(`lead/${lead.id}`, lead);
  return lead;
}
export async function findLeadByEmail(store, email) {
  const id = await store.get(`email/${normEmail(email)}`);
  return id ? getLead(store, id) : null;
}
export async function listLeads(store) {
  const keys = await store.list('lead/');
  return (await Promise.all(keys.map((k) => store.get(k)))).filter(Boolean);
}

function cleanFields(input) {
  const out = {};
  for (const f of LEAD_FIELDS) if (input[f] !== undefined) out[f] = String(input[f] ?? '').trim().slice(0, 5000);
  if (out.email !== undefined) out.email = normEmail(out.email);
  return out;
}

export async function createLead(store, input, { source = 'Manual' } = {}) {
  const fields = cleanFields(input);
  if (!fields.business_name && !fields.contact_name) throw httpError(400, 'Business name or contact name is required');
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw httpError(400, 'Email address looks invalid');
  if (fields.email && (await findLeadByEmail(store, fields.email))) throw httpError(409, 'A lead with this email already exists');
  const status = STATUSES.includes(input.status) ? input.status : 'new';
  const now = Date.now();
  const lead = {
    id: newId(), source, ...fields, status,
    createdAt: now, statusChangedAt: now, repliedAt: null, unsubscribed: false, sequence: null,
  };
  await saveLead(store, lead);
  if (lead.email) await store.set(`email/${lead.email}`, lead.id);
  await addEvent(store, lead.id, 'created', { source, status });
  return lead;
}

export async function updateLead(store, id, patch) {
  const lead = await getLead(store, id);
  if (!lead) throw httpError(404, 'Lead not found');
  const fields = cleanFields(patch);
  if (fields.email !== undefined && fields.email !== lead.email) {
    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw httpError(400, 'Email address looks invalid');
    const other = fields.email && (await findLeadByEmail(store, fields.email));
    if (other && other.id !== id) throw httpError(409, 'Another lead already uses this email');
    if (lead.email) await store.delete(`email/${lead.email}`);
    if (fields.email) await store.set(`email/${fields.email}`, id);
  }
  Object.assign(lead, fields);
  if (patch.status !== undefined) await setStatus(store, lead, patch.status, 'manual');
  return saveLead(store, lead);
}

// Mutates lead (caller saves). Moving to "sale" also stops any running sequence.
export async function setStatus(store, lead, status, reason) {
  if (!STATUSES.includes(status)) throw httpError(400, `Status must be one of: ${STATUSES.join(', ')}`);
  if (lead.status === status) return;
  const from = lead.status;
  lead.status = status;
  lead.statusChangedAt = Date.now();
  await addEvent(store, lead.id, 'status', { from, to: status, reason });
  if (status === 'sale') await stopSequence(store, lead, 'Lead marked as sale');
}

export async function deleteLead(store, id) {
  const lead = await getLead(store, id);
  if (!lead) throw httpError(404, 'Lead not found');
  for (const k of await store.list(`ev/${id}/`)) await store.delete(k);
  if (lead.email) await store.delete(`email/${lead.email}`);
  await store.delete(`lead/${id}`);
}

// ---------- sequences ----------
export function validateSequence(input) {
  const name = String(input.name || '').trim().slice(0, 120);
  if (!name) throw httpError(400, 'Sequence name is required');
  const steps = Array.isArray(input.steps) ? input.steps : [];
  if (!steps.length) throw httpError(400, 'Add at least one email step');
  if (steps.length > 20) throw httpError(400, 'A sequence can have at most 20 steps');
  const clean = steps.map((s, i) => {
    const delayDays = Number(s.delayDays);
    if (!Number.isFinite(delayDays) || delayDays < 0 || delayDays > 365) throw httpError(400, `Step ${i + 1}: wait days must be between 0 and 365`);
    const subject = String(s.subject || '').trim().slice(0, 300);
    const body = String(s.body || '').slice(0, 20000);
    if (!subject || !body.trim()) throw httpError(400, `Step ${i + 1}: subject and body are required`);
    for (const m of `${subject} ${body}`.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)) {
      if (!TEMPLATE_VARS.includes(m[1].toLowerCase())) throw httpError(400, `Step ${i + 1}: unknown placeholder {{${m[1]}}}. Allowed: ${TEMPLATE_VARS.join(', ')}`);
    }
    return { delayDays, subject, body };
  });
  return { name, steps: clean };
}
export async function listSequences(store) {
  const keys = await store.list('seq/');
  return (await Promise.all(keys.map((k) => store.get(k)))).filter(Boolean).sort((a, b) => a.createdAt - b.createdAt);
}
export async function saveSequence(store, id, input) {
  const clean = validateSequence(input);
  const existing = id ? await store.get(`seq/${id}`) : null;
  if (id && !existing) throw httpError(404, 'Sequence not found');
  const seq = { ...(existing || { id: newId(), createdAt: Date.now() }), ...clean, updatedAt: Date.now() };
  await store.set(`seq/${seq.id}`, seq);
  return seq;
}

export async function enroll(store, leadId, sequenceId, now = Date.now()) {
  const lead = await getLead(store, leadId);
  if (!lead) throw httpError(404, 'Lead not found');
  const seq = await store.get(`seq/${sequenceId}`);
  if (!seq) throw httpError(404, 'Sequence not found');
  if (!lead.email) throw httpError(400, 'This lead has no email address');
  if (lead.unsubscribed) throw httpError(400, 'This lead unsubscribed — they cannot be emailed');
  if (lead.status === 'sale') throw httpError(400, 'This lead is already a sale');
  if (lead.sequence?.state === 'active') throw httpError(409, `Already in sequence "${lead.sequence.name}". Stop it first.`);
  lead.sequence = {
    sequenceId: seq.id, name: seq.name, step: 0, total: seq.steps.length, state: 'active',
    startedAt: now, nextAt: now + seq.steps[0].delayDays * DAY, failures: 0, stopReason: null,
  };
  await addEvent(store, lead.id, 'sequence', { action: 'enrolled', name: seq.name }, now);
  await saveLead(store, lead);
  if (lead.sequence.nextAt <= now) return processSequenceLead(store, lead.id, now);
  return lead;
}

export async function stopSequence(store, lead, reason) {
  if (lead.sequence?.state !== 'active') return;
  lead.sequence.state = 'stopped';
  lead.sequence.stopReason = reason;
  lead.sequence.nextAt = null;
  await addEvent(store, lead.id, 'sequence', { action: 'stopped', name: lead.sequence.name, reason });
}

// Sends the due step for one lead (if still appropriate) and schedules the next one.
export async function processSequenceLead(store, leadId, now = Date.now()) {
  const lead = await getLead(store, leadId);
  const s = lead?.sequence;
  if (!s || s.state !== 'active' || s.nextAt > now) return lead;
  const seq = await store.get(`seq/${s.sequenceId}`);
  let stop = null;
  if (!seq) stop = 'Sequence was deleted';
  else if (lead.status === 'sale') stop = 'Lead marked as sale';
  else if (lead.unsubscribed) stop = 'Lead unsubscribed';
  else if (lead.repliedAt && lead.repliedAt >= s.startedAt) stop = 'Lead replied';
  else if (!lead.email) stop = 'Lead has no email address';
  if (stop) { await stopSequence(store, lead, stop); return saveLead(store, lead); }

  const step = seq.steps[s.step];
  if (!step) { s.state = 'completed'; s.nextAt = null; return saveLead(store, lead); }
  try {
    await sendToLead(store, lead, { subject: step.subject, body: step.body, kind: 'sequence', sequence: seq.name, step: s.step + 1 });
    s.failures = 0;
    s.step += 1;
    s.total = seq.steps.length;
    if (s.step < seq.steps.length) s.nextAt = now + seq.steps[s.step].delayDays * DAY;
    else {
      s.state = 'completed'; s.nextAt = null;
      await addEvent(store, lead.id, 'sequence', { action: 'completed', name: seq.name });
    }
  } catch (err) {
    s.failures = (s.failures || 0) + 1;
    if (s.failures >= 3) await stopSequence(store, lead, `Sending failed 3 times: ${err.message}`);
    else s.nextAt = now + 60 * 60 * 1000; // retry in an hour
  }
  return saveLead(store, lead);
}

export async function runDueSequences(store, now = Date.now()) {
  const due = (await listLeads(store))
    .filter((l) => l.sequence?.state === 'active' && l.sequence.nextAt <= now)
    .sort((a, b) => a.sequence.nextAt - b.sequence.nextAt)
    .slice(0, MAX_SENDS_PER_RUN);
  for (const l of due) await processSequenceLead(store, l.id, now);
  return { processed: due.length };
}

// ---------- email ----------
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderTemplate(text, lead) {
  const vars = {
    first_name: (lead.contact_name || '').split(/\s+/)[0] || 'there',
    contact_name: lead.contact_name || 'there',
    business_name: lead.business_name || 'your business',
    business_type: lead.business_type || '',
    current_processor: lead.current_processor || 'your current processor',
    sender_name: config().senderName,
  };
  return String(text).replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => vars[k.toLowerCase()] ?? '');
}

export function buildEmail(lead, { subject, body, sendId, sentAt }) {
  const cfg = config();
  const base = cfg.publicUrl.replace(/\/$/, '');
  const unsubUrl = `${base}/u/${makeToken({ l: lead.id })}`;
  const pixelUrl = `${base}/t/o/${makeToken({ l: lead.id, s: sendId, t: sentAt })}`;
  const finalSubject = renderTemplate(subject, lead);
  const text = renderTemplate(body, lead);
  const address = cfg.mailingAddress;

  const html = text.split(/(https?:\/\/[^\s<>"]+)/g).map((part, i) => {
    if (i % 2 === 0) return escapeHtml(part).replace(/\n/g, '<br>');
    const url = part.replace(/[.,;:!?)]+$/, '');
    const trailing = part.slice(url.length);
    const href = `${base}/t/c/${makeToken({ l: lead.id, s: sendId, u: url })}`;
    return `<a href="${escapeHtml(href)}">${escapeHtml(url)}</a>${escapeHtml(trailing)}`;
  }).join('');

  const footerText = `\n\n--\n${cfg.senderName}${address ? `\n${address}` : ''}\nDon't want these emails? Unsubscribe: ${unsubUrl}`;
  const footerHtml = `<p style="margin-top:28px;font-size:12px;color:#6b7280">${escapeHtml(cfg.senderName)}${address ? `<br>${escapeHtml(address)}` : ''}<br>Don't want these emails? <a href="${escapeHtml(unsubUrl)}" style="color:#6b7280">Unsubscribe</a></p>`;

  return {
    subject: finalSubject,
    text: text + footerText,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111827">${html}${footerHtml}</div><img src="${escapeHtml(pixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">`,
    headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

async function deliver({ to, subject, html, text, headers }) {
  const cfg = config();
  if (cfg.dryRun) return { id: `dry-run-${rand()}` };
  if (!cfg.resendKey) throw new Error('RESEND_API_KEY is not configured');
  if (!cfg.from) throw new Error('CRM_FROM_EMAIL (or WPC_FROM_EMAIL) is not configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: cfg.from, to: [to], subject, html, text, headers, ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}) }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.message || `Resend returned HTTP ${res.status}`);
  return out;
}

export async function sendToLead(store, lead, { subject, body, kind = 'manual', sequence, step }) {
  if (!lead.email) throw httpError(400, 'This lead has no email address');
  if (lead.unsubscribed) throw httpError(400, 'This lead unsubscribed — they cannot be emailed');
  if (!String(subject || '').trim() || !String(body || '').trim()) throw httpError(400, 'Subject and message are required');
  const sendId = rand() + rand();
  const sentAt = Date.now();
  const email = buildEmail(lead, { subject, body, sendId, sentAt });
  try {
    const result = await deliver({ to: lead.email, ...email });
    await addEvent(store, lead.id, 'sent', { sendId, subject: email.subject, kind, sequence, step, providerId: result.id }, sentAt);
    return { sendId, providerId: result.id };
  } catch (err) {
    await addEvent(store, lead.id, 'failed', { subject: email.subject, kind, sequence, step, error: err.message }, sentAt);
    throw httpError(502, `Email not sent: ${err.message}`);
  }
}

// ---------- tracking ----------
export async function recordOpen(store, token, userAgent = '') {
  const t = readToken(token);
  if (!t?.l || !t.s) return false;
  if (!(await getLead(store, t.l))) return false;
  const now = Date.now();
  const likelyAutomated = t.t && now - t.t < AUTO_OPEN_WINDOW_MS;
  await addEvent(store, t.l, likelyAutomated ? 'openauto' : 'open', { sendId: t.s, ua: String(userAgent).slice(0, 300) }, now);
  return true;
}
export async function recordClick(store, token, userAgent = '') {
  const t = readToken(token);
  if (!t?.l || !t.u || !/^https?:\/\//i.test(t.u)) return null;
  if (await getLead(store, t.l)) await addEvent(store, t.l, 'click', { sendId: t.s, url: t.u, ua: String(userAgent).slice(0, 300) });
  return t.u;
}
export async function unsubscribe(store, token) {
  const t = readToken(token);
  const lead = t?.l && (await getLead(store, t.l));
  if (!lead) return false;
  if (!lead.unsubscribed) {
    lead.unsubscribed = true;
    await addEvent(store, lead.id, 'unsubscribed', {});
    await stopSequence(store, lead, 'Lead unsubscribed');
    await saveLead(store, lead);
  }
  return true;
}

// ---------- replies ----------
const AUTO_SUBJECT = /^(automatic reply|auto[- ]?reply|autoreply|out of (the )?office|ooo\b|away:|undeliverable|delivery status)/i;

export async function recordReply(store, { from, subject = '', messageId = '', at = Date.now(), auto = false, source = 'manual' }) {
  const lead = await findLeadByEmail(store, parseAddress(from));
  if (!lead) return { matched: false };
  if (messageId) {
    const seenKey = `seen/${crypto.createHash('sha256').update(messageId).digest('hex').slice(0, 40)}`;
    if (await store.get(seenKey)) return { matched: true, duplicate: true, leadId: lead.id };
    await store.set(seenKey, { at: Date.now() });
  }
  const isAuto = auto || AUTO_SUBJECT.test(subject);
  await addEvent(store, lead.id, isAuto ? 'replyauto' : 'reply', { subject: String(subject).slice(0, 300), source }, at);
  if (isAuto) return { matched: true, auto: true, leadId: lead.id };
  lead.repliedAt = Math.max(lead.repliedAt || 0, at);
  if (lead.status === 'new') await setStatus(store, lead, 'warm', 'Lead replied');
  await stopSequence(store, lead, 'Lead replied');
  await saveLead(store, lead);
  return { matched: true, leadId: lead.id };
}

// Emails you write in Gmail (not through the CRM) to a lead's address. Not tracked: no pixel or links.
export async function recordOutgoing(store, { to = [], subject = '', messageId = '', at = Date.now() }) {
  const leadIds = new Set();
  for (const addr of to) {
    const lead = await findLeadByEmail(store, parseAddress(addr));
    if (lead) leadIds.add(lead.id);
  }
  if (!leadIds.size) return { matched: 0 };
  if (messageId) {
    const seenKey = `seen/out-${crypto.createHash('sha256').update(messageId).digest('hex').slice(0, 40)}`;
    if (await store.get(seenKey)) return { matched: 0, duplicate: true };
    await store.set(seenKey, { at: Date.now() });
  }
  for (const id of leadIds) await addEvent(store, id, 'mailsent', { subject: String(subject).slice(0, 300), source: 'gmail' }, at);
  return { matched: leadIds.size };
}

// Reads new messages from one mailbox, remembering where it stopped (per mailbox) between runs.
export async function scanMailbox(client, store, mailbox, metaKey, onMessage) {
  const lock = await client.getMailboxLock(mailbox);
  let matched = 0, scanned = 0;
  try {
    const meta = (await store.get(metaKey)) || {};
    const validity = String(client.mailbox.uidValidity);
    const resume = meta.uidValidity === validity && meta.lastUid;
    const range = resume ? `${meta.lastUid + 1}:*` : { since: new Date(Date.now() - 14 * DAY) };
    let lastUid = resume ? meta.lastUid : 0;
    const query = { uid: true, envelope: true, headers: ['auto-submitted', 'x-autoreply', 'x-autorespond', 'precedence'] };
    for await (const msg of client.fetch(range, query, { uid: true })) {
      if (resume && msg.uid <= meta.lastUid) continue; // "N:*" always returns the newest message
      scanned++;
      lastUid = Math.max(lastUid, msg.uid);
      const env = msg.envelope || {};
      const info = {
        env, headers: (msg.headers || '').toString().toLowerCase(),
        messageId: env.messageId || `${mailbox}:${validity}:${msg.uid}`,
        at: env.date ? new Date(env.date).getTime() : Date.now(),
      };
      matched += (await onMessage(info)) || 0;
    }
    await store.set(metaKey, { mailbox, uidValidity: validity, lastUid, checkedAt: Date.now() });
  } finally {
    lock.release();
  }
  return { scanned, matched };
}

async function findSentMailbox(client) {
  const override = config().imap.sentMailbox;
  if (override) return override;
  const boxes = await client.list();
  return boxes.find((b) => b.specialUse === '\\Sent')?.path
    || boxes.find((b) => /^(\[gmail\]\/)?sent( mail| items)?$/i.test(b.path))?.path
    || null;
}

const replyHandler = (store) => async ({ env, headers, messageId, at }) => {
  const from = env.from?.[0]?.address;
  if (!from) return 0;
  const auto = /auto-submitted:\s*(?!no)\S/.test(headers) || /x-autoreply|x-autorespond/.test(headers) || /precedence:\s*(auto_reply|bulk|junk)/.test(headers);
  const r = await recordReply(store, { from, subject: env.subject || '', messageId, at, auto, source: 'inbox' });
  return r.matched && !r.duplicate ? 1 : 0;
};
const sentHandler = (store) => async ({ env, messageId, at }) => {
  const to = [...(env.to || []), ...(env.cc || []), ...(env.bcc || [])].map((a) => a.address).filter(Boolean);
  return (await recordOutgoing(store, { to, subject: env.subject || '', messageId, at })).matched;
};

const FETCH_QUERY = { uid: true, envelope: true, headers: ['auto-submitted', 'x-autoreply', 'x-autorespond', 'precedence'] };
const BACKFILL_DAYS = 90;
const BACKFILL_LEADS_PER_RUN = 25;

// Runs one IMAP search in a mailbox and feeds the matching messages to onMessage.
async function scanSearch(client, mailbox, search, onMessage) {
  const lock = await client.getMailboxLock(mailbox);
  let matched = 0, scanned = 0;
  try {
    const uids = await client.search(search, { uid: true });
    if (!uids || !uids.length) return { scanned, matched };
    for await (const msg of client.fetch(uids.slice(-300), FETCH_QUERY, { uid: true })) {
      scanned++;
      const env = msg.envelope || {};
      matched += (await onMessage({
        env, headers: (msg.headers || '').toString().toLowerCase(),
        messageId: env.messageId || `${mailbox}:${String(client.mailbox.uidValidity)}:${msg.uid}`,
        at: env.date ? new Date(env.date).getTime() : Date.now(),
      })) || 0;
    }
  } finally {
    lock.release();
  }
  return { scanned, matched };
}

// New leads (or leads whose email changed) get a one-time search of the last 90 days of Gmail,
// because the regular check only reads mail that arrived after its previous run.
async function backfillLeads(client, store, sentBox) {
  const { imap } = config();
  const pending = (await listLeads(store)).filter((l) => l.email && l.gmailSyncedEmail !== l.email).slice(0, BACKFILL_LEADS_PER_RUN);
  let found = 0;
  const since = new Date(Date.now() - BACKFILL_DAYS * DAY);
  for (const lead of pending) {
    found += (await scanSearch(client, imap.mailbox, { from: lead.email, since }, replyHandler(store))).matched;
    if (sentBox) {
      const search = { or: [{ to: lead.email }, { cc: lead.email }, { bcc: lead.email }], since };
      found += (await scanSearch(client, sentBox, search, sentHandler(store))).matched;
    }
    const fresh = await getLead(store, lead.id);
    if (fresh) { fresh.gmailSyncedEmail = lead.email; await saveLead(store, fresh); }
  }
  return { leads: pending.length, found };
}

// Checks the inbox for replies from leads, and the Sent folder for emails you wrote to leads in Gmail.
export async function checkImapReplies(store, client = null) {
  const { imap } = config();
  if (!client && (!imap.host || !imap.user || !imap.pass)) return { skipped: 'IMAP not configured' };
  let own = false;
  if (!client) {
    const { ImapFlow } = await import('imapflow');
    client = new ImapFlow({
      host: imap.host, port: imap.port, secure: imap.port === 993, auth: { user: imap.user, pass: imap.pass },
      logger: false, connectionTimeout: 20000, greetingTimeout: 20000, socketTimeout: 120000,
    });
    await client.connect();
    own = true;
  }
  try {
    const inbox = await scanMailbox(client, store, imap.mailbox, 'meta/imap', replyHandler(store));
    let sent, box = null;
    try {
      box = await findSentMailbox(client);
      sent = box ? await scanMailbox(client, store, box, 'meta/imapsent', sentHandler(store)) : { skipped: 'Sent folder not found' };
    } catch (e) {
      sent = { error: e.message };
    }
    let backfill;
    try { backfill = await backfillLeads(client, store, box); } catch (e) { backfill = { error: e.message }; }
    return { ...inbox, sent, backfill };
  } finally {
    if (own) await client.logout().catch(() => {});
  }
}

// One full pass: Gmail (replies, Gmail-sent, history for new leads) then due sequence emails.
export async function runSync(store, trigger) {
  const startedAt = Date.now();
  await store.set('meta/syncRunning', { startedAt, trigger });
  let replies;
  try { replies = await checkImapReplies(store); } catch (e) { replies = { error: e.message }; }
  let sequences;
  try { sequences = await runDueSequences(store); } catch (e) { sequences = { processed: 0, error: e.message }; }
  const result = { at: Date.now(), startedAt, replies, sequences, trigger };
  await store.set('meta/lastRun', result);
  await store.delete('meta/syncRunning');
  console.log('crm-run', JSON.stringify(result));
  return result;
}

// Key that lets our own functions start the background sync (it has a public URL).
export function syncKey() {
  return crypto.createHmac('sha256', config().trackingSecret || 'unset').update('crm-sync-v1').digest('hex');
}
export async function startBackgroundSync(origin, trigger) {
  const res = await fetch(`${origin.replace(/\/$/, '')}/.netlify/functions/crm-sync-background`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-crm-sync': syncKey() }, body: JSON.stringify({ trigger }),
  });
  if (res.status !== 202 && !res.ok) throw new Error(`Background sync did not start (HTTP ${res.status})`);
}

// ---------- misc ----------
export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
