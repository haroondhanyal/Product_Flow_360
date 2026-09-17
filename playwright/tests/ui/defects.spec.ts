import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/ui/pages/login.page';
import { SidebarComponent } from '../../src/ui/components/sidebar.component';
import { brandAllure } from '../../src/utils/allure';

test.describe('@ui @defect @regression Defect management', () => {
  test.beforeEach(async ({ page }) => { const login = new LoginPage(page); await login.open(); await login.login(); await new SidebarComponent(page).open('Defects'); await expect(page.getByRole('button', { name: 'New defect', exact: true })).toBeVisible(); });
  test('positive: defect creation exposes professional triage fields', async ({ page }) => { await brandAllure('Defect Management'); await page.getByRole('button', { name: 'New defect', exact: true }).click(); await expect(page.getByLabel('Priority')).toBeVisible(); await expect(page.getByLabel('Linked record')).toBeVisible(); await expect(page.getByText('Actual result / observed behaviour', { exact: true })).toBeVisible(); });
  test('negative: cancelling a blank defect keeps the issue board available', async ({ page }) => { await page.getByRole('button', { name: 'New defect', exact: true }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByRole('button', { name: 'New defect', exact: true })).toBeVisible(); });
});
