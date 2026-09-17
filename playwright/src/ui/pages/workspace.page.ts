import { expect, type Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { SidebarComponent } from '../components/sidebar.component';
import { workspaceLocators } from '../locators/workspace.locators';
export class WorkspacePage {
  constructor(readonly page: Page) {}
  get locators() { return workspaceLocators(this.page); }
  async open() { const login = new LoginPage(this.page); await login.open(); await login.login(); await new SidebarComponent(this.page).open('Workspace tools'); await expect(this.locators.heading).toBeVisible(); }
  async begin() { await this.locators.create.click(); await expect(this.locators.name).toBeVisible(); }
}
