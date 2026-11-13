// Node-side font loader for tests and scripts (the browser uses fetch()).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setFontByteSource } from '../src/design/fonts.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/fonts');
export function useNodeFonts() {
  setFontByteSource(async (fam, v) => new Uint8Array(fs.readFileSync(path.join(dir, `${fam}-${v}.ttf`))));
}
