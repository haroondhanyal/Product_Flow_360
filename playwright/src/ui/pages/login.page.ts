import { expect, type Page } from '@playwright/test';
import { environment } from '../../../config/environment';
export class LoginPage {
  constructor(private readonly page: Page) {}
  async open() { await this.page.goto('/'); await expect(this.page.getByRole('button', { name: 'Login to ProductFlow 360' })).toBeVisible(); }
  async login(email = environment.userEmail, password = environment.userPassword) { await this.page.getByLabel('Email').fill(email); await this.page.locator('input[name="password"]').fill(password); await this.page.getByRole('button', { name: 'Login to ProductFlow 360' }).click(); await expect(this.page.locator('.splash')).toBeHidden(); }
}
