import { type Page } from '@playwright/test';
export const defectLocators = (page: Page) => ({ create: page.getByRole('button', { name: /New defect/i }), manage: page.getByRole('button', { name: /Manage issue/i }), evidence: page.getByRole('button', { name: '👁 View evidence' }) });
