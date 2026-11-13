import { defineConfig, devices } from '@playwright/test';

// Chromium only: it is the browser installed in this environment. iPhone/iPad
// projects EMULATE viewport, touch and user agent in Chromium — they are NOT
// real Safari/WebKit. Real-device checks are in TESTING.md.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL || 'http://localhost:4173', acceptDownloads: true, trace: 'off' },
  webServer: process.env.BASE_URL ? undefined : { command: 'npx vite build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/app.html', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
    { name: 'ipad-emulated', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' }, testMatch: /mobile\.spec/ },
    { name: 'iphone-emulated', use: { ...devices['iPhone 13'], browserName: 'chromium' }, testMatch: /mobile\.spec/ },
  ],
});
