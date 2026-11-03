import type { Recipe } from "../domain/types";
import { formatSec } from "../lib/format";
import type { BrewResult } from "./Timer";

export function Done({
  recipe,
  result,
  onHome,
}: {
  recipe: Recipe;
  result: BrewResult;
  onHome: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <h1 className="text-2xl font-bold">抽出完了</h1>
      <p className="tabular mt-4 text-5xl font-bold">{formatSec(result.totalSec)}</p>
      <p className="text-muted">総抽出時間</p>

      {recipe.finishNote && (
        <section className="mt-6 rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-muted">仕上げ</h2>
          <p className="mt-1">{recipe.finishNote}</p>
        </section>
      )}

      {result.interruptions.length > 0 && (
        <p className="mt-4 rounded-lg bg-warn-bg p-3 text-sm">
          中断あり：
          {result.interruptions.map((i) => `${formatSec(i.fromSec)}〜${formatSec(i.toSec)}`).join("、")}
        </p>
      )}

      <p className="mt-6 text-sm text-muted">ログの保存は次の段階で追加します。</p>

      <button
        onClick={onHome}
        className="mt-auto w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-fg"
      >
        レシピ一覧へ
      </button>
    </main>
  );
}
