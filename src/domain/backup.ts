import { LIMITS } from "./log";
import { checkSteps, RECIPE_LIMITS } from "./recipe";
import { isValidSettings, type Settings } from "./settings";
import type { BrewLog, Recipe, Step, StepAction } from "./types";

// JSON での書き出し・読み込み（SPEC.md §1）。読み込みは既存データに id 単位で上書き追加し、削除はしない

export const BACKUP_FORMAT = "coffee-timer-backup";
export const BACKUP_VERSION = 1;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  /** 自作レシピのみ（同梱テンプレートは含めない） */
  recipes: Recipe[];
  logs: BrewLog[];
  settings: Settings;
}

export function makeBackup(recipes: Recipe[], logs: BrewLog[], settings: Settings, now: Date): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    recipes: recipes.filter((r) => !r.builtIn),
    logs,
    settings,
  };
}

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const isStr = (x: unknown, maxLen = Infinity): x is string => typeof x === "string" && x.length <= maxLen;
const inRange = (x: unknown, min: number, max: number): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
const optional = (x: unknown, check: (v: unknown) => boolean) => x === undefined || check(x);

const ACTIONS: StepAction[] = ["pour", "wait", "stir", "switchClose", "switchOpen", "finish"];

function isStep(x: unknown): x is Step {
  return (
    isObj(x) &&
    Number.isInteger(x.atSec) &&
    inRange(x.atSec, 0, RECIPE_LIMITS.atSec.max) &&
    ACTIONS.includes(x.action as StepAction) &&
    optional(x.waterG, (v) => Number.isInteger(v) && inRange(v, RECIPE_LIMITS.waterG.min, RECIPE_LIMITS.waterG.max)) &&
    optional(x.note, (v) => isStr(v, RECIPE_LIMITS.text.maxLen))
  );
}

function isRecipe(x: unknown): x is Recipe {
  if (!isObj(x)) return false;
  const d = x.defaults;
  const ok =
    isStr(x.id) &&
    x.id !== "" &&
    isStr(x.name, RECIPE_LIMITS.name.maxLen) &&
    x.name.trim() !== "" &&
    isStr(x.device, RECIPE_LIMITS.device.maxLen) &&
    inRange(x.doseG, RECIPE_LIMITS.doseG.min, RECIPE_LIMITS.doseG.max) &&
    inRange(x.totalWaterG, RECIPE_LIMITS.waterG.min, RECIPE_LIMITS.waterG.max) &&
    optional(x.prep, (v) => isStr(v, RECIPE_LIMITS.text.maxLen)) &&
    optional(x.finishNote, (v) => isStr(v, RECIPE_LIMITS.text.maxLen)) &&
    optional(x.source, (v) => isStr(v)) &&
    x.builtIn === false &&
    optional(
      d,
      (v) =>
        isObj(v) &&
        optional(v.waterTempC, (t) => inRange(t, LIMITS.waterTempC.min, LIMITS.waterTempC.max)) &&
        optional(v.grind, (g) => inRange(g, LIMITS.grind.min, LIMITS.grind.max)) &&
        optional(v.bypassG, (b) => inRange(b, LIMITS.bypassG.min, LIMITS.bypassG.max)),
    ) &&
    Array.isArray(x.steps) &&
    x.steps.every(isStep);
  if (!ok) return false;
  const steps = x.steps as Step[];
  // 並びの整合性（警告は許容、エラーは不可）と注湯合計の一致
  const maxWater = Math.max(...steps.flatMap((s) => (s.waterG === undefined ? [] : [s.waterG])));
  return checkSteps(steps, 0).every((i) => i.level !== "error") && x.totalWaterG === maxWater;
}

function isLog(x: unknown): x is BrewLog {
  return (
    isObj(x) &&
    isStr(x.id) &&
    x.id !== "" &&
    isStr(x.recipeId) &&
    isStr(x.recipeName) &&
    isStr(x.brewedAt) &&
    !Number.isNaN(Date.parse(x.brewedAt)) &&
    isStr(x.beanName, LIMITS.beanName.maxLen) &&
    optional(x.roastLevel, (v) => v === "light" || v === "medium" || v === "dark") &&
    optional(x.roastDate, (v) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)) &&
    isStr(x.grinder) &&
    inRange(x.grind, LIMITS.grind.min, LIMITS.grind.max) &&
    inRange(x.waterTempC, LIMITS.waterTempC.min, LIMITS.waterTempC.max) &&
    inRange(x.bypassG, LIMITS.bypassG.min, LIMITS.bypassG.max) &&
    inRange(x.totalSec, 0, 24 * 3600) &&
    Number.isInteger(x.rating) &&
    inRange(x.rating, 1, 5) &&
    isStr(x.memo, LIMITS.memo.maxLen) &&
    typeof x.interrupted === "boolean"
  );
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

/** 1件でも不正なデータがあれば全体を読み込まない（中途半端に取り込まない） */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON として読めないファイルです" };
  }
  if (!isObj(data) || data.format !== BACKUP_FORMAT)
    return { ok: false, error: "このアプリのバックアップファイルではありません" };
  if (data.version !== BACKUP_VERSION)
    return { ok: false, error: `対応していないバージョンです（${String(data.version)}）` };
  if (!Array.isArray(data.recipes) || !Array.isArray(data.logs))
    return { ok: false, error: "ファイルの形式が正しくありません" };
  const badRecipe = data.recipes.findIndex((r) => !isRecipe(r));
  if (badRecipe >= 0) return { ok: false, error: `レシピ ${badRecipe + 1} 件目の内容が正しくありません` };
  const badLog = data.logs.findIndex((l) => !isLog(l));
  if (badLog >= 0) return { ok: false, error: `ログ ${badLog + 1} 件目の内容が正しくありません` };
  if (!isValidSettings(data.settings)) return { ok: false, error: "設定の内容が正しくありません" };
  return { ok: true, backup: data as unknown as Backup };
}
