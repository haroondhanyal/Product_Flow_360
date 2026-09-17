import { expect, type Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { SidebarComponent } from '../components/sidebar.component';
import { adminAuthLocators } from '../locators/admin-auth.locators';
export class AdminAuthPage {
  constructor(readonly page: Page) {}
  get locators() { return adminAuthLocators(this.page); }
  async open() { const login = new LoginPage(this.page); await login.open(); await login.login(); await new SidebarComponent(this.page).open('Admin board'); await expect(this.locators.queue).toBeVisible(); }
}
