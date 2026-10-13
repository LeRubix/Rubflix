const DB_NAME = 'kudflix_media_cache_v1';
const DB_VERSION = 2;
const STORE = 'media';
const HISTORY_THUMB_STORE = 'watchHistoryThumbs';

export interface CachedMediaEntry {
  path: string;
  thumbnail: string | null;
  duration: number;
  mtimeMs: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains(HISTORY_THUMB_STORE)) {
        db.createObjectStore(HISTORY_THUMB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function getCachedMedia(path: string, mtimeMs?: number): Promise<CachedMediaEntry | null> {
  try {
    const db = await openDb();
    const entry = await new Promise<CachedMediaEntry | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(path);
      req.onsuccess = () => resolve(req.result as CachedMediaEntry | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!entry) return null;
    if (mtimeMs != null && entry.mtimeMs !== mtimeMs) return null;
    return entry;
  } catch {
    return null;
  }
}

export async function setCachedMedia(entry: CachedMediaEntry): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore quota / IDB errors
  }
}

export async function hydrateFilesFromCache<T extends { path: string; thumbnail?: string; duration?: number; mtimeMs?: number }>(
  files: T[],
): Promise<T[]> {
  if (files.length === 0) return files;
  try {
    const db = await openDb();
    const cached = await new Promise<Map<string, CachedMediaEntry>>((resolve) => {
      const map = new Map<string, CachedMediaEntry>();
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      let pending = files.length;
      if (pending === 0) {
        resolve(map);
        return;
      }
      for (const file of files) {
        const req = store.get(file.path);
        req.onsuccess = () => {
          const entry = req.result as CachedMediaEntry | undefined;
          if (entry && (file.mtimeMs == null || entry.mtimeMs === file.mtimeMs)) {
            map.set(file.path, entry);
          }
          if (--pending === 0) resolve(map);
        };
        req.onerror = () => {
          if (--pending === 0) resolve(map);
        };
      }
    });

    return files.map((file) => {
      const hit = cached.get(file.path);
      if (!hit) return file;
      return {
        ...file,
        thumbnail: file.thumbnail || hit.thumbnail || undefined,
        duration: file.duration && file.duration > 0 ? file.duration : hit.duration,
      };
    });
  } catch {
    return files;
  }
}

export async function deleteCachedMedia(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const path of paths) store.delete(path);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function setWatchHistoryThumb(id: string, thumbnail: string | null): Promise<void> {
  if (!thumbnail) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HISTORY_THUMB_STORE, 'readwrite');
      tx.objectStore(HISTORY_THUMB_STORE).put({ id, thumbnail });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function getWatchHistoryThumb(id: string): Promise<string | null> {
  try {
    const db = await openDb();
    const row = await new Promise<{ id: string; thumbnail: string | null } | undefined>((resolve, reject) => {
      const tx = db.transaction(HISTORY_THUMB_STORE, 'readonly');
      const req = tx.objectStore(HISTORY_THUMB_STORE).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return row?.thumbnail ?? null;
  } catch {
    return null;
  }
}

export async function deleteWatchHistoryThumb(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HISTORY_THUMB_STORE, 'readwrite');
      tx.objectStore(HISTORY_THUMB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export async function pruneCachedMedia(validPaths: Set<string>): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const entry = cursor.value as CachedMediaEntry;
        if (!validPaths.has(entry.path)) cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
