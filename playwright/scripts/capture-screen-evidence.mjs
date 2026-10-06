import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const output = resolve('docs/images/screens');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto(baseURL);
await page.getByRole('button', { name: 'Sign up' }).click();
await page.screenshot({ path: resolve(output, '00-sign-up.png'), fullPage: true, animations: 'disabled' });
await page.getByRole('button', { name: 'Forgot password' }).click();
await page.screenshot({ path: resolve(output, '00-password-recovery.png'), fullPage: true, animations: 'disabled' });
await page.getByRole('button', { name: 'Login', exact: true }).click();
await page.screenshot({ path: resolve(output, '00-login.png'), fullPage: true, animations: 'disabled' });
await page.locator('input[name="email"]').fill(process.env.TEST_USER_EMAIL ?? 'admin@ptcl.com');
await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD ?? 'PTCLAdmin!2026');
await page.getByRole('button', { name: 'Login to ProductFlow 360' }).click();
await page.getByRole('heading', { name: /A clear view/ }).waitFor();

const screens = [
  ['01-command-center', 'Overview'], ['02-products', 'Products'], ['03-change-requests', 'Change requests'],
  ['04-requirements', 'Requirements'], ['05-test-management', 'Test management'], ['06-defects', 'Defects'],
  ['07-rtm', 'RTM'], ['08-uat-approvals', 'UAT approvals'], ['09-telecom-configuration', 'Telecom configuration'],
  ['10-billing-validation', 'Billing validation'], ['11-revenue-assurance', 'Revenue assurance'],
  ['12-releases', 'Releases'], ['13-reports', 'Reports'], ['14-workspace-tools', 'Workspace tools'],
  ['15-settings', 'Settings'], ['16-admin-board', 'Admin board'], ['17-help-resources', 'Help & resources'],
];
for (const [file, name] of screens) {
  const item = name === 'Settings' || name === 'Help & resources'
    ? page.locator('.sidebar button.nav-item').filter({ hasText: name }).first()
    : page.locator('.sidebar nav button.nav-item').filter({ hasText: name }).first();
  await item.click();
  await page.locator('.shell .main > main').waitFor();
  await page.waitForTimeout(450);
  await page.screenshot({ path: resolve(output, `${file}.png`), fullPage: true, animations: 'disabled' });
  console.log(`Captured ${name}`);
}
await page.goto(`${baseURL}/reports/allure/index.html`);
await page.locator('.pf360-report-brand').waitFor();
await page.screenshot({ path: resolve('docs/images/automation-report-snapshots/allure-latest.png'), fullPage: false, animations: 'disabled' });
console.log('Captured current Allure report overview');
await browser.close();
