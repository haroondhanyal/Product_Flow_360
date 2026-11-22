import type { AuthUser } from './auth';
import { releaseGates, type WorkRecord } from './lifecycle';
import type { TestCase } from './test-cases';

export type AssistantRequest = {
  id: string;
  title: string;
  product: string;
  status: string;
  priority: string;
  owner: string;
  date: string;
};

type AssistantInput = {
  question: string;
  user: AuthUser;
  requests: AssistantRequest[];
  tests: TestCase[];
  work: WorkRecord[];
  now?: Date;
};

const closedStatuses = new Set(['approved', 'closed', 'verified', 'deployed', 'passed', 'retired', 'rolled back']);
const isOpen = (status: string) => !closedStatuses.has(status.toLowerCase());

export function answerProductQuestion({ question, user, requests, tests, work, now = new Date() }: AssistantInput): string {
  const query = question.trim().toLowerCase();
  if (!query) return 'Ask about an RFC, overdue work, test coverage, open defects, release readiness, or your next action.';

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const overdue = requests.filter(item => item.date && item.date < today && item.status !== 'Approved');
  const failed = tests.filter(item => item.status === 'Failed');
  const blocked = tests.filter(item => item.status === 'Blocked');
  const openBugs = work.filter(item => item.kind === 'defects' && isOpen(item.status));
  const highBugs = openBugs.filter(item => ['High', 'Critical'].includes(item.priority));

  const rfcId = query.match(/\brfc[-\s#]*([a-f0-9]{8}|\d{3,})\b/i)?.[1];
  if (rfcId) {
    const request = requests.find(item => item.id.toLowerCase() === `rfc-${rfcId}`.toLowerCase() || item.id.toLowerCase() === rfcId.toLowerCase());
    if (!request) return `I couldn't find RFC-${rfcId} in the saved workspace. Refresh the Command Center or check the RFC ID.`;
    const relatedTests = tests.filter(item => item.requestId === request.id);
    const relatedWork = work.filter(item => item.requestId === request.id);
    const failedCount = relatedTests.filter(item => ['Failed', 'Blocked'].includes(item.status)).length;
    const next = request.status === 'In review' ? 'complete the review and capture its decision' : request.status === 'In development' ? 'confirm requirement traceability before QA' : request.status === 'In testing' ? 'resolve failed or blocked tests and attach execution evidence' : 'confirm release gates and production ownership';
    return `${request.id} · ${request.title}\nStatus: ${request.status} · Priority: ${request.priority} · Owner: ${request.owner || 'Unassigned'} · Due: ${request.date || 'No due date'}\nLinked checks: ${relatedTests.length} tests (${failedCount} failed/blocked), ${relatedWork.filter(item => item.kind === 'defects' && isOpen(item.status)).length} open defects, ${relatedWork.length} lifecycle items.\nSuggested next step: ${next}.`;
  }

  if (query.includes('overdue') || query.includes('late')) {
    if (!overdue.length) return `No overdue, unapproved RFCs found as of ${today}.`;
    const ordered = [...overdue].sort((a, b) => a.date.localeCompare(b.date));
    return `${ordered.length} overdue RFC${ordered.length === 1 ? '' : 's'} need attention: ${ordered.slice(0, 6).map(item => `${item.id} (${item.owner || 'unassigned'}, due ${item.date})`).join('; ')}. Start with the oldest due date and confirm a new owner/date if the plan changed.`;
  }

  if (query.includes('due date') || query.includes('due soon') || query.includes('due this') || query.includes(' due') || query.startsWith('due')) {
    const upcoming = requests.filter(item => item.date && item.date >= today && item.status !== 'Approved').sort((a, b) => a.date.localeCompare(b.date));
    return upcoming.length ? `${upcoming.length} active RFC${upcoming.length === 1 ? '' : 's'} due today or later: ${upcoming.slice(0, 6).map(item => `${item.id} (${item.owner || 'unassigned'}, due ${item.date})`).join('; ')}.` : 'No upcoming due dates are recorded for active RFCs.';
  }

  if (query.includes('my work') || query.includes('assigned to me') || query.includes('my next') || query.includes('my task') || query.includes('my assigned')) {
    const mine = [...requests.filter(item => item.owner.toLowerCase() === user.fullName.toLowerCase() && isOpen(item.status)).map(item => `${item.id}: ${item.title} (${item.status})`), ...work.filter(item => item.owner.toLowerCase() === user.fullName.toLowerCase() && isOpen(item.status)).map(item => `${item.id}: ${item.title} (${item.status})`)];
    return mine.length ? `${mine.length} open item${mine.length === 1 ? '' : 's'} assigned to ${user.fullName}: ${mine.slice(0, 8).join('; ')}.` : `No open items are assigned to ${user.fullName} in the saved workspace.`;
  }

  if (query.includes('coverage') || query.includes('test') || query.includes('uat')) {
    const stages = ['SIT', 'QA', 'UAT'];
    const stageSummary = stages.map(stage => `${stage} ${tests.filter(item => item.stage === stage).length}`).join(' · ');
    const noCoverage = requests.filter(request => !tests.some(test => test.requestId === request.id));
    return `Test inventory: ${tests.length} total (${stageSummary}). ${failed.length} failed, ${blocked.length} blocked. ${noCoverage.length} RFC${noCoverage.length === 1 ? '' : 's'} have no linked test case${noCoverage.length === 1 ? '' : 's'}${noCoverage.length ? `: ${noCoverage.slice(0, 5).map(item => item.id).join(', ')}` : ''}. Next: unblock cases, rerun failures, then capture evidence before sign-off.`;
  }

  if (query.includes('bug') || query.includes('defect')) {
    return openBugs.length ? `${openBugs.length} open defects; ${highBugs.length} are high/critical. Highest-priority items: ${[...highBugs, ...openBugs.filter(item => !highBugs.includes(item))].slice(0, 5).map(item => `${item.id} ${item.title} (${item.status}, ${item.owner || 'unassigned'}, RFC ${item.requestId})`).join('; ')}. Confirm retest evidence before closing.` : 'No open defects found in the saved workspace.';
  }

  if (query.includes('release') || query.includes('ready') || query.includes('deploy')) {
    const active = requests.filter(item => item.status !== 'Approved');
    const blockedReleases = active.map(request => ({ request, missing: releaseGates(request.id, work, tests).filter(gate => !gate.passed) })).filter(item => item.missing.length > 0);
    if (!active.length) return 'All saved RFCs are approved. Before deployment, confirm the production window, rollback owner, CAB/RA evidence, and post-release validation.';
    const sample = blockedReleases.slice(0, 3).map(item => `${item.request.id}: ${item.missing.slice(0, 3).map(gate => gate.label).join(', ')}`).join('; ');
    return `Release gate review: ${blockedReleases.length} of ${active.length} active RFCs have unmet release gates. ${highBugs.length} high/critical open defects, ${failed.length} failed tests, ${blocked.length} blocked tests, and ${overdue.length} overdue RFCs. ${sample ? `Examples: ${sample}.` : ''} Review each RFC's linked evidence before scheduling deployment.`;
  }

  if (query.includes('next') || query.includes('priorit')) {
    const candidate = [...overdue, ...requests.filter(item => ['High', 'Critical'].includes(item.priority) && item.status !== 'Approved')].sort((a, b) => a.date.localeCompare(b.date))[0];
    const signal = highBugs[0] ? `Retest ${highBugs[0].id} (${highBugs[0].priority} defect)` : failed[0] ? `Investigate ${failed[0].id} (${failed[0].title})` : candidate ? `Review ${candidate.id} (${candidate.status}, ${candidate.priority}, due ${candidate.date})` : 'Review the oldest open RFC and confirm its next owner action';
    return `Recommended next action: ${signal}. Workspace signals: ${overdue.length} overdue RFCs, ${failed.length} failed tests, ${blocked.length} blocked tests, ${highBugs.length} high/critical open defects.`;
  }

  return `Workspace snapshot: ${requests.filter(item => item.status !== 'Approved').length} active RFCs, ${overdue.length} overdue, ${tests.length} test cases, ${failed.length} failed, ${blocked.length} blocked, and ${openBugs.length} open defects. Try “What is overdue?”, “Show UAT coverage”, “Is release ready?”, “My work”, or an RFC ID.`;
}
