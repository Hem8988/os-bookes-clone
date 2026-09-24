'use client';

// Offline queue for the delivery app (SRS §14.4). Deliveries and other
// critical entries are stored in IndexedDB and shown as "Pending Sync" until
// the server confirms them, so accounts never verify unsynced data.
// Photos are stored as blobs and uploaded during sync.

const DB_NAME = 'deskshark-offline';
const STORE = 'queue';

export interface QueuedEntry {
  id: string; // also used as the server idempotency key (clientRef)
  kind: 'DELIVERY';
  createdAt: string;
  payload: Record<string, unknown>;
  files: Record<string, Blob>; // payload field → photo waiting for upload
  attempts: number;
  lastError?: string;
  label: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const queueAll = () => tx<QueuedEntry[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedEntry[]>);
export const queuePut = (entry: QueuedEntry) => tx('readwrite', (s) => s.put(entry));
export const queueDelete = (id: string) => tx('readwrite', (s) => s.delete(id));

/**
 * Try to push every queued entry. Validation errors (4xx) stay in the queue
 * with the message so the delivery boy can fix or report them.
 */
export async function syncQueue(onProgress?: (entries: QueuedEntry[]) => void): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  for (const entry of await queueAll()) {
    try {
      const payload = { ...entry.payload };
      for (const [field, blob] of Object.entries(entry.files)) {
        if (typeof payload[field] === 'string' && String(payload[field]).startsWith('/api/files/')) continue;
        const form = new FormData();
        form.append('file', blob, `${field}.jpg`);
        const up = await fetch('/api/files', { method: 'POST', body: form });
        const upJson = await up.json();
        if (!up.ok) throw Object.assign(new Error(upJson.error || 'Photo upload failed'), { status: up.status });
        payload[field] = upJson.data.url;
        entry.payload[field] = upJson.data.url; // keep uploaded URL if the next step fails
      }
      const res = await fetch('/api/cylinder/deliveries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, clientRef: entry.id }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(json.error || `Sync failed (${res.status})`), { status: res.status });
      await queueDelete(entry.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await queuePut({ ...entry, attempts: entry.attempts + 1, lastError: error instanceof Error ? error.message : String(error) });
    }
    onProgress?.(await queueAll());
  }
  return { synced, failed };
}
