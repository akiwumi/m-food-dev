import { describe, expect, it } from "vitest";
import { compareRankings, aggregate, GATE_SCENARIOS } from "./qualityGate";

describe("compareRankings", () => {
  it("reports perfect agreement for identical orderings", () => {
    const r = compareRankings(["a", "b", "c", "d", "e"], ["a", "b", "c", "d", "e"], 5);
    expect(r.top1Match).toBe(true);
    expect(r.topKJaccard).toBe(1);
    expect(r.rankCorrelation).toBeCloseTo(1, 5);
    expect(r.displaced).toBe(0);
  });

  it("reports zero overlap for disjoint top-k", () => {
    const r = compareRankings(["a", "b", "c"], ["x", "y", "z"], 3);
    expect(r.top1Match).toBe(false);
    expect(r.topKJaccard).toBe(0);
    expect(r.displaced).toBe(3);
  });

  it("detects a fully reversed ordering as strong negative correlation", () => {
    const r = compareRankings(["a", "b", "c", "d", "e"], ["e", "d", "c", "b", "a"], 5);
    expect(r.top1Match).toBe(false);
    expect(r.rankCorrelation).toBeCloseTo(-1, 5);
    expect(r.topKJaccard).toBe(1); // same set, different order
  });

  it("counts partial top-k overlap", () => {
    const r = compareRankings(["a", "b", "c", "d", "e"], ["a", "b", "x", "y", "z"], 5);
    expect(r.top1Match).toBe(true);
    expect(r.displaced).toBe(3); // x, y, z not in deterministic top-5
    expect(r.topKJaccard).toBeCloseTo(2 / 8, 5); // intersection 2, union 8
  });
});

describe("aggregate", () => {
  it("flags likely parity when orderings broadly agree", () => {
    const v = aggregate([
      compareRankings(["a", "b", "c", "d", "e"], ["a", "c", "b", "d", "e"], 5),
      compareRankings(["a", "b", "c", "d", "e"], ["a", "b", "d", "c", "e"], 5),
    ]);
    expect(v.likelyParity).toBe(true);
    expect(v.top1AgreementRate).toBe(1);
  });

  it("withholds parity when orderings disagree badly", () => {
    const v = aggregate([
      compareRankings(["a", "b", "c"], ["x", "y", "z"], 3),
      compareRankings(["a", "b", "c"], ["z", "y", "x"], 3),
    ]);
    expect(v.likelyParity).toBe(false);
  });
});

describe("GATE_SCENARIOS", () => {
  it("is a non-empty, stable fixed sample", () => {
    expect(GATE_SCENARIOS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(GATE_SCENARIOS.map(s => s.name)).size).toBe(GATE_SCENARIOS.length);
  });
});
