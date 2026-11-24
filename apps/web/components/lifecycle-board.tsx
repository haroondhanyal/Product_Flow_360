'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, Download, Eye, Paperclip, Pencil, Plus, Save, Search, Trash2 } from 'lucide-react';
import { activeWorkspaceLink, commitRecord, EMPTY_LIFECYCLE, LIFECYCLE_KEY, MODULES, parseLifecycle, reconciliation, releaseGates, transitionRecord, type LifecycleState, type WorkKind, type WorkRecord } from '../lib/lifecycle';
import { parseTestCases, TEST_STORAGE_KEY, type TestCase } from '../lib/test-cases';
import { RfcDocuments } from './rfc-documents';
import { VersionEditor } from './version-editor';
import { RecordTypeSelect, StatusIndicator, StatusSelect } from './status-indicator';
import './lifecycle-form-layout.css';
import './defect-issue-ui.css';
import './defect-actions.css';
import './requirement-actions.css';

type Request = {id: string; title: string};

export function LifecycleBoard({kind, requests, onOpenRequest, workspaceId}: {kind: WorkKind; requests: Request[]; onOpenRequest: (id: string) => void; workspaceId?: string}) {
  const [state, setState] = useState<LifecycleState>(EMPTY_LIFECYCLE);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [ready, setReady] = useState(false), [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [requestFilter, setRequestFilter] = useState(''), [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(''), [editing, setEditing] = useState<WorkRecord | 'new' | null>(null);
  const [draftId, setDraftId] = useState('');
  const [versionTarget,setVersionTarget]=useState<WorkRecord|null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const module = MODULES[kind];
  // Local demo data can contain repeated IDs (for example after restoring/importing a
  // workspace). Keep the saved data intact, but render one stable row per ID.
  const requestOptions = Array.from(new Map(requests.map(request => [request.id, request])).values());
  const workspaceRecords = Array.from(new Map(state.records.filter(record => record.workspaceId === workspaceId).map(record => [record.id, record])).values());
  const workspaceTests = Array.from(new Map(tests.filter(test => test.workspaceId === workspaceId).map(test => [test.id, test])).values());
  const selected = workspaceRecords.find(record => record.id === selectedId);
  useEffect(() => {
    try {
      setState(parseLifecycle(localStorage.getItem(LIFECYCLE_KEY) ?? JSON.stringify(EMPTY_LIFECYCLE)));
      setTests(parseTestCases(localStorage.getItem(TEST_STORAGE_KEY) ?? '[]'));
    } catch (error) { setError((error as Error).message); setBlocked(true); }
    setReady(true);
  }, []);
  useEffect(() => { if (editing) requestAnimationFrame(() => editorRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'})); }, [editing]);
  useEffect(() => { if (kind !== 'defects' || !editing) return; const id = requestAnimationFrame(() => editorRef.current?.querySelector('select[name="requestId"]')?.removeAttribute('required')); return () => cancelAnimationFrame(id); }, [kind, editing]);
  useEffect(() => { if (kind !== 'defects' || !editing) return; const frame = requestAnimationFrame(() => { const form = editorRef.current?.querySelector('form'); if (!form || form.querySelector('.defect-result-field')) return; const current = editing === 'new' ? null : editing; const label = document.createElement('label'); label.className = 'defect-result-field'; label.textContent = 'Actual result / observed behaviour'; const textarea = document.createElement('textarea'); textarea.name = 'actual'; textarea.rows = 3; textarea.maxLength = 5000; textarea.placeholder = 'What actually happened? Add error message, impact or observed behaviour.'; textarea.value = current?.actual ?? ''; label.append(textarea); form.querySelector('button[type="submit"]')?.insertAdjacentElement('beforebegin', label); }); return () => cancelAnimationFrame(frame); }, [kind, editing]);

  function save(record: WorkRecord, action: string, expectedVersion = record.version) {
    if (!ready || blocked) return false;
    try {
      const latest = parseLifecycle(localStorage.getItem(LIFECYCLE_KEY) ?? JSON.stringify(EMPTY_LIFECYCLE));
      const existing = latest.records.find(item => item.id === record.id);
      if (existing && existing.version !== expectedVersion) throw new Error('This record changed in another tab. Reopen this module before saving.');
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
    if ((!field('requestId') && kind !== 'defects') || (field('requestId') && !requests.some(request => request.id === field('requestId')))) { setError('Choose an existing RFC, or leave RFC blank only for a standalone defect.'); return; }
    const old = editing && editing !== 'new' ? editing : null;
    const record: WorkRecord = {id: old?.id || draftId || `${kind.slice(0,3).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`, kind, requestId: field('requestId'), title: field('title'), owner: field('owner'), type: field('type'), status: old?.status ?? module.statuses[0], description: field('description'), notes: field('notes'), linkedId: field('linkedId'), priority: field('priority'), expected: field('expected'), actual: field('actual'), date: field('date'), version: old?.version ?? '1', updatedAt: old?.updatedAt ?? '', ...(old?.workspaceId ? {workspaceId:old.workspaceId,workspaceName:old.workspaceName} : activeWorkspaceLink())};
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
    if (!String(data.get('status') ?? '').trim()) { setError('Choose the next status before updating this record.'); return; }
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
  function removeSelected() {
    if (!selected || !['defects','requirements'].includes(kind)) return;
    const label = kind === 'defects' ? 'defect' : 'requirement';
    if (!window.confirm(`Delete ${label} “${selected.title}”? Linked evidence remains in this browser until removed.`)) return;
    try { const latest = parseLifecycle(localStorage.getItem(LIFECYCLE_KEY) ?? JSON.stringify(EMPTY_LIFECYCLE)); const next = {...latest, records: latest.records.filter(record => record.id !== selected.id)}; localStorage.setItem(LIFECYCLE_KEY, JSON.stringify(next)); setState(next); setSelectedId(''); setMessage(`${label[0].toUpperCase()}${label.slice(1)} deleted.`); } catch { setError(`Unable to delete this ${label}.`); }
  }
  const filtered = workspaceRecords.filter(record => record.kind === kind && (!requestFilter || record.requestId === requestFilter) && (!statusFilter || record.status === statusFilter) && `${record.id} ${record.title} ${record.owner} ${record.type} ${record.status}`.toLowerCase().includes(query.toLowerCase()));
  const editRecord = editing && editing !== 'new' ? editing : undefined;

  return <div className={`lifecycle-board lifecycle-${kind}`}>
    <div className="test-intro"><div><span className="eyebrow">CONNECTED DELIVERY</span><h2>{module.name}</h2><p>{module.description}</p></div><button className="primary" disabled={!ready || blocked || !requests.length} onClick={() => { setDraftId(`${kind.slice(0,3).toUpperCase()}-${crypto.randomUUID().slice(0,8).toUpperCase()}`); setEditing('new'); setSelectedId(''); setMessage(''); }}><Plus size={16}/>New {module.singular}</button></div>
    <div className="workflow-states">{module.statuses.map((status,index) => <span key={status}>{index > 0 && <small>→</small>}<StatusIndicator status={status}/></span>)}</div>
    {error && <div className="inline-error" role="alert">{error}</div>}{message && <p className="success-message" role="status">{message}</p>}
    {editing && <section ref={editorRef} className="test-editor feature-form"><div className="section-title"><h2>{editRecord ? 'Edit' : 'Create'} {module.singular}</h2><button className="text-button" onClick={() => { setEditing(null); setDraftId(''); }}>Cancel</button></div><RfcDocuments key={editRecord?.id ?? draftId} requestId={`work:${editRecord?.id ?? draftId}`} evidence title={`Evidence for this ${module.singular} — screenshots, video & documents`}/><form key={editRecord?.id ?? draftId} onSubmit={submit}>
      <div className="form-row"><label>Linked RFC<select name="requestId" aria-label="Linked RFC" defaultValue={editRecord?.requestId ?? requestFilter ?? ''} required><option value="">Choose RFC</option>{requestOptions.map(request => <option key={request.id} value={request.id}>{request.id} · {request.title}</option>)}</select></label><label>Record type<RecordTypeSelect ariaLabel="Record type" value={editRecord?.type ?? module.types[0]} options={[...module.types]} onChange={()=>{}}/></label></div>
      <label>Title<input name="title" required maxLength={160} autoFocus defaultValue={editRecord?.title}/></label><div className="form-row owner-priority-row"><label>Owner / reviewer<input name="owner" required maxLength={80} defaultValue={editRecord?.owner}/></label><label>Priority<StatusSelect name="priority" ariaLabel="Priority" value={editRecord?.priority ?? 'Medium'} options={['Critical','High','Medium','Low']} onChange={()=>{}}/></label></div>
      <label>{kind === 'releases' ? 'Rollout plan' : kind === 'configuration' ? 'Configuration definition' : 'Description / steps'}<textarea name="description" required rows={4} maxLength={10000} defaultValue={editRecord?.description}/></label>
      {(kind === 'requirements' || kind === 'defects') && <label>{kind === 'defects' ? 'Linked test case' : 'Parent requirement'}<select name="linkedId" aria-label="Linked record" defaultValue={editRecord?.linkedId ?? ''}><option value="">No linked record</option>{(kind === 'defects' ? workspaceTests : workspaceRecords.filter(record => record.kind === 'requirements' && record.id !== editRecord?.id)).map(record => <option key={record.id} value={record.id}>{record.id} · {record.title}</option>)}</select></label>}
      {['billing','revenue'].includes(kind) ? <><div className="form-row"><label>Expected amount (PKR)<input name="expected" required inputMode="decimal" placeholder="0.00" defaultValue={editRecord?.expected}/></label><label>Actual amount (PKR)<input name="actual" required inputMode="decimal" placeholder="0.00" defaultValue={editRecord?.actual}/></label></div><p className="report-note">Exact comparison to two decimal places. A difference creates a Failed check; correct the values and save a new version after investigation.</p></> : kind === 'releases' ? <label>Rollback plan<textarea name="expected" required rows={3} maxLength={5000} defaultValue={editRecord?.expected}/></label> : null}
      <div className="form-row"><label>Target / effective date<input name="date" type="date" required={kind === 'releases'} defaultValue={editRecord?.date}/></label><label>Initial notes<input name="notes" maxLength={2000} defaultValue={editRecord?.notes}/></label></div><button className="primary" type="submit"><Save size={16}/>Save {module.singular}</button>
    </form></section>}
    <section className="requests"><div className="table-toolbar test-toolbar"><label className="search"><Search size={17}/><input aria-label={`Search ${module.name}`} placeholder="Search title, owner, status…" value={query} onChange={event => setQuery(event.target.value)}/></label><label className="filter"><select aria-label="Filter records by RFC" value={requestFilter} onChange={event => setRequestFilter(event.target.value)}><option value="">All RFCs</option>{requestOptions.map(request => <option key={request.id} value={request.id}>{request.id}</option>)}</select></label><label className="filter status-filter"><StatusSelect ariaLabel={`Filter ${module.name} by status`} value={statusFilter || 'All statuses'} options={['All statuses',...module.statuses]} onChange={value => setStatusFilter(value === 'All statuses' ? '' : value)}/></label><button className="text-button" onClick={exportRecords}><Download size={15}/>Export</button></div><div className="table-scroll"><table><thead><tr><th>RECORD</th><th>RFC</th><th>TYPE</th><th>STATUS</th><th>OWNER</th><th>VERSION</th>{['defects','requirements'].includes(kind) && <th>DESCRIPTION</th>}{kind === 'defects' && <th>RESULT</th>}<th>ACTIONS</th></tr></thead><tbody>{filtered.map(record => <tr key={record.id}><td><button className="request-title" onClick={() => { setSelectedId(record.id); setEditing(null); setMessage(''); }}><small>{record.id}</small><strong>{record.title}</strong></button></td><td><button className="rfc-link" onClick={() => onOpenRequest(record.requestId)}>{record.requestId}</button></td><td><StatusIndicator status={record.type}/></td><td><StatusIndicator status={record.status}/></td><td>{record.owner}</td><td><button className="version-advance" aria-label={`Set version for ${record.id}, currently v${record.version}`} title="Set version manually" onClick={() => setVersionTarget(record)}>v{record.version}<Pencil size={12}/></button></td>{['defects','requirements'].includes(kind) && <td className="lifecycle-board-copy">{record.description || '—'}</td>}{kind === 'defects' && <td className="lifecycle-board-copy">{record.actual || 'Not recorded'}</td>}<td><div className="lifecycle-row-actions"><button className="row-action" aria-label={`View ${record.id}`} onClick={() => { setSelectedId(record.id); setEditing(null); }}><Eye size={14}/>View</button><button className="row-action" aria-label={`Edit ${record.id}`} onClick={() => { setSelectedId(''); setEditing(record); setMessage(''); }}><Pencil size={14}/>Edit</button></div></td></tr>)}</tbody></table></div>{!filtered.length && <div className="empty">{ready ? `No ${module.name.toLowerCase()} found. Create a record to start this workflow.` : 'Loading records…'}</div>}<div className="table-footer"><span>{filtered.length} records</span><span>Local workspace</span></div></section>
    {selected && !editing && <section className="test-editor feature-form" aria-label="Lifecycle record details"><div className="section-title"><div><span className="eyebrow">{selected.id} · VERSION v{selected.version}</span><h2>{selected.title}</h2></div><button className="text-button" onClick={() => setSelectedId('')}>Close details</button></div><div className="test-detail-meta"><span>{selected.owner}</span><StatusIndicator status={selected.type}/><StatusIndicator status={selected.status}/><span>{selected.date}</span></div><div className="test-copy"><h3>{kind === 'releases' ? 'Rollout plan' : 'Description'}</h3><p>{selected.description}</p></div>{kind === 'defects' && <div className="test-copy"><h3>Actual result / observed behaviour</h3><p>{selected.actual || 'No actual result recorded yet.'}</p></div>}{['defects','requirements'].includes(kind) && <div className="lifecycle-detail-actions"><button className="row-action" onClick={() => document.querySelector<HTMLElement>('.lifecycle-board [aria-label="Lifecycle record details"] .evidence-open-button')?.click()}><Paperclip size={14}/>Add evidence</button><button className="row-action" onClick={() => window.dispatchEvent(new CustomEvent('pf360-open-evidence-view',{detail:`work:${selected.id}`}))}><Eye size={14}/>View evidence</button><button className="row-action danger-action" onClick={removeSelected}><Trash2 size={14}/>Delete {kind === 'defects' ? 'issue' : 'requirement'}</button></div>}{selected.linkedId && <p className="report-note">Linked record: {selected.linkedId}</p>}
      {kind === 'releases' && <><div className="test-copy"><h3>Rollback plan</h3><p>{selected.expected}</p></div><div className="release-gates"><h3>Release readiness</h3>{releaseGates(selected.requestId,workspaceRecords,workspaceTests).map(gate => <div key={gate.label}>{gate.passed ? <CheckCircle2 size={18}/> : <Circle size={18}/>}<span>{gate.label}</span><strong>{gate.passed ? 'Passed' : 'Pending'}</strong></div>)}</div><p className="report-note">Deployment statuses record an operator’s actions. They do not deploy to PTCL systems. Verification and closure require evidence notes.</p></>}
      {['billing','revenue'].includes(kind) && <div className="test-summary"><article><span>Expected PKR</span><strong>{selected.expected}</strong></article><article><span>Actual PKR</span><strong>{selected.actual}</strong></article><article><span>Difference PKR</span><strong>{(reconciliation(selected).difference / 100).toFixed(2)}</strong></article></div>}
      <div className="lifecycle-detail-actions"><button className="row-action version-advance-detail" onClick={() => setVersionTarget(selected)}><Pencil size={14}/>Set version · v{selected.version}</button><button className="row-action" onClick={() => { setEditing(selected); setSelectedId(''); }}> <Pencil size={14}/>Edit {module.singular}</button></div>
      {!['billing','revenue'].includes(kind) && <form className="execution-form" onSubmit={transition}><h3>Move this work forward</h3><label>Next status<StatusSelect name="status" ariaLabel="Next status" value="" placeholder="Choose next status" options={module.statuses.filter(status => status !== selected.status)} onChange={() => {}}/></label><label>Decision / evidence notes<textarea name="notes" required rows={3} maxLength={5000}/></label><button className="primary" type="submit">Update status</button></form>}
      <RfcDocuments key={selected.id} requestId={`work:${selected.id}`} evidence title={kind === 'defects' ? 'Defect screenshots, video & evidence' : kind === 'uat' ? 'UAT screenshots, video & evidence' : kind === 'requirements' ? 'Requirement screenshots, video & evidence' : 'Supporting screenshots, video & evidence'}/>
      <div className="run-history"><h3>Version history</h3>{state.audit.filter(entry => entry.recordId === selected.id).map(entry => <article key={entry.id}><div><strong>{entry.before?`v${entry.before.version} → v${entry.after.version}`:`Created v${entry.after.version}`} · {entry.action}</strong><span>{new Date(entry.at).toLocaleString()} · {entry.owner}</span></div><p>{entry.after.notes || entry.after.description}</p><details><summary>Compare previous and saved version</summary><div className="version-snapshot-grid"><section><h4>Previous {entry.before?`v${entry.before.version}`:'record'}</h4><pre>{entry.before?JSON.stringify(entry.before,null,2):"No previous version — this was the initial record."}</pre></section><section><h4>Saved v{entry.after.version}</h4><pre>{JSON.stringify(entry.after,null,2)}</pre></section></div></details></article>)}</div>
    </section>}
    {versionTarget&&<VersionEditor current={versionTarget.version} onClose={()=>setVersionTarget(null)} onSave={version=>{const updated={...versionTarget,version};if(save(updated,'Version manually set',versionTarget.version)){setSelectedId(updated.id);setMessage(`Version set to v${version}.`)}setVersionTarget(null)}}/>}
  </div>;
}
