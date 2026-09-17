import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/ui/pages/login.page';
import { SidebarComponent } from '../../src/ui/components/sidebar.component';
import { brandAllure } from '../../src/utils/allure';

test.describe('@ui @rtm @regression RTM management', () => {
  test.beforeEach(async ({ page }) => { const login = new LoginPage(page); await login.open(); await login.login(); await new SidebarComponent(page).open('RTM'); await expect(page.getByRole('button', { name: 'Create RTM', exact: true })).toBeVisible(); });
  test('positive: exposes standard RTM volume choices', async ({ page }) => { await brandAllure('RTM Management'); await page.getByRole('button', { name: 'Create RTM', exact: true }).click(); const options = page.getByLabel('Initial test cases').locator('option'); await expect(options).toHaveText(['100 test cases', '200 test cases', '300 test cases', '500 test cases']); });
  test('negative: cancelling an empty RTM draft leaves no creation form', async ({ page }) => { await page.getByRole('button', { name: 'Create RTM', exact: true }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Create project RTM' })).toHaveCount(0); });
});
