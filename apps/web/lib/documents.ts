export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const EVIDENCE_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.pdf,.doc,.docx,.xlsx,.xls,.csv,.json,.txt,.log';
export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.json,.txt,.log,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime';

export type DocumentInfo = {
  id: string;
  requestId: string;
  name: string;
  size: number;
  uploadedAt: string;
};
type StoredDocument = DocumentInfo & { blob: Blob };

export async function validateDocument(file: File): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm', 'mov', 'xlsx', 'xls', 'csv', 'json', 'txt', 'log'].includes(extension ?? '')) return validateEvidence(file);
  if (!['pdf', 'doc', 'docx'].includes(extension ?? '')) {
    throw new Error('Choose a supported project document: PDF, Word, Excel, CSV, image, video, JSON, TXT or LOG.');
  }
  if (file.size === 0) throw new Error('Empty documents cannot be attached.');
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('Each document must be 50 MB or smaller (52,428,800 bytes).');
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const startsWith = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const valid = extension === 'pdf'
    ? startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])
    : extension === 'doc'
      ? startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
      : startsWith([0x50, 0x4b, 0x03, 0x04]);
  if (!valid) throw new Error('The document format does not match its file extension. Choose the original PDF or Word file.');
}

export async function validateEvidence(file: File): Promise<void> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf', 'doc', 'docx'].includes(extension)) return validateDocument(file);
  if (!EVIDENCE_ACCEPT.split(',').includes('.' + extension)) throw new Error('Choose a supported screenshot, video, PDF, Word or Excel document.');
  if (!file.size) throw new Error('Empty evidence cannot be attached.');
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('Each evidence file must be 50 MB or smaller.');
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matches = (signature: number[], offset = 0) => signature.every((byte, i) => bytes[i + offset] === byte);
  const text = new TextDecoder().decode(bytes);
  const valid = ['csv', 'json', 'txt', 'log'].includes(extension) ? true
    : extension === 'png' ? matches([137, 80, 78, 71, 13, 10, 26, 10])
    : ['jpg', 'jpeg'].includes(extension) ? matches([255, 216, 255])
    : extension === 'gif' ? text.startsWith('GIF87a') || text.startsWith('GIF89a')
    : extension === 'webp' ? text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP'
    : extension === 'webm' ? matches([26, 69, 223, 163])
    : ['mp4', 'mov'].includes(extension) ? ['ftyp', 'moov', 'mdat', 'wide'].includes(text.slice(4, 8))
    : extension === 'xlsx' ? matches([80, 75, 3, 4])
    : matches([208, 207, 17, 224, 161, 177, 26, 225]);
  if (!valid) throw new Error('The evidence format does not match its file extension.');
}

export function evidenceMime(name: string): string | undefined {
  const types: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
  return types[name.split('.').pop()?.toLowerCase() ?? ''];
}

export async function previewDocument(id: string): Promise<Blob> {
  const document = await transaction<StoredDocument | undefined>('readonly', store => store.get(id));
  if (!document) throw new Error('Evidence is no longer available.');
  const type = evidenceMime(document.name);
  if (!type) throw new Error('Download this document to open it.');
  return document.blob.slice(0, document.blob.size, type);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pf360-documents', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('documents', { keyPath: 'id' });
      store.createIndex('requestId', 'requestId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other PF360 tabs and try again.'));
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', mode);
    let request: IDBRequest<T>;
    try { request = action(tx.objectStore('documents')); }
    catch (error) { tx.abort(); db.close(); reject(error); return; }
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = () => { db.close(); reject(tx.error ?? request.error ?? new Error('Document storage failed.')); };
    tx.onerror = () => { /* onabort reports the transaction failure. */ };
  });
}

export async function listDocuments(requestId: string): Promise<DocumentInfo[]> {
  // Walk keys/metadata one record at a time; do not load every large Blob into React state.
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const cursor = tx.objectStore('documents').index('requestId').openCursor(IDBKeyRange.only(requestId));
    const documents: DocumentInfo[] = [];
    cursor.onsuccess = () => {
      if (!cursor.result) return;
      const { blob: _blob, ...info } = cursor.result.value as StoredDocument;
      documents.push(info);
      cursor.result.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export async function attachDocument(requestId: string, file: File, evidence = false): Promise<DocumentInfo> {
  await (evidence ? validateEvidence(file) : validateDocument(file));
  const info: DocumentInfo = { id: crypto.randomUUID(), requestId, name: file.name, size: file.size, uploadedAt: new Date().toISOString() };
  await transaction('readwrite', store => store.add({ ...info, blob: file } satisfies StoredDocument));
  return info;
}

export async function downloadDocument(id: string): Promise<void> {
  const document = await transaction<StoredDocument | undefined>('readonly', store => store.get(id));
  if (!document) throw new Error('This document is no longer available. Reopen the request to refresh the list.');
  const url = URL.createObjectURL(document.blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function removeDocument(id: string): Promise<void> {
  await transaction('readwrite', store => store.delete(id));
}

export async function removeDocumentsForRequest(requestId: string): Promise<void> {
  const documents = await listDocuments(requestId);
  await Promise.all(documents.map(document => removeDocument(document.id)));
}

export function documentError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'Your browser storage is full. Free space or remove unused attachments, then try again. This document was not saved.';
  }
  return error instanceof Error ? error.message : 'Document storage is unavailable. Please try again.';
}
