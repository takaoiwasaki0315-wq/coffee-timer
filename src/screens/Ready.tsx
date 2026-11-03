import { stepLabel } from "../domain/labels";
import type { Recipe } from "../domain/types";
import { formatSec } from "../lib/format";
import { wakeLockSupported } from "../lib/useWakeLock";

export function Ready({
  recipe,
  onStart,
  onBack,
}: {
  recipe: Recipe;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <button onClick={onBack} className="self-start text-sm text-muted">
        ← レシピ一覧
      </button>
      <h1 className="mt-3 text-2xl font-bold">{recipe.name}</h1>
      <p className="mt-1 text-muted">
        豆{recipe.doseG}g・注湯{recipe.totalWaterG}g
      </p>

      {recipe.prep && (
        <section className="mt-5 rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-muted">準備</h2>
          <p className="mt-1">{recipe.prep}</p>
        </section>
      )}

      <ol className="mt-5 divide-y divide-line rounded-xl border border-line bg-card">
        {recipe.steps.map((s, i) => (
          <li key={i} className="flex gap-3 p-3">
            <span className="tabular w-12 shrink-0 font-semibold">{formatSec(s.atSec)}</span>
            <span>
              {stepLabel(s)}
              {s.note && <span className="block text-sm text-muted">{s.note}</span>}
            </span>
          </li>
        ))}
      </ol>

      <section className="mt-5 space-y-2 rounded-xl bg-warn-bg p-4 text-sm">
        <p>🔕 消音モード（サイレントスイッチ）がオンだとビープ音が鳴りません。</p>
        <p>🔊 音量を上げておいてください。</p>
        {!wakeLockSupported && (
          <p>📱 この端末では画面を点けたままにできません。設定で自動ロックをオフにしてください。</p>
        )}
      </section>

      <button
        onClick={onStart}
        className="mt-auto w-full rounded-2xl bg-accent py-5 text-xl font-bold text-accent-fg active:opacity-80"
      >
        注ぎ始めと同時にタップ
      </button>
    </main>
  );
}
