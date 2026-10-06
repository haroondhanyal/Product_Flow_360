import { MODULES, type WorkKind, type WorkRecord, type LifecycleState } from './lifecycle';
import type { TestCase, TestStage, TestStatus } from './test-cases';

export const DEMO_SEED_KEY = 'pf360-demo-seed-v1';

const people = ['Ayesha Noor', 'Ahmed Khan', 'Sara Ali', 'Usman Malik', 'Bilal Ahmed', 'Hira Shah', 'Zain Abbas', 'Mariam Iqbal'];
const products = ['Flash Fiber', 'Enterprise', 'Smart TV', 'Voice'];
const themes = ['capacity uplift', 'billing alignment', 'customer onboarding', 'service assurance', 'network resilience', 'digital self-service'];
const kinds: WorkKind[] = ['requirements', 'defects', 'uat', 'configuration', 'billing', 'revenue', 'releases'];

export function createDemoSeed(now = new Date()) {
  const date = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
  const requests = Array.from({length: 30}, (_, index) => ({
    id: `RFC-${String(248 - index).padStart(4, '0')}`,
    title: `${products[index % products.length]} — ${themes[index % themes.length]}`,
    product: products[index % products.length],
    status: ['In development', 'In review', 'In testing', 'Approved'][index % 4],
    priority: ['High', 'Medium', 'Low'][index % 3], owner: people[index % people.length], date: date(index % 18 - 9),
  }));
  const records: WorkRecord[] = kinds.flatMap(kind => Array.from({length: 30}, (_, index) => {
    const module = MODULES[kind], request = requests[index % requests.length];
    const status = module.statuses[index % module.statuses.length];
    const type = kind === 'requirements' ? module.types[index % module.types.length] : kind === 'billing' ? module.types[index % 2] : module.types[index % module.types.length];
    return {
      id: `${kind.slice(0,3).toUpperCase()}-${String(index + 1).padStart(4, '0')}`, kind, requestId: request.id,
      title: `${request.product} ${themes[(index + kinds.indexOf(kind)) % themes.length]} ${kind === 'uat' ? 'acceptance' : kind === 'billing' || kind === 'revenue' ? 'reconciliation' : kind.slice(0, -1)}`,
      owner: people[(index + kinds.indexOf(kind)) % people.length], status, type,
      description: `Validate ${request.product.toLowerCase()} ${themes[index % themes.length]} for ${request.id}. Confirm owner actions, acceptance criteria and supporting evidence before advancing.`,
      notes: `Demo portfolio record ${index + 1} of 30.`, linkedId: '', priority: ['High', 'Medium', 'Low'][index % 3],
      expected: kind === 'billing' || kind === 'revenue' ? `${(1250 + index * 125).toFixed(2)}` : kind === 'releases' ? 'Rollback to the previous approved service profile and verify customer impact.' : '',
      actual: kind === 'billing' || kind === 'revenue' ? `${(1250 + index * 125 + (index % 5 === 0 ? 10 : 0)).toFixed(2)}` : '',
      date: date(index % 18 - 9), version: 1, updatedAt: now.toISOString(), workspaceId: 'ptcl-qa', workspaceName: 'PTCL QA Workspace',
    };
  }));
  const stages: TestStage[] = ['Smoke', 'Regression', 'SIT', 'QA', 'UAT'];
  const statuses: TestStatus[] = ['Passed', 'Ready', 'In progress', 'Failed', 'Blocked', 'Draft'];
  const tests: TestCase[] = Array.from({length: 30}, (_, index) => ({
    id: `TC-${String(index + 1).padStart(4, '0')}`, requestId: requests[index].id,
    title: `${requests[index].product} ${themes[index % themes.length]} — ${stages[index % stages.length]} validation`,
    stage: stages[index % stages.length], priority: ['High', 'Medium', 'Low'][index % 3], owner: people[index % people.length],
    preconditions: 'Approved test environment and active customer profile are available.',
    steps: `1. Sign in to the ${requests[index].product} portal.\n2. Apply the ${themes[index % themes.length]} scenario.\n3. Verify the service and audit trail.`,
    expected: 'The expected service state is displayed and the transaction is recorded.', status: statuses[index % statuses.length],
    runs: index % 3 === 0 ? [{id:`RUN-${index + 1}`,result:'Passed',actual:'Observed result matches the expected service state.',tester:people[index % people.length],at:now.toISOString()}] : [],
    objective: `Verify ${themes[index % themes.length]} for ${requests[index].product}.`, module: requests[index].product,
    testData: `Customer: PTCL-DEMO-${String(index + 1).padStart(3, '0')}; RFC: ${requests[index].id}.`, remarks: 'Seeded demonstration case.',
  }));
  const lifecycle: LifecycleState = {version: 1, records, audit: []};
  const rtm = [{id:'rtm-demo-flash-fiber',name:'Flash Fiber Portfolio RTM',createdAt:now.toISOString(),workspaceId:'ptcl-qa',workspaceName:'PTCL QA Workspace',customFields:[],rows:Array.from({length:30},(_,index)=>({id:`RTM-${index+1}`,rfc:requests[index].id,requirement:`${requests[index].product} ${themes[index % themes.length]} requirement`,module:requests[index].product,changeType:['New','Enhancement','Migration'][index%3],testCase:tests[index].id,testStage:stages[index%stages.length],status:['Passed','In progress','Not started','Blocked'][index%4],owner:people[index%people.length],evidence:'Not attached',notes:`Traceability row ${index+1} of 30.`,custom:{}}))}];
  const projects = Array.from({length:30},(_,index)=>({id:`project-${index+1}`,name:`${products[index%4]} ${['Modernization','Quality uplift','Service assurance','Digital journey'][index%4]} ${String(index+1).padStart(2,'0')}`,code:`PF${String(index+1).padStart(3,'0')}`,description:`Delivery project ${index+1} for ${products[index%4]} portfolio.`,createdAt:now.toISOString()}));
  return {requests, lifecycle, tests, rtm, projects};
}
