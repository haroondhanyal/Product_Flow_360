import { type Page } from '@playwright/test';
export const changeRequestsLocators = (page: Page) => ({
  heading: page.getByRole('heading', { name: 'Change requests', exact: true }),
  create: page.getByRole('button', { name: 'New request' }),
  search: page.getByRole('textbox', { name: 'Search requests' }),
  status: page.getByRole('combobox', { name: 'Filter by status' }),
  table: page.locator('.requests table'),
  export: page.locator('.requests').getByRole('button', { name: 'Export' }),
  dialog: page.getByRole('dialog', { name: 'New change request' }),
  close: page.getByRole('button', { name: 'Close dialog' }),
  title: page.getByRole('textbox', { name: 'Request title' }),
  product: page.getByRole('combobox', { name: 'Product' }),
  priority: page.getByRole('combobox', { name: 'Priority' }),
  owner: page.getByRole('textbox', { name: 'Owner' }),
  submit: page.getByRole('button', { name: 'Create request' }),
  empty: page.getByText('No requests match your search. Try a different keyword or status.'),
});
