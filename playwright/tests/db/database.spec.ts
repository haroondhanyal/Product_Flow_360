import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { request as playwrightRequest } from '@playwright/test';
import { apiTest as test, expect, type ApiHarness } from '../../src/api/evidence-test';
import { environment } from '../../config/environment';

const root = environment.apiBaseUrl;
const workspaceId = process.env.API_TEST_WORKSPACE_ID!;
const email = process.env.API_TEST_EMAIL ?? 'api-cases@ptcl.test';
const password = process.env.API_TEST_PASSWORD ?? 'ApiCases!Password2026';
const storePath = process.env.LOCAL_DATA_FILE!;
const entities = ['project', 'rfc', 'user-story', 'requirement', 'test-case', 'test-run', 'bug', 'document', 'comment', 'link', 'release', 'approval', 'risk'];
let token = '';

function readStore() {
  return JSON.parse(readFileSync(storePath, 'utf8')) as {
    version: number;
    users: Array<Record<string, unknown>>;
    workspaces: Array<Record<string, unknown>>;
    memberships: Array<Record<string, unknown>>;
    records: Array<{ id: string; workspaceId: string; projectId: string | null; entityType: string; title: string; status: string; payload: Record<string, unknown>; createdBy: string; updatedBy: string }>;
    audits: Array<{ entityId: string; action: string; workspaceId: string; after: unknown }>;
  };
}

