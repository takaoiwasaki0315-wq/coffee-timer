import { LIMITS, parseNumber } from "./log";
import type { Recipe, Step, StepAction } from "./types";

// レシピ編集の入力チェック（SPEC.md §5）

export const RECIPE_LIMITS = {
  name: { maxLen: 30 },
  device: { maxLen: 30 },
  doseG: { min: 1, max: 100 },
  atSec: { max: 3600 },
  waterG: { min: 1, max: 2000 },
  text: { maxLen: 200 },
} as const;

export const ACTION_LABELS: Record<StepAction, string> = {
  switchClose: "スイッチを閉じる",
  switchOpen: "スイッチを開ける",
  pour: "注湯",
  stir: "撹拌",
  wait: "待つ",
  finish: "完了待ち",
};

/** 湯量を入力できる動作。pour は必須、スイッチ開閉は任意 */
export const usesWater = (a: StepAction) => a === "pour" || a === "switchOpen" || a === "switchClose";

export interface StepForm {
  time: string;
  action: StepAction;
  water: string;
  note: string;
}

export interface RecipeForm {
  name: string;
  device: string;
  doseG: string;
  prep: string;
  finishNote: string;
  waterTempC: string;
  grind: string;
  bypassG: string;
  steps: StepForm[];
}

export interface Issue {
  level: "error" | "warning";
  message: string;
  /** 0 始まり。レシピ全体の問題なら undefined */
  stepIndex?: number;
}

export function formatTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** "1:15" または秒数 "75" を秒にする。秒の部分は 00〜59 の2桁のみ */
export function parseTime(s: string): number | undefined {
  const t = s.trim();
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return /^\d{1,4}$/.test(t) ? Number(t) : undefined;
}

const str = (n: number | undefined) => (n === undefined ? "" : String(n));

export function toForm(r: Recipe): RecipeForm {
  return {
    name: r.name,
    device: r.device,
    doseG: String(r.doseG),
    prep: r.prep ?? "",
    finishNote: r.finishNote ?? "",
    waterTempC: str(r.defaults?.waterTempC),
    grind: str(r.defaults?.grind),
    bypassG: str(r.defaults?.bypassG),
    steps: r.steps.map((s) => ({
      time: formatTime(s.atSec),
      action: s.action,
      water: str(s.waterG),
      note: s.note ?? "",
    })),
  };
}

export const emptyStep = (time = ""): StepForm => ({ time, action: "pour", water: "", note: "" });

export function newRecipeForm(): RecipeForm {
  return {
    name: "",
    device: "",
    doseG: "15",
    prep: "",
    finishNote: "",
    waterTempC: "",
    grind: "",
    bypassG: "",
    steps: [emptyStep("0:00"), { time: "", action: "finish", water: "", note: "" }],
  };
}

/**
 * 変換済みのステップ列の検査。編集画面と JSON 読み込みの両方で使う。
 * leadSec は予告の秒数（間隔が短すぎる警告に使う）
 */
export function checkSteps(steps: Step[], leadSec: number): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string, stepIndex?: number) => issues.push({ level: "error", message, stepIndex });
  const warn = (message: string, stepIndex?: number) =>
    issues.push({ level: "warning", message, stepIndex });

  if (steps.length === 0) {
    err("ステップがありません");
    return issues;
  }
  if (steps[0].atSec !== 0) err("最初のステップは 0:00 にしてください", 0);

  const last = steps.length - 1;
  if (steps[last].action !== "finish") err("最後のステップは「完了待ち」にしてください", last);
  if (!steps.some((s) => s.waterG !== undefined)) err("湯量を指定したステップがありません");

  let lastWater: number | undefined;
  let switchState: "open" | "closed" | undefined;
  steps.forEach((s, i) => {
    if (s.action === "finish" && i !== last) err("「完了待ち」は最後のステップにだけ置けます", i);
    if (s.action === "pour" && s.waterG === undefined) err("注湯には湯量が必要です", i);

    if (i > 0) {
      const gap = s.atSec - steps[i - 1].atSec;
      if (gap <= 0) err("時刻が前のステップより後になっていません", i);
      // 完了待ちは予告しないので対象外
      else if (s.action !== "finish" && gap < leadSec)
        warn(`前のステップとの間隔が${gap}秒で、予告（${leadSec}秒前）と重なります`, i);
    }

    if (s.waterG !== undefined) {
      if (lastWater !== undefined && s.waterG < lastWater)
        err(`湯量が前のステップ（${lastWater}g）より少なくなっています。湯量は累積で入力します`, i);
      lastWater = s.waterG;
    }

    if (s.action === "switchClose" || s.action === "switchOpen") {
      const next = s.action === "switchClose" ? "closed" : "open";
      if (switchState === next)
        warn(`スイッチがすでに${next === "closed" ? "閉じて" : "開いて"}います`, i);
      switchState = next;
    }
  });
  return issues;
}

