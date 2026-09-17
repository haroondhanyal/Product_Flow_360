import { type Page } from '@playwright/test';
/** Last-resort legacy locators only. New tests must use role/label/test-id selectors first. */
export const xpathFallbacks = { modalByTitle: (page: Page, title: string) => page.locator(`xpath=//section[@role='dialog'][.//h2[normalize-space()=${JSON.stringify(title)}]]`) };
