import { expect, type Page } from '@playwright/test';
import { environment } from '../../../config/environment';
import { loginLocators } from '../locators/login.locators';
export class LoginPage {
  constructor(readonly page: Page) {}
  async open() {
    // Every Playwright context is isolated. Seed a predictable admin only inside
    // that test browser so the UI suite does not depend on the app's random demo
    // password or a developer's local browser storage.
    await this.page.addInitScript(async ({ email, password }) => {
      const usersKey = 'pf360-auth-users';
      const users = JSON.parse(localStorage.getItem(usersKey) ?? '[]');
      if (!users.some((user: { email?: string }) => user.email?.toLowerCase() === email)) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
        const passwordHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        users.push({ id: 'playwright-admin', fullName: 'Playwright Admin', employeeNo: 'PW-ADMIN-001', designation: 'Test Administrator', department: 'Technology', email, mobile: '+92 300 0000000', passwordHash, role: 'Admin', status: 'Approved', createdAt: new Date().toISOString() });
        localStorage.setItem(usersKey, JSON.stringify(users));
      }
    }, { email: environment.userEmail.toLowerCase(), password: environment.userPassword });
    const l = loginLocators(this.page); await this.page.goto('/'); await expect(l.submit).toBeVisible();
  }
  async login(email = environment.userEmail, password = environment.userPassword) { const l = loginLocators(this.page); await l.email.fill(email); await l.password.fill(password); await l.submit.click(); await expect(l.splash).toBeHidden(); }
}
