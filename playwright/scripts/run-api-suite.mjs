import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';

const run = (command, args, env) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  return result.status ?? 1;
};
const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), 'pf360-api-automation-'));
const port = String(process.env.PF360_API_TEST_PORT ?? 4100);
const email = 'api-cases@ptcl.test';
const password = 'ApiCases!Password2026';
const userId = randomUUID();
const workspaceId = randomUUID();
const salt = randomBytes(16);
const passwordHash = `scrypt$${salt.toString('base64')}$${scryptSync(password, salt, 64).toString('base64')}`;
const now = new Date().toISOString();
const storePath = join(temp, 'store.json');
writeFileSync(storePath, JSON.stringify({
  version: 1,
  users: [{ id: userId, email, displayName: 'API Automation', passwordHash, active: true, createdAt: now }],
  workspaces: [{ id: workspaceId, name: 'API Automation Workspace', createdAt: now }],
  memberships: [{ workspaceId, userId, role: 'Super Admin' }],
  records: [],
  audits: [],
}, null, 2));
const env = {
  ...process.env,
  PORT: port,
  API_BASE_URL: `http://127.0.0.1:${port}`,
  JWT_SECRET: randomBytes(32).toString('hex'),
  LOCAL_DATA_FILE: storePath,
  API_TEST_EMAIL: email,
  API_TEST_PASSWORD: password,
  API_TEST_WORKSPACE_ID: workspaceId,
  PF360_RUN_API_TESTS: '1',
};
let server;
let status = 1;
try {
  if (run('npm', ['run', 'api:build'], env) !== 0) throw new Error('API build failed.');
  server = spawn('node', ['apps/api/dist/main.js'], { cwd: root, env, stdio: 'inherit' });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`${env.API_BASE_URL}/health`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('Isolated API test server did not become ready.');
  status = run('npx', ['playwright', 'test', 'playwright/tests/api', '--project=chromium', '--workers=1', ...process.argv.slice(2)], env);
} finally {
  server?.kill('SIGTERM');
  rmSync(temp, { recursive: true, force: true });
}
if (status !== 0) process.exitCode = status;
