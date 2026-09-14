'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Trash2, UploadCloud, Eye, X } from 'lucide-react';
import { attachDocument, DOCUMENT_ACCEPT, EVIDENCE_ACCEPT, evidenceMime, previewDocument, documentError, downloadDocument, listDocuments, removeDocument, type DocumentInfo } from '../lib/documents';

export function RfcDocuments({ requestId, evidence = false, title = 'RFC documents' }: { requestId: string; evidence?: boolean; title?: string }) {
  const [preview, setPreview] = useState<{url: string; type: string; name: string} | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);

  useEffect(() => {
    let current = true;
    listDocuments(requestId).then(items => { if (current) setDocuments(items); })
      .catch(error => { if (current) setError(documentError(error)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [requestId]);

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
          setDocuments(items => [info, ...items]);
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
      setDocuments(items => items.filter(item => item.id !== info.id));
      setMessage(`${info.name} removed.`);
    } catch (error) { setError(documentError(error)); }
    finally { setBusy(false); lock.current = false; }
  }

  return <section className="rfc-documents" aria-label={title}>
    <div className="section-title"><h3>{title} <span className="count">{documents.length}</span></h3></div>
    <div className={`document-dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={event => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files)); }}>
      <UploadCloud size={26} />
      <strong>{busy ? 'Saving document…' : evidence ? 'Drop screenshots, videos or documents here' : 'Drop your RFC documents or images here'}</strong>
      <span>{evidence ? 'PNG, JPG, WebP, GIF · MP4, WebM, MOV · PDF, Word, Excel' : 'PDF, DOC, DOCX · PNG, JPG, WebP, GIF'} · Maximum 50 MB per file</span>
      <button type="button" className="text-button" disabled={busy || loading} onClick={() => input.current?.click()}>Choose documents</button>
      <input ref={input} className="sr-only" tabIndex={-1} type="file" multiple accept={evidence ? EVIDENCE_ACCEPT : DOCUMENT_ACCEPT}
        aria-label={evidence ? `Upload ${title.toLowerCase()}` : 'Upload RFC documents'} disabled={busy || loading}
        onChange={event => void upload(Array.from(event.target.files ?? []))} />
    </div>
    {loading && <p role="status">Loading documents…</p>}
    {error && <div className="inline-error" role="alert">{error}</div>}
    {message && <p className="success-message" role="status">{message}</p>}
    <ul className="document-list">{documents.map(info => <li key={info.id}>
      <FileText size={21} />
      <div><strong>{info.name}</strong><small>{(info.size / 1024 / 1024).toFixed(2)} MB · {new Date(info.uploadedAt).toLocaleDateString()}</small></div>
      {(evidence || evidenceMime(info.name)?.startsWith('image/')) && evidenceMime(info.name) && <button type="button" className="icon-button" aria-label={`Preview ${info.name}`} onClick={() => { setError(''); void previewDocument(info.id).then(blob => setPreview({url: URL.createObjectURL(blob), type: blob.type, name: info.name})).catch(error => setError(documentError(error))); }}><Eye size={17}/></button>}
      <button type="button" className="icon-button" aria-label={`Download ${info.name}`} disabled={busy}
        onClick={() => { setError(''); void downloadDocument(info.id).catch(error => setError(documentError(error))); }}><Download size={17} /></button>
      <button type="button" className="icon-button" aria-label={`Remove ${info.name}`} disabled={busy} onClick={() => void remove(info)}><Trash2 size={17} /></button>
    </li>)}</ul>
    {preview && <div className="evidence-preview"><div><strong>{preview.name}</strong><button className="icon-button" aria-label="Close preview" onClick={() => setPreview(null)}><X size={18}/></button></div>{preview.type.startsWith('image/') ? <img src={preview.url} alt={preview.name}/> : <><video src={preview.url} controls preload="metadata" onError={() => setError('This browser cannot play this video format. Download the file to view it.')}/><small>Playback depends on the video codec. Download the original if it cannot play here.</small></>}</div>}
    <p className="form-note">Documents are saved on this device, in this browser. They are not shared with other users.</p>
  </section>;
}
