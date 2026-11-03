import { describe, expect, it } from "vitest";
import { fullText, preannounceText, resumeText, shortText } from "../src/domain/speech";
import type { Step } from "../src/domain/types";

describe("読み上げ文", () => {
  it.each<[Step, string, string]>([
    [{ atSec: 0, action: "switchClose", waterG: 150 }, "スイッチを閉じて、150グラムまで", "閉じる"],
    [{ atSec: 0, action: "switchClose" }, "スイッチを閉じる", "閉じる"],
    [{ atSec: 0, action: "switchOpen", waterG: 250 }, "スイッチを開けて、250グラムまで", "開ける"],
    [{ atSec: 0, action: "switchOpen" }, "スイッチを開ける", "開ける"],
    [{ atSec: 0, action: "pour", waterG: 90 }, "90グラムまで注ぐ", "注ぐ"],
    [{ atSec: 0, action: "pour" }, "注ぐ", "注ぐ"],
    [{ atSec: 0, action: "stir" }, "撹拌", "撹拌"],
    [{ atSec: 0, action: "wait" }, "待つ", "待つ"],
    [{ atSec: 0, action: "finish" }, "終わったら、完了をタップ", "完了待ち"],
  ])("%o", (step, full, short) => {
    expect(fullText(step)).toBe(full);
    expect(shortText(step)).toBe(short);
  });

  it("メモは読み上げに含めない", () => {
    const step: Step = { atSec: 0, action: "switchOpen", note: "約10秒透過" };
    expect(fullText(step)).not.toContain("透過");
  });

  it("予告・再開の前置き", () => {
    const step: Step = { atSec: 0, action: "switchOpen" };
    expect(preannounceText(step)).toBe("まもなく、スイッチを開ける");
    expect(resumeText(step)).toBe("いま、スイッチを開ける");
  });
});
