import { useState } from "react";
import { DEFAULT_LEAD_SEC } from "./domain/schedule";
import { TEMPLATES } from "./domain/templates";
import type { Recipe } from "./domain/types";
import { unlockAudio, speak } from "./lib/audio";
import { Done } from "./screens/Done";
import { Home } from "./screens/Home";
import { Ready } from "./screens/Ready";
import { Timer, type BrewResult } from "./screens/Timer";

type Screen =
  | { name: "home" }
  | { name: "ready"; recipe: Recipe }
  | { name: "timer"; recipe: Recipe }
  | { name: "done"; recipe: Recipe; result: BrewResult };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const home = () => setScreen({ name: "home" });

  switch (screen.name) {
    case "home":
      return <Home recipes={TEMPLATES} onSelect={(recipe) => setScreen({ name: "ready", recipe })} />;
    case "ready":
      return (
        <Ready
          recipe={screen.recipe}
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
      return <Done recipe={screen.recipe} result={screen.result} onHome={home} />;
  }
}
