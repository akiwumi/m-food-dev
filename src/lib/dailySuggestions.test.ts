import { describe, expect, it } from "vitest";
import { deriveDailySuggestions } from "./dailySuggestions";
import type { Recipe } from "../data";
import type { Profile } from "../store";
import { defaultProfile } from "../store";
import type { DiaryEntry } from "../appTypes";

// Minimal Recipe stub — deriveDailySuggestions only reads id, status, cuisine,
// diets, and allergens.
function makeRecipe(id: string, cuisine: string, extra: Partial<Recipe> = {}): Recipe {
  return {
    id, cuisine, status: "published", diets: [], allergens: [], title: id,
    ...extra,
  } as unknown as Recipe;
}

const profile: Profile = { ...defaultProfile, diet: "Everything", allergies: [] };

describe("deriveDailySuggestions", () => {
  it("only returns published recipes", () => {
    const catalog = [
      makeRecipe("a", "Italian"),
      makeRecipe("b", "Thai", { status: "draft" }),
    ];
    const picks = deriveDailySuggestions([], [], catalog, profile, 5);
    expect(picks.map(r => r.id)).toEqual(["a"]);
  });

  it("excludes recipes that clash with a profile allergy (case-insensitive)", () => {
    const catalog = [
      makeRecipe("safe", "Italian", { allergens: ["Gluten"] }),
      makeRecipe("unsafe", "Thai", { allergens: ["Peanut"] }),
    ];
    const picks = deriveDailySuggestions([], [], catalog, { ...profile, allergies: ["peanut"] }, 5);
    expect(picks.map(r => r.id)).toEqual(["safe"]);
  });

  it("respects a specific diet", () => {
    const catalog = [
      makeRecipe("vegan", "Italian", { diets: ["Vegan"] }),
      makeRecipe("omni", "Thai", { diets: [] }),
    ];
    const picks = deriveDailySuggestions([], [], catalog, { ...profile, diet: "Vegan" }, 5);
    expect(picks.map(r => r.id)).toEqual(["vegan"]);
  });

  it("keeps the full catalog available to an omnivore", () => {
    const catalog = [makeRecipe("chicken", "British"), makeRecipe("vegan", "Indian", { diets: ["Vegan"] })];
    expect(deriveDailySuggestions([], [], catalog, { ...profile, diet: "Omnivore" }, 5)).toHaveLength(2);
  });

  it("caps the result at `count`", () => {
    const catalog = Array.from({ length: 10 }, (_, i) => makeRecipe(`r${i}`, `Cuisine${i}`));
    expect(deriveDailySuggestions([], [], catalog, profile, 3)).toHaveLength(3);
  });

  it("prefers cuisine variety across the leading picks", () => {
    const catalog = [
      makeRecipe("it1", "Italian"), makeRecipe("it2", "Italian"),
      makeRecipe("th1", "Thai"), makeRecipe("mx1", "Mexican"),
    ];
    const picks = deriveDailySuggestions([], [], catalog, profile, 3);
    const cuisines = picks.map(r => r.cuisine);
    // At least two distinct cuisines among 3 picks (no all-Italian run).
    expect(new Set(cuisines).size).toBeGreaterThan(1);
  });

  it("boosts cuisines the diary rated highly", () => {
    const catalog = [makeRecipe("thai", "Thai"), makeRecipe("italian", "Italian")];
    const diary: DiaryEntry[] = [
      { recipe: makeRecipe("old-thai", "Thai"), rating: 5, when: "2026-01-01" },
    ];
    const picks = deriveDailySuggestions(diary, [], catalog, profile, 1);
    expect(picks[0].cuisine).toBe("Thai");
  });
});
