import { type Page } from '@playwright/test';
import { selectorHub } from './selector-hub';
export const rtmLocators = (page: Page) => ({
  heading: selectorHub.heading(page, 'Project RTM'),
  create: selectorHub.button(page, 'Create RTM'),
  import: selectorHub.button(page, 'Import Excel / CSV'),
  formHeading: selectorHub.heading(page, 'Create project RTM'),
  name: page.getByRole('textbox', { name: 'Project / RTM name' }),
  volume: page.getByRole('combobox', { name: 'Initial test cases' }),
  submit: selectorHub.button(page, 'Create editable RTM'),
  cancel: selectorHub.button(page, 'Cancel'),
  table: page.getByRole('table'),
  addCase: selectorHub.button(page, 'Add test case'),
  export: selectorHub.button(page, 'Export RTM'),
});
