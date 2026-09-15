import type { TestCase } from './test-cases';

export const LIFECYCLE_KEY = 'pf360-lifecycle-v1';
export const REQUIREMENT_TYPES = ['Idea', 'Business requirement', 'Functional requirement', 'User story', 'Acceptance criteria', 'Zero Hour', 'Development task'] as const;
export type WorkKind = 'requirements' | 'defects' | 'uat' | 'configuration' | 'billing' | 'revenue' | 'releases';
export type WorkRecord = {
  id: string; kind: WorkKind; requestId: string; title: string; owner: string; status: string;
  type: string; description: string; notes: string; linkedId: string; priority: string;
  expected: string; actual: string; date: string; version: number; updatedAt: string; workspaceId?: string; workspaceName?: string;
};
export type AuditEntry = {id: string; recordId: string; action: string; at: string; owner: string; before: WorkRecord | null; after: WorkRecord};
export type LifecycleState = {version: 1; records: WorkRecord[]; audit: AuditEntry[]};
export const EMPTY_LIFECYCLE: LifecycleState = {version: 1, records: [], audit: []};
export function activeWorkspaceLink(): Pick<WorkRecord, 'workspaceId' | 'workspaceName'> { try { const workspaceId = localStorage.getItem('pf360-active-workspace') ?? ''; const workspaces = JSON.parse(localStorage.getItem('pf360-workspaces') ?? '[]') as {id:string;name:string}[]; const workspaceName = workspaces.find(workspace => workspace.id === workspaceId)?.name; return workspaceName ? {workspaceId, workspaceName} : {}; } catch { return {}; } }
export const MODULES: Record<WorkKind, {name: string; singular: string; description: string; types: readonly string[]; statuses: string[]}> = {
  requirements: {name: 'Requirements', singular: 'requirement', description: 'Connect ideas, requirements and delivery tasks to the RFC they support.', types: REQUIREMENT_TYPES, statuses: ['Draft', 'In review', 'Approved', 'Rejected']},
  defects: {name: 'Defects', singular: 'defect', description: 'Track failures from discovery through fix, retest and closure.', types: ['Functional', 'Billing', 'Performance', 'Integration', 'UI'], statuses: ['Open', 'In progress', 'Fixed', 'Retesting', 'Closed', 'Reopened']},
  uat: {name: 'UAT approvals', singular: 'UAT review', description: 'Record business acceptance with test evidence and an accountable reviewer.', types: ['Business acceptance'], statuses: ['Pending', 'Approved', 'Rejected']},
  configuration: {name: 'Telecom configuration', singular: 'configuration', description: 'Track product tariffs, speed profiles and provisioning definitions.', types: ['Tariff', 'Speed profile', 'Provisioning', 'Bundle', 'Eligibility'], statuses: ['Draft', 'In review', 'Approved', 'Retired']},
  billing: {name: 'Billing validation', singular: 'billing check', description: 'Compare expected and actual amounts for billing and pre-bill checks.', types: ['Billing validation', 'Pre-bill validation'], statuses: ['Pending', 'Passed', 'Failed']},
  revenue: {name: 'Revenue assurance', singular: 'revenue check', description: 'Reconcile expected revenue with collected amounts and investigate differences.', types: ['Revenue reconciliation', 'Leakage investigation'], statuses: ['Pending', 'Passed', 'Failed']},
  releases: {name: 'Releases', singular: 'release', description: 'Plan rollout, check readiness, record deployment and verify production.', types: ['Standard', 'Hotfix'], statuses: ['Planned', 'Ready', 'Deployed', 'Verified', 'Closed', 'Rolled back']},
};
const keys = ['id','requestId','title','owner','status','type','description','notes','linkedId','priority','expected','actual','date','updatedAt'];
export function parseLifecycle(raw: string): LifecycleState {
  const state = JSON.parse(raw) as LifecycleState;
  if (state?.version !== 1 || !Array.isArray(state.records) || !Array.isArray(state.audit) || !state.records.every(record => record && record.kind in MODULES && keys.every(key => typeof record[key as keyof WorkRecord] === 'string') && Number.isInteger(record.version) && record.version > 0 && MODULES[record.kind].statuses.includes(record.status)) || !state.audit.every(entry => entry && typeof entry.id === 'string' && typeof entry.at === 'string' && typeof entry.action === 'string' && typeof entry.recordId === 'string' && typeof entry.owner === 'string' && entry.after && typeof entry.after.id === 'string')) {
    throw new Error('Saved lifecycle data is invalid. Existing data has been left untouched.');
  }
  return state;
}
export function commitRecord(state: LifecycleState, record: WorkRecord, action: string): LifecycleState {
  const before = state.records.find(item => item.id === record.id) ?? null;
  const next = {...record, version: (before?.version ?? 0) + 1, updatedAt: new Date().toISOString()};
  const event: AuditEntry = {id: crypto.randomUUID(), recordId: next.id, action, at: next.updatedAt, owner: next.owner, before, after: next};
  return {...state, records: [next, ...state.records.filter(item => item.id !== next.id)], audit: [event, ...state.audit].slice(0,1000)};
}
export function moneyCents(value: string): number {
  const clean = value.trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new Error('Enter a non-negative amount with at most two decimal places.');
  const [whole, fraction = ''] = clean.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(result) || result > 1_000_000_000_000) throw new Error('Amount is too large.');
  return result;
}
export function reconciliation(record: Pick<WorkRecord, 'expected' | 'actual'>) {
  const expected = moneyCents(record.expected), actual = moneyCents(record.actual);
  return {expected, actual, difference: actual - expected, status: expected === actual ? 'Passed' : 'Failed'};
}
export function releaseGates(requestId: string, records: WorkRecord[], tests: TestCase[]) {
  const linked = records.filter(record => record.requestId === requestId), cases = tests.filter(test => test.requestId === requestId);
  const requirements = linked.filter(record => record.kind === 'requirements');
  return [
    {label: 'Requirements and Zero Hour approved', passed: requirements.length > 0 && requirements.every(record => record.status === 'Approved') && requirements.some(record => record.type === 'Zero Hour')},
    {label: 'SIT, QA and UAT tests passed', passed: ['SIT','QA','UAT'].every(stage => cases.some(test => test.stage === stage)) && cases.every(test => test.status === 'Passed')},
    {label: 'All linked defects closed', passed: linked.filter(record => record.kind === 'defects').every(record => record.status === 'Closed')},
    {label: 'UAT acceptance recorded', passed: linked.some(record => record.kind === 'uat' && record.status === 'Approved') && linked.filter(record => record.kind === 'uat').every(record => record.status === 'Approved')},
    {label: 'Billing and pre-bill checks passed', passed: ['Billing validation','Pre-bill validation'].every(type => linked.some(record => record.kind === 'billing' && record.type === type && record.status === 'Passed')) && linked.filter(record => record.kind === 'billing').every(record => record.status === 'Passed')},
    {label: 'Revenue assurance passed', passed: linked.some(record => record.kind === 'revenue' && record.status === 'Passed') && linked.filter(record => record.kind === 'revenue').every(record => record.status === 'Passed')},
    {label: 'Telecom configuration approved', passed: linked.some(record => record.kind === 'configuration' && record.status === 'Approved') && linked.filter(record => record.kind === 'configuration' && record.status !== 'Retired').every(record => record.status === 'Approved')},
  ];
}
export function transitionRecord(record: WorkRecord, status: string, notes: string, state: LifecycleState, tests: TestCase[]): WorkRecord {
  if (!notes.trim()) throw new Error('Add a decision or evidence note before changing status.');
  if (record.status === status) throw new Error('Choose a different status.');
  if (!MODULES[record.kind].statuses.includes(status)) throw new Error('Invalid status.');
  const flows: Partial<Record<WorkKind, Record<string,string[]>>> = {
    requirements: {'Draft':['In review'], 'In review':['Approved','Rejected'], 'Rejected':['Draft'], 'Approved':['Draft']},
    configuration: {'Draft':['In review'], 'In review':['Approved','Draft'], 'Approved':['Retired','Draft'], 'Retired':['Draft']},
    defects: {'Open':['In progress'], 'In progress':['Fixed'], 'Fixed':['Retesting'], 'Retesting':['Closed','Reopened'], 'Reopened':['In progress'], 'Closed':['Reopened']},
    uat: {'Pending':['Approved','Rejected'], 'Rejected':['Pending'], 'Approved':['Pending']},
    releases: {'Planned':['Ready'], 'Ready':['Deployed','Planned'], 'Deployed':['Verified','Rolled back'], 'Verified':['Closed','Rolled back'], 'Closed':[], 'Rolled back':['Planned']},
  };
  if (flows[record.kind] && !flows[record.kind]![record.status]?.includes(status)) throw new Error(`Cannot move directly from ${record.status} to ${status}. Follow the workflow in order.`);
  const linked = tests.filter(test => test.requestId === record.requestId);
  if (record.kind === 'uat' && status === 'Approved' && (!linked.some(test => test.stage === 'UAT') || linked.filter(test => test.stage === 'UAT').some(test => test.status !== 'Passed'))) throw new Error('All linked UAT tests must pass before acceptance.');
  if (record.kind === 'defects' && status === 'Closed' && record.linkedId) {
    const test = linked.find(test => test.id === record.linkedId);
    if (!test || test.status !== 'Passed') throw new Error('The linked test must pass its retest before closing the defect.');
  }
  if (record.kind === 'releases' && ['Ready','Deployed','Closed'].includes(status)) {
    const missing = releaseGates(record.requestId, state.records, tests).filter(gate => !gate.passed);
    if (missing.length) throw new Error(`Release blocked: ${missing.map(gate => gate.label).join('; ')}.`);
    if (!record.description.trim() || !record.expected.trim() || !record.date) throw new Error('Add a rollout plan, rollback plan and target date first.');
  }
  return {...record, status, notes: notes.trim()};
}
