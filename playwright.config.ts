// Smoke tests of the assembled site (dist/site) served with the production URL scheme.
// Uses the pre-installed Chromium (Playwright 1.56.1 pinned to it, ADR-0005). Run: pnpm site:build && pnpm test:e2e
import { defineConfig, devices } from '@playwright/test';

const port = 4321;
export const authPort = 4322;
export const AUTH_PASSWORD = 'e2e-password';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: `node tools/site/preview.mjs --port ${port}`,
      url: `http://127.0.0.1:${port}/registry.json`,
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
    },
    {
      // Same Worker code with the login on (ADR-0015): tests/e2e/auth.spec.ts.
      command: `node tools/site/preview.mjs --port ${authPort}`,
      env: { PROTO_PREVIEW_PASSWORD: AUTH_PASSWORD },
      url: `http://127.0.0.1:${authPort}/robots.txt`,
      reuseExistingServer: !process.env.CI,
      timeout: 20_000,
    },
  ],
});
