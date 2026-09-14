function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pf360-workspace', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function access<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', mode);
    let request: IDBRequest<T>;
    try { request = action(tx.objectStore('records')); }
    catch (error) { tx.abort(); db.close(); reject(error); return; }
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = () => { db.close(); reject(tx.error ?? request.error); };
  });
}
export async function putLocal<T extends {id: string}>(record: T) { await access('readwrite', store => store.put(record)); }
export function getLocal<T>(id: string) { return access<T | undefined>('readonly', store => store.get(id)); }
export function allLocal<T>() { return access<T[]>('readonly', store => store.getAll()); }
export async function deleteLocal(id: string) { await access('readwrite', store => store.delete(id)); }
