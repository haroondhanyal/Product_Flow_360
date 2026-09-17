import { type Page } from '@playwright/test';
import { selectorHub } from './selector-hub';
export const loginLocators = (page: Page) => ({ email: selectorHub.field(page, 'Email'), password: selectorHub.namedInput(page, 'password'), submit: selectorHub.button(page, 'Login to ProductFlow 360'), error: page.getByText('Email or password is incorrect.'), splash: page.locator('.splash'), signupTab: selectorHub.button(page, 'Sign up'), forgotTab: selectorHub.button(page, 'Forgot password'), forgotLink: selectorHub.button(page, 'Forgot password?') });
