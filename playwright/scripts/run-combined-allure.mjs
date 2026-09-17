import { spawn, spawnSync } from 'node:child_process';

const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  return result.status ?? 1;
};

if (run('node', ['playwright/scripts/reset-allure-results.mjs']) !== 0) process.exit(1);
const server = spawn('npm', ['run', 'start', '--workspace', 'apps/web', '--', '--hostname', '127.0.0.1', '--port', '3100'], { stdio: 'inherit' });
let failed = false;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:3100');
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('ProductFlow 360 web server did not become ready.');

  const bddStatus = run('npx', ['cucumber-js', '--config', 'playwright/cucumber.mjs'], {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=tsx`.trim(),
  });
  if (bddStatus !== 0) failed = true;

  const playwrightStatus = run('npx', ['playwright', 'test', 'playwright/tests/ui', '--project=chromium']);
  if (playwrightStatus !== 0) failed = true;

  if (run('node', ['playwright/scripts/generate-allure-report.mjs'], { ...process.env, ALLURE_REPORT_MODE: 'combined' }) !== 0) failed = true;
} finally {
  server.kill('SIGTERM');
}
if (failed) process.exitCode = 1;
