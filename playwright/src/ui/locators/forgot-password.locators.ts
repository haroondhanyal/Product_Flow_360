import { type Page } from '@playwright/test';
export const forgotPasswordLocators = (page: Page) => ({
  heading: page.getByRole('heading', { name: 'Recover your employee account.' }),
  email: page.getByRole('textbox', { name: 'Employee email' }),
  request: page.getByRole('button', { name: 'Request password reset' }),
  code: page.getByRole('textbox', { name: 'Recovery code' }),
  newPassword: page.locator('input[name="password"]'),
  confirmation: page.locator('input[name="confirmPassword"]'),
  setPassword: page.getByRole('button', { name: 'Set new password' }),
  notice: page.locator('.auth-panel .success-message'),
  error: page.locator('.auth-panel .inline-error'),
});
