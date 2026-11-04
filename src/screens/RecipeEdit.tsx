import { useState } from "react";
import {
  ACTION_LABELS,
  emptyStep,
  usesWater,
  validateRecipeForm,
  type Issue,
  type RecipeDraft,
  type RecipeForm,
  type StepForm,
} from "../domain/recipe";
import type { StepAction } from "../domain/types";

const ACTIONS = Object.keys(ACTION_LABELS) as StepAction[];

export function RecipeEdit({
  title,
  initial,
  leadSec,
  onSave,
  onDelete,
  onCancel,
}: {
  title: string;
  initial: RecipeForm;
  leadSec: number;
  onSave: (r: RecipeDraft) => Promise<void>;
  /** 保存済みのレシピのみ */
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string>();

  const set = <K extends keyof RecipeForm>(k: K, v: RecipeForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setStep = (i: number, p: Partial<StepForm>) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const moveStep = (i: number, d: -1 | 1) =>
    setForm((f) => {
      const steps = [...f.steps];
      [steps[i], steps[i + d]] = [steps[i + d], steps[i]];
      return { ...f, steps };
    });
  const removeStep = (i: number) => setForm((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }));
  // 完了待ちの前に足す（完了待ちは最後に置く決まりなので）
  const addStep = () =>
    setForm((f) => {
      const steps = [...f.steps];
      const at = steps.at(-1)?.action === "finish" ? steps.length - 1 : steps.length;
      steps.splice(at, 0, emptyStep());
      return { ...f, steps };
    });

  const generalIssues = issues.filter((i) => i.stepIndex === undefined);
  const stepIssues = (i: number) => issues.filter((x) => x.stepIndex === i);
  const hasError = issues.some((i) => i.level === "error");

  const save = async () => {
    const r = validateRecipeForm(form, leadSec);
    setIssues(r.issues);
    if (!r.recipe) return;
    if (r.issues.length > 0 && !window.confirm("警告があります。このまま保存しますか？")) return;
    setBusy(true);
    setSaveError(undefined);
    try {
      await onSave(r.recipe);
    } catch {
      setSaveError("保存できませんでした。もう一度お試しください。");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <button
        onClick={() => {
          if (window.confirm("編集内容を保存せずに戻りますか？")) onCancel();
        }}
        className="text-sm text-muted"
      >
        ← 戻る
      </button>
      <h1 className="mt-3 text-2xl font-bold">{title}</h1>

      <div className="mt-5 space-y-4">
        <Text label="レシピ名" value={form.name} onChange={(v) => set("name", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Text label="器具" value={form.device} onChange={(v) => set("device", v)} />
          <Text label="豆量 g" value={form.doseG} onChange={(v) => set("doseG", v)} decimal />
        </div>
        <Text label="準備（タイマー前）" value={form.prep} onChange={(v) => set("prep", v)} />
        <Text label="仕上げ（タイマー後）" value={form.finishNote} onChange={(v) => set("finishNote", v)} />
        <div>
          <p className="text-sm font-semibold text-muted">ログの初期値（任意）</p>
          <div className="mt-1 grid grid-cols-3 gap-3">
            <Text label="湯温 ℃" value={form.waterTempC} onChange={(v) => set("waterTempC", v)} decimal />
            <Text label="挽目" value={form.grind} onChange={(v) => set("grind", v)} decimal />
            <Text label="バイパス g" value={form.bypassG} onChange={(v) => set("bypassG", v)} decimal />
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-bold">ステップ</h2>
      <p className="mt-1 text-sm text-muted">
        時刻は注ぎ始めからの経過時間（例 1:15）、湯量は累積（スケールの表示）で入力します。
      </p>
      <ol className="mt-3 space-y-3">
        {form.steps.map((s, i) => (
          <li key={i} className="rounded-xl border border-line bg-card p-3">
            <div className="flex gap-2">
              <input
                aria-label="時刻"
                inputMode="numeric"
                placeholder="0:00"
                value={s.time}
                onChange={(e) => setStep(i, { time: e.target.value })}
                className={`${inputCls} w-20 shrink-0 text-center`}
              />
              <select
                aria-label="動作"
                value={s.action}
                onChange={(e) => setStep(i, { action: e.target.value as StepAction })}
                className={`${inputCls} min-w-0 flex-1`}
              >
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
              {usesWater(s.action) && (
                <div className="flex w-24 shrink-0 items-center gap-1">
                  <input
                    aria-label="累積湯量"
                    inputMode="numeric"
                    placeholder={s.action === "pour" ? "必須" : "任意"}
                    value={s.water}
                    onChange={(e) => setStep(i, { water: e.target.value })}
                    className={`${inputCls} w-full min-w-0 text-right`}
                  />
                  <span className="text-sm">g</span>
                </div>
              )}
            </div>
            <input
              aria-label="メモ"
              placeholder="メモ（画面に表示・読み上げなし）"
              value={s.note}
              onChange={(e) => setStep(i, { note: e.target.value })}
              className={`${inputCls} mt-2 w-full`}
            />
            <IssueList issues={stepIssues(i)} />
            <div className="mt-2 flex justify-end gap-2 text-sm">
              <button disabled={i === 0} onClick={() => moveStep(i, -1)} className={smallBtn}>
                ↑
              </button>
              <button disabled={i === form.steps.length - 1} onClick={() => moveStep(i, 1)} className={smallBtn}>
                ↓
              </button>
              <button onClick={() => removeStep(i)} className={smallBtn}>
                削除
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        onClick={addStep}
        className="mt-3 w-full rounded-xl border border-dashed border-line py-3 font-semibold text-muted"
      >
        ＋ ステップを追加
      </button>

      <IssueList issues={generalIssues} />
      {hasError && <p className="mt-4 text-sm font-semibold text-red-600">赤字の項目を直してください。</p>}
      {saveError && <p className="mt-4 text-sm font-semibold text-red-600">{saveError}</p>}

      <button
        onClick={save}
        disabled={busy}
        className="mt-6 w-full rounded-2xl bg-accent py-4 text-lg font-bold text-accent-fg disabled:opacity-50"
      >
        保存
      </button>
      {onDelete && (
        <button
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("このレシピを削除しますか？（ログは残ります）")) return;
            setBusy(true);
            await onDelete();
          }}
          className="mt-3 w-full py-3 text-red-600"
        >
          レシピを削除
        </button>
      )}
    </main>
  );
}

// 幅は使う側で指定する（w-full と w-20 が競合しないように）
const inputCls =
  "rounded-lg border border-line bg-bg px-2 py-2.5 text-base text-fg outline-none focus:border-accent";
const smallBtn = "rounded-md border border-line px-3 py-1 disabled:opacity-30";

function Text({
  label,
  value,
  onChange,
  decimal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-muted">{label}</span>
      <input
        value={value}
        inputMode={decimal ? "decimal" : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} w-full`}
      />
    </label>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {issues.map((x, i) => (
        <li key={i} className={x.level === "error" ? "font-semibold text-red-600" : "rounded bg-warn-bg px-2 py-1"}>
          {x.level === "error" ? "✕ " : "⚠ "}
          {x.message}
        </li>
      ))}
    </ul>
  );
}
