import type { Recipe } from "../domain/types";

export function Home({
  recipes,
  onSelect,
  onLogs,
}: {
  recipes: Recipe[];
  onSelect: (r: Recipe) => void;
  onLogs: () => void;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coffee Timer</h1>
        <button onClick={onLogs} className="rounded-lg border border-line bg-card px-4 py-2 font-semibold">
          ログ
        </button>
      </div>
      <ul className="mt-6 space-y-3">
        {recipes.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => onSelect(r)}
              className="w-full rounded-xl border border-line bg-card p-4 text-left active:opacity-70"
            >
              <div className="text-lg font-semibold">{r.name}</div>
              <div className="mt-1 text-sm text-muted">
                {r.device}・豆{r.doseG}g・注湯{r.totalWaterG}g
              </div>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
