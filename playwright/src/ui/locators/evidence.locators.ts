import { type Page } from '@playwright/test';
export const evidenceLocators = (page: Page) => ({ add: page.getByRole('button', { name: 'Add evidence', exact: true }), view: page.getByRole('button', { name: '👁 View evidence' }), preview: page.getByRole('dialog', { name: /Evidence preview:/ }), closePreview: page.getByRole('button', { name: 'Close preview' }) });
