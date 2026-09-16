import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { environment } from './config/environment';
const frameworkRoot = __dirname;
export default defineConfig({ testDir: resolve(frameworkRoot, 'tests/ui'), timeout: 60_000, expect: { timeout: 10_000 }, fullyParallel: true, retries: process.env.CI ? 2 : 0, reporter: [['list'], ['html', { outputFolder: resolve(frameworkRoot, 'reports/playwright'), open: 'never' }]], use: { baseURL: environment.baseUrl, trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'retain-on-failure' }, projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'firefox', use: { ...devices['Desktop Firefox'] } }, { name: 'webkit', use: { ...devices['Desktop Safari'] } }], webServer: { command: 'npm run start --workspace apps/web -- --hostname 127.0.0.1 --port 3100', url: environment.baseUrl, reuseExistingServer: !process.env.CI, timeout: 60_000 } });