function rangeNumber(
  raw: string,
  label: string,
  { min, max }: { min: number; max: number },
  issues: Issue[],
  opts: { required: boolean; integer?: boolean; stepIndex?: number },
): number | undefined {
  if (raw.trim() === "") {
    if (opts.required) issues.push({ level: "error", message: `${label}を入力してください`, stepIndex: opts.stepIndex });
    return undefined;
  }
  const n = parseNumber(raw);
  if (n === undefined || (opts.integer && !Number.isInteger(n))) {
    issues.push({
      level: "error",
      message: `${label}は半角の${opts.integer ? "整数" : "数字"}で入力してください`,
      stepIndex: opts.stepIndex,
    });
    return undefined;
  }
  if (n < min || n > max) {
    issues.push({ level: "error", message: `${label}は${min}〜${max}の範囲で入力してください`, stepIndex: opts.stepIndex });
    return undefined;
  }
  return n;
}

export type RecipeDraft = Omit<Recipe, "id" | "builtIn">;

/** フォームを検査してレシピに変換する。エラーが1つでもあれば recipe は undefined */
export function validateRecipeForm(
  form: RecipeForm,
  leadSec: number,
): { issues: Issue[]; recipe?: RecipeDraft } {
  const issues: Issue[] = [];
  const err = (message: string, stepIndex?: number) => issues.push({ level: "error", message, stepIndex });

  const name = form.name.trim();
  if (name === "") err("レシピ名を入力してください");
  else if (name.length > RECIPE_LIMITS.name.maxLen) err(`レシピ名は${RECIPE_LIMITS.name.maxLen}文字以内にしてください`);
  const device = form.device.trim();
  if (device.length > RECIPE_LIMITS.device.maxLen) err(`器具は${RECIPE_LIMITS.device.maxLen}文字以内にしてください`);
  const prep = form.prep.trim();
  const finishNote = form.finishNote.trim();
  if (prep.length > RECIPE_LIMITS.text.maxLen) err(`準備は${RECIPE_LIMITS.text.maxLen}文字以内にしてください`);
  if (finishNote.length > RECIPE_LIMITS.text.maxLen) err(`仕上げは${RECIPE_LIMITS.text.maxLen}文字以内にしてください`);

  const doseG = rangeNumber(form.doseG, "豆量", RECIPE_LIMITS.doseG, issues, { required: true });
  const waterTempC = rangeNumber(form.waterTempC, "湯温の初期値", LIMITS.waterTempC, issues, { required: false });
  const grind = rangeNumber(form.grind, "挽目の初期値", LIMITS.grind, issues, { required: false });
  const bypassG = rangeNumber(form.bypassG, "バイパスの初期値", LIMITS.bypassG, issues, { required: false });

  // 個々の欄の形式エラーがあるステップは、並びの検査に回さない（エラーが二重に出るため）
  let stepsOk = true;
  const steps: Step[] = form.steps.map((f, i) => {
    const atSec = parseTime(f.time);
    if (atSec === undefined) {
      err("時刻は「1:15」の形式で入力してください", i);
      stepsOk = false;
    } else if (atSec > RECIPE_LIMITS.atSec.max) {
      err(`時刻は${formatTime(RECIPE_LIMITS.atSec.max)}以内にしてください`, i);
      stepsOk = false;
    }
    let waterG: number | undefined;
    if (usesWater(f.action)) {
      const before = issues.length;
      waterG = rangeNumber(f.water, "湯量", RECIPE_LIMITS.waterG, issues, {
        required: false,
        integer: true,
        stepIndex: i,
      });
      if (issues.length > before) stepsOk = false;
    }
    const note = f.note.trim();
    if (note.length > RECIPE_LIMITS.text.maxLen) err(`メモは${RECIPE_LIMITS.text.maxLen}文字以内にしてください`, i);
    return {
      atSec: atSec ?? 0,
      action: f.action,
      ...(waterG !== undefined && { waterG }),
      ...(note !== "" && { note }),
    };
  });
  if (stepsOk) issues.push(...checkSteps(steps, leadSec));

  if (issues.some((i) => i.level === "error")) return { issues };
  const defaults = {
    ...(waterTempC !== undefined && { waterTempC }),
    ...(grind !== undefined && { grind }),
    ...(bypassG !== undefined && { bypassG }),
  };
  return {
    issues,
    recipe: {
      name,
      device,
      doseG: doseG!,
      totalWaterG: Math.max(...steps.flatMap((s) => (s.waterG === undefined ? [] : [s.waterG]))),
      ...(prep !== "" && { prep }),
      ...(finishNote !== "" && { finishNote }),
      ...(Object.keys(defaults).length > 0 && { defaults }),
      steps,
    },
  };
}

/** テンプレートを複製して編集できるレシピにする */
export function duplicateRecipe(r: Recipe, newId: string): Recipe {
  return {
    ...structuredClone(r),
    id: newId,
    name: `${r.name}（コピー）`.slice(0, RECIPE_LIMITS.name.maxLen),
    builtIn: false,
  };
}
