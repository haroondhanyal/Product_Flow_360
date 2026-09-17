import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { ForgotPasswordPage } from '../../src/ui/pages/forgot-password.page';
import { AdminAuthPage } from '../../src/ui/pages/admin-auth.page';
import { loginLocators } from '../../src/ui/locators/login.locators';
import { brandAllure } from '../../src/utils/allure';

const oldPassword = 'OldSecurePass!2026';
const newPassword = 'NewSecurePass!2026';
const account = () => { const id = crypto.randomUUID().slice(0, 8); return { name: `QA Recovery ${id}`, email: `recovery-${id}@example.com`, id }; };
async function seedEmployee(page: Page, data: ReturnType<typeof account>) {
  const user = { id: data.id, fullName: data.name, employeeNo: `PTCL-${data.id}`, designation: 'QA Engineer', department: 'Technology', email: data.email, mobile: '+92 300 1234567', passwordHash: createHash('sha256').update(oldPassword).digest('hex'), role: 'Employee', status: 'Approved', createdAt: new Date().toISOString() };
  await page.addInitScript(user => { if (!localStorage.getItem('pf360-auth-users')) localStorage.setItem('pf360-auth-users', JSON.stringify([user])); }, user);
}

test.describe('@ui @auth @forgot Employee password recovery flow', () => {
  test.beforeEach(async () => { await brandAllure('Employee password recovery'); });
  test('unknown employee email cannot request reset', async ({ page }) => { const forgot = new ForgotPasswordPage(page); await forgot.open(); await forgot.request('unknown-employee@example.com'); await expect(forgot.locators.error).toContainText('No approved employee account'); });
  test('administrator account cannot use employee recovery', async ({ page }) => { const forgot = new ForgotPasswordPage(page); await forgot.open(); await forgot.request('admin@ptcl.com'); await expect(forgot.locators.error).toContainText('Administrator password resets require'); });
  test('approved employee request waits for admin', async ({ page }) => { const data = account(); await seedEmployee(page, data); const forgot = new ForgotPasswordPage(page); await forgot.open(); await forgot.request(data.email); await expect(forgot.locators.notice).toContainText('administrator must approve'); await expect(forgot.locators.setPassword).toHaveCount(0); await forgot.request(data.email); await expect(forgot.locators.notice).toContainText('waiting for administrator approval'); });
  test('administrator can reject reset request', async ({ page }) => { const data = account(); await seedEmployee(page, data); const forgot = new ForgotPasswordPage(page); await forgot.open(); await forgot.request(data.email); const admin = new AdminAuthPage(page); await admin.open(); const row = admin.locators.resetRow(data.email); await expect(row).toContainText('Pending'); await admin.locators.rejectReset(data.name).click(); await expect(row).toContainText('Rejected'); });
  test('incorrect recovery code cannot change password', async ({ page }) => { const data = account(); await seedEmployee(page, data); const forgot = new ForgotPasswordPage(page); await forgot.open(); await forgot.request(data.email); const admin = new AdminAuthPage(page); await admin.open(); await admin.locators.approveReset(data.name).click(); await page.getByRole('button', { name: 'Sign out' }).click(); await forgot.open(); await forgot.locators.email.fill(data.email); await forgot.reset(data.email, 'INVALIDCODE', newPassword); await expect(forgot.locators.error).toContainText('Recovery code is incorrect'); });
  test('approved reset changes password and old password stops working', async ({ page }) => { const data = account(); await seedEmployee(page, data); const forgot = new ForgotPasswordPage(page); await forgot.open(); await forgot.request(data.email); const admin = new AdminAuthPage(page); await admin.open(); await admin.locators.approveReset(data.name).click(); await expect(admin.locators.resetRow(data.email)).toContainText('Approved'); const code = (await admin.locators.recoveryCode(data.email).textContent())!.trim(); await page.getByRole('button', { name: 'Sign out' }).click(); await forgot.open(); await forgot.locators.email.fill(data.email); await expect(forgot.locators.setPassword).toBeVisible(); await forgot.reset(data.email, code, newPassword); await expect(forgot.locators.notice).toContainText('Password updated'); const l = loginLocators(page); await l.email.fill(data.email); await l.password.fill(oldPassword); await l.submit.click(); await expect(l.error).toBeVisible(); await l.password.fill(newPassword); await l.submit.click(); await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible(); });
});
