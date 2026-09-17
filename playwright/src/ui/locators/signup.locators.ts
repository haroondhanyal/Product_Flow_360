import { type Page } from '@playwright/test';
export const signupLocators = (page: Page) => ({
  heading: page.getByRole('heading', { name: 'Create your workspace account.' }),
  fullName: page.getByRole('textbox', { name: 'Full name' }),
  employeeNo: page.getByRole('textbox', { name: 'Employee number' }),
  mobile: page.getByRole('textbox', { name: 'Mobile number' }),
  designation: page.getByRole('textbox', { name: 'Designation' }),
  department: page.getByRole('combobox', { name: 'Department' }),
  email: page.getByRole('textbox', { name: 'Email' }),
  password: page.locator('input[name="password"]'),
  confirmation: page.locator('input[name="confirmPassword"]'),
  submit: page.getByRole('button', { name: 'Submit for approval' }),
  success: page.getByText('Signup submitted. An administrator must approve your account before login.'),
  error: page.locator('.auth-panel .inline-error'),
});
