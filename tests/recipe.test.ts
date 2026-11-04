import { describe, expect, it } from "vitest";
import {
  checkSteps,
  duplicateRecipe,
  newRecipeForm,
  parseTime,
  toForm,
  validateRecipeForm,
  type RecipeForm,
  type StepForm,
} from "../src/domain/recipe";
import { TEMPLATES } from "../src/domain/templates";
import type { Step } from "../src/domain/types";

const template = TEMPLATES.find((t) => t.id === "switch-hybrid")!;

describe("parseTime", () => {
  it.each([
    ["0:00", 0],
    ["0:45", 45],
    ["1:15", 75],
    ["10:00", 600],
    [" 1:05 ", 65],
    ["75", 75],
    ["0", 0],
  ])("%s → %s秒", (s, n) => expect(parseTime(s)).toBe(n));

  it.each(["", "1:5", "1:60", "1:15:00", "-1", "1.5", "a", "１:１５", "100:00"])("%s は不可", (s) => {
    expect(parseTime(s)).toBeUndefined();
  });
});

describe("toForm → validateRecipeForm", () => {
  it("テンプレートをフォームにして戻すと同じ内容になる", () => {
    const { issues, recipe } = validateRecipeForm(toForm(template), 5);
    expect(issues).toEqual([]);
    const { id: _id, builtIn: _b, source: _s, ...rest } = template;
    expect(recipe).toEqual(rest);
  });

  it("注湯合計は最大の累積湯量から自動で決まる", () => {
    const f = toForm(template);
    f.steps[3].water = "260";
    expect(validateRecipeForm(f, 5).recipe?.totalWaterG).toBe(260);
  });

  it("新規フォームは未入力のままだとエラー", () => {
    const { issues, recipe } = validateRecipeForm(newRecipeForm(), 5);
    expect(recipe).toBeUndefined();
    expect(issues.map((i) => i.message)).toEqual(
      expect.arrayContaining(["レシピ名を入力してください"]),
    );
  });

  it("湯量を使わない動作では湯量欄を無視する", () => {
    const f = toForm(template);
    f.steps[1].water = "abc"; // スイッチを開ける…は湯量任意なのでエラー
    expect(validateRecipeForm(f, 5).recipe).toBeUndefined();
    f.steps[1] = { ...f.steps[1], action: "wait", water: "abc" };
    expect(validateRecipeForm(f, 5).recipe?.steps[1]).toEqual({ atSec: 45, action: "wait", note: "約10秒透過" });
  });
});

describe("validateRecipeForm のエラー", () => {
  const base = (): RecipeForm => toForm(template);
  const errorsOf = (f: RecipeForm) =>
    validateRecipeForm(f, 5).issues.filter((i) => i.level === "error");
  const withStep = (i: number, p: Partial<StepForm>) => {
    const f = base();
    f.steps[i] = { ...f.steps[i], ...p };
    return f;
  };

  it.each<[string, RecipeForm, number | undefined]>([
    ["名前が空", { ...base(), name: " " }, undefined],
    ["名前が長すぎ", { ...base(), name: "あ".repeat(31) }, undefined],
    ["豆量が範囲外", { ...base(), doseG: "0" }, undefined],
    ["豆量が空", { ...base(), doseG: "" }, undefined],
    ["湯温の初期値が範囲外", { ...base(), waterTempC: "120" }, undefined],
    ["時刻の形式", withStep(1, { time: "0:4" }), 1],
    ["時刻が前より前", withStep(2, { time: "0:40" }), 2],
    ["時刻が前と同じ", withStep(2, { time: "0:45" }), 2],
    ["最初が0:00でない", withStep(0, { time: "0:05" }), 0],
    ["湯量が減る", withStep(2, { water: "80" }), 2],
    ["湯量が小数", withStep(2, { water: "150.5" }), 2],
    ["湯量が範囲外", withStep(2, { water: "2001" }), 2],
    ["注湯に湯量がない", withStep(2, { action: "pour", water: "" }), 2],
    ["最後が完了待ちでない", withStep(4, { action: "wait" }), 4],
    ["途中に完了待ち", withStep(1, { action: "finish" }), 1],
  ])("%s", (_, f, stepIndex) => {
    const errs = errorsOf(f);
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0].stepIndex).toBe(stepIndex);
  });

  it("ステップが空", () => {
    expect(errorsOf({ ...base(), steps: [] }).map((i) => i.message)).toEqual(["ステップがありません"]);
  });
});

describe("checkSteps の警告", () => {
  const steps: Step[] = [
    { atSec: 0, action: "switchClose", waterG: 90 },
    { atSec: 45, action: "switchOpen" },
    { atSec: 48, action: "pour", waterG: 150 },
    { atSec: 60, action: "switchOpen" },
    { atSec: 62, action: "finish" },
  ];
  const warnings = checkSteps(steps, 5).filter((i) => i.level === "warning");

  it("予告秒数より短い間隔は警告（完了待ちは対象外）", () => {
    expect(warnings.filter((w) => w.message.includes("間隔")).map((w) => w.stepIndex)).toEqual([2]);
  });

  it("スイッチの開閉順の不整合は警告", () => {
    expect(warnings.filter((w) => w.message.includes("スイッチ")).map((w) => w.stepIndex)).toEqual([3]);
  });

  it("警告だけならエラーにならない", () => {
    expect(checkSteps(steps, 5).every((i) => i.level === "warning")).toBe(true);
  });

  it("予告0秒なら間隔の警告は出ない", () => {
    expect(checkSteps(steps, 0).some((w) => w.message.includes("間隔"))).toBe(false);
  });

  it("同梱テンプレートは警告もない", () => {
    expect(checkSteps(template.steps, 5)).toEqual([]);
  });
});

describe("duplicateRecipe", () => {
  it("id・名前・builtIn を変え、元のテンプレートを変更しない", () => {
    const copy = duplicateRecipe(template, "new-id");
    expect(copy).toMatchObject({ id: "new-id", name: "スイッチ ハイブリッド（コピー）", builtIn: false });
    copy.steps[0].waterG = 999;
    expect(template.steps[0].waterG).toBe(90);
  });
});
