import { type Page } from '@playwright/test';
export const adminAuthLocators = (page: Page) => ({
  queue: page.getByRole('heading', { name: 'Account approval queue' }),
  resetQueue: page.getByRole('heading', { name: 'Password reset requests' }),
  accountRow: (email: string) => page.locator('.admin-board .requests').first().getByRole('row').filter({ hasText: email }),
  resetRow: (email: string) => page.locator('.admin-board .requests').nth(1).getByRole('row').filter({ hasText: email }),
  approveReset: (name: string) => page.getByRole('button', { name: `Approve password reset for ${name}` }),
  rejectReset: (name: string) => page.getByRole('button', { name: `Reject password reset for ${name}` }),
  recoveryCode: (email: string) => page.locator('.admin-board .requests').nth(1).getByRole('row').filter({ hasText: email }).locator('strong'),
});
