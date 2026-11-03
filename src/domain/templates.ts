import type { Recipe } from "./types";

// 4:6メソッドは出典確認後に追加する（SPEC.md §3）
export const TEMPLATES: Recipe[] = [
  {
    id: "switch-hybrid",
    name: "スイッチ ハイブリッド",
    device: "ハリオ スイッチ",
    doseG: 15,
    totalWaterG: 250,
    prep: "スイッチを閉じた状態でペーパーリンスし、湯は捨てる",
    finishNote: "サーバーに20〜50gの湯を足して混ぜる（バイパス）",
    steps: [
      { atSec: 0, action: "switchClose", waterG: 90, note: "0:45まで蒸らし" },
      { atSec: 45, action: "switchOpen", note: "約10秒透過" },
      { atSec: 55, action: "switchClose", waterG: 150, note: "1:15まで再浸漬" },
      { atSec: 75, action: "switchOpen", waterG: 250 },
      {
        atSec: 90,
        action: "finish",
        note: "サーバーの抽出液200mlでスイッチを閉じ、ドリッパーを外して「完了」",
      },
    ],
    // ユーザーの常用条件（豆15g / 86℃ / TIMEMORE S5 で 6.5）
    defaults: { waterTempC: 86, grind: 6.5, bypassG: 40 },
    // TODO: ユーザーが参照している YouTube 動画の URL を追記
    source: "YouTube のおすすめレシピ（URL 未確認）",
    builtIn: true,
  },
];
