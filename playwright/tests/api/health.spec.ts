import { request as playwrightRequest } from '@playwright/test';
import { apiTest as test, expect, type ApiHarness } from '../../src/api/evidence-test';
import { environment } from '../../config/environment';

const root = environment.apiBaseUrl;
const credentials = { email: process.env.API_TEST_EMAIL ?? 'api-cases@ptcl.test', password: process.env.API_TEST_PASSWORD ?? 'ApiCases!Password2026' };
let token = '';
const detail = async (h: ApiHarness, title: string, method: string, path: string, response: Awaited<ReturnType<ApiHarness['request']['get']>>, expected: number) => {
  const body = await response.text();
  await h.apiEvidence.show(title, method, path, response.status(), body);
  expect(response.status(), `${method} ${path}`).toBe(expected);
  return body;
};

test.beforeAll(async () => {
  const client = await playwrightRequest.newContext();
  const login = await client.post(`${root}/auth/login`, { data: credentials });
  if (!login.ok()) throw new Error(`API case account could not authenticate (${login.status()}): ${await login.text()}`);
  token = (await login.json()).accessToken;
  await client.dispose();
});

test('@api @smoke PF360-API-001 health endpoint reports local API readiness', async ({ request, apiEvidence }: ApiHarness) => {
  const response = await request.get(`${root}/health`);
  const body = JSON.parse(await detail({ request, apiEvidence }, 'Health readiness contract', 'GET', '/health', response, 200));
  expect(body).toMatchObject({ status: 'ok', service: 'pf360-api', storage: 'local-file' });
  expect(Number.isNaN(Date.parse(body.at))).toBe(false);
});

const malformedLogins: Array<[string, unknown]> = [
  ['missing body', undefined], ['null body', null], ['array body', []], ['string body', 'user'], ['numeric body', 7],
  ['missing email', { password: credentials.password }], ['missing password', { email: credentials.email }],
  ['numeric email', { email: 4, password: credentials.password }], ['numeric password', { email: credentials.email, password: 123456789012 }],
  ['empty email', { email: '', password: credentials.password }], ['whitespace email', { email: '   ', password: credentials.password }],
  ['malformed email', { email: 'not-an-email', password: credentials.password }], ['missing at sign', { email: 'user.example.com', password: credentials.password }],
  ['empty password', { email: credentials.email, password: '' }], ['short password', { email: credentials.email, password: 'short' }],
  ['11 character password', { email: credentials.email, password: '12345678901' }],
  ['oversized password', { email: credentials.email, password: 'P'.repeat(257) }],
  ['email array', { email: ['qa@ptcl.test'], password: credentials.password }],
  ['password object', { email: credentials.email, password: { value: credentials.password } }],
  ['wrong property names', { username: credentials.email, passcode: credentials.password }],
];
for (const [index, [label, data]] of malformedLogins.entries()) {
  test(`@api @negative PF360-API-${String(index + 2).padStart(3, '0')} login rejects ${label}`, async ({ request, apiEvidence }: ApiHarness) => {
    const h = { request, apiEvidence };
    const response = await h.request.post(`${root}/auth/login`, { data });
    await detail(h, `Authentication input validation · ${label}`, 'POST', '/auth/login', response, 400);
  });
}

