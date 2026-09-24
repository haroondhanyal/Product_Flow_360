import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import exec from 'k6/execution';

const cases = JSON.parse(open(__ENV.CASE_CATALOG));
const repeats = Number(__ENV.REPEATS || 5);
const passRate = new Rate('case_pass');
const routeThresholds = Object.fromEntries(
  [...new Set(cases.map(testCase => testCase.path))].map(path => {
    const budget = cases.find(testCase => testCase.path === path).latencyBudgetMs;
    return [`http_req_duration{endpoint:${path}}`, [`p(95)<${budget}`]];
  }),
);

export const options = {
  scenarios: {
    productflow_case_catalog: {
      executor: 'shared-iterations',
      vus: Number(__ENV.VUS || 1),
      iterations: cases.length * repeats,
      maxDuration: __ENV.MAX_DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2500'],
    checks: ['rate>0.99'],
    ...routeThresholds,
  },
  discardResponseBodies: false,
};

export default function () {
  const index = Math.floor(exec.scenario.iterationInTest / repeats);
  const testCase = cases[index];
  const response = http.get(`${__ENV.BASE_URL}${testCase.path}${testCase.query}`, {
    headers: testCase.headers,
    tags: { case_id: testCase.id, case_name: testCase.name, suite: testCase.suite, endpoint: testCase.path },
    timeout: '10s',
  });
  const actualType = String(response.headers['Content-Type'] || '').toLowerCase();
  const checks = {
    'expected HTTP 200': response.status === 200,
    'expected response content type': actualType.includes(testCase.expectedContentType),
    'response under case latency budget': response.timings.duration <= testCase.latencyBudgetMs,
    'response body present': Boolean(response.body && response.body.length > 0),
  };
  const passed = check(response, checks, { case_id: testCase.id, case_name: testCase.name, suite: testCase.suite });
  passRate.add(passed ? 1 : 0, { case_id: testCase.id, case_name: testCase.name, suite: testCase.suite });
  sleep(0.01);
}
