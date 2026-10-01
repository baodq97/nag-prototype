import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    timezoneId: 'Europe/Berlin',
    locale: 'en-GB',
  },
  // One browser keeps the whole CI run well under its time budget.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  // The production build, served locally; `scripts/ci.sh` builds it first.
  webServer: {
    command: 'npm run preview',
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
