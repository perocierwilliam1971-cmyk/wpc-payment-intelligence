import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  build: {
    target: ['es2019', 'safari14'],
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app.html'),
      },
    },
  },
  test: {
    include: process.env.DBG ? ['scratch/dbg.test.js'] : ['tests/unit/**/*.test.js'],
    testTimeout: 60000,
  },
});
