// データモデル（SPEC.md §2）

export type StepAction =
  | "pour" // 注湯
  | "wait" // 待つ
  | "stir" // 撹拌
  | "switchClose" // スイッチを閉じる（注湯を伴う場合は waterG を持つ）
  | "switchOpen" // スイッチを開ける（注湯を伴う場合は waterG を持つ）
  | "finish"; // 完了待ち：ユーザーが「完了」をタップして終える

export interface Step {
  /** 抽出開始（注ぎ始め）からの絶対時刻（秒） */
  atSec: number;
  action: StepAction;
  /** 累積の目標湯量(g)。注湯しないステップでは省略 */
  waterG?: number;
  /** 画面表示のみ。読み上げない */
  note?: string;
}

export interface Recipe {
  id: string;
  name: string;
  device: string;
  /** 基準豆量(g)。v1 ではスケーリングしない */
  doseG: number;
  /** 注湯合計(g) */
  totalWaterG: number;
  /** タイマー外の準備（ペーパーリンス等） */
  prep?: string;
  /** タイマー外の仕上げ（バイパス等） */
  finishNote?: string;
  steps: Step[];
  /** ログが1件もないときの初期値 */
  defaults?: { waterTempC?: number; grind?: number; bypassG?: number };
  source?: string;
  /** 同梱テンプレートは編集不可（複製してから編集） */
  builtIn: boolean;
}

export type RoastLevel = "light" | "medium" | "dark";

/** 1回の抽出記録（SPEC.md §2） */
export interface BrewLog {
  id: string;
  recipeId: string;
  /** レシピが後で消えても読めるように名前も残す */
  recipeName: string;
  /** ISO 8601 */
  brewedAt: string;
  beanName: string;
  roastLevel?: RoastLevel;
  /** YYYY-MM-DD（端末のローカル日付） */
  roastDate?: string;
  grinder: string;
  grind: number;
  waterTempC: number;
  bypassG: number;
  totalSec: number;
  /** 1〜5 */
  rating: number;
  memo: string;
  interrupted: boolean;
}
