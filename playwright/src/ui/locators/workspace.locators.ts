import { type Page } from '@playwright/test';
export const workspaceLocators = (page: Page) => ({
  heading: page.getByRole('heading', { name: 'Workspaces', exact: true }),
  create: page.getByRole('button', { name: 'New workspace', exact: true }),
  close: page.getByRole('button', { name: 'Close', exact: true }),
  name: page.getByRole('textbox', { name: 'Workspace name' }),
  owner: page.getByRole('textbox', { name: 'Workspace owner' }),
  date: page.getByLabel('Start date', { exact: true }),
  description: page.getByRole('textbox', { name: 'Description', exact: true }),
  image: page.locator('input[type="file"][accept="image/png,image/jpeg,image/webp"]'),
  submit: page.getByRole('button', { name: 'Create workspace', exact: true }),
  directory: page.locator('.workspace-directory-panel'),
  search: page.getByPlaceholder('Search workspace by name, owner or description…'),
  selector: page.locator('.workspace-current'),
  project: page.getByRole('button', { name: 'New project', exact: true }),
});
