import { DEFAULT_SETTINGS, isValidSettings, type Settings } from "../domain/settings";
import type { BrewLog, Recipe } from "../domain/types";

// 端末内の IndexedDB に保存する（SPEC.md §1）。クラウド同期はしない

const DB_NAME = "coffee-timer";
// v1: logs / v2: recipes, settings を追加
const DB_VERSION = 2;
const LOGS = "logs";
const RECIPES = "recipes";
const SETTINGS = "settings";
const SETTINGS_KEY = "app";

type StoreName = typeof LOGS | typeof RECIPES | typeof SETTINGS;

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
      if (!db.objectStoreNames.contains(RECIPES)) db.createObjectStore(RECIPES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbPromise;
}

async function store(name: StoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return (await open()).transaction(name, mode).objectStore(name);
}

/** ブラウザの容量整理でデータが消されないように永続化を求める（失敗しても保存はできている） */
function requestPersist(): void {
  void navigator.storage?.persist?.().catch(() => undefined);
}

/** 新しい順 */
export async function listLogs(): Promise<BrewLog[]> {
  const logs = await req<BrewLog[]>((await store(LOGS, "readonly")).getAll());
  return logs.sort((a, b) => b.brewedAt.localeCompare(a.brewedAt));
}

export async function saveLog(log: BrewLog): Promise<void> {
  await req((await store(LOGS, "readwrite")).put(log));
  requestPersist();
}

export async function deleteLog(id: string): Promise<void> {
  await req((await store(LOGS, "readwrite")).delete(id));
}

/** 自作レシピ（名前順） */
export async function listRecipes(): Promise<Recipe[]> {
  const rs = await req<Recipe[]>((await store(RECIPES, "readonly")).getAll());
  return rs.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export async function saveRecipe(r: Recipe): Promise<void> {
  if (r.builtIn) throw new Error("同梱テンプレートは保存できません");
  await req((await store(RECIPES, "readwrite")).put(r));
  requestPersist();
}

export async function deleteRecipe(id: string): Promise<void> {
  await req((await store(RECIPES, "readwrite")).delete(id));
}

export async function loadSettings(): Promise<Settings> {
  const s = await req<unknown>((await store(SETTINGS, "readonly")).get(SETTINGS_KEY));
  return isValidSettings(s) ? s : DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings): Promise<void> {
  if (!isValidSettings(s)) throw new RangeError("設定の値が正しくありません");
  await req((await store(SETTINGS, "readwrite")).put(s, SETTINGS_KEY));
}

/** バックアップの読み込み。1つのトランザクションで行い、途中で失敗したら何も書き込まない */
export async function importAll(recipes: Recipe[], logs: BrewLog[], settings: Settings): Promise<void> {
  const db = await open();
  const tx = db.transaction([RECIPES, LOGS, SETTINGS], "readwrite");
  for (const r of recipes) tx.objectStore(RECIPES).put(r);
  for (const l of logs) tx.objectStore(LOGS).put(l);
  tx.objectStore(SETTINGS).put(settings, SETTINGS_KEY);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  requestPersist();
}
