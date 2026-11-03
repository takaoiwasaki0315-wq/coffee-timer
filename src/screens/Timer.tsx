import { currentStepIndex, secondsToNext } from "../domain/schedule";
import { stepLabel } from "../domain/labels";
import type { Recipe } from "../domain/types";
import { formatCountdown, formatSec } from "../lib/format";
import { useBrewTimer, type Interruption } from "../lib/useBrewTimer";
import { useWakeLock } from "../lib/useWakeLock";

export interface BrewResult {
  totalSec: number;
  interruptions: Interruption[];
}

export function Timer({
  recipe,
  leadSec,
  onFinish,
  onCancel,
}: {
  recipe: Recipe;
  leadSec: number;
  onFinish: (r: BrewResult) => void;
  onCancel: () => void;
}) {
  const { elapsed, paused, interruptions, pause, resume, finish } = useBrewTimer(
    recipe.steps,
    leadSec,
  );
  useWakeLock(!paused);

  const steps = recipe.steps;
  const idx = currentStepIndex(steps, elapsed);
  const current = steps[idx];
  const next = steps[idx + 1];
  const toNext = secondsToNext(steps, elapsed);
  // 3・2・1 の間は画面全体の色を変える（完了待ちの前は除く）
  const alert =
    !paused && next !== undefined && next.action !== "finish" && toNext !== undefined && toNext <= 3;
  const lastInt = interruptions.at(-1);

  const done = () => {
    // 抽出途中の押し間違いで総抽出時間が記録されないようにする
    if (current?.action !== "finish" && !window.confirm("まだ途中です。完了にしますか？")) return;
    onFinish({ totalSec: finish(), interruptions });
  };

  return (
    <main
      className={`flex min-h-dvh flex-col px-4 py-6 transition-colors duration-150 ${
        alert ? "bg-alert text-alert-fg" : ""
      }`}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{recipe.name}</span>
        <span className="tabular text-lg font-semibold">{formatSec(elapsed)}</span>
      </div>

      {lastInt && (
        <p className="mt-3 rounded-lg bg-warn-bg p-2 text-sm text-fg">
          中断がありました（{formatSec(lastInt.fromSec)}〜{formatSec(lastInt.toSec)}）
        </p>
      )}

      <section className="mt-6">
        <p className="text-sm opacity-70">いま</p>
        <p className="mt-1 text-3xl font-bold leading-tight">{current ? stepLabel(current) : "—"}</p>
        {current?.note && <p className="mt-2 text-lg">{current.note}</p>}
      </section>

      <section className="mt-auto py-6 text-center">
        {next && toNext !== undefined ? (
          <>
            <p className="text-sm opacity-70">次：{stepLabel(next)}</p>
            <p className="tabular mt-1 text-[7rem] leading-none font-bold">
              {formatCountdown(toNext)}
            </p>
          </>
        ) : (
          <p className="text-2xl font-semibold">終わったら「完了」をタップ</p>
        )}
      </section>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => {
            if (window.confirm("抽出を中止しますか？（記録は残りません）")) onCancel();
          }}
          className="rounded-2xl border border-current py-4 font-semibold opacity-70"
        >
          中止
        </button>
        <button
          onClick={paused ? resume : pause}
          className="rounded-2xl border border-current py-4 font-semibold"
        >
          {paused ? "再開" : "一時停止"}
        </button>
        <button
          onClick={done}
          className={`rounded-2xl py-4 font-bold ${
            current?.action === "finish" ? "bg-accent text-accent-fg" : "border border-current"
          }`}
        >
          完了
        </button>
      </div>
    </main>
  );
}
