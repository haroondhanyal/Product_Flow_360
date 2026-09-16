import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/ui/pages/login.page';
import { SidebarComponent } from '../../src/ui/components/sidebar.component';
import { TestCasePage } from '../../src/ui/pages/test-case.page';

test.describe('@smoke UI delivery controls', () => {
  test('admin can load dashboard, RTM and Test Management smoke/regression options', async ({ page }) => {
    const login = new LoginPage(page); await login.open(); await login.login();
    const sidebar = new SidebarComponent(page); await sidebar.open('RTM'); await expect(page.getByRole('button', { name: 'Create RTM', exact: true })).toBeVisible();
    await sidebar.open('Test management'); const tests = new TestCasePage(page); await tests.expectBoard(); await tests.expectSmokeAndRegressionOptions();
  });
});
