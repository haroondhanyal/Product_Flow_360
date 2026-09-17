import { type Page } from '@playwright/test';
import { selectorHub } from './selector-hub';
export const testCaseLocators = (page: Page) => ({
  heading: selectorHub.heading(page, 'Test case management.'),
  create: selectorHub.button(page, 'New test case'),
  editorHeading: selectorHub.heading(page, 'Create test case'),
  cancel: selectorHub.button(page, 'Cancel'),
  stage: page.getByRole('combobox', { name: 'Stage' }),
  stageOptions: page.locator('select[name="stage"] option'),
  linkedRfc: page.getByRole('combobox', { name: 'Linked RFC' }),
  title: page.getByRole('textbox', { name: 'Test case title' }),
  module: page.getByRole('textbox', { name: 'Module' }),
  steps: page.getByRole('textbox', { name: 'Steps' }),
  expected: page.getByRole('textbox', { name: 'Expected result' }),
  save: selectorHub.button(page, 'Save test case'),
  board: page.locator('.test-case-board'),
  manage: page.getByRole('button', { name: /Manage test/ }),
});
