import { useState } from "react";
import {
  daysSinceRoast,
  initialForm,
  validateLogForm,
  type LogForm,
} from "../domain/log";
import type { BrewLog, Recipe } from "../domain/types";
import { formatSec } from "../lib/format";
import type { BrewResult } from "./Timer";

const ROAST_LEVELS = [
  ["light", "浅煎り"],
  ["medium", "中煎り"],
  ["dark", "深煎り"],
] as const;

export function Done({
  recipe,
  result,
  logs,
  grinder,
  onSave,
  onSkip,
}: {
  recipe: Recipe;
  result: BrewResult;
  logs: BrewLog[];
  grinder: string;
  onSave: (log: BrewLog) => Promise<void>;
  onSkip: () => void;
}) {
  const [brewedAt] = useState(() => new Date());
  const [form, setForm] = useState<LogForm>(() => initialForm(recipe, logs));
  const [errors, setErrors] = useState<Partial<Record<keyof LogForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const set = <K extends keyof LogForm>(k: K, v: LogForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const days = form.roastDate ? daysSinceRoast(form.roastDate, brewedAt) : undefined;
  const interrupted = result.interruptions.length > 0;

  const save = async () => {
    const r = validateLogForm(form, brewedAt);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    setSaveError(undefined);
    try {
      await onSave({
        ...r.value,
        id: crypto.randomUUID(),
        recipeId: recipe.id,
        recipeName: recipe.name,
        brewedAt: brewedAt.toISOString(),
        grinder,
        totalSec: result.totalSec,
        interrupted,
      });
    } catch {
      setSaveError("保存できませんでした。もう一度お試しください。");
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-2xl font-bold">抽出完了</h1>
      <p className="tabular mt-3 text-5xl font-bold">{formatSec(result.totalSec)}</p>
      <p className="text-muted">総抽出時間</p>

      {recipe.finishNote && (
        <section className="mt-5 rounded-xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold text-muted">仕上げ</h2>
          <p className="mt-1">{recipe.finishNote}</p>
        </section>
      )}

      {interrupted && (
        <p className="mt-4 rounded-lg bg-warn-bg p-3 text-sm">
          中断あり：
          {result.interruptions.map((i) => `${formatSec(i.fromSec)}〜${formatSec(i.toSec)}`).join("、")}
        </p>
      )}

      <h2 className="mt-8 text-lg font-bold">ログを保存</h2>
      <div className="mt-3 space-y-4">
        <Field label="評価" error={errors.rating}>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n}点`}
                onClick={() => set("rating", n)}
                className={`h-12 flex-1 rounded-lg text-2xl ${
                  n <= form.rating ? "bg-accent text-accent-fg" : "border border-line bg-card text-muted"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </Field>

        <Field label="豆の名前" error={errors.beanName}>
          <input
            value={form.beanName}
            onChange={(e) => set("beanName", e.target.value)}
            className={inputCls}
            placeholder="例：エチオピア イルガチェフェ"
          />
        </Field>

        <Field label="焙煎度">
          <div className="flex gap-2">
            {ROAST_LEVELS.map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => set("roastLevel", form.roastLevel === v ? "" : v)}
                className={`flex-1 rounded-lg py-3 ${
                  form.roastLevel === v ? "bg-accent text-accent-fg" : "border border-line bg-card"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field
          label="焙煎日"
          error={errors.roastDate}
          hint={days !== undefined && days >= 0 ? `焙煎後${days}日目` : undefined}
        >
          <input
            type="date"
            value={form.roastDate}
            onChange={(e) => set("roastDate", e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="挽目" hint={grinder} error={errors.grind}>
            <input
              inputMode="decimal"
              value={form.grind}
              onChange={(e) => set("grind", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="湯温 ℃" error={errors.waterTempC}>
            <input
              inputMode="decimal"
              value={form.waterTempC}
              onChange={(e) => set("waterTempC", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="バイパス g" error={errors.bypassG}>
            <input
              inputMode="decimal"
              value={form.bypassG}
              onChange={(e) => set("bypassG", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="メモ" error={errors.memo}>
          <textarea
            rows={3}
            value={form.memo}
            onChange={(e) => set("memo", e.target.value)}
            className={inputCls}
            placeholder="例：酸味が強め。次は1段階細かく"
          />
        </Field>
      </div>

      {Object.keys(errors).length > 0 && (
        <p className="mt-4 text-sm font-semibold text-red-600">入力内容を確認してください。</p>
      )}
      {saveError && <p className="mt-4 text-sm font-semibold text-red-600">{saveError}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-fg disabled:opacity-50"
      >
        保存
      </button>
      <button
        onClick={() => {
          if (window.confirm("ログを保存せずに戻りますか？")) onSkip();
        }}
        className="mt-3 w-full py-3 text-muted"
      >
        保存しないで戻る
      </button>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-card px-3 py-3 text-base text-fg outline-none focus:border-accent";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-sm font-semibold text-red-600">{error}</span>}
    </label>
  );
}
