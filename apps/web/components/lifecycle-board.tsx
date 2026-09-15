'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Download, Plus, Search } from 'lucide-react';
import { commitRecord, EMPTY_LIFECYCLE, LIFECYCLE_KEY, MODULES, parseLifecycle, reconciliation, releaseGates, transitionRecord, type LifecycleState, type WorkKind, type WorkRecord } from '../lib/lifecycle';
import { parseTestCases, TEST_STORAGE_KEY, type TestCase } from '../lib/test-cases';
import { RfcDocuments } from './rfc-documents';

type Request = {id: string; title: string};

export function LifecycleBoard({kind, requests, onOpenRequest}: {kind: WorkKind; requests: Request[]; onOpenRequest: (id: string) => void}) {
  const [state, setState] = useState<LifecycleState>(EMPTY_LIFECYCLE);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [ready, setReady] = useState(false), [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [requestFilter, setRequestFilter] = useState('');
  const [selectedId, setSelectedId] = useState(''), [editing, setEditing] = useState<WorkRecord | 'new' | null>(null);
  const [draftId, setDraftId] = useState('');
  const module = MODULES[kind];
  const selected = state.records.find(record => record.id === selectedId);
  useEffect(() => {
    try {
      setState(parseLifecycle(localStorage.getItem(LIFECYCLE_KEY) ?? JSON.stringify(EMPTY_LIFECYCLE)));
      setTests(parseTestCases(localStorage.getItem(TEST_STORAGE_KEY) ?? '[]'));
    } catch (error) { setError((error as Error).message); setBlocked(true); }
    setReady(true);
  }, []);

  function save(record: WorkRecord, action: string) {
    if (!ready || blocked) return false;
    try {
      const latest = parseLifecycle(localStorage.getItem(LIFECYCLE_KEY) ?? JSON.stringify(EMPTY_LIFECYCLE));
      const existing = latest.records.find(item => item.id === record.id);
      if (existing && existing.version !== record.version) throw new Error('This record changed in another tab. Reopen this module before saving.');
      const next = commitRecord(latest, record, action);
      localStorage.setItem(LIFECYCLE_KEY, JSON.stringify(next));
      setState(next); setError(''); setMessage(`${module.singular} saved.`); return true;
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save. Browser storage may be full.'); return false; }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (key: string) => String(data.get(key) ?? '').trim();
    if (!field('title') || !field('owner') || !field('description')) { setError('Title, owner and description are required.'); return; }
    if (!requests.some(request => request.id === field('requestId'))) { setError('Choose an existing RFC.'); return; }
    const old = editing && editing !== 'new' ? editing : null;
    const record: WorkRecord = {id: old?.id || draftId || `${kind.slice(0,3).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`, kind, requestId: field('requestId'), title: field('title'), owner: field('owner'), type: field('type'), status: old?.status ?? module.statuses[0], description: field('description'), notes: field('notes'), linkedId: field('linkedId'), priority: field('priority'), expected: field('expected'), actual: field('actual'), date: field('date'), version: old?.version ?? 0, updatedAt: old?.updatedAt ?? ''};
    try {
      if (record.linkedId) {
        const match = kind === 'defects' ? tests.find(test => test.id === record.linkedId) : state.records.find(item => item.id === record.linkedId);
        if (!match || match.requestId !== record.requestId) throw new Error('Linked record must belong to the same RFC.');
      }
      if (['billing','revenue'].includes(kind)) record.status = reconciliation(record).status;
      if (save(record, old ? 'Record updated' : 'Record created')) { setEditing(null); setDraftId(''); setSelectedId(record.id); }
    } catch (error) { setError((error as Error).message); }
  }
  function transition(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const data = new FormData(event.currentTarget);
    try {
      const latest = parseLifecycle(localStorage.getItem(LIFECYCLE_KEY) ?? JSON.stringify(EMPTY_LIFECYCLE));
      const latestTests = parseTestCases(localStorage.getItem(TEST_STORAGE_KEY) ?? '[]');
      const updated = transitionRecord(selected, String(data.get('status')), String(data.get('notes')), latest, latestTests);
      if (save(updated, `${selected.status} → ${updated.status}`)) { setTests(latestTests); event.currentTarget.reset(); }
    } catch (error) { setError((error as Error).message); }
  }
  function exportRecords() {
    const rows = [['ID','RFC','Title','Type','Status','Owner','Version','Updated at'], ...filtered.map(record => [record.id, record.requestId, record.title, record.type, record.status, record.owner, String(record.version), record.updatedAt])];
    const csv = rows.map(row => row.map(value => `"${value.replace(/^[=+@-]/,"'").replaceAll('"','""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); const a = document.createElement('a'); a.href = url; a.download = `PF360-${kind}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  const filtered = state.records.filter(record => record.kind === kind && (!requestFilter || record.requestId === requestFilter) && `${record.id} ${record.title} ${record.owner} ${record.type} ${record.status}`.toLowerCase().includes(query.toLowerCase()));
  const editRecord = editing && editing !== 'new' ? editing : undefined;

  return <div className="lifecycle-board">
    <div className="test-intro"><div><span className="eyebrow">CONNECTED DELIVERY</span><h2>{module.name}</h2><p>{module.description}</p></div><button className="primary" disabled={!ready || blocked || !requests.length} onClick={() => { setDraftId(`${kind.slice(0,3).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`); setEditing('new'); setSelectedId(''); setMessage(''); }}><Plus size={16}/>New {module.singular}</button></div>
    <div className="workflow-states">{module.statuses.map((status,index) => <span key={status}>{index > 0 && <small>→</small>}{status}</span>)}</div>
    {error && <div className="inline-error" role="alert">{error}</div>}{message && <p className="success-message" role="status">{message}</p>}
    {editing && <section className="test-editor feature-form"><div className="section-title"><h2>{editRecord ? 'Edit' : 'Create'} {module.singular}</h2><button className="text-button" onClick={() => { setEditing(null); setDraftId(''); }}>Cancel</button></div><RfcDocuments key={editRecord?.id ?? draftId} requestId={`work:${editRecord?.id ?? draftId}`} evidence title="Evidence & attachments — upload screenshots, video or documents"/><form key={editRecord?.id ?? draftId} onSubmit={submit}>
      <div className="form-row"><label>Linked RFC<select name="requestId" aria-label="Linked RFC" defaultValue={editRecord?.requestId ?? requestFilter ?? ''} required><option value="">Choose RFC</option>{requests.map(request => <option key={request.id} value={request.id}>{request.id} · {request.title}</option>)}</select></label><label>Record type<select name="type" aria-label="Record type" defaultValue={editRecord?.type}>{module.types.map(type => <option key={type}>{type}</option>)}</select></label></div>
      <label>Title<input name="title" required maxLength={160} autoFocus defaultValue={editRecord?.title}/></label><div className="form-row"><label>Owner / reviewer<input name="owner" required maxLength={80} defaultValue={editRecord?.owner}/></label><label>Priority<select name="priority" aria-label="Priority" defaultValue={editRecord?.priority ?? 'Medium'}>{['Critical','High','Medium','Low'].map(priority => <option key={priority}>{priority}</option>)}</select></label></div>
      <label>{kind === 'releases' ? 'Rollout plan' : kind === 'configuration' ? 'Configuration definition' : 'Description / steps'}<textarea name="description" required rows={4} maxLength={10000} defaultValue={editRecord?.description}/></label>
      {(kind === 'requirements' || kind === 'defects') && <label>{kind === 'defects' ? 'Linked test case' : 'Parent requirement'}<select name="linkedId" aria-label="Linked record" defaultValue={editRecord?.linkedId ?? ''}><option value="">No linked record</option>{(kind === 'defects' ? tests : state.records.filter(record => record.kind === 'requirements' && record.id !== editRecord?.id)).map(record => <option key={record.id} value={record.id}>{record.id} · {record.title}</option>)}</select></label>}
      {['billing','revenue'].includes(kind) ? <><div className="form-row"><label>Expected amount (PKR)<input name="expected" required inputMode="decimal" placeholder="0.00" defaultValue={editRecord?.expected}/></label><label>Actual amount (PKR)<input name="actual" required inputMode="decimal" placeholder="0.00" defaultValue={editRecord?.actual}/></label></div><p className="report-note">Exact comparison to two decimal places. A difference creates a Failed check; correct the values and save a new version after investigation.</p></> : kind === 'releases' ? <label>Rollback plan<textarea name="expected" required rows={3} maxLength={5000} defaultValue={editRecord?.expected}/></label> : null}
      <div className="form-row"><label>Target / effective date<input name="date" type="date" required={kind === 'releases'} defaultValue={editRecord?.date}/></label><label>Initial notes<input name="notes" maxLength={2000} defaultValue={editRecord?.notes}/></label></div><button className="primary" type="submit">Save {module.singular}</button>
    </form></section>}
    <section className="requests"><div className="table-toolbar test-toolbar"><label className="search"><Search size={17}/><input aria-label={`Search ${module.name}`} placeholder="Search title, owner, status…" value={query} onChange={event => setQuery(event.target.value)}/></label><label className="filter"><select aria-label="Filter records by RFC" value={requestFilter} onChange={event => setRequestFilter(event.target.value)}><option value="">All RFCs</option>{requests.map(request => <option key={request.id} value={request.id}>{request.id}</option>)}</select></label><button className="text-button" onClick={exportRecords}><Download size={15}/>Export</button></div><div className="table-scroll"><table><thead><tr><th>RECORD</th><th>RFC</th><th>TYPE</th><th>STATUS</th><th>OWNER</th><th>VERSION</th></tr></thead><tbody>{filtered.map(record => <tr key={record.id}><td><button className="request-title" onClick={() => { setSelectedId(record.id); setEditing(null); setMessage(''); }}><small>{record.id}</small><strong>{record.title}</strong></button></td><td><button className="rfc-link" onClick={() => onOpenRequest(record.requestId)}>{record.requestId}</button></td><td>{record.type}</td><td><span className={`status test-status-${record.status.toLowerCase().replaceAll(' ','-')}`}>{record.status}</span></td><td>{record.owner}</td><td>v{record.version}</td></tr>)}</tbody></table></div>{!filtered.length && <div className="empty">{ready ? `No ${module.name.toLowerCase()} found. Create a record to start this workflow.` : 'Loading records…'}</div>}<div className="table-footer"><span>{filtered.length} records</span><span>Local workspace</span></div></section>
    {selected && !editing && <section className="test-editor feature-form" aria-label="Lifecycle record details"><div className="section-title"><div><span className="eyebrow">{selected.id} · VERSION {selected.version}</span><h2>{selected.title}</h2></div><button className="text-button" onClick={() => setSelectedId('')}>Close details</button></div><div className="test-detail-meta"><span>{selected.owner}</span><span>{selected.type}</span><span>{selected.status}</span><span>{selected.date}</span></div><div className="test-copy"><h3>{kind === 'releases' ? 'Rollout plan' : 'Description'}</h3><p>{selected.description}</p></div>{selected.linkedId && <p className="report-note">Linked record: {selected.linkedId}</p>}
      {kind === 'releases' && <><div className="test-copy"><h3>Rollback plan</h3><p>{selected.expected}</p></div><div className="release-gates"><h3>Release readiness</h3>{releaseGates(selected.requestId,state.records,tests).map(gate => <div key={gate.label}>{gate.passed ? <CheckCircle2 size={18}/> : <Circle size={18}/>}<span>{gate.label}</span><strong>{gate.passed ? 'Passed' : 'Pending'}</strong></div>)}</div><p className="report-note">Deployment statuses record an operator’s actions. They do not deploy to PTCL systems. Verification and closure require evidence notes.</p></>}
      {['billing','revenue'].includes(kind) && <div className="test-summary"><article><span>Expected PKR</span><strong>{selected.expected}</strong></article><article><span>Actual PKR</span><strong>{selected.actual}</strong></article><article><span>Difference PKR</span><strong>{(reconciliation(selected).difference / 100).toFixed(2)}</strong></article></div>}
      {(module.statuses[0] === selected.status || ['Draft','Rejected','Open','In progress','Reopened','Planned'].includes(selected.status) || ['billing','revenue'].includes(kind)) && <button className="text-button" onClick={() => setEditing(selected)}>Edit {module.singular}</button>}
      {!['billing','revenue'].includes(kind) && <form className="execution-form" onSubmit={transition}><h3>Move this work forward</h3><label>Next status<select name="status" aria-label="Next status" defaultValue="" required><option value="" disabled>Choose next status</option>{module.statuses.filter(status => status !== selected.status).map(status => <option key={status}>{status}</option>)}</select></label><label>Decision / evidence notes<textarea name="notes" required rows={3} maxLength={5000}/></label><button className="primary" type="submit">Update status</button></form>}
      <RfcDocuments key={selected.id} requestId={`work:${selected.id}`} evidence title={kind === 'defects' ? 'Defect screenshots, video & evidence' : kind === 'uat' ? 'UAT screenshots, video & evidence' : kind === 'requirements' ? 'Requirement screenshots, video & evidence' : 'Supporting screenshots, video & evidence'}/>
      <div className="run-history"><h3>Version history</h3>{state.audit.filter(entry => entry.recordId === selected.id).map(entry => <article key={entry.id}><div><strong>v{entry.after.version} · {entry.action}</strong><span>{new Date(entry.at).toLocaleString()} · {entry.owner}</span></div><p>{entry.after.notes || entry.after.description}</p><details><summary>View saved version</summary><pre>{JSON.stringify(entry.after,null,2)}</pre></details></article>)}</div>
    </section>}
  </div>;
}
