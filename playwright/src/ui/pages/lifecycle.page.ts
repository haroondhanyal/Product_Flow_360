import { expect, type Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { SidebarComponent } from '../components/sidebar.component';
import { lifecycleLocators } from '../locators/lifecycle.locators';

export class LifecyclePage {
  constructor(readonly page: Page, readonly module: string, readonly singular: string) {}
  get locators() { return lifecycleLocators(this.page, this.module, this.singular); }
  async open() {
    const login = new LoginPage(this.page);
    await login.open();
    await login.login();
    await new SidebarComponent(this.page).open(this.module);
    await expect(this.locators.heading).toBeVisible();
  }
  async begin() {
    await this.locators.create.click();
    await expect(this.locators.formHeading).toBeVisible();
  }
  async cancel() {
    await this.locators.cancel.click();
    await expect(this.locators.formHeading).toHaveCount(0);
  }
}
