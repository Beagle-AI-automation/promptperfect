import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const baseURL = `http://localhost:${PORT}`;

/**
 * Real-browser E2E (Playwright + Chromium).
 *
 * Prereq: a production build must exist (`npm run build`) — the webServer
 * runs `next start`. In CI, run the build step before `npx playwright test`,
 * or install browsers with `npx playwright install --with-deps chromium`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `next start -p ${PORT}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
