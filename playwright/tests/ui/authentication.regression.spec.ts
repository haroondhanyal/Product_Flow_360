import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/ui/pages/login.page';
import { automationData } from '../../src/utils/test-data.factory';
import { brandAllure } from '../../src/utils/allure';
test.describe('@regression @ui Authentication', () => {
  test('negative: invalid credentials keep the user on the secure login screen', async ({ page }) => { await brandAllure('Authentication'); const data = automationData(); const login = new LoginPage(page); await login.open(); await page.getByLabel('Email').fill(data.invalidEmail); await page.locator('input[name="password"]').fill(data.invalidPassword); await page.getByRole('button', { name: 'Login to ProductFlow 360' }).click(); await expect(page.getByText('Email or password is incorrect.')).toBeVisible(); await expect(page.getByRole('button', { name: 'Login to ProductFlow 360' })).toBeVisible(); });
});
