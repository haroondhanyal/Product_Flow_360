import { test, expect, type Page } from '@playwright/test';
import { LoginPage } from '../../src/ui/pages/login.page';
import { SidebarComponent } from '../../src/ui/components/sidebar.component';

async function openModule(page: Page, module: string) {
  const login = new LoginPage(page);
  await login.open();
  await login.login();
  await new SidebarComponent(page).open(module);
}

test.describe('@ui @matrix Module form coverage', () => {
  test('workspace creation has owner, date, description and image controls', async ({ page }) => {
    await openModule(page, 'Workspace tools');
    await expect(page.getByRole('heading', { name: 'Workspaces', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New workspace', exact: true }).click();
    for (const label of ['Workspace name', 'Workspace owner', 'Start date', 'Description']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator('input[type="file"][accept="image/png,image/jpeg,image/webp"]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByLabel('Workspace name')).toHaveCount(0);
  });

  test('RTM creation has import and all supported volumes', async ({ page }) => {
    await openModule(page, 'RTM');
    await expect(page.getByRole('button', { name: 'Import Excel / CSV' })).toBeVisible();
    await page.getByRole('button', { name: 'Create RTM', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Create project RTM' })).toBeVisible();
    await expect(page.getByLabel('Initial test cases').locator('option')).toHaveText([
      '100 test cases', '200 test cases', '300 test cases', '500 test cases',
    ]);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Create project RTM' })).toHaveCount(0);
  });

  test('test case form exposes traceability and execution fields', async ({ page }) => {
    await openModule(page, 'Test management');
    await page.getByRole('button', { name: 'New test case', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Linked RFC' })).toBeVisible();
    for (const label of ['Module', 'Test case title', 'Objective', 'Preconditions', 'Steps', 'Expected result']) {
      await expect(page.getByRole('textbox', { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('combobox', { name: 'Stage' }).locator('option')).toContainText(['Smoke', 'Regression']);
  });

  test('defect form exposes triage and observed result fields', async ({ page }) => {
    await openModule(page, 'Defects');
    await page.getByRole('button', { name: 'New defect', exact: true }).click();
    for (const label of ['Linked RFC', 'Priority', 'Linked record', 'Actual result / observed behaviour']) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'New defect', exact: true })).toBeVisible();
  });
});
