// Run: npm test   (uses a temp folder instead of Netlify Blobs, and never really sends email)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.CRM_STORE_DIR = mkdtempSync(path.join(os.tmpdir(), 'crm-'));
process.env.CRM_ADMIN_TOKEN = 'test-token';
process.env.CRM_INBOUND_SECRET = 'inbound-secret';
process.env.CRM_EMAIL_DRY_RUN = '1';
process.env.CRM_PUBLIC_URL = 'https://example.test';
process.env.CRM_MAILING_ADDRESS = '123 Main St, Miami FL';

const api = (await import('../netlify/functions/crm-api.mjs')).default;
const track = (await import('../netlify/functions/crm-track.mjs')).default;
const unsub = (await import('../netlify/functions/crm-unsubscribe.mjs')).default;
const runner = (await import('../netlify/functions/crm-sequence-runner.mjs')).default;
const { handler: formHook } = await import('../netlify/functions/submission-created.mjs');
const core = await import('../netlify/crm-lib/core.mjs');
const { getCrmStore } = await import('../netlify/crm-lib/store.mjs');

async function call(method, p, body, auth = 'test-token') {
  const res = await api(new Request('https://example.test/api/crm/' + p, {
    method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }));
  return { status: res.status, data: await res.json() };
}
const events = async (id) => (await call('GET', 'leads/' + id)).data.events;

test('rejects requests without the access code', async () => {
  assert.equal((await call('GET', 'leads', null, null)).status, 401);
  assert.equal((await call('GET', 'leads', null, 'wrong')).status, 401);
});

test('lead lifecycle: create, color status, duplicate email, sale', async () => {
  const r = await call('POST', 'leads', { business_name: 'Joe Pizza', contact_name: 'Joe Smith', email: 'Joe@Pizza.com' });
  assert.equal(r.status, 201);
  assert.equal(r.data.lead.status, 'new');
  assert.equal(r.data.lead.email, 'joe@pizza.com');
  assert.equal((await call('POST', 'leads', { business_name: 'Dup', email: 'joe@pizza.com' })).status, 409);
  assert.equal((await call('PATCH', 'leads/' + r.data.lead.id, { status: 'hot' })).status, 400);
  const up = await call('PATCH', 'leads/' + r.data.lead.id, { status: 'warm' });
  assert.equal(up.data.lead.status, 'warm');
});

