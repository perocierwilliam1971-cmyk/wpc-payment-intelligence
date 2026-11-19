// Runs every 15 minutes. Hands the work to the background function (no 30-second limit);
// if that can't be started, does the work here instead.
import { getCrmStore } from '../crm-lib/store.mjs';
import { runSync, startBackgroundSync } from '../crm-lib/core.mjs';

export default async () => {
  const origin = process.env.URL;
  if (origin) {
    try { await startBackgroundSync(origin, 'schedule'); return; } catch (e) { console.error(e.message); }
  }
  await runSync(await getCrmStore(), 'schedule');
};

export const config = { schedule: '*/15 * * * *' };
