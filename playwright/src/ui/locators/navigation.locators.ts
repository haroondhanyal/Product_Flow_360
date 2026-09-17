import { type Page } from '@playwright/test';
export const navigationLocators = (page: Page) => ({ module: (name: string) => page.locator('.sidebar nav, .sidebar-bottom').getByRole('button', { name, exact: name !== 'Change requests' }) });
