import { expect, type Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { SidebarComponent } from '../components/sidebar.component';
import { settingsLocators } from '../locators/settings.locators';
export class SettingsPage {
  constructor(readonly page: Page) {}
  get locators() { return settingsLocators(this.page); }
  async open() { const login = new LoginPage(this.page); await login.open(); await login.login(); await new SidebarComponent(this.page).open('Settings'); await expect(this.locators.heading).toBeVisible(); }
}
