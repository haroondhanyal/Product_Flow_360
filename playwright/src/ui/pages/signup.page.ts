import { expect, type Page } from '@playwright/test';
import { loginLocators } from '../locators/login.locators';
import { signupLocators } from '../locators/signup.locators';
export class SignupPage {
  constructor(readonly page: Page) {}
  get locators() { return signupLocators(this.page); }
  async open() { await this.page.goto('/'); await loginLocators(this.page).signupTab.click(); await expect(this.locators.heading).toBeVisible(); }
  async fill(data: { name: string; employeeNo: string; email: string; password: string; confirmation?: string }) {
    const l = this.locators;
    await l.fullName.fill(data.name); await l.employeeNo.fill(data.employeeNo); await l.mobile.fill('+92 300 1234567');
    await l.designation.fill('QA Engineer'); await l.department.selectOption({ label: 'Technology' });
    await l.email.fill(data.email); await l.password.fill(data.password); await l.confirmation.fill(data.confirmation ?? data.password);
  }
  async submit() { await this.locators.submit.click(); }
}
