import { daysSinceRoast } from "../domain/log";
import type { BrewLog } from "../domain/types";
import { formatSec } from "../lib/format";

const ROAST = { light: "浅煎り", medium: "中煎り", dark: "深煎り" } as const;

export function Logs({
  logs,
  onDelete,
  onBack,
}: {
  logs: BrewLog[];
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <button onClick={onBack} className="text-sm text-muted">
        ← レシピ一覧
      </button>
      <h1 className="mt-3 text-2xl font-bold">ログ</h1>
      {logs.length === 0 ? (
        <p className="mt-6 text-muted">まだ記録がありません。</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {logs.map((l) => {
            const at = new Date(l.brewedAt);
            const days = l.roastDate ? daysSinceRoast(l.roastDate, at) : undefined;
            return (
              <li key={l.id} className="rounded-xl border border-line bg-card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-muted">
                    {at.toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })}・{l.recipeName}
                  </span>
                  <span className="shrink-0">{"★".repeat(l.rating)}</span>
                </div>
                <p className="mt-1 font-semibold">
                  {l.beanName}
                  {l.roastLevel && <span className="font-normal text-muted">（{ROAST[l.roastLevel]}）</span>}
                </p>
                <p className="tabular mt-1 text-sm">
                  {days !== undefined && `焙煎後${days}日・`}挽目 {l.grind}・{l.waterTempC}℃・バイパス{" "}
                  {l.bypassG}g・{formatSec(l.totalSec)}
                  {l.interrupted && "・中断あり"}
                </p>
                {l.memo && <p className="mt-2 text-sm whitespace-pre-wrap">{l.memo}</p>}
                <button
                  onClick={() => {
                    if (window.confirm("このログを削除しますか？")) onDelete(l.id);
                  }}
                  className="mt-2 text-sm text-muted underline"
                >
                  削除
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
