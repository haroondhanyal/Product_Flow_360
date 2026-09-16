export const TEST_STAGES = ['SIT', 'QA', 'UAT'] as const;
export const TEST_STATUSES = ['Draft', 'Ready', 'In progress', 'Passed', 'Failed', 'Blocked'] as const;
export type TestStatus = typeof TEST_STATUSES[number];
export type TestStage = typeof TEST_STAGES[number];
export type TestRun = { id: string; result: 'Passed' | 'Failed' | 'Blocked'; actual: string; tester: string; at: string };
export type TestCase = {
  importKey?: string;
  id: string; requestId: string; title: string; stage: TestStage;
  priority: string; owner: string; preconditions: string; steps: string;
  expected: string; status: TestStatus; runs: TestRun[]; workspaceId?: string; workspaceName?: string;
  objective?: string; module?: string; testData?: string; remarks?: string;
};
export const TEST_STORAGE_KEY = 'pf360-test-cases';

export function parseTestCases(raw: string): TestCase[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(item => item &&
    ['id', 'requestId', 'title', 'priority', 'owner', 'preconditions', 'steps', 'expected'].every(key => typeof item[key] === 'string') &&
    TEST_STAGES.includes(item.stage) && TEST_STATUSES.includes(item.status) && Array.isArray(item.runs) &&
    item.runs.every((run: TestRun) => run && ['Passed', 'Failed', 'Blocked'].includes(run.result) &&
      ['id', 'actual', 'tester', 'at'].every(key => typeof run[key as keyof TestRun] === 'string')))) {
    throw new Error('Saved test cases could not be read. Existing data has been left untouched.');
  }
  return data;
}

export function changeTestStatus(test: TestCase, next: 'Ready' | 'In progress'): TestCase {
  if (next === 'Ready' && test.status !== 'Draft') throw new Error('Only a draft can be marked ready.');
  if (next === 'In progress' && !['Ready', 'Passed', 'Failed', 'Blocked'].includes(test.status)) {
    throw new Error('Mark the test ready before starting a run.');
  }
  return { ...test, status: next };
}

export function recordTestRun(test: TestCase, run: TestRun): TestCase {
  if (test.status !== 'In progress') throw new Error('Start the test before recording its result.');
  if (!run.actual.trim() || !run.tester.trim()) throw new Error('Actual result and tester are required.');
  if (!['Passed', 'Failed', 'Blocked'].includes(run.result)) throw new Error('Choose a valid test result.');
  return { ...test, status: run.result, runs: [{ ...run, actual: run.actual.trim(), tester: run.tester.trim() }, ...test.runs] };
}
