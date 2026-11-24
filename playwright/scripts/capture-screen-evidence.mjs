import { chromium } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const output = resolve('docs/images/screens');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const demoEmail = process.env.TEST_USER_EMAIL ?? 'admin@ptcl.com';
const demoPassword = process.env.TEST_USER_PASSWORD ?? `ProductFlowVisual!${randomBytes(18).toString('hex')}`;
if (!process.env.TEST_USER_EMAIL && !process.env.TEST_USER_PASSWORD) {
  await page.addInitScript(async ({ email, password }) => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const passwordHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('pf360-auth-users', JSON.stringify([{ id:'visual-capture-admin', fullName:'PF360 Administrator', employeeNo:'PTCL-ADMIN-001', designation:'Workspace Administrator', department:'Technology', email, mobile:'DEMO-ONLY', passwordHash, role:'Admin', status:'Approved', createdAt:new Date().toISOString() }]));
  }, { email: demoEmail, password: demoPassword });
}
await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Sign up' }).click();
await page.screenshot({ path: resolve(output, '00-sign-up.png'), fullPage: true, animations: 'disabled' });
await page.getByRole('button', { name: 'Login', exact: true }).click();
await page.getByRole('button', { name: 'Forgot password' }).click();
await page.screenshot({ path: resolve(output, '00-password-recovery.png'), fullPage: true, animations: 'disabled' });
await page.getByRole('button', { name: 'Login', exact: true }).click();
// Capture the login form before entering the temporary password.
await page.screenshot({ path: resolve(output, '00-login.png'), fullPage: true, animations: 'disabled' });
await page.locator('input[name="email"]').fill(demoEmail);
await page.locator('input[name="password"]').fill(demoPassword);
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
await page.locator('.sidebar nav button.nav-item').filter({ hasText: 'Change requests' }).click();
await page.screenshot({ path: resolve(output, '28-mobile-change-requests.png'), fullPage: true, animations: 'disabled' });
await page.locator('.mobile-toggle').click();
await page.locator('.sidebar nav button.nav-item').filter({ hasText: 'Overview' }).click();
await page.locator('.mobile-toggle').click();
await page.screenshot({ path: resolve(output, '19-mobile-navigation.png'), animations: 'disabled' });
await page.locator('.mobile-toggle').click();
await page.setViewportSize({ width: 1600, height: 1100 });
await page.setViewportSize({ width: 1024, height: 900 });
const headerRects = await page.evaluate(() => Object.fromEntries(['.breadcrumb', '.global-workspace-picker', '.header-actions'].map(selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return [selector, {top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right}]; })));
const headerOverlap = await page.evaluate(() => {
  const rects = ['.breadcrumb', '.global-workspace-picker', '.header-actions'].map(selector => document.querySelector(selector).getBoundingClientRect());
  return rects.some((a, i) => rects.slice(i + 1).some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
});
if (headerOverlap) throw new Error(`Tablet header controls overlap: ${JSON.stringify(headerRects)}`);
if (headerRects['.global-workspace-picker'].width < 220) throw new Error(`Tablet workspace selector is too narrow: ${JSON.stringify(headerRects)}`);
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
await page.getByRole('combobox', { name: 'Priority' }).click();
await page.screenshot({ path: resolve(output, '25-priority-options.png'), animations: 'disabled' });
await page.goto(`${baseURL}/reports/allure/index.html`);
await page.locator('.pf360-report-brand').waitFor();
await page.screenshot({ path: resolve('docs/images/automation-report-snapshots/allure-latest.png'), fullPage: false, animations: 'disabled' });
console.log('Captured current Allure report overview');
await copyFile(resolve(output, '01-command-center.png'), resolve('docs/images/command-center.png'));
await copyFile(resolve(output, '00-login.png'), resolve('docs/images/login.png'));
await browser.close();
