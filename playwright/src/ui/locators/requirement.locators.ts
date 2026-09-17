import { type Page } from '@playwright/test';
export const requirementLocators = (page: Page) => ({ create: page.getByRole('button', { name: /New requirement/i }), manage: page.getByRole('button', { name: /Manage requirement/i }), evidence: page.getByRole('button', { name: '👁 View evidence' }) });
