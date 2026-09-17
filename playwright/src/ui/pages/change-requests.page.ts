import { expect, type Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { SidebarComponent } from '../components/sidebar.component';
import { changeRequestsLocators } from '../locators/change-requests.locators';
export class ChangeRequestsPage {
  constructor(readonly page: Page) {}
  get locators() { return changeRequestsLocators(this.page); }
  async open() { const login = new LoginPage(this.page); await login.open(); await login.login(); await new SidebarComponent(this.page).open('Change requests'); await expect(this.locators.heading).toBeVisible(); }
  async begin() { await this.locators.create.click(); await expect(this.locators.dialog).toBeVisible(); }
}
