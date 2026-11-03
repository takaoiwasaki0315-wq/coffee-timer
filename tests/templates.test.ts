import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../src/domain/templates";

describe("同梱テンプレート", () => {
  for (const r of TEMPLATES) {
    describe(r.name, () => {
      it("時刻が単調増加する", () => {
        for (let i = 1; i < r.steps.length; i++) {
          expect(r.steps[i].atSec).toBeGreaterThan(r.steps[i - 1].atSec);
        }
      });

      it("累積湯量が減らず、最後の注湯が注湯合計と一致する", () => {
        const waters = r.steps.flatMap((s) => (s.waterG === undefined ? [] : [s.waterG]));
        for (let i = 1; i < waters.length; i++) {
          expect(waters[i]).toBeGreaterThanOrEqual(waters[i - 1]);
        }
        expect(waters.at(-1)).toBe(r.totalWaterG);
      });

      it("最後のステップが完了待ち", () => {
        expect(r.steps.at(-1)?.action).toBe("finish");
      });
    });
  }

  it("スイッチ ハイブリッドの各時刻・湯量が仕様どおり", () => {
    const r = TEMPLATES.find((t) => t.id === "switch-hybrid")!;
    expect(r.steps.map((s) => [s.atSec, s.action, s.waterG])).toEqual([
      [0, "switchClose", 90],
      [45, "switchOpen", undefined],
      [55, "switchClose", 150],
      [75, "switchOpen", 250],
      [90, "finish", undefined],
    ]);
  });
});