test('email: pixel open, scanner-open filtering, click redirect, forged token rejected', async () => {
  const { data } = await call('POST', 'leads', { business_name: 'Track Co', contact_name: 'Ana', email: 'ana@track.co' });
  const lead = data.lead;
  const sent = await call('POST', `leads/${lead.id}/email`, { subject: 'Hi {{first_name}}', body: 'See https://wpc.example/rates.' });
  assert.equal(sent.status, 200);

  const email = core.buildEmail(lead, { subject: 'Hi {{first_name}}', body: 'See https://wpc.example/rates.', sendId: 'abc', sentAt: Date.now() - 10 * 60000 });
  assert.equal(email.subject, 'Hi Ana');
  assert.match(email.text, /123 Main St/);
  assert.match(email.headers['List-Unsubscribe'], /\/u\//);
  const pixel = email.html.match(/\/t\/o\/([^"]+)"/)[1];
  const click = email.html.match(/\/t\/c\/([^"]+)"/)[1];
  assert.match(email.html, />https:\/\/wpc\.example\/rates<\/a>\./, 'trailing period is not part of the link');

  const img = await track(new Request('https://example.test/t/o/' + pixel));
  assert.equal(img.headers.get('content-type'), 'image/gif');
  const fresh = core.buildEmail(lead, { subject: 's', body: 'b', sendId: 'x', sentAt: Date.now() }).html.match(/\/t\/o\/([^"]+)"/)[1];
  await track(new Request('https://example.test/t/o/' + fresh));

  const go = await track(new Request('https://example.test/t/c/' + click));
  assert.equal(go.status, 302);
  assert.equal(go.headers.get('location'), 'https://wpc.example/rates');

  const forged = core.makeToken({ l: lead.id, s: 'x', u: 'https://evil.example' }).replace(/.$/, 'A');
  assert.equal((await track(new Request('https://example.test/t/c/' + forged))).status, 404);

  const types = (await events(lead.id)).map((e) => e.type);
  for (const t of ['sent', 'open', 'openauto', 'click']) assert.ok(types.includes(t), t);
  const list = (await call('GET', 'leads')).data.leads.find((l) => l.id === lead.id);
  assert.equal(list.activity.counts.open, 1);
  assert.equal(list.activity.counts.openauto, 1);
});

test('sequence: sends step 1 now, waits, stops when lead replies; reply turns New into Warm', async () => {
  const seq = await call('POST', 'sequences', { name: 'Cold', steps: [
    { delayDays: 0, subject: 'Hello {{business_name}}', body: 'Hi {{first_name}}' },
    { delayDays: 2, subject: 'Follow up', body: 'Bump' },
    { delayDays: 3, subject: 'Last one', body: 'Bye' },
  ] });
  assert.equal(seq.status, 201);
  assert.equal((await call('POST', 'sequences', { name: 'Bad', steps: [{ delayDays: 0, subject: 'x', body: '{{nope}}' }] })).status, 400);

  const { data } = await call('POST', 'leads', { business_name: 'Seq Bakery', contact_name: 'Bo', email: 'bo@bakery.com' });
  const en = await call('POST', `leads/${data.lead.id}/enroll`, { sequenceId: seq.data.sequence.id });
  assert.equal(en.data.lead.sequence.step, 1, 'first email sent immediately');
  assert.equal((await call('POST', `leads/${data.lead.id}/enroll`, { sequenceId: seq.data.sequence.id })).status, 409);

  const store = await getCrmStore();
  const in3days = Date.now() + 2.1 * 86400000;
  await core.runDueSequences(store, Date.now());
  assert.equal((await core.getLead(store, data.lead.id)).sequence.step, 1, 'nothing due yet');
  await core.runDueSequences(store, in3days);
  assert.equal((await core.getLead(store, data.lead.id)).sequence.step, 2);

  // out-of-office does not count
  const ooo = await api(new Request('https://example.test/api/crm/inbound?key=inbound-secret', { method: 'POST', body: JSON.stringify({ from: 'Bo <BO@bakery.com>', subject: 'Automatic reply: away' }) }));
  assert.equal((await ooo.json()).auto, true);
  assert.equal((await core.getLead(store, data.lead.id)).sequence.state, 'active');

  // a real reply via Resend-style webhook
  const bad = await api(new Request('https://example.test/api/crm/inbound?key=nope', { method: 'POST', body: '{}' }));
  assert.equal(bad.status, 401);
  const r = await api(new Request('https://example.test/api/crm/inbound?key=inbound-secret', { method: 'POST', body: JSON.stringify({ type: 'email.received', data: { from: 'Bo <BO@bakery.com>', subject: 'Re: Follow up', email_id: 'm1' } }) }));
  assert.equal((await r.json()).matched, true);
  const after = await core.getLead(store, data.lead.id);
  assert.equal(after.status, 'warm');
  assert.equal(after.sequence.state, 'stopped');
  assert.equal(after.sequence.stopReason, 'Lead replied');
  await core.runDueSequences(store, in3days + 10 * 86400000);
  assert.equal((await events(data.lead.id)).filter((e) => e.type === 'sent').length, 2, 'no more emails after reply');
});

test('unsubscribe: GET only asks, POST unsubscribes and blocks email', async () => {
  const { data } = await call('POST', 'leads', { business_name: 'Unsub LLC', email: 'u@unsub.com' });
  const url = core.buildEmail(data.lead, { subject: 's', body: 'b', sendId: 'x', sentAt: 0 }).headers['List-Unsubscribe'].slice(1, -1);
  const tok = url.split('/u/')[1];
  await unsub(new Request('https://example.test/u/' + tok));
  assert.equal((await call('GET', 'leads/' + data.lead.id)).data.lead.unsubscribed, false);
  await unsub(new Request('https://example.test/u/' + tok, { method: 'POST', body: 'List-Unsubscribe=One-Click' }));
  assert.equal((await call('GET', 'leads/' + data.lead.id)).data.lead.unsubscribed, true);
  assert.equal((await call('POST', `leads/${data.lead.id}/email`, { subject: 'a', body: 'b' })).status, 400);
});

test('website form submissions flow into the CRM (lead = New, analysis = Warm)', async () => {
  const ev = (form_name, data) => ({ body: JSON.stringify({ payload: { form_name, data } }) });
  await formHook(ev('merchant-leads', { business_name: 'Web Deli', contact_name: 'Kim', business_email: 'kim@deli.com' }));
  const store = await getCrmStore();
  let lead = await core.findLeadByEmail(store, 'kim@deli.com');
  assert.equal(lead.status, 'new');
  assert.equal(lead.source, 'Website form');
  await formHook(ev('analysis-results', { business_email: 'kim@deli.com', statement_grade: 'C', estimated_annual_opportunity: '4200' }));
  lead = await core.findLeadByEmail(store, 'kim@deli.com');
  assert.equal(lead.status, 'warm');
  assert.equal(lead.analysis.statement_grade, 'C');
});

test('scheduled runner works without IMAP configured', async () => {
  await runner();
  const store = await getCrmStore();
  assert.equal((await store.get('meta/lastRun')).replies.skipped, 'IMAP not configured');
});

test('Gmail sync: replies in Inbox and emails you wrote in Sent are logged once', async () => {
  const store = await getCrmStore();
  const { data } = await call('POST', 'leads', { business_name: 'Gmail Diner', contact_name: 'Rosa', email: 'rosa@diner.com' });
  const id = data.lead.id;
  const now = new Date();
  const boxes = {
    INBOX: [
      { uid: 5, envelope: { from: [{ address: 'stranger@x.com' }], subject: 'Hello', messageId: '<a>', date: now } },
      { uid: 6, envelope: { from: [{ address: 'Rosa@Diner.com' }], subject: 'Re: rates', messageId: '<b>', date: now } },
    ],
    '[Gmail]/Sent Mail': [
      { uid: 9, envelope: { to: [{ address: 'rosa@diner.com' }], cc: [], subject: 'Proposal attached', messageId: '<c>', date: now } },
      { uid: 10, envelope: { to: [{ address: 'someone@else.com' }], subject: 'Unrelated', messageId: '<d>', date: now } },
    ],
  };
  const fake = {
    mailbox: null,
    async list() { return [{ path: 'INBOX' }, { path: '[Gmail]/Sent Mail', specialUse: '\\Sent' }]; },
    async getMailboxLock(name) { this.mailbox = { uidValidity: 1n, name }; return { release() {} }; },
    async *fetch(range) {
      const msgs = boxes[this.mailbox.name];
      if (typeof range === 'string') { const from = Number(range.split(':')[0]); yield* msgs.filter((m) => m.uid >= from); if (!msgs.some((m) => m.uid >= from)) yield msgs.at(-1); }
      else yield* msgs;
    },
  };
  const first = await core.checkImapReplies(store, fake);
  assert.equal(first.matched, 1);
  assert.equal(first.sent.matched, 1);
  const second = await core.checkImapReplies(store, fake); // nothing new: no duplicates
  assert.equal(second.matched, 0);
  assert.equal(second.sent.matched, 0);

  const ev = await events(id);
  assert.equal(ev.filter((e) => e.type === 'reply').length, 1);
  assert.equal(ev.filter((e) => e.type === 'mailsent').length, 1);
  assert.equal(ev.find((e) => e.type === 'mailsent').subject, 'Proposal attached');
  assert.equal((await core.getLead(store, id)).status, 'warm');
});

test('a lead added after Gmail was already checked still gets its past emails (90-day history search)', async () => {
  const store = await getCrmStore();
  const now = new Date();
  const boxes = {
    INBOX: [{ uid: 20, envelope: { from: [{ address: 'late@lead.com' }], subject: 'Re: your rates', messageId: '<late-r>', date: now } }],
    '[Gmail]/Sent Mail': [{ uid: 30, envelope: { to: [{ address: 'late@lead.com' }], subject: 'Intro', messageId: '<late-s>', date: now } }],
  };
  const has = (list, e) => (list || []).some((a) => a.address.toLowerCase() === e);
  const fake = {
    mailbox: null,
    async list() { return [{ path: 'INBOX' }, { path: '[Gmail]/Sent Mail', specialUse: '\\Sent' }]; },
    async getMailboxLock(name) { this.mailbox = { uidValidity: 7n, name }; return { release() {} }; },
    async search(q) {
      return boxes[this.mailbox.name].filter((m) => (q.from && has(m.envelope.from, q.from))
        || (q.or && q.or.some((c) => has(m.envelope[Object.keys(c)[0]], Object.values(c)[0])))).map((m) => m.uid);
    },
    async *fetch(range) {
      const msgs = boxes[this.mailbox.name];
      if (Array.isArray(range)) yield* msgs.filter((m) => range.includes(m.uid));
      else if (typeof range === 'string') { const from = Number(range.split(':')[0]); const f = msgs.filter((m) => m.uid >= from); yield* (f.length ? f : [msgs.at(-1)]); }
      else yield* msgs;
    },
  };
  // Gmail checked before the lead exists: nothing matches, and the CRM remembers it has read these emails.
  await core.checkImapReplies(store, fake);
  const { data } = await call('POST', 'leads', { business_name: 'Late Lead', email: 'late@lead.com' });
  // Next check: regular scan finds nothing new, but the history search finds both emails.
  const r = await core.checkImapReplies(store, fake);
  assert.equal(r.matched, 0);
  assert.ok(r.backfill.leads >= 1);
  assert.equal(r.backfill.found, 2);
  const ev = await events(data.lead.id);
  assert.equal(ev.filter((e) => e.type === 'reply').length, 1);
  assert.equal(ev.filter((e) => e.type === 'mailsent').length, 1);
  // Only once per lead
  const again = await core.checkImapReplies(store, fake);
  assert.equal(again.backfill.leads, 0);
});

test('runSync records the result even when Gmail is not configured', async () => {
  const store = await getCrmStore();
  const r = await core.runSync(store, 'button');
  assert.equal(r.replies.skipped, 'IMAP not configured');
  assert.equal((await store.get('meta/lastRun')).trigger, 'button');
  assert.equal(await store.get('meta/syncRunning'), null);
});