async function createRecord(request: ApiHarness['request'], type: string, title = `DB-${type}-${randomUUID()}`) {
  const response = await request.post(`${root}/api/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { workspaceId, projectId: null, title, status: 'Open', payload: { priority: 'High', source: 'database-automation' } },
  });
  expect(response.status(), `POST /api/${type}`).toBe(201);
  return { id: (await response.json()).id as string, title };
}

async function showResult(h: ApiHarness, title: string, method: string, path: string, status: number, body: unknown) {
  await h.apiEvidence.show(title, method, path, status, JSON.stringify(body, null, 2));
}

test.beforeAll(async () => {
  const client = await playwrightRequest.newContext();
  const response = await client.post(`${root}/auth/login`, { data: { email, password } });
  if (!response.ok()) throw new Error(`DB test account could not authenticate (${response.status()}).`);
  token = (await response.json()).accessToken;
  await client.dispose();
});

for (const entity of entities) {
  test(`@database PF360-DB-${String(entities.indexOf(entity) + 1).padStart(3, '0')} INSERT persists ${entity} row and fields`, async ({ request, apiEvidence }: ApiHarness) => {
    const record = await createRecord(request, entity);
    const stored = readStore().records.find(row => row.id === record.id);
    await showResult({ request, apiEvidence }, `Database INSERT · ${entity}`, 'POST', `/api/${entity}`, 201, { returnedId: record.id, storedRow: stored });
    expect(stored).toMatchObject({ id: record.id, workspaceId, entityType: entity, title: record.title, status: 'Open', payload: { priority: 'High', source: 'database-automation' } });
  });
}

for (const [index, entity] of entities.entries()) {
  test(`@database PF360-DB-${String(index + 14).padStart(3, '0')} SELECT ${entity} reads persisted row by workspace`, async ({ request, apiEvidence }: ApiHarness) => {
    const record = await createRecord(request, entity);
    const response = await request.get(`${root}/api/${entity}`, { headers: { Authorization: `Bearer ${token}` } });
    const rows = await response.json() as Array<{ id: string; workspaceId: string; title: string }>;
    const found = rows.find(row => row.id === record.id);
    await showResult({ request, apiEvidence }, `Database SELECT · ${entity}`, 'GET', `/api/${entity}`, response.status(), { queriedRow: found, query: `workspaceId = ${workspaceId} AND entityType = '${entity}'` });
    expect(response.status()).toBe(200);
    expect(found).toMatchObject({ id: record.id, workspaceId, title: record.title });
  });
}

for (const [index, entity] of entities.entries()) {
  test(`@database PF360-DB-${String(index + 27).padStart(3, '0')} UPDATE changes ${entity} row and updated fields`, async ({ request, apiEvidence }: ApiHarness) => {
    const record = await createRecord(request, entity);
    const update = { workspaceId, projectId: null, title: `${record.title}-updated`, status: 'In Progress', payload: { priority: 'Critical', queryValidated: true } };
    const response = await request.post(`${root}/api/${entity}/${record.id}`, { headers: { Authorization: `Bearer ${token}` }, data: update });
    const result = await response.json();
    const stored = readStore().records.find(row => row.id === record.id);
    await showResult({ request, apiEvidence }, `Database UPDATE · ${entity}`, 'POST', `/api/${entity}/${record.id}`, response.status(), { response: result, storedRow: stored });
    expect(response.status()).toBe(201);
    expect(result.id).toBe(record.id);
    expect(stored).toMatchObject({ title: update.title, status: update.status, payload: update.payload, updatedBy: expect.any(String) });
  });
}

for (const [index, entity] of entities.entries()) {
  test(`@database PF360-DB-${String(index + 40).padStart(3, '0')} audit query records ${entity} INSERT`, async ({ request, apiEvidence }: ApiHarness) => {
    const record = await createRecord(request, entity);
    const audit = readStore().audits.find(row => row.entityId === record.id && row.action === 'created');
    await showResult({ request, apiEvidence }, `Database audit query · ${entity}`, 'SELECT', 'audit_event (local JSON audits)', 200, audit);
    expect(audit).toMatchObject({ entityId: record.id, action: 'created', workspaceId });
    expect(audit?.after).toMatchObject({ title: record.title, status: 'Open' });
  });
}

for (const [index, entity] of entities.entries()) {
  test(`@database PF360-DB-${String(index + 53).padStart(3, '0')} constraint query rejects blank ${entity} title without write`, async ({ request, apiEvidence }: ApiHarness) => {
    const before = readStore().records.length;
    const response = await request.post(`${root}/api/${entity}`, { headers: { Authorization: `Bearer ${token}` }, data: { workspaceId, title: '   ', status: 'Open' } });
    const result = await response.text();
    const after = readStore().records.length;
    await showResult({ request, apiEvidence }, `Database constraint · ${entity} blank title`, 'POST', `/api/${entity}`, response.status(), { response: result, recordsBefore: before, recordsAfter: after });
    expect(response.status()).toBe(400);
    expect(after).toBe(before);
  });
}

for (const [index, entity] of entities.entries()) {
  test(`@database PF360-DB-${String(index + 66).padStart(3, '0')} workspace predicate blocks foreign ${entity} write`, async ({ request, apiEvidence }: ApiHarness) => {
    const before = readStore().records.length;
    const response = await request.post(`${root}/api/${entity}`, { headers: { Authorization: `Bearer ${token}` }, data: { workspaceId: randomUUID(), title: 'Foreign workspace record', status: 'Open' } });
    const result = await response.text();
    const after = readStore().records.length;
    await showResult({ request, apiEvidence }, `Database workspace boundary · ${entity}`, 'POST', `/api/${entity}`, response.status(), { response: result, recordsBefore: before, recordsAfter: after });
    expect(response.status()).toBe(403);
    expect(after).toBe(before);
  });
}

test('@database PF360-DB-079 store integrity query verifies schema collections and UUID uniqueness', async ({ request, apiEvidence }: ApiHarness) => {
  const store = readStore();
  const ids = store.records.map(record => record.id);
  const uniqueIds = new Set(ids);
  const uuidValid = ids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
  await showResult({ request, apiEvidence }, 'Database integrity · store schema and record keys', 'SELECT', 'pf360.json integrity query', 200, { version: store.version, collections: ['users', 'workspaces', 'memberships', 'records', 'audits'], recordCount: ids.length, uniqueIdCount: uniqueIds.size, uuidValid });
  expect(store.version).toBe(1);
  expect(store).toHaveProperty('users');
  expect(store).toHaveProperty('workspaces');
  expect(store).toHaveProperty('memberships');
  expect(uniqueIds.size).toBe(ids.length);
  expect(uuidValid).toBe(true);
});

test('@database PF360-DB-080 read query confirms seeded user workspace and membership relations', async ({ request, apiEvidence }: ApiHarness) => {
  const store = readStore();
  const user = store.users.find(row => row.email === email);
  const workspace = store.workspaces.find(row => row.id === workspaceId);
  const membership = store.memberships.find(row => row.userId === user?.id && row.workspaceId === workspaceId);
  await showResult({ request, apiEvidence }, 'Database relation query · user workspace membership', 'SELECT', 'users JOIN memberships JOIN workspaces (local JSON)', 200, { user: user && { id: user.id, email: user.email }, workspace, membership });
  expect(user).toBeTruthy();
  expect(workspace).toBeTruthy();
  expect(membership).toMatchObject({ userId: user?.id, workspaceId, role: 'Super Admin' });
});
