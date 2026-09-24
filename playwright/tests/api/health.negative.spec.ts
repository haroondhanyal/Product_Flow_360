import { apiTest as test, expect, type ApiHarness } from '../../src/api/evidence-test';
import { environment } from '../../config/environment';

test('@api @negative PF360-API-061 protected resource rejects requests without a token', async ({ request, apiEvidence }: ApiHarness) => {
  const response = await request.get(`${environment.apiBaseUrl}/api/project`);
  const body = await response.text();
  await apiEvidence.show('Protected API resource · missing token', 'GET', '/api/project', response.status(), body);
  expect(response.status()).toBe(401);
});

const entities = ['project', 'rfc', 'user-story', 'requirement', 'test-case', 'test-run', 'bug', 'document', 'comment', 'link', 'release', 'approval', 'risk'];
const base = environment.apiBaseUrl;
let caseId = 62;
const protectedChecks: Array<[string, string, (id: string) => string]> = [
  ...entities.map(type => [`list ${type} records`, 'GET', () => `/api/${type}`] as [string, string, (id: string) => string]),
  ...entities.map(type => [`create ${type} record`, 'POST', () => `/api/${type}`] as [string, string, (id: string) => string]),
  ...entities.map(type => [`update ${type} record`, 'POST', () => `/api/${type}/${idForUpdate()}`] as [string, string, (id: string) => string]),
  ...['summary', 'project-health', 'rfc-statistics', 'uat-statistics', 'bug-statistics', 'release-statistics', 'approval-statistics', 'workload', 'risks', 'activity-feed', 'notifications'].map(path => [`read dashboard ${path}`, 'GET', () => `/dashboard/${path}`] as [string, string, (id: string) => string]),
];
function idForUpdate() { return '4a2d86f5-0e74-4ce4-a47d-0bb28e2e76a1'; }
for (const [label, method, pathFor] of protectedChecks) {
  const id = caseId++;
  test(`@api @negative PF360-API-${String(id).padStart(3, '0')} authorization blocks ${label}`, async ({ request, apiEvidence }: ApiHarness) => {
    const path = pathFor(idForUpdate());
    const response = method === 'GET'
      ? await request.get(`${base}${path}`)
      : await request.post(`${base}${path}`, { data: { workspaceId: 'bad-workspace', title: 'Unauthorized attempt', status: 'Open' } });
    await apiEvidence.show(`Authorization negative · ${label}`, method, path, response.status(), await response.text());
    expect(response.status()).toBe(401);
  });
}

const invalidHeaders = [
  ['missing token', undefined], ['empty token', ''], ['bare bearer scheme', 'Bearer'], ['blank bearer token', 'Bearer '],
  ['wrong token', 'Bearer not-a-jwt'], ['expired token shape', 'Bearer eyJhbGciOiJub25lIn0.eyJleHAiOjF9.signature'],
  ['basic auth scheme', 'Basic dXNlcjpwYXNz'], ['token auth scheme', 'Token abc123'], ['wrong bearer casing and value', 'bearer invalid-token'],
];
for (const [label, authorization] of invalidHeaders) {
  const id = caseId++;
  test(`@api @negative PF360-API-${String(id).padStart(3, '0')} dashboard rejects ${label}`, async ({ request, apiEvidence }: ApiHarness) => {
    const headers = authorization === undefined ? {} : { Authorization: authorization };
    const response = await request.get(`${base}/dashboard/summary`, { headers });
    await apiEvidence.show(`Authorization header rejection · ${label}`, 'GET', '/dashboard/summary', response.status(), await response.text());
    expect(response.status()).toBe(401);
  });
}
