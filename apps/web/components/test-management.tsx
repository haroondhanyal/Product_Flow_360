'use client';

import { useEffect, useState } from 'react';
import { RfcDocuments } from './rfc-documents';
import { ArrowRight, CheckCircle2, ClipboardList, FlaskConical, Play, Plus, Search } from 'lucide-react';
import { changeTestStatus, parseTestCases, recordTestRun, TEST_STAGES, TEST_STATUSES, TEST_STORAGE_KEY, type TestCase, type TestRun, type TestStage } from '../lib/test-cases';
import { commitRecord, EMPTY_LIFECYCLE, LIFECYCLE_KEY, parseLifecycle, type WorkRecord } from '../lib/lifecycle';

type LinkedRequest = { id: string; title: string };

export function TestManagement({ requests, initialRequest = '', onOpenRequest }: {
  requests: LinkedRequest[]; initialRequest?: string; onOpenRequest: (id: string) => void;
}) {
  const [tests, setTests] = useState<TestCase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [requestFilter, setRequestFilter] = useState(initialRequest);
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tests.find(test => test.id === selectedId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TEST_STORAGE_KEY);
      if (saved) setTests(parseTestCases(saved));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Test storage is unavailable.');
      setReadFailed(true);
    }
    setLoaded(true);
  }, []);
  useEffect(() => { setRequestFilter(initialRequest); }, [initialRequest]);

  function persist(next: TestCase[]) {
    if (!loaded || readFailed) return false;
    try {
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(next));
      setTests(next); setError('');
      return true;
    } catch {
      setError('Unable to save test cases. Browser storage may be full or disabled. Your last saved data is unchanged.');
      return false;
    }
  }

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (key: string) => String(form.get(key) ?? '').trim();
    if (!['title', 'owner', 'steps', 'expected'].every(key => field(key))) {
      setError('Title, owner, steps and expected result are required.'); return;
    }
    if (!requests.some(request => request.id === field('requestId'))) {
      setError('Choose an existing RFC.'); return;
    }
    const test: TestCase = {
      id: `TC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, requestId: field('requestId'),
      title: field('title'), stage: field('stage') as TestStage, priority: field('priority'),
      owner: field('owner'), preconditions: field('preconditions'), steps: field('steps'),
      expected: field('expected'), status: 'Draft', runs: [],
    };
    if (persist([test, ...tests])) {
      setCreating(false); setSelectedId(test.id); setQuery(''); setStatusFilter('');
      setRequestFilter(test.requestId); setMessage('Test case created. Review the steps, then mark it ready.');
    }
  }

  function transition(next: 'Ready' | 'In progress') {
    if (!selected) return;
    try {
      const updated = changeTestStatus(selected, next);
      if (persist(tests.map(test => test.id === updated.id ? updated : test))) setMessage(`Test ${next === 'Ready' ? 'marked ready' : 'started'}.`);
    } catch (error) { setError((error as Error).message); }
  }

  function execute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    try {
      const updated = recordTestRun(selected, {
        id: crypto.randomUUID(), at: new Date().toISOString(), result: String(form.get('result')) as TestRun['result'],
        actual: String(form.get('actual') ?? ''), tester: String(form.get('tester') ?? ''),
      });
      if (persist(tests.map(test => test.id === updated.id ? updated : test))) setMessage('Execution result saved to run history.');
    } catch (error) { setError((error as Error).message); }
  }
  function createBugFromFailure() {
    if (!selected || !['Failed', 'Blocked'].includes(selected.status)) return;
    const latestRun = selected.runs[0];
    try {
      const state = parseLifecycle(localStorage.getItem(LIFECYCLE_KEY) ?? JSON.stringify(EMPTY_LIFECYCLE));
      const duplicate = state.records.find(record => record.kind === 'defects' && record.linkedId === selected.id && !['Closed', 'Rejected'].includes(record.status));
      if (duplicate) throw new Error(`${duplicate.id} is already linked to this failed test.`);
      const bug: WorkRecord = { id: `BUG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, kind: 'defects', requestId: selected.requestId, title: `Failure: ${selected.title}`, owner: selected.owner, status: 'Open', type: 'Functional', description: latestRun?.actual || 'Failure reported from test execution.', notes: `Created directly from ${selected.id}.`, linkedId: selected.id, priority: selected.priority, expected: selected.expected, actual: latestRun?.actual || '', date: '', version: 0, updatedAt: '' };
      const next = commitRecord(state, bug, `Bug created from failed test ${selected.id}`);
      localStorage.setItem(LIFECYCLE_KEY, JSON.stringify(next));
      setMessage(`${bug.id} created and linked to this failed test. Open Defects to triage it.`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to create the linked bug.'); }
  }

  const filtered = tests.filter(test => (!requestFilter || test.requestId === requestFilter) &&
    (!statusFilter || test.status === statusFilter) && `${test.id} ${test.title} ${test.owner}`.toLowerCase().includes(query.toLowerCase()));
  const scoped = tests.filter(test => !requestFilter || test.requestId === requestFilter);

  return <div className="test-management">
    <div className="test-intro"><div><span className="eyebrow">QUALITY AT EVERY GATE</span><h2>From requirements to confidence.</h2><p>Link a test to an RFC, define the expected outcome, and record every run.</p></div>
      <button className="primary" disabled={!loaded || readFailed || !requests.length} onClick={() => { setCreating(true); setSelectedId(null); setMessage(''); }}><Plus size={17} />New test case</button></div>
    <ol className="test-flow" aria-label="Test case workflow">{['Link RFC', 'Define test', 'Mark ready', 'Execute', 'Record & retest'].map((step, index) => <li key={step}><span>{index + 1}</span>{step}{index < 4 && <ArrowRight size={15} />}</li>)}</ol>
    <div className="test-summary">{[{ label: 'Test cases', value: scoped.length, icon: ClipboardList }, { label: 'In progress', value: scoped.filter(test => test.status === 'In progress').length, icon: Play }, { label: 'Passed', value: scoped.filter(test => test.status === 'Passed').length, icon: CheckCircle2 }, { label: 'Failed / blocked', value: scoped.filter(test => ['Failed', 'Blocked'].includes(test.status)).length, icon: FlaskConical }].map(({ label, value, icon: Icon }) => <article key={label}><Icon size={18} /><span>{label}</span><strong>{value}</strong></article>)}</div>
    {error && <div className="inline-error" role="alert">{error}</div>}
    {message && <p className="success-message" role="status">{message}</p>}
    {creating && <section className="test-editor feature-form"><div className="section-title"><h2>Create a test case</h2><button className="text-button" onClick={() => setCreating(false)}>Cancel</button></div>
      <form onSubmit={create}><div className="form-row"><label>Linked RFC<select name="requestId" defaultValue={requestFilter || requests[0]?.id} required>{requests.map(request => <option key={request.id} value={request.id}>{request.id} · {request.title}</option>)}</select></label><label>Test stage<select name="stage" aria-label="Test stage">{TEST_STAGES.map(stage => <option key={stage}>{stage}</option>)}</select></label></div>
        <label>Test case title<input name="title" autoFocus required maxLength={160} placeholder="e.g. Verify the upgraded speed profile" /></label>
        <div className="form-row"><label>Test owner<input name="owner" required maxLength={80} placeholder="Full name" /></label><label>Priority<select name="priority"><option>Medium</option><option>High</option><option>Low</option></select></label></div>
        <label>Preconditions <span className="optional">(optional)</span><textarea name="preconditions" maxLength={5000} rows={2} placeholder="Test account, environment and setup" /></label>
        <label>Test steps<textarea name="steps" required maxLength={10000} rows={4} placeholder={'1. Open the customer account\n2. Apply the new speed profile\n3. Verify the provisioned speed'} /></label>
        <label>Expected result<textarea name="expected" required maxLength={5000} rows={3} placeholder="What should happen when the steps are completed?" /></label>
        <button className="primary" type="submit"><Plus size={16} />Save test case</button>
      </form></section>}
    <section className="requests"><div className="table-toolbar test-toolbar"><label className="search"><Search size={17} /><input aria-label="Search test cases" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search test cases or owners…" /></label><label className="filter"><select aria-label="Filter tests by RFC" value={requestFilter} onChange={event => setRequestFilter(event.target.value)}><option value="">All RFCs</option>{requests.map(request => <option key={request.id} value={request.id}>{request.id}</option>)}</select></label><label className="filter"><select aria-label="Filter test status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All statuses</option>{TEST_STATUSES.map(status => <option key={status}>{status}</option>)}</select></label></div>
      <div className="table-scroll"><table><thead><tr><th>TEST CASE</th><th>LINKED RFC</th><th>STAGE</th><th>STATUS</th><th>OWNER</th><th>RUNS</th></tr></thead><tbody>{filtered.map(test => <tr key={test.id}><td><button className="request-title" onClick={() => { setSelectedId(test.id); setCreating(false); setMessage(''); }}><small>{test.id}</small><strong>{test.title}</strong></button></td><td><button className="rfc-link" onClick={() => onOpenRequest(test.requestId)}>{test.requestId}</button></td><td>{test.stage}</td><td><span className={`status test-status-${test.status.toLowerCase().replaceAll(' ', '-')}`}>{test.status}</span></td><td>{test.owner}</td><td>{test.runs.length}</td></tr>)}</tbody></table></div>
      {!filtered.length && <div className="empty"><FlaskConical size={28} /><h3>{tests.length ? 'No matching test cases' : 'Your first quality gate starts here'}</h3><p>{!loaded ? 'Loading test cases…' : tests.length ? 'Adjust the search or filters to see more tests.' : 'Create a test case and link it to an RFC to start SIT, QA or UAT.'}</p></div>}
      <div className="table-footer"><span>{filtered.length} test cases shown</span><span>Saved in this browser</span></div>
    </section>
    {selected && <section key={selected.id} className="test-editor feature-form" aria-label="Test case details"><div className="section-title"><div><span className="eyebrow">{selected.id} · {selected.stage}</span><h2>{selected.title}</h2></div><button className="text-button" onClick={() => setSelectedId(null)}>Close details</button></div>
      <div className="test-detail-meta"><button className="rfc-link" onClick={() => onOpenRequest(selected.requestId)}>{selected.requestId}</button><span>{selected.owner}</span><span>{selected.priority} priority</span><span className={`status test-status-${selected.status.toLowerCase().replaceAll(' ', '-')}`}>{selected.status}</span></div>
      {selected.preconditions && <div className="test-copy"><h3>Preconditions</h3><p>{selected.preconditions}</p></div>}
      <div className="test-copy"><h3>Steps</h3><p>{selected.steps}</p></div><div className="test-copy"><h3>Expected result</h3><p>{selected.expected}</p></div>
      {selected.status === 'Draft' && <button className="primary" onClick={() => transition('Ready')}><CheckCircle2 size={16} />Mark ready</button>}
      {['Ready', 'Passed', 'Failed', 'Blocked'].includes(selected.status) && <button className="primary" onClick={() => transition('In progress')}><Play size={16} />{selected.status === 'Ready' ? 'Start test' : 'Start retest'}</button>}
      {['Failed', 'Blocked'].includes(selected.status) && <button className="text-button create-bug" onClick={createBugFromFailure}>Create linked bug</button>}
      {selected.status === 'In progress' && <form onSubmit={execute} className="execution-form"><h3>Record this execution</h3><div className="form-row"><label>Result<select name="result" aria-label="Result"><option>Passed</option><option>Failed</option><option>Blocked</option></select></label><label>Executed by<input name="tester" defaultValue={selected.owner} required maxLength={80} /></label></div><label>Actual result / evidence notes<textarea name="actual" required rows={3} maxLength={10000} placeholder="Record what happened, including any discrepancy or blocker." /></label><button className="primary" type="submit">Save execution result</button></form>}
      <RfcDocuments key={selected.id} requestId={`test:${selected.id}`} evidence title={selected.stage === 'UAT' ? 'UAT case screenshots, video & evidence' : 'Test case screenshots, video & evidence'}/>
      <div className="run-history"><h3>Run history <span className="count">{selected.runs.length}</span></h3>{!selected.runs.length && <p>No completed runs yet.</p>}{selected.runs.map(run => <article key={run.id}><div><span className={`status test-status-${run.result.toLowerCase()}`}>{run.result}</span><span>{run.tester} · {new Date(run.at).toLocaleString()}</span></div><p>{run.actual}</p><RunEvidence testId={selected.id} runId={run.id}/></article>)}</div>
    </section>}
  </div>;
}

function RunEvidence({testId, runId}: {testId: string; runId: string}) {
  const [open, setOpen] = useState(false);
  return <div><button className="text-button" onClick={() => setOpen(!open)}>{open ? 'Hide run evidence' : 'Attach screenshots, video or run evidence'}</button>{open && <RfcDocuments requestId={`run:${testId}:${runId}`} evidence title="Test run screenshots, video & evidence"/>}</div>;
}
