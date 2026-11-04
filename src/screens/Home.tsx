import type { Recipe } from "../domain/types";

export function Home({
  templates,
  recipes,
  onSelect,
  onNew,
  onLogs,
  onSettings,
}: {
  templates: Recipe[];
  recipes: Recipe[];
  onSelect: (r: Recipe) => void;
  onNew: () => void;
  onLogs: () => void;
  onSettings: () => void;
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Coffee Timer</h1>
        <div className="flex gap-2">
          <button onClick={onLogs} className="rounded-lg border border-line bg-card px-4 py-2 font-semibold">
            ログ
          </button>
          <button onClick={onSettings} className="rounded-lg border border-line bg-card px-4 py-2 font-semibold">
            設定
          </button>
        </div>
      </div>

      <h2 className="mt-6 text-sm font-semibold text-muted">マイレシピ</h2>
      {recipes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">テンプレートを開いて「複製して編集」すると、ここに追加されます。</p>
      ) : (
        <RecipeList recipes={recipes} onSelect={onSelect} />
      )}
      <button
        onClick={onNew}
        className="mt-3 w-full rounded-xl border border-dashed border-line py-3 font-semibold text-muted"
      >
        ＋ 新しいレシピ
      </button>

      <h2 className="mt-8 text-sm font-semibold text-muted">テンプレート</h2>
      <RecipeList recipes={templates} onSelect={onSelect} />
    </main>
  );
}

function RecipeList({ recipes, onSelect }: { recipes: Recipe[]; onSelect: (r: Recipe) => void }) {
  return (
    <ul className="mt-2 space-y-3">
      {recipes.map((r) => (
        <li key={r.id}>
          <button
            onClick={() => onSelect(r)}
            className="w-full rounded-xl border border-line bg-card p-4 text-left active:opacity-70"
          >
            <div className="text-lg font-semibold">{r.name}</div>
            <div className="mt-1 text-sm text-muted">
              {r.device && `${r.device}・`}豆{r.doseG}g・注湯{r.totalWaterG}g
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
