import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';

const run = (command, args, env = process.env) => execFileSync(command, args, { stdio: 'inherit', env });
run('node', ['playwright/scripts/reset-allure-results.mjs']);
const server = spawn('npm', ['run', 'start', '--workspace', 'apps/web', '--', '--hostname', '127.0.0.1', '--port', '3100'], { stdio: 'inherit', env: process.env });
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch('http://127.0.0.1:3100'); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('ProductFlow 360 web server did not become ready.');
  run('npx', ['cucumber-js', '--config', 'playwright/cucumber.mjs'], { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=tsx`.trim() });
  run('node', ['playwright/scripts/generate-allure-report.mjs'], { ...process.env, ALLURE_REPORT_MODE: 'bdd' });
} finally {
  server.kill('SIGTERM');
}
