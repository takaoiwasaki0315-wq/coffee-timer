import { DEFAULT_GRINDER } from "./log";
import { DEFAULT_LEAD_SEC } from "./schedule";

export interface Settings {
  /** 予告の秒数。0 で予告なし */
  leadSec: number;
  grinder: string;
}

export const DEFAULT_SETTINGS: Settings = { leadSec: DEFAULT_LEAD_SEC, grinder: DEFAULT_GRINDER };

export const SETTINGS_LIMITS = { leadSec: { min: 0, max: 10 }, grinder: { maxLen: 30 } } as const;

export function isValidSettings(x: unknown): x is Settings {
  if (typeof x !== "object" || x === null) return false;
  const s = x as Record<string, unknown>;
  return (
    Number.isInteger(s.leadSec) &&
    (s.leadSec as number) >= SETTINGS_LIMITS.leadSec.min &&
    (s.leadSec as number) <= SETTINGS_LIMITS.leadSec.max &&
    typeof s.grinder === "string" &&
    s.grinder.trim() !== "" &&
    s.grinder.length <= SETTINGS_LIMITS.grinder.maxLen
  );
}
