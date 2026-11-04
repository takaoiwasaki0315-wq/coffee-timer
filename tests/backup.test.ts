import { describe, expect, it } from "vitest";
import { makeBackup, parseBackup } from "../src/domain/backup";
import { duplicateRecipe } from "../src/domain/recipe";
import { DEFAULT_SETTINGS } from "../src/domain/settings";
import { TEMPLATES } from "../src/domain/templates";
import type { BrewLog } from "../src/domain/types";

const recipe = duplicateRecipe(TEMPLATES[0], "r1");
const log: BrewLog = {
  id: "l1",
  recipeId: "r1",
  recipeName: recipe.name,
  brewedAt: "2026-11-03T08:00:00.000Z",
  beanName: "エチオピア",
  roastLevel: "light",
  roastDate: "2026-10-20",
  grinder: "TIMEMORE S5",
  grind: 6.5,
  waterTempC: 86,
  bypassG: 40,
  totalSec: 151.2,
  rating: 4,
  memo: "甘い",
  interrupted: false,
};
const now = new Date("2026-11-04T00:00:00Z");
const backup = makeBackup([...TEMPLATES, recipe], [log], DEFAULT_SETTINGS, now);
const json = JSON.stringify(backup);

describe("バックアップ", () => {
  it("同梱テンプレートは書き出さない", () => {
    expect(backup.recipes.map((r) => r.id)).toEqual(["r1"]);
  });

  it("書き出し → 読み込みで内容が変わらない", () => {
    expect(parseBackup(json)).toEqual({ ok: true, backup: JSON.parse(json) });
  });

  const mutate = (fn: (b: any) => void) => {
    const b = JSON.parse(json);
    fn(b);
    return parseBackup(JSON.stringify(b));
  };

  it.each<[string, (b: any) => void]>([
    ["形式名が違う", (b) => (b.format = "other")],
    ["バージョンが違う", (b) => (b.version = 2)],
    ["ログの評価が範囲外", (b) => (b.logs[0].rating = 6)],
    ["ログの湯温が文字列", (b) => (b.logs[0].waterTempC = "86")],
    ["ログの日時が不正", (b) => (b.logs[0].brewedAt = "yesterday")],
    ["ログの項目が欠けている", (b) => delete b.logs[0].interrupted],
    ["レシピの時刻が逆順", (b) => (b.recipes[0].steps[2].atSec = 10)],
    ["レシピの注湯合計が不一致", (b) => (b.recipes[0].totalWaterG = 300)],
    ["レシピの動作が不明", (b) => (b.recipes[0].steps[1].action = "jump")],
    ["テンプレート扱いのレシピ", (b) => (b.recipes[0].builtIn = true)],
    ["設定の予告秒数が範囲外", (b) => (b.settings.leadSec = 11)],
  ])("%s は読み込まない", (_, fn) => {
    expect(mutate(fn).ok).toBe(false);
  });

  it("JSON でないファイル", () => {
    expect(parseBackup("not json")).toEqual({ ok: false, error: "JSON として読めないファイルです" });
  });
});
