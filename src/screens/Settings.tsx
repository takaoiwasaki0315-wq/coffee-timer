import { useRef, useState } from "react";
import { makeBackup, parseBackup } from "../domain/backup";
import { SETTINGS_LIMITS, isValidSettings, type Settings as AppSettings } from "../domain/settings";
import type { BrewLog, Recipe } from "../domain/types";
import { importAll } from "../lib/db";

export function Settings({
  settings,
  recipes,
  logs,
  onSave,
  onImported,
  onBack,
}: {
  settings: AppSettings;
  recipes: Recipe[];
  logs: BrewLog[];
  onSave: (s: AppSettings) => Promise<void>;
  onImported: () => Promise<void>;
  onBack: () => void;
}) {
  const [leadSec, setLeadSec] = useState(settings.leadSec);
  const [grinder, setGrinder] = useState(settings.grinder);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const fileRef = useRef<HTMLInputElement>(null);

  const draft: AppSettings = { leadSec, grinder: grinder.trim() };
  const valid = isValidSettings(draft);
  const changed = draft.leadSec !== settings.leadSec || draft.grinder !== settings.grinder;

  const save = async () => {
    try {
      await onSave(draft);
      setMessage({ ok: true, text: "設定を保存しました" });
    } catch {
      setMessage({ ok: false, text: "保存できませんでした" });
    }
  };

  const exportJson = async () => {
    const now = new Date();
    const backup = makeBackup(recipes, logs, settings, now);
    const ymd = now.toLocaleDateString("sv-SE").replaceAll("-", "");
    const file = new File([JSON.stringify(backup, null, 2)], `coffee-timer-${ymd}.json`, {
      type: "application/json",
    });
    // iPhone では共有シートから「"ファイル"に保存」で iCloud Drive に置ける
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importJson = async (file: File) => {
    const r = parseBackup(await file.text());
    if (!r.ok) {
      setMessage({ ok: false, text: `読み込めませんでした：${r.error}` });
      return;
    }
    const { recipes: rs, logs: ls, settings: st } = r.backup;
    const ok = window.confirm(
      `レシピ ${rs.length} 件・ログ ${ls.length} 件・設定を読み込みます。\n` +
        "同じデータがある場合は上書きします（今あるデータは消えません）。",
    );
    if (!ok) return;
    try {
      await importAll(rs, ls, st);
      await onImported();
      setLeadSec(st.leadSec);
      setGrinder(st.grinder);
      setMessage({ ok: true, text: `レシピ ${rs.length} 件・ログ ${ls.length} 件を読み込みました` });
    } catch {
      setMessage({ ok: false, text: "読み込みに失敗しました。データは変更されていません" });
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <button onClick={onBack} className="text-sm text-muted">
        ← レシピ一覧
      </button>
      <h1 className="mt-3 text-2xl font-bold">設定</h1>

      <section className="mt-6 space-y-4 rounded-xl border border-line bg-card p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">予告の秒数</span>
          <select
            value={leadSec}
            onChange={(e) => setLeadSec(Number(e.target.value))}
            className={inputCls}
          >
            {Array.from({ length: SETTINGS_LIMITS.leadSec.max + 1 }, (_, n) => (
              <option key={n} value={n}>
                {n === 0 ? "予告しない" : `${n}秒前`}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-sm text-muted">
            次のステップの何秒前に「まもなく、〜」と読み上げるか
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-muted">ミル</span>
          <input value={grinder} onChange={(e) => setGrinder(e.target.value)} className={inputCls} />
          {!valid && <span className="mt-1 block text-sm font-semibold text-red-600">ミルの名前を入力してください</span>}
        </label>
        <button
          onClick={save}
          disabled={!valid || !changed}
          className="w-full rounded-xl bg-accent py-3 font-bold text-accent-fg disabled:opacity-40"
        >
          設定を保存
        </button>
      </section>

      <section className="mt-6 space-y-3 rounded-xl border border-line bg-card p-4">
        <h2 className="font-bold">バックアップ</h2>
        <p className="text-sm text-muted">
          データはこのiPhoneの中にだけ保存されています。ホーム画面からアプリを削除するとデータも消えるので、ときどき書き出して「ファイル」（iCloud Drive）に保存してください。
        </p>
        <button onClick={exportJson} className="w-full rounded-xl border border-line py-3 font-semibold">
          書き出す（マイレシピ {recipes.filter((r) => !r.builtIn).length} 件・ログ {logs.length} 件）
        </button>
        <button onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-line py-3 font-semibold">
          読み込む
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void importJson(f);
          }}
        />
      </section>

      {message && (
        <p className={`mt-4 text-sm font-semibold ${message.ok ? "" : "text-red-600"}`}>{message.text}</p>
      )}
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-3 text-base text-fg outline-none focus:border-accent";
