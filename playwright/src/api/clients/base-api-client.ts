import { expect, type APIRequestContext } from '@playwright/test';
export class BaseApiClient {
  constructor(protected readonly request: APIRequestContext) {}
  async get(path: string) { const response = await this.request.get(path); expect(response.ok(), `${path} should return a successful response`).toBeTruthy(); return response; }
}
