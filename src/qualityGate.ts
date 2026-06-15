import type { Recipe } from "./data";
import type { Profile } from "./store";
import type { RecipeFilters } from "./searchFilters";
import { recommend } from "./recommendation";
import { fetchCuratedRecipes } from "./recipes";

// Slice 1 quality gate (roadmap v3): before trusting deterministic ranking as the
// default, prove it is at parity with AI curation on a fixed sample of queries.
// This module is the measurement tool. The pure comparison core (compareRankings /
// aggregate) is unit-tested; `collectDeterministicVsAi` runs a live head-to-head
// against the backend for a real scenario.
//
// "Parity" here is about ranking AGREEMENT, not a claim that one is correct — the
// final call needs a human/thumb label per the roadmap. This quantifies how far
// apart the two orderings are so a reviewer knows where to look.

export type RankComparison = {
  k: number;
  top1Match: boolean;        // do both rankers agree on the #1 pick?
  topKJaccard: number;       // set overlap of the top-k (0..1)
  rankCorrelation: number;   // Spearman ρ over items present in both lists (-1..1)
  displaced: number;         // top-k items in one list missing from the other's top-k
};

const rankIndex = (ids: string[]) => new Map(ids.map((id, i) => [id, i]));

// Spearman rank correlation over the items present in BOTH lists. Returns 1 for a
// degenerate (<2 common items) case where the top picks agree, else 0.
function spearman(a: string[], b: string[], top1Match: boolean): number {
  const ra = rankIndex(a);
  const rb = rankIndex(b);
  const common = a.filter(id => rb.has(id));
  const n = common.length;
  if (n < 2) return top1Match ? 1 : 0;
  let sumDsq = 0;
  for (const id of common) {
    const d = (ra.get(id)! - rb.get(id)!);
    sumDsq += d * d;
  }
  // Note: ranks here are positions within each full list (a reasonable proxy when
  // both lists contain the same candidate pool, as in the head-to-head).
  return 1 - (6 * sumDsq) / (n * (n * n - 1));
}

export function compareRankings(deterministic: string[], ai: string[], k = 5): RankComparison {
  const topA = deterministic.slice(0, k);
  const topB = ai.slice(0, k);
  const setA = new Set(topA);
  const setB = new Set(topB);
  const intersection = topA.filter(id => setB.has(id)).length;
  const union = new Set([...topA, ...topB]).size;
  return {
    k,
    top1Match: deterministic[0] !== undefined && deterministic[0] === ai[0],
    topKJaccard: union === 0 ? 1 : intersection / union,
    rankCorrelation: spearman(deterministic, ai, deterministic[0] === ai[0]),
    displaced: topB.filter(id => !setA.has(id)).length, // AI top-k picks the deterministic top-k missed
  };
}

export type QualityGateVerdict = {
  scenarios: number;
  meanTopKJaccard: number;
  meanRankCorrelation: number;
  top1AgreementRate: number;
  // Heuristic parity signal — NOT a substitute for human/thumb evaluation. Flags
  // whether the two orderings are close enough that defaulting to deterministic is
  // unlikely to be a large quality regression.
  likelyParity: boolean;
};

export const PARITY_THRESHOLDS = { topKJaccard: 0.5, rankCorrelation: 0.3, top1Agreement: 0.4 };

export function aggregate(comparisons: RankComparison[]): QualityGateVerdict {
  const n = comparisons.length || 1;
  const mean = (sel: (c: RankComparison) => number) => comparisons.reduce((s, c) => s + sel(c), 0) / n;
  const meanTopKJaccard = mean(c => c.topKJaccard);
  const meanRankCorrelation = mean(c => c.rankCorrelation);
  const top1AgreementRate = mean(c => (c.top1Match ? 1 : 0));
  return {
    scenarios: comparisons.length,
    meanTopKJaccard,
    meanRankCorrelation,
    top1AgreementRate,
    likelyParity:
      meanTopKJaccard >= PARITY_THRESHOLDS.topKJaccard &&
      meanRankCorrelation >= PARITY_THRESHOLDS.rankCorrelation &&
      top1AgreementRate >= PARITY_THRESHOLDS.top1Agreement,
  };
}

// A fixed, representative sample of check-in scenarios to run the gate against.
// Kept small and stable so results are comparable across runs.
export type Scenario = { name: string; mood: string; energy: number; time: number; query?: string; filters?: RecipeFilters };
export const GATE_SCENARIOS: Scenario[] = [
  { name: "tired weeknight", mood: "Tired", energy: 25, time: 30 },
  { name: "cozy comfort", mood: "Cozy", energy: 45, time: 45 },
  { name: "energised quick", mood: "Energised", energy: 80, time: 20 },
  { name: "stressed light", mood: "Stressed", energy: 35, time: 25, filters: { diet: "Vegetarian" } },
  { name: "adventurous dinner", mood: "Adventurous", energy: 70, time: 60, filters: { type: "dinner" } },
  { name: "focused protein", mood: "Focused", energy: 60, time: 30, query: "chicken" },
];

// Live head-to-head for one scenario: fetch the SAME real candidate pool, then
// compare the deterministic client ranking against the AI-curated order. Requires
// a configured backend + signed-in session; returns null if the live fetch fails.
export async function collectDeterministicVsAi(
  profile: Profile,
  scenario: Scenario,
  k = 5,
): Promise<RankComparison | null> {
  const { mood, energy, time, query = "", filters = {} } = scenario;
  // AI-curated order (curate=true) and the raw candidate pool (curate=false).
  const [aiList, rawList] = await Promise.all([
    fetchCuratedRecipes(profile, mood, energy, time, query, filters, {}, 0, true, true),
    fetchCuratedRecipes(profile, mood, energy, time, query, filters, {}, 0, true, false),
  ]);
  if (!aiList?.length || !rawList?.length) return null;
  const deterministic = recommend(rawList as Recipe[], profile, mood, energy, time).map(r => r.recipe.id);
  return compareRankings(deterministic, (aiList as Recipe[]).map(r => r.id), k);
}
