import { describe, expect, it } from "vitest";
import { deriveCuisineSignal, deriveMoodCuisineSignal, suppressSignal, recordRating, recordRun, fetchRatingHistory, MIN_SUPPORT, HALF_LIFE_DAYS, type RatingObservation } from "./behavioral";
import { recommend, learnedBoost, moodBoost, MOOD_BOOST, LEARNED_TOTAL_CAP, LEARNED_BOOST_CAP, LEARNED_SIGNAL_VERSION, type CuisineSignal } from "./recommendation";
import { defaultProfile } from "./store";
import type { Recipe } from "./data";

const recipe = (id: string, cuisine: string, overrides: Partial<Recipe> = {}): Recipe => ({
  id, title: `${cuisine} dish ${id}`, cuisine, image: "", time: 30, calories: 500,
  difficulty: "Easy", moods: ["Cozy"], reason: "", ingredients: ["rice"], steps: ["cook"],
  diets: [], allergens: [], equipment: [], status: "published", mealTypes: ["dinner"],
  ...overrides,
} as Recipe);

const obs = (cuisine: string, rating: number, n: number): RatingObservation[] =>
  Array.from({ length: n }, () => ({ cuisine, rating }));

describe("deriveCuisineSignal", () => {
  it("returns no preference below the support threshold", () => {
    const s = deriveCuisineSignal(obs("Thai", 5, MIN_SUPPORT - 1));
    expect(s.preferred).toEqual([]);
  });

  it("promotes a cuisine with enough highly-rated observations", () => {
    const s = deriveCuisineSignal(obs("Thai", 5, MIN_SUPPORT));
    expect(s.preferred).toContain("Thai");
    expect(s.support.Thai).toBe(MIN_SUPPORT);
    expect(s.derivationVersion).toBe(LEARNED_SIGNAL_VERSION);
  });

  it("does not promote a frequently-but-poorly rated cuisine", () => {
    const s = deriveCuisineSignal(obs("Italian", 2, 6));
    expect(s.preferred).not.toContain("Italian");
  });

  it("is deterministic and order-independent", () => {
    const a = deriveCuisineSignal([...obs("Thai", 5, 3), ...obs("Indian", 4, 3)]);
    const b = deriveCuisineSignal([...obs("Indian", 4, 3), ...obs("Thai", 5, 3)]);
    expect(a).toEqual(b);
  });
});

describe("suppressSignal (Slice 3 forget)", () => {
  const base = deriveCuisineSignal([...obs("Thai", 5, 4), ...obs("Indian", 5, 3)]);
  it("removes a forgotten cuisine and its support", () => {
    const s = suppressSignal(base, ["Thai"]);
    expect(s.preferred).toEqual(["Indian"]);
    expect(s.support.Thai).toBeUndefined();
  });
  it("is a no-op when nothing is forgotten", () => {
    expect(suppressSignal(base, [])).toEqual(base);
  });
  it("an explicit forget wins even for a strong signal", () => {
    const strong = deriveCuisineSignal(obs("Thai", 5, 10));
    expect(suppressSignal(strong, ["Thai"]).preferred).toEqual([]);
  });
});

describe("learnedBoost", () => {
  const signal: CuisineSignal = { preferred: ["Thai"], support: { Thai: 10 }, derivationVersion: LEARNED_SIGNAL_VERSION };
  it("is zero without a signal", () => {
    expect(learnedBoost(recipe("1", "Thai"), undefined)).toBe(0);
  });
  it("is zero for a non-preferred cuisine", () => {
    expect(learnedBoost(recipe("1", "Italian"), signal)).toBe(0);
  });
  it("boosts a preferred cuisine but never above the cap", () => {
    const b = learnedBoost(recipe("1", "Thai"), signal);
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThanOrEqual(LEARNED_BOOST_CAP);
  });
});

