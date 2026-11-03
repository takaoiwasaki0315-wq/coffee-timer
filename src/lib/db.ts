import type { BrewLog } from "../domain/types";

// 端末内の IndexedDB に保存する（SPEC.md §1）。クラウド同期はしない

const DB_NAME = "coffee-timer";
const DB_VERSION = 1;
const LOGS = "logs";

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

let dbPromise: Promise<IDBDatabase> | undefined;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(LOGS)) db.createObjectStore(LOGS, { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbPromise;
}

async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return (await open()).transaction(LOGS, mode).objectStore(LOGS);
}

/** 新しい順 */
export async function listLogs(): Promise<BrewLog[]> {
  const logs = await req<BrewLog[]>((await store("readonly")).getAll());
  return logs.sort((a, b) => b.brewedAt.localeCompare(a.brewedAt));
}

export async function saveLog(log: BrewLog): Promise<void> {
  await req((await store("readwrite")).put(log));
  // ブラウザの容量整理でデータが消されないように永続化を求める（失敗しても保存はできている）
  void navigator.storage?.persist?.().catch(() => undefined);
}

export async function deleteLog(id: string): Promise<void> {
  await req((await store("readwrite")).delete(id));
}
