import { fullText, preannounceText, resumeText, shortText } from "./speech";
import type { Step } from "./types";

// タイマーの合図スケジュールと進行判定（SPEC.md §4）

/** 予告の秒数の初期値（全体設定で変更可） */
export const DEFAULT_LEAD_SEC = 5;

/** 前回の tick からこれ以上空いたら中断とみなす（秒）。通常の tick は 0.1〜0.25 秒間隔 */
export const INTERRUPTION_GAP_SEC = 2;

export type Cue =
  | { kind: "preannounce"; atSec: number; stepIndex: number; text: string }
  | { kind: "beep"; atSec: number; stepIndex: number; count: 3 | 2 | 1 }
  | { kind: "go"; atSec: number; stepIndex: number; text: string };

/**
 * レシピのステップから合図の一覧を時刻順に作る。
 * - 予告は step.atSec - leadSec、3・2・1 のビープは atSec-3〜atSec-1
 * - 予告・ビープは前のステップの合図より後（かつ 0 秒以上）のときだけ出す。
 *   重なると「まもなく」が前の合図より先に聞こえて混乱するため
 * - 予告を出せなかったステップは、合図で内容をすべて読み上げる
 */
export function buildCues(steps: Step[], leadSec: number = DEFAULT_LEAD_SEC): Cue[] {
  if (!Number.isFinite(leadSec) || leadSec < 0) {
    throw new RangeError(`leadSec は 0 以上の数値: ${leadSec}`);
  }
  const cues: Cue[] = [];
  steps.forEach((step, i) => {
    const prevAt = i === 0 ? -Infinity : steps[i - 1].atSec;
    const after = (t: number) => t > prevAt && t >= 0;

    const preAt = step.atSec - leadSec;
    // 完了待ちは秒単位で合わせる動作ではないので、予告・ビープなしで内容を読み上げる
    if (step.action === "finish") {
      cues.push({ kind: "go", atSec: step.atSec, stepIndex: i, text: fullText(step) });
      return;
    }
    const hasPre = leadSec > 0 && after(preAt);
    if (hasPre) {
      cues.push({ kind: "preannounce", atSec: preAt, stepIndex: i, text: preannounceText(step) });
    }
    for (const count of [3, 2, 1] as const) {
      const t = step.atSec - count;
      // 予告より前にビープが鳴らないようにする
      if (after(t) && (!hasPre || t > preAt)) {
        cues.push({ kind: "beep", atSec: t, stepIndex: i, count });
      }
    }
    cues.push({
      kind: "go",
      atSec: step.atSec,
      stepIndex: i,
      text: hasPre ? shortText(step) : fullText(step),
    });
  });
  return cues.sort((a, b) => a.atSec - b.atSec);
}

/** 経過時間（秒）に対応する現在のステップ番号。開始前は -1 */
export function currentStepIndex(steps: Step[], elapsedSec: number): number {
  let idx = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].atSec <= elapsedSec) idx = i;
    else break;
  }
  return idx;
}

/** 次のステップまでの残り秒数。次がなければ undefined */
export function secondsToNext(steps: Step[], elapsedSec: number): number | undefined {
  const next = steps[currentStepIndex(steps, elapsedSec) + 1];
  return next === undefined ? undefined : next.atSec - elapsedSec;
}

/**
 * 経過時間は開始時刻から毎回計算する（1秒ずつ数えない）。
 * pausedMs は一時停止していた合計時間。
 */
export function elapsedSec(startMs: number, nowMs: number, pausedMs = 0): number {
  return Math.max(0, (nowMs - startMs - pausedMs) / 1000);
}

export type TickResult =
  | { kind: "cues"; cues: Cue[] }
  | { kind: "interrupted"; fromSec: number; toSec: number; stepIndex: number; text: string };

/**
 * 前回の tick（prevSec）から今回（nowSec）までに鳴らすべき合図を返す。
 * 間隔が INTERRUPTION_GAP_SEC を超えたら中断とみなし、逃した合図は流さず
 * 現在のステップだけを「いま、〜」で1回読み上げる。
 */
export function tick(cues: Cue[], steps: Step[], prevSec: number, nowSec: number): TickResult {
  if (nowSec - prevSec > INTERRUPTION_GAP_SEC) {
    const stepIndex = currentStepIndex(steps, nowSec);
    if (stepIndex >= 0) {
      return {
        kind: "interrupted",
        fromSec: prevSec,
        toSec: nowSec,
        stepIndex,
        text: resumeText(steps[stepIndex]),
      };
    }
  }
  // 開始直後（prevSec = 0, nowSec ≒ 0.1）に 0:00 の合図を拾うため、初回は prevSec < 0 で呼ぶ
  return { kind: "cues", cues: cues.filter((c) => c.atSec > prevSec && c.atSec <= nowSec) };
}
