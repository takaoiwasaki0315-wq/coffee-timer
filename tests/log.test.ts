import { describe, expect, it } from "vitest";
import {
  daysSinceRoast,
  initialForm,
  parseLocalDate,
  validateLogForm,
  type LogForm,
} from "../src/domain/log";
import { TEMPLATES } from "../src/domain/templates";
import type { BrewLog, Recipe } from "../src/domain/types";

const recipe = TEMPLATES.find((t) => t.id === "switch-hybrid")!;
const other: Recipe = { ...recipe, id: "other", defaults: undefined };

const log = (p: Partial<BrewLog>): BrewLog => ({
  id: "x",
  recipeId: recipe.id,
  recipeName: recipe.name,
  brewedAt: "2026-11-01T08:00:00.000Z",
  beanName: "エチオピア",
  roastLevel: "light",
  roastDate: "2026-10-20",
  grinder: "TIMEMORE S5",
  grind: 6.5,
  waterTempC: 86,
  bypassG: 40,
  totalSec: 150,
  rating: 4,
  memo: "",
  interrupted: false,
  ...p,
});

const valid: LogForm = {
  beanName: "エチオピア",
  roastLevel: "light",
  roastDate: "2026-10-20",
  grind: "6.5",
  waterTempC: "86",
  bypassG: "40",
  rating: 4,
  memo: "",
};
const today = new Date(2026, 10, 4, 9, 0); // 2026-11-04 ローカル

describe("initialForm", () => {
  it("ログがなければレシピの初期値（86℃・6.5・40g）", () => {
    expect(initialForm(recipe, [])).toEqual({
      beanName: "",
      roastLevel: "",
      roastDate: "",
      grind: "6.5",
      waterTempC: "86",
      bypassG: "40",
      rating: 0,
      memo: "",
    });
  });

  it("レシピの初期値もなければ空欄", () => {
    const f = initialForm(other, []);
    expect([f.grind, f.waterTempC, f.bypassG]).toEqual(["", "", ""]);
  });

  it("同じレシピの直近ログの挽目・湯温・バイパスを使う", () => {
    const logs = [
      log({ brewedAt: "2026-11-01T08:00:00Z", grind: 6.5, waterTempC: 86 }),
      log({ brewedAt: "2026-11-03T08:00:00Z", grind: 7, waterTempC: 88, bypassG: 30 }),
      log({ brewedAt: "2026-11-02T08:00:00Z", grind: 5, waterTempC: 90 }),
    ];
    const f = initialForm(recipe, logs);
    expect([f.grind, f.waterTempC, f.bypassG]).toEqual(["7", "88", "30"]);
  });

  it("豆の情報はレシピを問わず直近、挽目は同じレシピの直近", () => {
    const logs = [
      log({ brewedAt: "2026-11-01T08:00:00Z", grind: 6 }),
      log({ recipeId: "other", brewedAt: "2026-11-03T08:00:00Z", beanName: "ケニア", grind: 20 }),
    ];
    const f = initialForm(recipe, logs);
    expect(f.beanName).toBe("ケニア");
    expect(f.grind).toBe("6");
  });

  it("評価とメモは毎回空", () => {
    const f = initialForm(recipe, [log({ rating: 5, memo: "おいしい" })]);
    expect([f.rating, f.memo]).toEqual([0, ""]);
  });
});

describe("parseLocalDate / daysSinceRoast", () => {
  it("存在しない日付・形式違いは undefined", () => {
    for (const s of ["2026-02-30", "2026-13-01", "2026/11/01", "20261101", ""]) {
      expect(parseLocalDate(s)).toBeUndefined();
    }
    expect(parseLocalDate("2024-02-29")).toBeDefined();
  });

  it.each([
    ["2026-11-04", 0],
    ["2026-11-03", 1],
    ["2026-10-20", 15],
    ["2026-10-04", 31],
    ["2026-11-05", -1],
  ])("焙煎日 %s → %s日目", (d, n) => {
    expect(daysSinceRoast(d, today)).toBe(n);
  });

  it("時刻に関係なく日付で数える", () => {
    expect(daysSinceRoast("2026-11-03", new Date(2026, 10, 4, 0, 1))).toBe(1);
    expect(daysSinceRoast("2026-11-03", new Date(2026, 10, 4, 23, 59))).toBe(1);
  });
});

describe("validateLogForm", () => {
  it("正しい入力は数値に変換される", () => {
    expect(validateLogForm({ ...valid, beanName: "  エチオピア ", memo: " 甘い " }, today)).toEqual({
      ok: true,
      value: {
        beanName: "エチオピア",
        roastLevel: "light",
        roastDate: "2026-10-20",
        grind: 6.5,
        waterTempC: 86,
        bypassG: 40,
        rating: 4,
        memo: "甘い",
      },
    });
  });

  it("焙煎度・焙煎日は省略できる", () => {
    const r = validateLogForm({ ...valid, roastLevel: "", roastDate: "" }, today);
    expect(r.ok && [r.value.roastLevel, r.value.roastDate]).toEqual([undefined, undefined]);
  });

  const errorOf = (p: Partial<LogForm>) => {
    const r = validateLogForm({ ...valid, ...p }, today);
    return r.ok ? undefined : r.errors;
  };

  it.each<[Partial<LogForm>, keyof LogForm]>([
    [{ beanName: "  " }, "beanName"],
    [{ beanName: "あ".repeat(51) }, "beanName"],
    [{ roastDate: "2026-11-05" }, "roastDate"],
    [{ roastDate: "2026-02-30" }, "roastDate"],
    [{ grind: "" }, "grind"],
    [{ grind: "6." }, "grind"],
    [{ grind: "-1" }, "grind"],
    [{ grind: "1e1" }, "grind"],
    [{ grind: "６．５" }, "grind"],
    [{ grind: "100.1" }, "grind"],
    [{ waterTempC: "69" }, "waterTempC"],
    [{ waterTempC: "101" }, "waterTempC"],
    [{ bypassG: "201" }, "bypassG"],
    [{ rating: 0 }, "rating"],
    [{ rating: 6 }, "rating"],
    [{ rating: 2.5 }, "rating"],
    [{ memo: "あ".repeat(501) }, "memo"],
  ])("%o はエラー（%s）", (p, field) => {
    expect(Object.keys(errorOf(p) ?? {})).toEqual([field]);
  });

  it.each<Partial<LogForm>>([
    { grind: "0" },
    { grind: "100" },
    { waterTempC: "70" },
    { waterTempC: "100" },
    { bypassG: "0" },
    { bypassG: "200" },
    { roastDate: "2026-11-04" },
    { beanName: "あ".repeat(50) },
  ])("境界値 %o は通る", (p) => {
    expect(errorOf(p)).toBeUndefined();
  });

  it("複数のエラーをまとめて返す", () => {
    expect(Object.keys(errorOf({ beanName: "", rating: 0, waterTempC: "50" }) ?? {}).sort()).toEqual(
      ["beanName", "rating", "waterTempC"].sort(),
    );
  });
});
