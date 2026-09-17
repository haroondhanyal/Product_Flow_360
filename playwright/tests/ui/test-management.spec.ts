import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/ui/pages/login.page';
import { SidebarComponent } from '../../src/ui/components/sidebar.component';
import { TestCasePage } from '../../src/ui/pages/test-case.page';
import { brandAllure } from '../../src/utils/allure';

test.describe('@ui @testcase @regression Test Management', () => {
  test.beforeEach(async ({ page }) => { const login = new LoginPage(page); await login.open(); await login.login(); await new SidebarComponent(page).open('Test management'); await new TestCasePage(page).expectBoard(); });
  test('positive: standard fields and Smoke/Regression types are present', async ({ page }) => { await brandAllure('Test Case Management'); await page.getByRole('button', { name: 'New test case', exact: true }).click(); for (const label of ['Test case title', 'Objective', 'Preconditions', 'Steps', 'Test data', 'Expected result', 'Remarks']) await expect(page.getByText(label, { exact: true })).toBeVisible(); await expect(page.locator('select[name="stage"] option')).toContainText(['Smoke', 'Regression']); });
  test('negative: cancelling a blank test case keeps the board unchanged', async ({ page }) => { await page.getByRole('button', { name: 'New test case', exact: true }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByRole('button', { name: 'New test case', exact: true })).toBeVisible(); });
});
