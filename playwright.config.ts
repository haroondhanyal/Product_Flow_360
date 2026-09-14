import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    ...(process.env.PF360_CHROME_PATH ? { launchOptions: { executablePath: process.env.PF360_CHROME_PATH } } : {}),
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start --workspace apps/web -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
