import type { Step } from "./types";

/** 画面表示用のステップ名。例：「スイッチを閉じる → 150g」 */
export function stepLabel(step: Step): string {
  const name = {
    pour: "注湯",
    wait: "待つ",
    stir: "撹拌",
    switchClose: "スイッチを閉じる",
    switchOpen: "スイッチを開ける",
    finish: "完了待ち",
  }[step.action];
  return step.waterG === undefined ? name : `${name} → ${step.waterG}g`;
}
