import { describe, expect, it } from "vitest";
import {
  buildCues,
  currentStepIndex,
  elapsedSec,
  INTERRUPTION_GAP_SEC,
  secondsToNext,
  tick,
  type Cue,
} from "../src/domain/schedule";
import { TEMPLATES } from "../src/domain/templates";
import type { Step } from "../src/domain/types";

const switchHybrid = TEMPLATES.find((t) => t.id === "switch-hybrid")!.steps;
const summarize = (cues: Cue[]) =>
  cues.map((c) => [c.atSec, c.kind, c.kind === "beep" ? c.count : c.text]);

describe("buildCues", () => {
  it("スイッチ ハイブリッドの合図一覧（予告5秒）", () => {
    expect(summarize(buildCues(switchHybrid, 5))).toEqual([
      [0, "go", "スイッチを閉じて、90グラムまで"],
      [40, "preannounce", "まもなく、スイッチを開ける"],
      [42, "beep", 3],
      [43, "beep", 2],
      [44, "beep", 1],
      [45, "go", "開ける"],
      [50, "preannounce", "まもなく、スイッチを閉じて、150グラムまで"],
      [52, "beep", 3],
      [53, "beep", 2],
      [54, "beep", 1],
      [55, "go", "閉じる"],
      [70, "preannounce", "まもなく、スイッチを開けて、250グラムまで"],
      [72, "beep", 3],
      [73, "beep", 2],
      [74, "beep", 1],
      [75, "go", "開ける"],
      [90, "go", "終わったら、完了をタップ"],
    ]);
  });

  it("前のステップとの間隔が予告秒数以下なら予告を省き、合図で内容をすべて読む", () => {
    const steps: Step[] = [
      { atSec: 0, action: "pour", waterG: 50 },
      { atSec: 4, action: "pour", waterG: 100 },
    ];
    expect(summarize(buildCues(steps, 5))).toEqual([
      [0, "go", "50グラムまで注ぐ"],
      [1, "beep", 3],
      [2, "beep", 2],
      [3, "beep", 1],
      [4, "go", "100グラムまで注ぐ"],
    ]);
  });

  it("前のステップと同時刻のビープ・予告は出さない", () => {
    const steps: Step[] = [
      { atSec: 0, action: "pour", waterG: 50 },
      { atSec: 2, action: "stir" },
    ];
    const cues = buildCues(steps, 5);
    expect(cues.filter((c) => c.atSec === 0)).toHaveLength(1);
    expect(summarize(cues)).toEqual([
      [0, "go", "50グラムまで注ぐ"],
      [1, "beep", 1],
      [2, "go", "撹拌"],
    ]);
  });

  it("予告秒数が3秒未満ならビープは予告より後だけ鳴る", () => {
    const steps: Step[] = [
      { atSec: 0, action: "pour", waterG: 50 },
      { atSec: 30, action: "wait" },
    ];
    expect(summarize(buildCues(steps, 2)).slice(1)).toEqual([
      [28, "preannounce", "まもなく、待つ"],
      [29, "beep", 1],
      [30, "go", "待つ"],
    ]);
  });

  it("予告0秒なら予告なし・合図で全文", () => {
    const steps: Step[] = [
      { atSec: 0, action: "pour", waterG: 50 },
      { atSec: 30, action: "pour", waterG: 100 },
    ];
    const cues = buildCues(steps, 0);
    expect(cues.some((c) => c.kind === "preannounce")).toBe(false);
    expect(cues.at(-1)).toMatchObject({ kind: "go", text: "100グラムまで注ぐ" });
  });

  it("不正な予告秒数はエラー", () => {
    expect(() => buildCues(switchHybrid, -1)).toThrow(RangeError);
    expect(() => buildCues(switchHybrid, NaN)).toThrow(RangeError);
  });

  it("合図は時刻順に並ぶ", () => {
    const at = buildCues(switchHybrid).map((c) => c.atSec);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });
});

describe("currentStepIndex / secondsToNext", () => {
  it.each([
    [0, 0, 45],
    [44.9, 0, 0.1],
    [45, 1, 10],
    [54.5, 1, 0.5],
    [55, 2, 20],
    [75, 3, 15],
    [89.9, 3, 0.1],
    [90, 4, undefined],
    [300, 4, undefined],
  ])("%s秒 → ステップ%s、次まで%s秒", (t, idx, next) => {
    expect(currentStepIndex(switchHybrid, t)).toBe(idx);
    const s = secondsToNext(switchHybrid, t);
    if (next === undefined) expect(s).toBeUndefined();
    else expect(s).toBeCloseTo(next);
  });

  it("開始前は -1", () => {
    expect(currentStepIndex([{ atSec: 5, action: "wait" }], 1)).toBe(-1);
  });
});

describe("elapsedSec", () => {
  it("開始時刻からの差で計算する", () => {
    expect(elapsedSec(1_000, 46_000)).toBe(45);
  });
  it("一時停止の合計時間を差し引く", () => {
    expect(elapsedSec(1_000, 46_000, 10_000)).toBe(35);
  });
  it("時計が巻き戻っても負にならない", () => {
    expect(elapsedSec(10_000, 5_000)).toBe(0);
  });
});

describe("tick", () => {
  const cues = buildCues(switchHybrid, 5);

  it("初回（prevSec < 0）で 0:00 の合図を拾う", () => {
    const r = tick(cues, switchHybrid, -1, 0.1);
    expect(r).toEqual({ kind: "cues", cues: [cues[0]] });
  });

  it("区間 (prev, now] の合図だけを返し、同じ合図を二度鳴らさない", () => {
    const a = tick(cues, switchHybrid, 39.9, 40.1);
    const b = tick(cues, switchHybrid, 40.1, 40.3);
    expect(a.kind === "cues" && a.cues.map((c) => c.kind)).toEqual(["preannounce"]);
    expect(b).toEqual({ kind: "cues", cues: [] });
  });

  it("中断から戻ったら逃した合図は流さず、現在のステップを1回だけ読む", () => {
    const r = tick(cues, switchHybrid, 38, 52);
    expect(r).toEqual({
      kind: "interrupted",
      fromSec: 38,
      toSec: 52,
      stepIndex: 1,
      text: "いま、スイッチを開ける",
    });
  });

  it("閾値ちょうどの間隔は中断扱いしない", () => {
    const r = tick(cues, switchHybrid, 40, 40 + INTERRUPTION_GAP_SEC);
    expect(r.kind).toBe("cues");
  });
});
