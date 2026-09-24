import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const catalogPath = resolve(root, 'performance/cases.json');
const scriptPath = resolve(root, 'performance/productflow.k6.js');
const runDir = resolve(root, 'reports/allure/performance');
const reportPath = resolve(runDir, 'index.html');
const summaryPath = resolve(runDir, 'summary.json');
const rawPath = resolve(runDir, 'k6-metrics.jsonl');
const nativeReportPath = resolve(runDir, 'native-k6-report.html');
const baseUrl = (process.env.PF360_PERF_BASE_URL || 'http://127.0.0.1:3100').replace(/\/$/, '');
const repeats = Number(process.env.PF360_K6_REPEATS || 10);
const vus = Number(process.env.PF360_K6_VUS || 1);
const k6 = process.env.K6_BIN || 'k6';

const patterns = [
  ['Smoke', 'Cold route response'], ['Smoke', 'Warm route response'], ['Smoke', 'Content type contract'],
  ['Regression', 'Repeated navigation response'], ['Regression', 'Response body integrity'], ['Regression', 'Latency budget'],
  ['Capacity baseline', 'Single virtual user baseline'], ['Capacity baseline', 'Steady request handling'], ['Capacity baseline', 'Response availability'],
  ['Resilience', 'Short interval availability'],
];
const profiles = [
  { name: 'standard request', headers: { Accept: '*/*' }, query: '' },
  { name: 'browser accept headers', headers: { Accept: 'text/html,application/xhtml+xml' }, query: '' },
  { name: 'no-cache request', headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }, query: '' },
  { name: 'English locale header', headers: { 'Accept-Language': 'en-US,en;q=0.8' }, query: '' },
  { name: 'cache-bypass query', headers: { Accept: '*/*' }, query: i => `?pf360_case=${i + 1}` },
];
mkdirSync(runDir, { recursive: true });

const toolCheck = spawnSync(k6, ['version'], { encoding: 'utf8' });
if (toolCheck.error || toolCheck.status !== 0) {
  throw new Error(`Grafana k6 is required to execute this suite. Install it with "brew install k6", then rerun this script. ${toolCheck.error?.message ?? toolCheck.stderr ?? ''}`);
}
const health = await fetch(baseUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
if (!health?.ok) throw new Error(`Local ProductFlow web app is not responding at ${baseUrl}. Start it with "npm run dev" and rerun.`);
const workspaceHtml = await health.text();
const appBundle = workspaceHtml.match(/<script[^>]+src="([^"]+\.js[^"]*)"/)?.[1];
if (!appBundle) throw new Error(`Could not find a JavaScript bundle in ${baseUrl}; no performance load was sent.`);
const routes = [
  { path: '/', label: 'ProductFlow workspace', suite: 'UI delivery', expectedContentType: 'text/html', budget: 2500 },
  { path: appBundle, label: 'Workspace JavaScript bundle', suite: 'UI assets', expectedContentType: 'javascript', budget: 1500 },
  { path: '/logo.svg', label: 'ProductFlow brand asset', suite: 'Static assets', expectedContentType: 'image/svg+xml', budget: 750 },
];
const cases = Array.from({ length: 150 }, (_, i) => {
  const route = routes[i % routes.length];
  const [suite, focus] = patterns[Math.floor(i / routes.length) % patterns.length];
  const profile = profiles[Math.floor(i / (routes.length * patterns.length)) % profiles.length];
  const ordinal = String(i + 1).padStart(3, '0');
  return {
    id: `K6-${ordinal}`,
    name: `${route.label} · ${focus} · ${profile.name}`,
    suite,
    routeSuite: route.suite,
    path: route.path,
    query: typeof profile.query === 'function' ? profile.query(i) : profile.query,
    headers: profile.headers,
    expectedContentType: route.expectedContentType,
    latencyBudgetMs: route.budget,
    repetitions: repeats,
    method: 'GET',
    description: `${focus} for ${route.label} using the ${profile.name} profile. k6 checks HTTP 200, the response content type, a ${route.budget} ms latency budget, and a non-empty response body. Executed ${repeats} times against the local ProductFlow 360 instance.`,
  };
});
writeFileSync(catalogPath, JSON.stringify(cases, null, 2));

const allureCasesPath = resolve(root, 'reports/allure/data/test-cases');
const functionalCases = readdirSync(allureCasesPath)
  .filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(readFileSync(resolve(allureCasesPath, file), 'utf8')))
  .map(testCase => ({
    id: `ALLURE-${testCase.uid}`,
    name: testCase.name,
    suite: testCase.labels?.find(label => label.name === 'suite')?.value || 'Functional automation',
    status: testCase.status,
    durationMs: testCase.time?.duration ?? null,
  }));
for (const route of routes) {
  const response = await fetch(`${baseUrl}${route.path}`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!response?.ok || !String(response.headers.get('content-type') || '').toLowerCase().includes(route.expectedContentType)) {
    throw new Error(`Local warm-up failed for ${route.path}; received ${response?.status ?? 'no response'}. No performance load was sent.`);
  }
  await response.arrayBuffer();
}

