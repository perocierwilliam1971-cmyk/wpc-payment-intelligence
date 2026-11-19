// Storage for the CRM.
// Production: Netlify Blobs (store "wpc-crm", strong consistency).
// Local tests: set CRM_STORE_DIR to a folder and a JSON-file store is used instead.
import { promises as fs } from 'node:fs';
import path from 'node:path';

function fileStore(dir) {
  const file = (key) => path.join(dir, encodeURIComponent(key) + '.json');
  return {
    async get(key) {
      try { return JSON.parse(await fs.readFile(file(key), 'utf8')); } catch { return null; }
    },
    async set(key, value) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(key), JSON.stringify(value));
    },
    async delete(key) { await fs.rm(file(key), { force: true }); },
    async list(prefix = '') {
      let names = [];
      try { names = await fs.readdir(dir); } catch { return []; }
      return names
        .filter((n) => n.endsWith('.json'))
        .map((n) => decodeURIComponent(n.slice(0, -5)))
        .filter((k) => k.startsWith(prefix))
        .sort();
    },
  };
}

async function blobStore() {
  const { getStore } = await import('@netlify/blobs');
  const store = getStore({ name: 'wpc-crm', consistency: 'strong' });
  return {
    get: (key) => store.get(key, { type: 'json' }),
    set: (key, value) => store.setJSON(key, value),
    delete: (key) => store.delete(key),
    async list(prefix = '') {
      const { blobs } = await store.list({ prefix });
      return blobs.map((b) => b.key).sort();
    },
  };
}

export async function getCrmStore() {
  if (process.env.CRM_STORE_DIR) return fileStore(process.env.CRM_STORE_DIR);
  return blobStore();
}
