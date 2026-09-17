import { type Page } from '@playwright/test';
export const rfcLocators = (page: Page) => ({ create: page.getByRole('button', { name: 'New request', exact: true }), title: page.getByLabel('Request title'), owner: page.getByLabel('Owner', { exact: true }), upload: page.getByRole('button', { name: 'Choose documents', exact: true }) });
