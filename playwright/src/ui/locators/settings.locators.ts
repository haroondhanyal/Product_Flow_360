import { type Page } from '@playwright/test';
export const settingsLocators = (page: Page) => ({
  heading: page.getByRole('heading', { name: 'Make this workspace yours' }),
  themes: page.getByRole('group', { name: 'Workspace theme' }),
  theme: (name: string) => page.getByRole('group', { name: 'Workspace theme' }).getByRole('button', { name: new RegExp(name) }),
  colours: page.getByRole('group', { name: 'Primary button colour' }),
  colour: (name: string) => page.getByRole('button', { name: `${name} button colour` }),
  profile: page.getByRole('button', { name: 'Update profile' }),
  note: page.locator('.settings-panel .settings-note'),
});
