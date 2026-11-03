import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildCues, elapsedSec, tick, type Cue } from "../domain/schedule";
import type { Step } from "../domain/types";
import { beep, speak, stopSpeech } from "./audio";

const TICK_MS = 100;

export interface Interruption {
  fromSec: number;
  toSec: number;
}

export interface BrewTimer {
  elapsed: number;
  paused: boolean;
  interruptions: Interruption[];
  pause: () => void;
  resume: () => void;
  /** 完了タップ。総抽出時間（秒）を返す */
  finish: () => number;
}

function play(cue: Cue): void {
  switch (cue.kind) {
    case "preannounce":
      speak(cue.text);
      break;
    case "beep":
      beep(880, 120);
      break;
    case "go":
      beep(1320, 250);
      speak(cue.text);
      break;
  }
}

/** マウントした時点を抽出開始とする。経過時間は開始時刻から毎回計算する（SPEC.md §4） */
export function useBrewTimer(steps: Step[], leadSec: number): BrewTimer {
  const cues = useMemo(() => buildCues(steps, leadSec), [steps, leadSec]);
  const t = useRef({
    startMs: Date.now(),
    pausedMs: 0,
    pauseAt: undefined as number | undefined,
    // 初回の tick で 0:00 の合図を拾うため負から始める
    prevSec: -1,
    finished: false,
  });
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interruptions, setInterruptions] = useState<Interruption[]>([]);

  const step = useCallback(() => {
    const s = t.current;
    if (s.finished || s.pauseAt !== undefined) return;
    const now = elapsedSec(s.startMs, Date.now(), s.pausedMs);
    const r = tick(cues, steps, s.prevSec, now);
    if (r.kind === "interrupted") {
      setInterruptions((xs) => [...xs, { fromSec: r.fromSec, toSec: r.toSec }]);
      speak(r.text);
    } else {
      r.cues.forEach(play);
    }
    s.prevSec = now;
    setElapsed(now);
  }, [cues, steps]);

  useEffect(() => {
    const id = window.setInterval(step, TICK_MS);
    // アプリに戻った瞬間に正しい経過時間を出す
    const onVisible = () => {
      if (document.visibilityState === "visible") step();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [step]);

  useEffect(() => stopSpeech, []);

  const pause = useCallback(() => {
    const s = t.current;
    if (s.pauseAt !== undefined || s.finished) return;
    s.pauseAt = Date.now();
    stopSpeech();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    const s = t.current;
    if (s.pauseAt === undefined) return;
    s.pausedMs += Date.now() - s.pauseAt;
    s.pauseAt = undefined;
    setPaused(false);
  }, []);

  const finish = useCallback(() => {
    const s = t.current;
    const end = s.pauseAt ?? Date.now();
    s.finished = true;
    stopSpeech();
    return elapsedSec(s.startMs, end, s.pausedMs);
  }, []);

  return { elapsed, paused, interruptions, pause, resume, finish };
}
