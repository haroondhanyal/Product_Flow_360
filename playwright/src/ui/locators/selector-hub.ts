import { type Locator, type Page } from '@playwright/test';
/** Shared selector primitives. Prefer semantic Playwright locators; XPath is quarantined in xpath-fallbacks.ts. */
export const selectorHub = {
  button: (page: Page, name: string) => page.getByRole('button', { name, exact: true }),
  heading: (page: Page, name: string) => page.getByRole('heading', { name, exact: true }),
  field: (page: Page, label: string) => page.getByLabel(label, { exact: true }),
  namedInput: (page: Page, name: string): Locator => page.locator(`input[name="${name}"]`),
  testId: (page: Page, id: string) => page.getByTestId(id),
};
