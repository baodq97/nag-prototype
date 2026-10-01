import { defineConfig, devices } from '@playwright/test';

// Parallel local runs can each use their own build, port and results folder:
// `npm run e2e --e2e_slot=2` builds to dist-2 and serves it on port 4175.
const slot = Number(process.env.npm_config_e2e_slot ?? 0);
const port = 4173 + slot;
const outDir = slot ? `dist-${slot}` : 'dist';
// Slot runs bind to the IPv6 loopback: some sandboxes drop IPv4 connections to a closed
// port instead of refusing them, which stalls the server availability probe.
const host = slot ? '[::1]' : 'localhost';

export default defineConfig({
  testDir: 'e2e',
  outputDir: slot ? `test-results/slot-${slot}` : 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://${host}:${port}`,
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
    command: slot
      ? `npm exec -- vite build --outDir ${outDir} && npm exec -- vite preview --host ::1 --strictPort --port ${port} --outDir ${outDir}`
      : 'npm run preview',
    url: `http://${host}:${port}`,
    reuseExistingServer: !process.env.CI && !slot,
    timeout: 120_000,
  },
});
