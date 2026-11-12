import { defineConfig, devices } from '@playwright/test';

// `npm run e2e` tests the production build. E2E_DEV_SERVER=1 runs against `next dev` instead,
// which is the only place the dev-only /dev/ui showcase exists (it is a 404 in production).
const devServer = process.env.E2E_DEV_SERVER === '1';
const port = devServer ? 3101 : 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: {
    command: devServer
      ? `npm run dev -- -p ${port}`
      : `npm run build && npm run start -- -p ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
