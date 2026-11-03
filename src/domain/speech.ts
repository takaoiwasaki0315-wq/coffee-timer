import type { Step } from "./types";

// 読み上げ文の生成（SPEC.md §4）。メモは読み上げない。

/** ステップの内容をすべて伝える文。例：「スイッチを閉じて、150グラムまで」 */
export function fullText(step: Step): string {
  const water = step.waterG === undefined ? undefined : `${step.waterG}グラムまで`;
  switch (step.action) {
    case "switchClose":
      return water ? `スイッチを閉じて、${water}` : "スイッチを閉じる";
    case "switchOpen":
      return water ? `スイッチを開けて、${water}` : "スイッチを開ける";
    case "pour":
      return water ? `${water}注ぐ` : "注ぐ";
    case "stir":
      return "撹拌";
    case "wait":
      return "待つ";
    case "finish":
      return "終わったら、完了をタップ";
  }
}

/** ちょうどの時刻に流す短い合図。予告で内容は伝えてあるので動作だけ言う */
export function shortText(step: Step): string {
  switch (step.action) {
    case "switchClose":
      return "閉じる";
    case "switchOpen":
      return "開ける";
    case "pour":
      return "注ぐ";
    case "stir":
      return "撹拌";
    case "wait":
      return "待つ";
    case "finish":
      return "完了待ち";
  }
}

export const preannounceText = (step: Step) => `まもなく、${fullText(step)}`;

export const resumeText = (step: Step) => `いま、${fullText(step)}`;
