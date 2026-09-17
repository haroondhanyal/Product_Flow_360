import { expect, type Page } from '@playwright/test';
import { testCaseLocators } from '../locators/test-case.locators';
import { LoginPage } from './login.page';
import { SidebarComponent } from '../components/sidebar.component';
export class TestCasePage {
  constructor(private readonly page: Page) {}
  get locators() { return testCaseLocators(this.page); }
  async open() { const login = new LoginPage(this.page); await login.open(); await login.login(); await new SidebarComponent(this.page).open('Test management'); await this.expectBoard(); }
  async begin() { await this.locators.create.click(); await expect(this.locators.editorHeading).toBeVisible(); }
  async expectBoard() { await expect(testCaseLocators(this.page).heading).toBeVisible(); }
  async expectSmokeAndRegressionOptions() { const l = testCaseLocators(this.page); await expect(l.create).toBeVisible(); await l.create.click(); await expect(l.stageOptions).toContainText(['Smoke', 'Regression']); }
}