const invalidCredentials = [
  ['unknown account', 'missing-user@ptcl.test', credentials.password], ['wrong password', credentials.email, 'Wrong!Password2026'],
  ['case-changed unknown account', 'API-CASES@ptcl.test', 'Wrong!Password2026'], ['inactive style account', 'inactive@ptcl.test', credentials.password],
  ['empty account password', credentials.email, '', 400], ['short account password', credentials.email, '12345678901', 400],
  ['leading whitespace email', ` ${credentials.email}`, 'Wrong!Password2026'], ['trailing whitespace email', `${credentials.email} `, 'Wrong!Password2026'],
  ['unicode account', 'ٹیسٹ@ptcl.test', credentials.password, 400], ['plus alias account', 'api-cases+unknown@ptcl.test', credentials.password],
  ['wrong-case account', 'api-cases@PTCL.test', 'Wrong!Password2026'], ['near-match account', 'api-case@ptcl.test', credentials.password],
  ['deleted style account', 'deleted@ptcl.test', credentials.password], ['unregistered viewer', 'viewer@ptcl.test', credentials.password],
  ['wrong password suffix', credentials.email, `${credentials.password}x`], ['wrong password prefix', credentials.email, `x${credentials.password}`],
  ['wrong password case', credentials.email, credentials.password.toLowerCase()], ['wrong password symbols', credentials.email, '###########2026'],
  ['unlinked account', 'no-membership@ptcl.test', credentials.password], ['trimmed unknown account', ' unknown@ptcl.test ', credentials.password],
];
for (const [index, [label, email, password, expected = 401]] of invalidCredentials.entries()) {
  test(`@api @negative PF360-API-${String(index + 22).padStart(3, '0')} login returns unauthorized for ${label}`, async ({ request, apiEvidence }: ApiHarness) => {
    const h = { request, apiEvidence };
    const response = await h.request.post(`${root}/auth/login`, { data: { email, password } });
    await detail(h, `Authentication rejection · ${label}`, 'POST', '/auth/login', response, expected);
  });
}

const successfulLogins = [
  ['canonical email', credentials.email], ['uppercase email', credentials.email.toUpperCase()], ['mixed-case email', 'Api-Cases@Ptcl.Test'],
  ['trimmed email', `  ${credentials.email}  `], ['lowercase email', credentials.email.toLowerCase()], ['domain case variant', 'api-cases@PTCL.TEST'],
  ['email normalization', `\t${credentials.email}\n`], ['canonical credentials', credentials.email], ['session metadata', credentials.email], ['bearer type', credentials.email],
];
for (const [index, [label, email]] of successfulLogins.entries()) {
  test(`@api @regression PF360-API-${String(index + 42).padStart(3, '0')} login success contract · ${label}`, async ({ request, apiEvidence }: ApiHarness) => {
    const h = { request, apiEvidence };
    const response = await h.request.post(`${root}/auth/login`, { data: { email, password: credentials.password } });
    const body = JSON.parse(await detail(h, `Authentication success contract · ${label}`, 'POST', '/auth/login', response, 201));
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBe('15m');
    expect(body.accessToken.split('.')).toHaveLength(3);
  });
}

const workflows = [
  ['create project record', 'project', 'Project API workflow'], ['create RFC record', 'rfc', 'RFC API workflow'],
  ['create requirement record', 'requirement', 'Requirement API workflow'], ['create test case record', 'test-case', 'Test case API workflow'],
  ['create defect record', 'bug', 'Defect API workflow'], ['create release record', 'release', 'Release API workflow'],
  ['create approval record', 'approval', 'Approval API workflow'], ['create risk record', 'risk', 'Risk API workflow'],
  ['create and read workspace project', 'project', 'Project round trip API workflow'],
];
const workspaceId = process.env.API_TEST_WORKSPACE_ID!;
for (const [index, [label, type, title]] of workflows.entries()) {
  test(`@api @regression PF360-API-${String(index + 52).padStart(3, '0')} ${label} contract`, async ({ request, apiEvidence }: ApiHarness) => {
    const h = { request, apiEvidence };
    const payload = { workspaceId, title: `${title} ${index + 1}`, status: index % 2 ? 'In review' : 'Open', payload: { priority: 'Medium', source: 'Allure API suite' } };
    const created = await h.request.post(`${root}/api/${type}`, { headers: { Authorization: `Bearer ${token}` }, data: payload });
    const createdBody = JSON.parse(await detail(h, `${title} · create`, 'POST', `/api/${type}`, created, 201));
    expect(createdBody.id).toBeTruthy();
    const read = await h.request.get(`${root}/api/${type}`, { headers: { Authorization: `Bearer ${token}` } });
    const list = JSON.parse(await detail(h, `${title} · verify persisted record`, 'GET', `/api/${type}`, read, 200));
    expect(list).toEqual(expect.arrayContaining([expect.objectContaining({ id: createdBody.id, title: payload.title, status: payload.status, entityType: type, workspaceId })]));
  });
}
