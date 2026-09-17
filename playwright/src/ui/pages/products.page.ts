import { expect, type Page } from '@playwright/test';
import { LoginPage } from './login.page';
import { SidebarComponent } from '../components/sidebar.component';
import { productsLocators } from '../locators/products.locators';
export class ProductsPage {
  constructor(readonly page: Page) {}
  get locators() { return productsLocators(this.page); }
  async open() { const login = new LoginPage(this.page); await login.open(); await login.login(); await new SidebarComponent(this.page).open('Products'); await expect(this.locators.grid).toBeVisible(); }
}
