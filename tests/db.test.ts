import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { deleteLog, listLogs, saveLog } from "../src/lib/db";
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

describe("ログの保存", () => {
  it("保存・一覧（新しい順）・削除で値が変わらない", async () => {
    const a = log("a", "2026-11-01T08:00:00.000Z");
    const b = log("b", "2026-11-03T08:00:00.000Z");
    await saveLog(a);
    await saveLog(b);
    expect(await listLogs()).toEqual([b, a]);
    await deleteLog("a");
    expect(await listLogs()).toEqual([b]);
  });
});
