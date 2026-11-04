import { stepLabel } from "../domain/labels";
import { daysSinceRoast } from "../domain/log";
import type { BrewLog, Recipe } from "../domain/types";
import { formatSec } from "../lib/format";
import { wakeLockSupported } from "../lib/useWakeLock";

export function Ready({
  recipe,
  lastLog,
  onStart,
  onBack,
  onEdit,
}: {
  recipe: Recipe;
  /** このレシピの前回のログ */
  lastLog?: BrewLog;
  onStart: () => void;
  onBack: () => void;
  /** 同梱テンプレートなら複製してから編集 */
  onEdit: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted">
          ← レシピ一覧
        </button>
        <button onClick={onEdit} className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold">
          {recipe.builtIn ? "複製して編集" : "編集"}
        </button>
      </div>
      <h1 className="mt-3 text-2xl font-bold">{recipe.name}</h1>
      <p className="mt-1 text-muted">
        豆{recipe.doseG}g・注湯{recipe.totalWaterG}g
      </p>

      {lastLog && <LastLog log={lastLog} />}

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
        <p className="text-base font-bold">
          🔕 消音モードがオンだと、ビープ音も読み上げも鳴りません。消音モードがオフになっているか確認してください。
        </p>
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

function LastLog({ log }: { log: BrewLog }) {
  const days = log.roastDate ? daysSinceRoast(log.roastDate, new Date()) : undefined;
  return (
    <section className="mt-5 rounded-xl border border-line bg-card p-4">
      <h2 className="text-sm font-semibold text-muted">
        前回（{new Date(log.brewedAt).toLocaleDateString("ja-JP")}）
      </h2>
      <p className="mt-1">
        {log.beanName}
        {days !== undefined && <span className="text-muted">（焙煎後{days}日目）</span>}
      </p>
      <p className="tabular mt-1">
        挽目 {log.grind}・{log.waterTempC}℃・バイパス {log.bypassG}g・{"★".repeat(log.rating)}
      </p>
      {log.memo && <p className="mt-1 text-sm text-muted">{log.memo}</p>}
    </section>
  );
}
