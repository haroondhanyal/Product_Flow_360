import { test, expect } from '@playwright/test';
import { environment } from '../../config/environment';
test.describe('@api @regression API negative paths', () => {
  test.skip(!process.env.PF360_RUN_API_TESTS, 'Set PF360_RUN_API_TESTS=1 when the Nest API is running.');
  test('negative: unknown API route returns not found', async ({ request }) => { const response = await request.get(`${environment.apiBaseUrl}/api/not-a-real-resource`); expect(response.status()).toBe(404); });
});
