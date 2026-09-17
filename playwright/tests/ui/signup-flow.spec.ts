import { test, expect } from '@playwright/test';
import { SignupPage } from '../../src/ui/pages/signup.page';
import { LoginPage } from '../../src/ui/pages/login.page';
import { AdminAuthPage } from '../../src/ui/pages/admin-auth.page';
import { brandAllure } from '../../src/utils/allure';
import { loginLocators } from '../../src/ui/locators/login.locators';

const sample = () => { const id = crypto.randomUUID().slice(0, 8); return { name: `QA Signup ${id}`, employeeNo: `PTCL-${id}`, email: `signup-${id}@example.com`, password: 'SecureSignup!2026' }; };

test.describe('@ui @auth @signup Employee signup flow', () => {
  test.beforeEach(async () => { await brandAllure('Employee signup'); });
  test('signup screen exposes employee identity fields', async ({ page }) => { const signup = new SignupPage(page); await signup.open(); const l = signup.locators; for (const field of [l.fullName, l.employeeNo, l.mobile, l.designation, l.department, l.email, l.password, l.confirmation]) await expect(field).toBeVisible(); });
  test('mismatched password is rejected', async ({ page }) => { const signup = new SignupPage(page); await signup.open(); await signup.fill({ ...sample(), confirmation: 'DifferentPass!2026' }); await signup.submit(); await expect(signup.locators.error).toContainText('Password and confirm password must match.'); });
  test('duplicate email is rejected', async ({ page }) => { const signup = new SignupPage(page); await signup.open(); await signup.fill({ ...sample(), email: 'admin@ptcl.com' }); await signup.submit(); await expect(signup.locators.error).toContainText('An account already exists'); });
  test('valid signup waits for administrator approval', async ({ page }) => { const signup = new SignupPage(page); const data = sample(); await signup.open(); await signup.fill(data); await signup.submit(); await expect(signup.locators.success).toBeVisible(); const login = new LoginPage(page); await loginLocatorsLogin(login, data.email, data.password); await expect(signup.locators.error).toContainText('waiting for administrator approval'); });
  test('admin approves signup and employee can log in', async ({ page }) => { const signup = new SignupPage(page); const data = sample(); await signup.open(); await signup.fill(data); await signup.submit(); await expect(signup.locators.success).toBeVisible(); const admin = new AdminAuthPage(page); await admin.open(); const row = admin.locators.accountRow(data.email); await expect(row).toContainText('Pending'); await row.getByRole('button', { name: 'Approve', exact: true }).click(); await expect(row).toContainText('Approved'); await page.getByRole('button', { name: 'Sign out' }).click(); await loginLocatorsLogin(new LoginPage(page), data.email, data.password); await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible(); });
});

async function loginLocatorsLogin(login: LoginPage, email: string, password: string) { const page = login.page; const l = loginLocators(page); await l.email.fill(email); await l.password.fill(password); await l.submit.click(); }
