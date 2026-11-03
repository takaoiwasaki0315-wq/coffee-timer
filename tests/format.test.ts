import { describe, expect, it } from "vitest";
import { formatCountdown, formatSec } from "../src/lib/format";

describe("formatSec", () => {
  it.each([
    [0, "0:00"],
    [9.9, "0:09"],
    [45, "0:45"],
    [75, "1:15"],
    [600, "10:00"],
    [-3, "0:00"],
  ])("%s → %s", (s, out) => expect(formatSec(s)).toBe(out));
});

describe("formatCountdown", () => {
  it.each([
    [0.2, "0:01"],
    [3, "0:03"],
    [44.9, "0:45"],
    [0, "0:00"],
  ])("%s → %s", (s, out) => expect(formatCountdown(s)).toBe(out));
});
