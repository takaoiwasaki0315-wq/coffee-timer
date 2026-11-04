import "fake-indexeddb/auto";
import { beforeAll, describe, expect, it } from "vitest";
import type { BrewLog } from "../src/domain/types";

const log = (id: string, brewedAt: string): BrewLog => ({
  id,
  recipeId: "switch-hybrid",
  recipeName: "スイッチ ハイブリッド",
  brewedAt,
  beanName: "エチオピア",
  grinder: "TIMEMORE S5",
  grind: 6.5,
  waterTempC: 86,
  bypassG: 40,
  totalSec: 152.3,
  rating: 4,
  memo: "",
  interrupted: true,
});

const old = log("old", "2026-10-01T08:00:00.000Z");

// 最初の公開版（DB v1：logs のみ）で保存したログが、更新後も残ることを確かめる
beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    const r = indexedDB.open("coffee-timer", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("logs", { keyPath: "id" });
    r.onsuccess = () => {
      const tx = r.result.transaction("logs", "readwrite");
      tx.objectStore("logs").put(old);
      tx.oncomplete = () => {
        r.result.close();
        resolve();
      };
    };
    r.onerror = () => reject(r.error);
  });
});

describe("IndexedDB", async () => {
  const db = await import("../src/lib/db");
  const { duplicateRecipe } = await import("../src/domain/recipe");
  const { TEMPLATES } = await import("../src/domain/templates");
  const { DEFAULT_SETTINGS } = await import("../src/domain/settings");

  it("v1 で保存したログが v2 でも読める", async () => {
    expect(await db.listLogs()).toEqual([old]);
  });

  it("ログの保存・一覧（新しい順）・削除", async () => {
    const a = log("a", "2026-11-01T08:00:00.000Z");
    const b = log("b", "2026-11-03T08:00:00.000Z");
    await db.saveLog(a);
    await db.saveLog(b);
    expect(await db.listLogs()).toEqual([b, a, old]);
    await db.deleteLog("a");
    await db.deleteLog("old");
    expect(await db.listLogs()).toEqual([b]);
  });

  it("レシピの保存・削除。同梱テンプレートは保存できない", async () => {
    const r = duplicateRecipe(TEMPLATES[0], "r1");
    await db.saveRecipe(r);
    expect(await db.listRecipes()).toEqual([r]);
    await expect(db.saveRecipe(TEMPLATES[0])).rejects.toThrow();
    await db.deleteRecipe("r1");
    expect(await db.listRecipes()).toEqual([]);
  });

  it("設定：未保存なら初期値、不正な値は保存しない", async () => {
    expect(await db.loadSettings()).toEqual(DEFAULT_SETTINGS);
    await db.saveSettings({ leadSec: 3, grinder: "C40" });
    expect(await db.loadSettings()).toEqual({ leadSec: 3, grinder: "C40" });
    await expect(db.saveSettings({ leadSec: 99, grinder: "C40" })).rejects.toThrow();
  });

  it("バックアップの読み込みは id 単位で上書きし、既存データを消さない", async () => {
    const r = duplicateRecipe(TEMPLATES[0], "r2");
    const existing = log("keep", "2026-11-02T08:00:00.000Z");
    await db.saveLog(existing);
    const imported = { ...log("b", "2026-11-03T08:00:00.000Z"), memo: "上書き" };
    await db.importAll([r], [imported], DEFAULT_SETTINGS);
    expect((await db.listLogs()).map((l) => [l.id, l.memo])).toEqual([
      ["b", "上書き"],
      ["keep", ""],
    ]);
    expect(await db.listRecipes()).toEqual([r]);
    expect(await db.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
