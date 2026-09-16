import { test, expect } from '@playwright/test';
import { HealthService } from '../../src/api/services/health.service';
test.describe('@api @smoke health', () => { test('API health endpoint responds when API is running', async ({ request }) => { const response = await new HealthService(request).health(); expect(await response.json()).toBeTruthy(); }); });
