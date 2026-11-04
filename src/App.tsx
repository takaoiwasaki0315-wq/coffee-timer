import { useEffect, useState } from "react";
import { duplicateRecipe, newRecipeForm, toForm } from "./domain/recipe";
import { DEFAULT_SETTINGS, type Settings as AppSettings } from "./domain/settings";
import { TEMPLATES } from "./domain/templates";
import type { BrewLog, Recipe } from "./domain/types";
import { speak, unlockAudio } from "./lib/audio";
import * as db from "./lib/db";
import { Done } from "./screens/Done";
import { Home } from "./screens/Home";
import { Logs } from "./screens/Logs";
import { Ready } from "./screens/Ready";
import { RecipeEdit } from "./screens/RecipeEdit";
import { Settings } from "./screens/Settings";
import { Timer, type BrewResult } from "./screens/Timer";

type Screen =
  | { name: "home" }
  | { name: "logs" }
  | { name: "settings" }
  | { name: "ready"; recipe: Recipe }
  | { name: "timer"; recipe: Recipe }
  | { name: "done"; recipe: Recipe; result: BrewResult }
  /** base が undefined なら新規作成。テンプレートは複製したものを渡す */
  | { name: "edit"; base?: Recipe; isNew: boolean };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  // listLogs は新しい順
  const [logs, setLogs] = useState<BrewLog[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const home = () => setScreen({ name: "home" });

  const reload = async () => {
    const [l, r, s] = await Promise.all([db.listLogs(), db.listRecipes(), db.loadSettings()]);
    setLogs(l);
    setRecipes(r);
    setSettings(s);
  };

  useEffect(() => {
    void reload();
  }, []);

  switch (screen.name) {
    case "home":
      return (
        <Home
          templates={TEMPLATES}
          recipes={recipes}
          onSelect={(recipe) => setScreen({ name: "ready", recipe })}
          onNew={() => setScreen({ name: "edit", isNew: true })}
          onLogs={() => setScreen({ name: "logs" })}
          onSettings={() => setScreen({ name: "settings" })}
        />
      );
    case "logs":
      return (
        <Logs
          logs={logs}
          onBack={home}
          onDelete={async (id) => {
            await db.deleteLog(id);
            await reload();
          }}
        />
      );
    case "settings":
      return (
        <Settings
          settings={settings}
          recipes={recipes}
          logs={logs}
          onBack={home}
          onImported={reload}
          onSave={async (s) => {
            await db.saveSettings(s);
            setSettings(s);
          }}
        />
      );
    case "ready":
      return (
        <Ready
          recipe={screen.recipe}
          lastLog={logs.find((l) => l.recipeId === screen.recipe.id)}
          onBack={home}
          onEdit={() =>
            setScreen(
              screen.recipe.builtIn
                ? { name: "edit", base: duplicateRecipe(screen.recipe, crypto.randomUUID()), isNew: true }
                : { name: "edit", base: screen.recipe, isNew: false },
            )
          }
          onStart={() => {
            // iOS はタップの中で音声を有効化しないと鳴らない
            unlockAudio();
            setScreen({ name: "timer", recipe: screen.recipe });
          }}
        />
      );
    case "edit": {
      const { base, isNew } = screen;
      return (
        <RecipeEdit
          title={isNew ? "新しいレシピ" : "レシピを編集"}
          initial={base ? toForm(base) : newRecipeForm()}
          leadSec={settings.leadSec}
          onCancel={() => (base && !isNew ? setScreen({ name: "ready", recipe: base }) : home())}
          onSave={async (draft) => {
            const recipe: Recipe = {
              ...draft,
              id: base?.id ?? crypto.randomUUID(),
              builtIn: false,
              ...(base?.source !== undefined && { source: base.source }),
            };
            await db.saveRecipe(recipe);
            await reload();
            setScreen({ name: "ready", recipe });
          }}
          onDelete={
            base && !isNew
              ? async () => {
                  await db.deleteRecipe(base.id);
                  await reload();
                  home();
                }
              : undefined
          }
        />
      );
    }
    case "timer":
      return (
        <Timer
          recipe={screen.recipe}
          leadSec={settings.leadSec}
          onCancel={home}
          onFinish={(result) => {
            speak("おつかれさまでした");
            setScreen({ name: "done", recipe: screen.recipe, result });
          }}
        />
      );
    case "done":
      return (
        <Done
          recipe={screen.recipe}
          result={screen.result}
          logs={logs}
          grinder={settings.grinder}
          onSkip={home}
          onSave={async (log) => {
            await db.saveLog(log);
            await reload();
            setScreen({ name: "logs" });
          }}
        />
      );
  }
}
