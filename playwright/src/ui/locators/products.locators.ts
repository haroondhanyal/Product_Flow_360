import { type Page } from '@playwright/test';
export const productsLocators = (page: Page) => ({
  grid: page.locator('.product-grid'),
  cards: page.locator('.product-card'),
  card: (name: string) => page.getByRole('button', { name: new RegExp(`^${name}\\b`) }),
  requestHeading: page.getByRole('heading', { name: 'Change requests', exact: true }),
  requestSearch: page.getByRole('textbox', { name: 'Search requests' }),
});
