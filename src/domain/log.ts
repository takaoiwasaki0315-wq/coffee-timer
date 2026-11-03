import type { BrewLog, Recipe, RoastLevel } from "./types";

// ログ入力フォームの初期値・入力チェック・焙煎後日数（SPEC.md §2）

export const DEFAULT_GRINDER = "TIMEMORE S5";

/** 入力範囲。範囲外は保存させない */
export const LIMITS = {
  beanName: { maxLen: 50 },
  grind: { min: 0, max: 100 },
  waterTempC: { min: 70, max: 100 },
  bypassG: { min: 0, max: 200 },
  memo: { maxLen: 500 },
} as const;

/** フォームの入力値（文字列のまま持ち、保存時に検証する） */
export interface LogForm {
  beanName: string;
  roastLevel: "" | RoastLevel;
  roastDate: string;
  grind: string;
  waterTempC: string;
  bypassG: string;
  /** 0 は未選択 */
  rating: number;
  memo: string;
}

export type LogFields = Omit<
  BrewLog,
  "id" | "recipeId" | "recipeName" | "brewedAt" | "totalSec" | "interrupted" | "grinder"
>;

export type ValidationResult =
  | { ok: true; value: LogFields }
  | { ok: false; errors: Partial<Record<keyof LogForm, string>> };

const newest = (logs: BrewLog[]) =>
  logs.reduce<BrewLog | undefined>((a, b) => (a === undefined || b.brewedAt > a.brewedAt ? b : a), undefined);

/**
 * 前回の値を初期値にする。
 * - 豆の情報：レシピを問わず直近のログ（同じ豆を別レシピで淹れることが多いため）
 * - 挽目・湯温・バイパス：同じレシピの直近のログ → なければレシピの初期値
 * - 評価・メモは毎回空
 */
export function initialForm(recipe: Recipe, logs: BrewLog[]): LogForm {
  const lastAny = newest(logs);
  const lastSame = newest(logs.filter((l) => l.recipeId === recipe.id));
  const str = (n: number | undefined) => (n === undefined ? "" : String(n));
  return {
    beanName: lastAny?.beanName ?? "",
    roastLevel: lastAny?.roastLevel ?? "",
    roastDate: lastAny?.roastDate ?? "",
    grind: str(lastSame?.grind ?? recipe.defaults?.grind),
    waterTempC: str(lastSame?.waterTempC ?? recipe.defaults?.waterTempC),
    bypassG: str(lastSame?.bypassG ?? recipe.defaults?.bypassG),
    rating: 0,
    memo: "",
  };
}

/** 半角の非負数のみ受け付ける（"6.5" "86"）。"6." "-1" "1e2" などは不可 */
function parseNumber(s: string): number | undefined {
  const t = s.trim();
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : undefined;
}

/** YYYY-MM-DD を端末ローカルの日付として解釈する。存在しない日付は undefined */
export function parseLocalDate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
    ? date
    : undefined;
}

const dayNumber = (d: Date) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);

/** 焙煎日から抽出日までの日数（ローカル日付で数える。焙煎当日は 0） */
export function daysSinceRoast(roastDate: string, brewedAt: Date): number | undefined {
  const r = parseLocalDate(roastDate);
  return r === undefined ? undefined : dayNumber(brewedAt) - dayNumber(r);
}

function checkRange(
  label: string,
  raw: string,
  { min, max }: { min: number; max: number },
  unit: string,
): { value?: number; error?: string } {
  if (raw.trim() === "") return { error: `${label}を入力してください` };
  const n = parseNumber(raw);
  if (n === undefined) return { error: `${label}は半角の数字で入力してください` };
  if (n < min || n > max) return { error: `${label}は${min}〜${max}${unit}の範囲で入力してください` };
  return { value: n };
}

export function validateLogForm(form: LogForm, today: Date): ValidationResult {
  const errors: Partial<Record<keyof LogForm, string>> = {};

  const beanName = form.beanName.trim();
  if (beanName === "") errors.beanName = "豆の名前を入力してください";
  else if (beanName.length > LIMITS.beanName.maxLen)
    errors.beanName = `豆の名前は${LIMITS.beanName.maxLen}文字以内にしてください`;

  let roastDate: string | undefined;
  if (form.roastDate !== "") {
    const days = daysSinceRoast(form.roastDate, today);
    if (days === undefined) errors.roastDate = "焙煎日の形式が正しくありません";
    else if (days < 0) errors.roastDate = "焙煎日が未来の日付になっています";
    else roastDate = form.roastDate;
  }

  const grind = checkRange("挽目", form.grind, LIMITS.grind, "");
  const temp = checkRange("湯温", form.waterTempC, LIMITS.waterTempC, "℃");
  const bypass = checkRange("バイパス量", form.bypassG, LIMITS.bypassG, "g");
  if (grind.error) errors.grind = grind.error;
  if (temp.error) errors.waterTempC = temp.error;
  if (bypass.error) errors.bypassG = bypass.error;

  if (!Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5)
    errors.rating = "評価を選んでください";

  const memo = form.memo.trim();
  if (memo.length > LIMITS.memo.maxLen) errors.memo = `メモは${LIMITS.memo.maxLen}文字以内にしてください`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      beanName,
      roastLevel: form.roastLevel === "" ? undefined : form.roastLevel,
      roastDate,
      grind: grind.value!,
      waterTempC: temp.value!,
      bypassG: bypass.value!,
      rating: form.rating,
      memo,
    },
  };
}
