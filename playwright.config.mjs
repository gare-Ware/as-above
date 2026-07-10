import { defineConfig, devices } from '@playwright/test';

const PORT = 3111;
const baseURL = `http://127.0.0.1:${PORT}`;

// The e2e suite drives the whole loop for real — there is no readiness clock
// in AS ABOVE (every press answers instantly), so no ?fast hook exists or is
// needed. Specs wait on the app's own ready signal: [data-ready="true"] on
// <main> (never race the mount).
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