describe("recommend with a learned signal", () => {
  // Korean and Thai are both absent from defaultProfile.cuisines, so they score
  // equally on the base ranking — isolating the learned signal's effect.
  const recipes = [recipe("kor", "Korean"), recipe("tha", "Thai")];
  it("does not change ranking when no signal is supplied (clean revert)", () => {
    const withUndef = recommend(recipes, defaultProfile, "Cozy", 50, 60).map(r => r.recipe.id);
    const explicit = recommend(recipes, defaultProfile, "Cozy", 50, 60, undefined).map(r => r.recipe.id);
    expect(withUndef).toEqual(explicit);
  });
  it("lifts a preferred-cuisine recipe above an otherwise-equal one", () => {
    const signal: CuisineSignal = { preferred: ["Thai"], support: { Thai: 5 }, derivationVersion: LEARNED_SIGNAL_VERSION };
    const base = recommend(recipes, defaultProfile, "Cozy", 50, 60);
    const learned = recommend(recipes, defaultProfile, "Cozy", 50, 60, { cuisine: signal });
    expect(base.find(r => r.recipe.id === "tha")!.score).toBe(base.find(r => r.recipe.id === "kor")!.score);
    expect(learned[0].recipe.id).toBe("tha");
  });
});

describe("recency decay (Slice 4)", () => {
  const now = Date.parse("2026-06-15T00:00:00Z");
  const ago = (days: number) => new Date(now - days * 86_400_000).toISOString();

  it("treats undated observations as full weight (backward compatible)", () => {
    const s = deriveCuisineSignal(obs("Thai", 5, 3), now);
    expect(s.preferred).toContain("Thai");
  });

  it("lets stale observations decay below the confidence bar", () => {
    // Three 5★ Thai ratings, but all ~4 half-lives old → weighted support well under
    // MIN_SUPPORT, so it should no longer count as a preference.
    const stale: RatingObservation[] = Array.from({ length: 3 }, () => ({ cuisine: "Thai", rating: 5, at: ago(HALF_LIFE_DAYS * 4) }));
    expect(deriveCuisineSignal(stale, now).preferred).not.toContain("Thai");
  });

  it("still reports the raw cook count for display even with decay", () => {
    const recent: RatingObservation[] = Array.from({ length: 4 }, () => ({ cuisine: "Thai", rating: 5, at: ago(1) }));
    const s = deriveCuisineSignal(recent, now);
    expect(s.support.Thai).toBe(4);
  });
});

describe("deriveMoodCuisineSignal (Slice 4)", () => {
  it("learns mood-specific cuisine preferences", () => {
    const observations: RatingObservation[] = [
      ...Array.from({ length: 3 }, () => ({ cuisine: "Thai", rating: 5, mood: "Tired" })),
      ...Array.from({ length: 3 }, () => ({ cuisine: "Italian", rating: 5, mood: "Celebratory" })),
    ];
    const s = deriveMoodCuisineSignal(observations);
    expect(s.byMood.Tired).toContain("Thai");
    expect(s.byMood.Celebratory).toContain("Italian");
    expect(s.byMood.Tired ?? []).not.toContain("Italian");
  });

  it("only boosts a recipe when the current mood matches", () => {
    const signal = { byMood: { Tired: ["Thai"] }, derivationVersion: LEARNED_SIGNAL_VERSION };
    expect(moodBoost(recipe("1", "Thai"), signal, "Tired")).toBe(MOOD_BOOST);
    expect(moodBoost(recipe("1", "Thai"), signal, "Celebratory")).toBe(0);
  });
});

describe("combined diversity cap (Slice 4)", () => {
  it("never exceeds the total learned-boost cap", () => {
    const recipes = [recipe("tha", "Thai")];
    const signals = {
      cuisine: { preferred: ["Thai"], support: { Thai: 20 }, derivationVersion: LEARNED_SIGNAL_VERSION },
      moodCuisine: { byMood: { Cozy: ["Thai"] }, derivationVersion: LEARNED_SIGNAL_VERSION },
    };
    const withSignals = recommend(recipes, defaultProfile, "Cozy", 50, 60, signals)[0].score;
    const without = recommend(recipes, defaultProfile, "Cozy", 50, 60)[0].score;
    expect(withSignals - without).toBeLessThanOrEqual(LEARNED_TOTAL_CAP);
  });
});

describe("behavioral recording (no backend)", () => {
  it("no-ops safely without a session", async () => {
    await expect(recordRating({ providerRecipeId: "x", title: "t", cuisine: "Thai", rating: 5 })).resolves.toBe(false);
    await expect(recordRun({ rankingConfigVersion: "pilot-v1", candidates: [] })).resolves.toBe(false);
    await expect(fetchRatingHistory()).resolves.toEqual([]);
  });
});
