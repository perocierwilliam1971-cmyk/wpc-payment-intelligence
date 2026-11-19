// Background function (up to 15 minutes): checks Gmail and sends due sequence emails.
// Started by the "Check replies" button and by the 15-minute schedule. Only our own functions
// know the x-crm-sync key, so outsiders can't trigger it.
import { getCrmStore } from '../crm-lib/store.mjs';
import { runSync, syncKey, safeEqual } from '../crm-lib/core.mjs';

export default async (req) => {
  if (!safeEqual(req.headers.get('x-crm-sync') || '', syncKey())) return;
  let trigger = 'button';
  try { trigger = (await req.json()).trigger || trigger; } catch {}
  await runSync(await getCrmStore(), trigger);
};
