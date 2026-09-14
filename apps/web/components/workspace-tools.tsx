'use client';

import { useEffect, useState } from 'react';
import { Download, Search, UploadCloud } from 'lucide-react';
import { EMPTY_LIFECYCLE, LIFECYCLE_KEY, MODULES, parseLifecycle, type LifecycleState } from '../lib/lifecycle';
import { changeTestStatus, parseTestCases, recordTestRun, TEST_STORAGE_KEY, type TestCase } from '../lib/test-cases';

export function WorkspaceTools({requests, onNavigate}: {requests: {id: string; title: string; owner: string}[]; onNavigate: (module: string) => void}) {
  const [state, setState] = useState<LifecycleState>(EMPTY_LIFECYCLE), [tests, setTests] = useState<TestCase[]>([]);
  const [query, setQuery] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy,setBusy] = useState(false), [projects,setProjects] = useState<{id:string; name:string; code:string; description:string; createdAt:string}[]>([]), [showProjectForm,setShowProjectForm] = useState(false);
  useEffect(() => { try { setState(parseLifecycle(localStorage.getItem(LIFECYCLE_KEY) ?? JSON.stringify(EMPTY_LIFECYCLE))); setTests(parseTestCases(localStorage.getItem(TEST_STORAGE_KEY) ?? '[]')); const saved=localStorage.getItem('pf360-projects'); if(saved) setProjects(JSON.parse(saved)); } catch (error) { setError((error as Error).message); } }, []);
  const entries = [...requests.map(request => ({...request,module:'Change requests'})), ...tests.map(test => ({...test,module:'Test management'})), ...state.records.map(record => ({...record,module:MODULES[record.kind].name}))];
  const found = query.trim() ? entries.filter(entry => `${entry.id} ${entry.title} ${entry.owner} ${entry.module}`.toLowerCase().includes(query.toLowerCase())).slice(0,100) : [];
  function download(value: unknown, name: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  async function importRuns(file?: File) {
    if (!file || busy) return; setBusy(true); setError(''); setMessage('');
    try {
      if (!/\.json$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error('Choose a JSON results file up to 5 MB.');
      const input: unknown = JSON.parse(await file.text());
      if (!Array.isArray(input) || !input.length || input.length > 1000) throw new Error('Provide an array of 1–1,000 execution results.');
      let next = parseTestCases(localStorage.getItem(TEST_STORAGE_KEY) ?? '[]');
      const seen = new Set<string>();
      for (const [index,row] of input.entries()) {
        if (!row || !['caseId','runId','actual','tester'].every(key => typeof row[key] === 'string' && row[key].trim()) || !['Passed','Failed','Blocked'].includes(row.result)) throw new Error(`Result ${index + 1}: caseId, runId, actual, tester and a Passed/Failed/Blocked result are required.`);
        const runId = `external:${row.runId}`;
        if (seen.has(runId) || next.some(test => test.runs.some(run => run.id === runId))) throw new Error(`Result ${index + 1}: runId has already been imported. No results were saved.`);
        seen.add(runId);
        const test = next.find(test => test.id === row.caseId);
        if (!test) throw new Error(`Result ${index + 1}: test case ${row.caseId} was not found.`);
        if (test.status === 'Draft') throw new Error(`Mark ${test.id} ready before importing execution results.`);
        const running = test.status === 'In progress' ? test : changeTestStatus(test,'In progress');
        const updated = recordTestRun(running,{id:runId,result:row.result,actual:`Imported from ${file.name}\n${row.actual}`,tester:row.tester,at:new Date().toISOString()});
        next = next.map(item => item.id === updated.id ? updated : item);
      }
      localStorage.setItem(TEST_STORAGE_KEY,JSON.stringify(next)); setTests(next); setMessage(`${input.length} execution results imported. Run IDs prevent duplicate imports.`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save execution results.'); }
    finally { setBusy(false); }
  }
  function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const name=String(data.get('name') ?? '').trim(), code=String(data.get('code') ?? '').trim().toUpperCase(), description=String(data.get('description') ?? '').trim();
    if (!name || !code) { setError('Project name and key are required.'); return; }
    if (!/^[A-Z0-9-]{2,12}$/.test(code)) { setError('Project key must use 2–12 letters, numbers or hyphens.'); return; }
    if (projects.some(project => project.code === code)) { setError('That project key already exists.'); return; }
    try { const next=[{id:crypto.randomUUID(),name,code,description,createdAt:new Date().toISOString()},...projects]; localStorage.setItem('pf360-projects',JSON.stringify(next)); setProjects(next); setShowProjectForm(false); setMessage(`${name} project created. It is ready for new RFCs and linked work.`); } catch { setError('Project could not be saved in this browser.'); }
  }
  return <div className="workspace-tools"><div className="test-intro"><div><span className="eyebrow">FIND, CONNECT, REVIEW</span><h2>Workspace tools</h2><p>Search linked work, import automation results and review change history.</p></div></div>
    {error && <div role="alert" className="inline-error">{error}</div>}{message && <p role="status" className="success-message">{message}</p>}
    <section className="test-editor project-workspace"><div className="section-title"><div><h2>Projects</h2><p>Create delivery spaces for CRM, Billing, Fly, Digital Channels and future product work.</p></div><button className="primary" onClick={() => setShowProjectForm(open => !open)}>{showProjectForm ? 'Close' : 'New project'}</button></div>{showProjectForm && <form className="feature-form" onSubmit={createProject}><div className="form-row"><label>Project name<input name="name" required maxLength={80} autoFocus placeholder="e.g. CRM / CAReS"/></label><label>Project key<input name="code" required maxLength={12} placeholder="e.g. CRM"/></label></div><label>Description <span className="optional">(optional)</span><textarea name="description" rows={2} maxLength={500}/></label><button className="primary" type="submit">Create project</button></form>}<div className="project-list">{projects.map(project => <article key={project.id}><strong>{project.code}</strong><div><h3>{project.name}</h3><p>{project.description || 'Ready for RFCs, tests, bugs and reports.'}</p></div><small>{new Date(project.createdAt).toLocaleDateString()}</small></article>)}{!projects.length && <p className="report-note">No dedicated projects yet. Create one to establish a project workspace; existing RFCs remain available in the All Projects view.</p>}</div></section>
    <section className="test-editor"><h2>Search across your workspace</h2><label className="search global-search"><Search size={18}/><input aria-label="Global search" value={query} onChange={event => setQuery(event.target.value)} placeholder="RFC, test, requirement, owner…"/></label>{found.map(entry => <button className="search-result" key={entry.id} onClick={() => onNavigate(entry.module)}><div><strong>{entry.title}</strong><small>{entry.id} · {entry.owner}</small></div><span>{entry.module}</span></button>)}{query && !found.length && <p className="report-note">No records match this search.</p>}</section>
    <section className="test-editor"><h2>Import automated test results</h2><p className="report-note">Upload results from your test runner. Cases must already exist and be marked ready. Import records the supplied result; it does not run tests or call external systems.</p><div className="tool-actions"><label className="primary upload-label"><UploadCloud size={17}/>{busy ? 'Importing…' : 'Import results JSON'}<input type="file" className="sr-only" aria-label="Import automation results" accept=".json" disabled={busy} onChange={event => { void importRuns(event.target.files?.[0]); event.target.value = ''; }}/></label><button className="text-button" onClick={() => download([{caseId: tests[0]?.id ?? 'TC-YOUR-CASE-ID',runId:'ci-build-123-test-1',result:'Passed',tester:'CI runner',actual:'Expected and actual output matched.'}],'PF360-results-template.json')}><Download size={16}/>Download format</button></div></section>
    <section className="test-editor"><div className="section-title"><h2>Lifecycle audit history</h2><button className="text-button" onClick={() => download(state.audit,'PF360-audit.json')}><Download size={16}/>Export history</button></div><p className="report-note">Latest 1,000 local lifecycle changes. This browser history is not an authenticated enterprise audit log.</p><div className="run-history">{state.audit.slice(0,50).map(entry => <article key={entry.id}><div><strong>{entry.recordId} · {entry.action}</strong><span>{entry.owner} · {new Date(entry.at).toLocaleString()}</span></div><p>{entry.after.title}</p></article>)}{!state.audit.length && <p>No lifecycle changes recorded yet.</p>}{state.audit.length > 50 && <p>Showing 50 recent changes. Export includes all retained entries.</p>}</div></section>
  </div>;
}
