import { describe, expect, it } from "vitest";
import type { Recipe } from "./data";
import { defaultProfile } from "./store";
import { moodyCandidates, resolveMoodyRecipe } from "./moodyRecipes";

const recipe = (patch: Partial<Recipe> = {}): Recipe => ({
  id: "safe",
  title: "Safe Bean Bowl",
  image: "",
  time: 20,
  difficulty: "Easy",
  calories: 400,
  moods: ["Tired"],
  reason: "Quick and comforting",
  ingredients: ["beans", "rice"],
  steps: [],
  cuisine: "Mexican",
  diets: ["Vegetarian"],
  allergens: [],
  equipment: [],
  status: "published",
  ...patch,
});

describe("Moody recipe links", () => {
  it("serializes searchable catalog recipes for structured selection", () => {
    expect(moodyCandidates([recipe()])).toEqual([{
      id: "safe",
      title: "Safe Bean Bowl",
      time: 20,
      cuisine: "Mexican",
      reason: "Quick and comforting",
      ingredients: ["beans", "rice"],
    }]);
  });

  it("resolves a returned ID only when it remains safe for the profile", () => {
    const safe = recipe();
    const unsafe = recipe({ id: "unsafe", title: "Peanut noodles", ingredients: ["peanuts", "noodles"], allergens: ["Peanuts"] });
    const profile = { ...defaultProfile, allergies: ["Peanuts"] };

    expect(resolveMoodyRecipe("safe", [safe, unsafe], profile)).toBe(safe);
    expect(resolveMoodyRecipe("unsafe", [safe, unsafe], profile)).toBeUndefined();
    expect(resolveMoodyRecipe("missing", [safe, unsafe], profile)).toBeUndefined();
    expect(resolveMoodyRecipe(undefined, [safe], profile)).toBeUndefined();
  });
});
