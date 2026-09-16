'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Trash2, UploadCloud, Eye, Maximize2, Minimize2, Paperclip, X, ZoomIn, ZoomOut } from 'lucide-react';
import { attachDocument, DOCUMENT_ACCEPT, EVIDENCE_ACCEPT, evidenceMime, previewDocument, documentError, downloadDocument, listDocuments, removeDocument, type DocumentInfo } from '../lib/documents';
import './evidence-preview.css';
import './evidence-popup-flow.css';

export function RfcDocuments({ requestId, evidence = false, title = 'RFC documents' }: { requestId: string; evidence?: boolean; title?: string }) {
  const [preview, setPreview] = useState<{url: string; type: string; name: string} | null>(null);
  const [zoom, setZoom] = useState(1);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentInfo | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPreview(null); setPendingDelete(null); } };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, []);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const [projects, setProjects] = useState<{id:string;name:string;code:string}[]>([]);
  const [projectId, setProjectId] = useState('');
  const evidencePopup = evidence && /^(work|test|run|report-evidence):/.test(requestId);
  const [panelOpen, setPanelOpen] = useState(!evidencePopup);
  const [readOnlyView, setReadOnlyView] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);

  useEffect(() => {
    let current = true;
    listDocuments(requestId).then(items => { if (current) setDocuments(items); })
      .catch(error => { if (current) setError(documentError(error)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [requestId]);
  useEffect(() => {
    if (evidence) return;
    try {
      const available = JSON.parse(localStorage.getItem('pf360-projects') ?? '[]');
      if (Array.isArray(available)) setProjects(available.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.code === 'string'));
      const assignments = JSON.parse(localStorage.getItem('pf360-rfc-projects') ?? '{}');
      if (assignments && typeof assignments[requestId] === 'string') setProjectId(assignments[requestId]);
    } catch { setError('Project assignment could not be loaded.'); }
  }, [requestId, evidence]);
  useEffect(() => { const openView = (event: Event) => { if ((event as CustomEvent<string>).detail === requestId) { setReadOnlyView(true); setPanelOpen(true); } }; window.addEventListener('pf360-open-evidence-view', openView); return () => window.removeEventListener('pf360-open-evidence-view', openView); }, [requestId]);
  function assignProject(next: string) {
    setProjectId(next);
    try { const assignments = JSON.parse(localStorage.getItem('pf360-rfc-projects') ?? '{}'); localStorage.setItem('pf360-rfc-projects', JSON.stringify({...assignments, [requestId]: next})); setMessage(next ? 'RFC assigned to its workspace project.' : 'RFC moved to All Projects.'); }
    catch { setError('Project assignment could not be saved.'); }
  }

  async function upload(files: File[]) {
    if (lock.current || loading || !files.length) return;
    lock.current = true;
    setBusy(true); setError(''); setMessage('');
    const failures: string[] = [];
    let added = 0;
    try {
      for (const file of files) {
        try {
          const info = await attachDocument(requestId, file, evidence);
          setDocuments(items => { const next = [info, ...items]; window.dispatchEvent(new CustomEvent('pf360-evidence-changed', {detail: {requestId, count: next.length}})); return next; });
          added++;
        } catch (error) { failures.push(`${file.name}: ${documentError(error)}`); }
      }
      setError(failures.join('\n'));
      if (added) setMessage(`${added} document${added === 1 ? '' : 's'} attached successfully.`);
    } finally {
      setBusy(false); lock.current = false;
      if (input.current) input.current.value = '';
    }
  }

  async function remove(info: DocumentInfo) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await removeDocument(info.id);
      setDocuments(items => { const next = items.filter(item => item.id !== info.id); window.dispatchEvent(new CustomEvent('pf360-evidence-changed', {detail: {requestId, count: next.length}})); return next; });
      setMessage(`Evidence deleted successfully: ${info.name}.`);
    } catch (error) { setError(documentError(error)); }
    finally { setBusy(false); lock.current = false; }
  }
  function openPreview(info: DocumentInfo) {
    setError(''); setZoom(1); setPreviewExpanded(false);
    void previewDocument(info.id)
      .then(blob => setPreview({url: URL.createObjectURL(blob), type: blob.type || evidenceMime(info.name) || 'application/octet-stream', name: info.name}))
      .catch(error => setError(documentError(error)));
  }

  if (evidencePopup && !panelOpen) return <button type="button" className="evidence-open-button" onClick={() => { setReadOnlyView(false); setPanelOpen(true); }}><Paperclip size={16}/>Add evidence {documents.length ? `(${documents.length})` : ''}</button>;

  return <section className={`rfc-documents ${evidencePopup ? 'evidence-popup-panel' : ''}`} aria-label={title}>
    <div className="section-title"><h3>{readOnlyView ? 'View evidence' : title} <span className="count">{documents.length}</span></h3>{evidencePopup && <button type="button" className="evidence-popup-close" aria-label="Close evidence popup" onClick={() => { setPanelOpen(false); setReadOnlyView(false); }}>Close <X size={17}/></button>}</div>
    {!evidence && <label className="rfc-project-picker">Workspace project<select aria-label="RFC workspace project" value={projectId} onChange={event => assignProject(event.target.value)}><option value="">All Projects / unassigned</option>{projects.map(project => <option value={project.id} key={project.id}>{project.code} · {project.name}</option>)}</select><small>{projects.length ? 'This RFC and its documents are grouped under the selected project in this browser.' : 'Create a project in Workspace tools, then return here to assign this RFC.'}</small></label>}
    {!readOnlyView && <div className={`document-dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files)); }}>
      <UploadCloud size={26} />
      <strong>{busy ? 'Saving document…' : evidence ? 'Drop screenshots, videos or documents here' : 'Drop RFC documents, screenshots or videos here'}</strong>
      <span>PNG, JPG, WebP, GIF · MP4, WebM, MOV · PDF, Word, Excel, CSV, JSON, TXT, LOG · Maximum 50 MB per file</span>
      <button type="button" className="text-button" disabled={busy || loading} onClick={() => input.current?.click()}>Choose documents</button>
      <input ref={input} className="sr-only" tabIndex={-1} type="file" multiple accept={evidence ? EVIDENCE_ACCEPT : DOCUMENT_ACCEPT}
        aria-label={evidence ? `Upload ${title.toLowerCase()}` : 'Upload RFC documents'} disabled={busy || loading}
        onChange={event => void upload(Array.from(event.target.files ?? []))} />
    </div>}
    {loading && <p role="status">Loading documents…</p>}
    {error && <div className="inline-error" role="alert">{error}</div>}
    {message && <p className="success-message" role="status">{message}</p>}
    <ul className="document-list">{documents.map(info => <li key={info.id}>
      <FileText size={21} />
      <div><button type="button" className="evidence-file-name" onClick={() => openPreview(info)} title={`Open ${info.name}`}><strong>{info.name}</strong></button><small>{(info.size / 1024 / 1024).toFixed(2)} MB · {new Date(info.uploadedAt).toLocaleDateString()}</small></div>
      <button type="button" className="evidence-view-file" aria-label={`View ${info.name}`} onClick={() => openPreview(info)}><Eye size={16}/>View file</button>
      <button type="button" className="icon-button" aria-label={`Download ${info.name}`} disabled={busy}
        onClick={() => { setError(''); void downloadDocument(info.id).catch(error => setError(documentError(error))); }}><Download size={17} /></button>
      {!readOnlyView && <button type="button" className="icon-button" aria-label={`Remove ${info.name}`} disabled={busy} onClick={() => setPendingDelete(info)}><Trash2 size={17} /></button>}
    </li>)}</ul>
    {preview && <div className="evidence-modal-backdrop" role="presentation" onClick={() => { setPreview(null); setPreviewExpanded(false); }}><section className={`evidence-preview ${previewExpanded ? 'evidence-preview-expanded' : ''}`} role="dialog" aria-modal="true" aria-label={`Evidence preview: ${preview.name}`} onClick={event => event.stopPropagation()}><header><strong>{preview.name}</strong><span className="evidence-preview-actions">{(preview.type.startsWith('image/') || preview.type === 'application/pdf') && <button className="icon-button" aria-label={previewExpanded ? 'Restore preview size' : 'Expand preview'} title={previewExpanded ? 'Restore original size' : 'Expand preview'} onClick={() => setPreviewExpanded(value => !value)}>{previewExpanded ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button>}{preview.type.startsWith('image/') && <><button className="icon-button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(.5, value - .25))}><ZoomOut size={18}/></button><button className="icon-button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(3, value + .25))}><ZoomIn size={18}/></button><button className="icon-button" aria-label="Reset image zoom" onClick={() => setZoom(1)}><Maximize2 size={18}/></button></>}<button type="button" className="preview-cancel" aria-label="Close preview" onClick={() => { setPreview(null); setPreviewExpanded(false); }}>Cancel <X size={18}/></button></span></header>{preview.type.startsWith('image/') ? <div className="evidence-image-stage"><img style={{transform:`scale(${zoom})`}} src={preview.url} alt={preview.name}/></div> : preview.type === 'application/pdf' || preview.type.startsWith('text/') || preview.type === 'application/json' ? <iframe title={preview.name} src={preview.url}/> : preview.type.startsWith('video/') ? <><video src={preview.url} controls preload="metadata" onError={() => setError('This browser cannot play this video format. Download the file to view it.')}/><small>Playback depends on the video codec. Download the original if it cannot play here.</small></> : <div className="unsupported-evidence"><FileText size={40}/><h3>{preview.name}</h3><p>This Office document opens through your device’s installed app. Download it to open the original file.</p><button type="button" className="primary" onClick={() => { const item = documents.find(document => document.name === preview.name); if (item) void downloadDocument(item.id); }}>Download file</button></div>}</section></div>}
    {pendingDelete && <div className="evidence-modal-backdrop" role="presentation" onClick={() => setPendingDelete(null)}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-evidence-title" onClick={event => event.stopPropagation()}><div className="section-title"><div><span className="eyebrow">CONFIRM DELETION</span><h3 id="delete-evidence-title">Delete evidence?</h3></div><button className="icon-button" aria-label="Close delete confirmation" onClick={() => setPendingDelete(null)}><X size={18}/></button></div><p>Are you sure you want to delete <strong>{pendingDelete.name}</strong>? This evidence will no longer be available for this test execution.</p><div className="modal-actions"><button type="button" className="text-button" onClick={() => setPendingDelete(null)}>Cancel</button><button type="button" className="danger-button" onClick={() => { const item = pendingDelete; setPendingDelete(null); void remove(item); }}>Delete evidence</button></div></section></div>}
    <p className="form-note">Documents are saved on this device, in this browser. They are not shared with other users.</p>
  </section>;
}
