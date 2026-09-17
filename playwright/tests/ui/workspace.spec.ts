import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/ui/pages/login.page';
import { SidebarComponent } from '../../src/ui/components/sidebar.component';
import { brandAllure } from '../../src/utils/allure';

test.describe('@ui @workspace @regression Workspace management', () => {
  test.beforeEach(async ({ page }) => { const login = new LoginPage(page); await login.open(); await login.login(); await new SidebarComponent(page).open('Workspace tools'); await expect(page.getByRole('heading', { name: 'Workspaces', exact: true })).toBeVisible(); });
  test('positive: opens the workspace creation form', async ({ page }) => { await brandAllure('Workspace Management'); await page.getByRole('button', { name: 'New workspace', exact: true }).click(); await expect(page.getByLabel('Workspace name')).toBeVisible(); await expect(page.getByLabel('Workspace owner')).toBeVisible(); });
  test('negative: closing a blank workspace form does not create a workspace', async ({ page }) => { await page.getByRole('button', { name: 'New workspace', exact: true }).click(); await page.getByRole('button', { name: 'Close', exact: true }).click(); await expect(page.getByLabel('Workspace name')).toHaveCount(0); });
});
