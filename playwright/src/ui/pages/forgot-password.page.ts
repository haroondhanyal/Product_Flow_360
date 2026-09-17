import { expect, type Page } from '@playwright/test';
import { loginLocators } from '../locators/login.locators';
import { forgotPasswordLocators } from '../locators/forgot-password.locators';
export class ForgotPasswordPage {
  constructor(readonly page: Page) {}
  get locators() { return forgotPasswordLocators(this.page); }
  async open() { await this.page.goto('/'); await loginLocators(this.page).forgotLink.click(); await expect(this.locators.heading).toBeVisible(); }
  async request(email: string) { await this.locators.email.fill(email); await this.locators.request.click(); }
  async reset(email: string, code: string, password: string, confirmation = password) { await this.locators.email.fill(email); await this.locators.code.fill(code); await this.locators.newPassword.fill(password); await this.locators.confirmation.fill(confirmation); await this.locators.setPassword.click(); }
}
