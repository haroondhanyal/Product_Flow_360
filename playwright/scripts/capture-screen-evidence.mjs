import { chromium } from '@playwright/test';
import { copyFile, mkdir } from 'node:fs/promises';
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
// The local demo password is generated per browser and shown on the login form.
// Read it for this isolated browser context, then mask it in the public screenshot.
const demoPassword = process.env.TEST_USER_PASSWORD ?? (await page.locator('.auth-form .form-note strong').nth(1).textContent())?.trim();
if (!process.env.TEST_USER_PASSWORD && !demoPassword) throw new Error('Could not read the generated local demo admin password.');
await page.addStyleTag({ content: '.auth-form .form-note strong:last-child{filter:blur(7px)}' });
await page.screenshot({ path: resolve(output, '00-login.png'), fullPage: true, animations: 'disabled' });
await page.locator('input[name="email"]').fill(process.env.TEST_USER_EMAIL ?? 'admin@ptcl.com');
await page.locator('input[name="password"]').fill(process.env.TEST_USER_PASSWORD ?? demoPassword);
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
  if (name === 'Overview') {
    await page.getByRole('button', { name: 'Open RTM', exact: true }).click();
    await page.getByRole('heading', { name: 'Flash Fiber Portfolio RTM', exact: true }).waitFor();
    await page.locator('.rtm-table tbody tr').first().waitFor();
    await page.locator('.sidebar nav button.nav-item').filter({ hasText: 'Overview' }).click();
  }
  console.log(`Captured ${name}`);
}
await page.locator('.sidebar nav button.nav-item').filter({ hasText: 'Overview' }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: resolve(output, '18-mobile-overview.png'), fullPage: true, animations: 'disabled' });
await page.locator('.mobile-toggle').click();
await page.screenshot({ path: resolve(output, '19-mobile-navigation.png'), animations: 'disabled' });
await page.locator('.mobile-toggle').click();
await page.setViewportSize({ width: 1600, height: 1100 });
await page.setViewportSize({ width: 1024, height: 900 });
const headerRects = await page.evaluate(() => Object.fromEntries(['.breadcrumb', '.global-workspace-picker', '.header-actions'].map(selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return [selector, {top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right}]; })));
if (Math.max(headerRects['.breadcrumb'].top, headerRects['.global-workspace-picker'].top, headerRects['.header-actions'].top) - Math.min(headerRects['.breadcrumb'].top, headerRects['.global-workspace-picker'].top, headerRects['.header-actions'].top) > 24) throw new Error(`Tablet header controls do not align in one row: ${JSON.stringify(headerRects)}`);
if (headerRects['.global-workspace-picker'].right > headerRects['.header-actions'].left + 8) throw new Error('Tablet workspace picker overlaps the header actions.');
await page.screenshot({ path: resolve(output, '26-tablet-header.png'), animations: 'disabled' });
await page.setViewportSize({ width: 1600, height: 1100 });
await page.locator('.sidebar nav button.nav-item').filter({ hasText: 'Billing validation' }).click();
await page.getByRole('button', { name: /New billing check/i }).click();
await page.locator('.test-editor.feature-form').screenshot({ path: resolve(output, '27-billing-form.png'), animations: 'disabled' });
await page.locator('.sidebar nav button.nav-item').filter({ hasText: 'Workspace tools' }).click();
await page.getByText('Project members & requests').waitFor();
const firstProject = page.locator('.project-collab-grid > article').first();
await firstProject.getByRole('button', { name: /View project team|Manage team/ }).click();
const colleague = page.locator('.project-invite-form select');
if (await colleague.locator('option').count() > 1) {
  await colleague.selectOption({ index: 1 });
  await page.screenshot({ path: resolve(output, '20-project-invitation.png'), animations: 'disabled' });
}
await page.getByRole('button', { name: 'Close project team' }).click();
await page.getByRole('button', { name: 'Open PTCL AI Assistant' }).click();
await page.getByRole('dialog').waitFor();
await page.screenshot({ path: resolve(output, '21-ai-assistant.png'), animations: 'disabled' });
await page.getByRole('button', { name: 'Close assistant' }).click();
await page.locator('.sidebar nav button.nav-item').filter({ hasText: 'Overview' }).click();
await page.getByRole('button', { name: 'Edit overview board' }).first().click();
await page.screenshot({ path: resolve(output, '22-overview-editor.png'), animations: 'disabled' });
await page.locator('.overview-edit-list .status-select-trigger').nth(1).click();
await page.screenshot({ path: resolve(output, '23-lifecycle-status-options.png'), animations: 'disabled' });
await page.getByRole('button', { name: 'Close editor' }).click();
await page.getByRole('button', { name: 'New request' }).click();
await page.screenshot({ path: resolve(output, '24-new-request-form.png'), animations: 'disabled' });
await page.getByRole('button', { name: 'Priority' }).click();
await page.screenshot({ path: resolve(output, '25-priority-options.png'), animations: 'disabled' });
await page.goto(`${baseURL}/reports/allure/index.html`);
await page.locator('.pf360-report-brand').waitFor();
await page.screenshot({ path: resolve('docs/images/automation-report-snapshots/allure-latest.png'), fullPage: false, animations: 'disabled' });
console.log('Captured current Allure report overview');
await copyFile(resolve(output, '01-command-center.png'), resolve('docs/images/command-center.png'));
await copyFile(resolve(output, '00-login.png'), resolve('docs/images/login.png'));
await browser.close();
