import { expect, type Page } from '@playwright/test';
export class TestCasePage {
  constructor(private readonly page: Page) {}
  async expectBoard() { await expect(this.page.getByRole('heading', { name: 'Test case management.' })).toBeVisible(); }
  async expectSmokeAndRegressionOptions() { await expect(this.page.getByRole('button', { name: 'New test case', exact: true })).toBeVisible(); await this.page.getByRole('button', { name: 'New test case', exact: true }).click(); await expect(this.page.locator('select[name="stage"] option')).toContainText(['Smoke', 'Regression']); }
}
