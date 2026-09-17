import { expect, type Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { SidebarComponent } from '../components/sidebar.component';
import { rtmLocators } from '../locators/rtm.locators';
export class RtmPage {
  constructor(readonly page: Page) {}
  get locators() { return rtmLocators(this.page); }
  async open() { const login = new LoginPage(this.page); await login.open(); await login.login(); await new SidebarComponent(this.page).open('RTM'); await expect(this.locators.heading).toBeVisible(); }
  async begin() { await this.locators.create.click(); await expect(this.locators.formHeading).toBeVisible(); }
}
