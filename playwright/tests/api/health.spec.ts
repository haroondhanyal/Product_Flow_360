import { test, expect } from '@playwright/test';
import { HealthService } from '../../src/api/services/health.service';
test.describe('@api health', () => { test.skip(!process.env.PF360_RUN_API_TESTS, 'Set PF360_RUN_API_TESTS=1 when the Nest API is running.'); test('API health endpoint responds when API is running', async ({ request }) => { const response = await new HealthService(request).health(); expect(await response.json()).toBeTruthy(); }); });
