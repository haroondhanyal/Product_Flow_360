import { expect, type Page } from '@playwright/test';
import { environment } from '../../../config/environment';
import { loginLocators } from '../locators/login.locators';
export class LoginPage {
  constructor(readonly page: Page) {}
  async open() { const l = loginLocators(this.page); await this.page.goto('/'); await expect(l.submit).toBeVisible(); }
  async login(email = environment.userEmail, password = environment.userPassword) { const l = loginLocators(this.page); await l.email.fill(email); await l.password.fill(password); await l.submit.click(); await expect(l.splash).toBeHidden(); }
}
