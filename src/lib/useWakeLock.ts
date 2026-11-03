import { useEffect, useState } from "react";

export const wakeLockSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

/** active の間は画面を点けたままにする。アプリに戻ったときは取り直す */
export function useWakeLock(active: boolean): { held: boolean } {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!active || !wakeLockSupported) return;
    let sentinel: WakeLockSentinel | undefined;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void s.release();
          return;
        }
        sentinel = s;
        setHeld(true);
        s.addEventListener("release", () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [active]);

  return { held };
}
