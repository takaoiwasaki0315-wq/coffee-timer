import { useEffect, useState } from "react";
import { DEFAULT_LEAD_SEC } from "./domain/schedule";
import { TEMPLATES } from "./domain/templates";
import type { BrewLog, Recipe } from "./domain/types";
import { speak, unlockAudio } from "./lib/audio";
import { deleteLog, listLogs, saveLog } from "./lib/db";
import { Done } from "./screens/Done";
import { Home } from "./screens/Home";
import { Logs } from "./screens/Logs";
import { Ready } from "./screens/Ready";
import { Timer, type BrewResult } from "./screens/Timer";

type Screen =
  | { name: "home" }
  | { name: "logs" }
  | { name: "ready"; recipe: Recipe }
  | { name: "timer"; recipe: Recipe }
  | { name: "done"; recipe: Recipe; result: BrewResult };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  // listLogs は新しい順
  const [logs, setLogs] = useState<BrewLog[]>([]);
  const home = () => setScreen({ name: "home" });
  const reload = async () => setLogs(await listLogs());

  useEffect(() => {
    void reload();
  }, []);

  switch (screen.name) {
    case "home":
      return (
        <Home
          recipes={TEMPLATES}
          onSelect={(recipe) => setScreen({ name: "ready", recipe })}
          onLogs={() => setScreen({ name: "logs" })}
        />
      );
    case "logs":
      return (
        <Logs
          logs={logs}
          onBack={home}
          onDelete={async (id) => {
            await deleteLog(id);
            await reload();
          }}
        />
      );
    case "ready":
      return (
        <Ready
          recipe={screen.recipe}
          lastLog={logs.find((l) => l.recipeId === screen.recipe.id)}
          onBack={home}
          onStart={() => {
            // iOS はタップの中で音声を有効化しないと鳴らない
            unlockAudio();
            setScreen({ name: "timer", recipe: screen.recipe });
          }}
        />
      );
    case "timer":
      return (
        <Timer
          recipe={screen.recipe}
          leadSec={DEFAULT_LEAD_SEC}
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
          onSkip={home}
          onSave={async (log) => {
            await saveLog(log);
            await reload();
            setScreen({ name: "logs" });
          }}
        />
      );
  }
}
