import { describe, expect, it } from "vitest";
import { deterministicTasteSummary, fetchTasteSummary } from "./tasteSummary";
import { LEARNED_SIGNAL_VERSION, type CuisineSignal, type MoodCuisineSignal } from "./recommendation";

const cuisine = (preferred: string[]): CuisineSignal => ({
  preferred, support: Object.fromEntries(preferred.map((c, i) => [c, 5 - i])), derivationVersion: LEARNED_SIGNAL_VERSION,
});
const mood = (byMood: Record<string, string[]>): MoodCuisineSignal => ({ byMood, derivationVersion: LEARNED_SIGNAL_VERSION });

describe("deterministicTasteSummary", () => {
  it("explains the empty state without inventing anything", () => {
    expect(deterministicTasteSummary(null, null)).toMatch(/not enough cooking history/i);
  });

  it("names preferred cuisines in plain language", () => {
    const s = deterministicTasteSummary(cuisine(["Thai", "Indian"]), null);
    expect(s).toContain("Thai and Indian");
  });

  it("includes mood patterns when present", () => {
    const s = deterministicTasteSummary(cuisine(["Thai"]), mood({ Tired: ["Thai"] }));
    expect(s).toMatch(/when you’re tired/i);
  });

  it("only ever mentions cuisines that are in the signal (no fabrication)", () => {
    const s = deterministicTasteSummary(cuisine(["Thai"]), null);
    expect(s).not.toMatch(/italian|mexican|indian/i);
  });

  it("is deterministic for the same signal", () => {
    const sig = cuisine(["Thai", "Korean"]);
    expect(deterministicTasteSummary(sig, null)).toBe(deterministicTasteSummary(sig, null));
  });
});

describe("fetchTasteSummary (no backend)", () => {
  it("falls back to deterministic copy and never throws", async () => {
    const result = await fetchTasteSummary(cuisine(["Thai"]), null);
    expect(result.source).toBe("fallback");
    expect(result.summary).toBe(deterministicTasteSummary(cuisine(["Thai"]), null));
  });
});
