// Runs every 15 minutes: checks the inbox for replies first (so nobody who just replied gets a
// follow-up), then sends every sequence email that is due.
import { getCrmStore } from '../crm-lib/store.mjs';
import { checkImapReplies, runDueSequences } from '../crm-lib/core.mjs';

export default async () => {
  const store = await getCrmStore();
  let replies;
  try { replies = await checkImapReplies(store); } catch (e) { console.error('Reply check failed', e); replies = { error: e.message }; }
  const sequences = await runDueSequences(store);
  const result = { at: Date.now(), replies, sequences, trigger: 'schedule' };
  await store.set('meta/lastRun', result);
  console.log(JSON.stringify(result));
};

export const config = { schedule: '*/15 * * * *' };