const run = spawnSync(k6, ['run', '--quiet', '--summary-trend-stats', 'avg,min,med,max,p(90),p(95)', '--out', `json=${rawPath}`, scriptPath], {
  encoding: 'utf8', stdio: 'inherit',
  env: {
    ...process.env, BASE_URL: baseUrl, CASE_CATALOG: catalogPath, REPEATS: String(repeats), VUS: String(vus),
    MAX_DURATION: process.env.PF360_K6_MAX_DURATION || '3m', K6_WEB_DASHBOARD: 'true',
    K6_WEB_DASHBOARD_EXPORT: nativeReportPath, K6_WEB_DASHBOARD_PERIOD: '1s', K6_WEB_DASHBOARD_OPEN: 'false',
  },
});
if (run.error) throw run.error;

const requests = new Map(cases.map(item => [item.id, []]));
const checkResults = new Map(cases.map(item => [item.id, []]));
for (const line of readFileSync(rawPath, 'utf8').split(/\r?\n/).filter(Boolean)) {
  let sample;
  try { sample = JSON.parse(line); } catch { continue; }
  const tags = sample.data?.tags ?? {};
  const id = tags.case_id;
  if (!requests.has(id)) continue;
  if (sample.type === 'Point' && sample.metric === 'http_req_duration') {
    requests.get(id).push({ duration: sample.data.value, status: Number(tags.status || 0), time: sample.data.time, failed: tags.expected_response === 'false' });
  } else if (sample.type === 'Point' && sample.metric === 'checks') {
    checkResults.get(id).push({ name: tags.check, passed: sample.data.value === 1 });
  }
}
const quantile = (values, q) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
};
const rows = cases.map(testCase => {
  const samples = requests.get(testCase.id);
  const checks = checkResults.get(testCase.id);
  const durations = samples.map(sample => sample.duration);
  const failedChecks = checks.filter(item => !item.passed);
  const statuses = [...new Set(samples.map(sample => sample.status).filter(Boolean))];
  return {
    ...testCase,
    status: samples.length === repeats && failedChecks.length === 0 && samples.every(sample => sample.status === 200) ? 'passed' : 'failed',
    samples: samples.length,
    checks: checks.length,
    failedChecks,
    statuses,
    avgMs: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null,
    p90Ms: quantile(durations, 0.90),
    p95Ms: quantile(durations, 0.95),
    minMs: durations.length ? Math.min(...durations) : null,
    maxMs: durations.length ? Math.max(...durations) : null,
  };
});
const allDurations = rows.flatMap(row => requests.get(row.id).map(sample => sample.duration));
const sampleTimes = rows.flatMap(row => requests.get(row.id).map(sample => Date.parse(sample.time)).filter(Number.isFinite));
const measuredWindowSeconds = sampleTimes.length > 1 ? (Math.max(...sampleTimes) - Math.min(...sampleTimes)) / 1000 : 0;
const passed = rows.filter(row => row.status === 'passed').length;
const functionalPassed = functionalCases.filter(testCase => testCase.status === 'passed').length;
const functionalFailed = functionalCases.length - functionalPassed;
const summary = {
  product: 'ProductFlow 360', framework: 'Grafana k6', baseUrl, generatedAt: new Date().toISOString(),
  runStatus: run.status === 0 && passed === rows.length ? 'passed' : 'failed',
  total: rows.length, passed, failed: rows.length - passed, repeats, vus,
  functionalTotal: functionalCases.length, functionalPassed, functionalFailed,
  combinedTotal: functionalCases.length + rows.length, combinedPassed: functionalPassed + passed,
  combinedFailed: functionalFailed + rows.length - passed,
  requests: allDurations.length,
  avgMs: allDurations.length ? allDurations.reduce((sum, value) => sum + value, 0) / allDurations.length : 0,
  medianMs: quantile(allDurations, 0.5), p90Ms: quantile(allDurations, 0.90), p95Ms: quantile(allDurations, 0.95),
  minMs: allDurations.length ? Math.min(...allDurations) : 0,
  maxMs: allDurations.length ? Math.max(...allDurations) : 0,
  requestsPerSecond: allDurations.length / Math.max(0.001, measuredWindowSeconds),
  thresholds: { 'http_req_failed': 'rate < 1%', 'http_req_duration': 'p(95) < 2500 ms', checks: 'rate > 99%' },
  cases: rows, functionalCases,
};
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
writeFileSync(reportPath, buildReport(summary));
console.log(`\nProductFlow 360 k6 report: ${reportPath}`);
console.log(`Cases ${passed}/${rows.length} passed · p95 ${summary.p95Ms.toFixed(1)} ms · ${summary.requests} requests`);
if (run.status !== 0 || passed !== rows.length) process.exitCode = 1;

function buildReport(data) {
  const template = readFileSync(resolve(root, 'performance/dashboard.html'), 'utf8');
  const safeData = JSON.stringify(data).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
  return template.replace('__REPORT_DATA__', safeData)
    .replaceAll('__FUNCTIONAL_COUNT__', String(data.functionalTotal))
    .replaceAll('__K6_COUNT__', String(data.total));
}
