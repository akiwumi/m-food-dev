import { describe, expect, it } from "vitest";
import type { Recipe } from "./data";
import { defaultProfile } from "./store";
import { profileForDiners, recommend, safeRecipes } from "./recommendation";

const fixture: Recipe[] = [
  {
    id: "r1", title: "Pasta", image: "", time: 25, difficulty: "Easy", calories: 600,
    moods: ["Tired", "Cozy"], reason: "Comforting", cuisine: "Italian",
    diets: ["Vegetarian"], allergens: ["Gluten", "Dairy"],
    equipment: ["Stovetop"], status: "published", ingredients: ["pasta", "parmesan"], steps: [],
  },
  {
    id: "r2", title: "Salad", image: "", time: 15, difficulty: "Easy", calories: 300,
    moods: ["Energised", "Happy"], reason: "Light", cuisine: "Mediterranean",
    diets: ["Vegetarian", "Gluten-free", "High protein"], allergens: [],
    equipment: ["Stovetop"], status: "published", ingredients: ["lettuce", "chicken"], steps: [],
  },
];

describe("recommendation safety", () => {
  it("never returns recipes containing a hard allergen", () => {
    const safe = safeRecipes(fixture, { ...defaultProfile, allergies: ["Dairy"], equipment: ["Stovetop", "Oven", "Blender"] });
    expect(safe.every(recipe => !recipe.allergens.includes("Dairy"))).toBe(true);
  });

  it("never relaxes dietary exclusions", () => {
    const safe = safeRecipes(fixture, { ...defaultProfile, diet: "Gluten-free", equipment: ["Stovetop", "Oven", "Blender"] });
    expect(safe.every(recipe => recipe.diets.includes("Gluten-free"))).toBe(true);
  });

  it("rejects meat recipes mislabeled vegetarian", () => {
    const safe = safeRecipes(fixture, { ...defaultProfile, diet: "Vegetarian", equipment: ["Stovetop", "Oven", "Blender"] });
    expect(safe.map(recipe => recipe.title)).toEqual(["Pasta"]);
  });

  it("ranks deterministically and records the config version", () => {
    const profile = { ...defaultProfile, equipment: ["Stovetop", "Oven", "Blender"] };
    expect(recommend(fixture, profile, "Cozy", 30, 30)).toEqual(recommend(fixture, profile, "Cozy", 30, 30));
    expect(recommend(fixture, profile, "Cozy", 30, 30)[0].configVersion).toBe("pilot-v1");
  });

  it("never returns a recipe beyond the selected cook time", () => {
    const profile = { ...defaultProfile, equipment: ["Stovetop", "Oven", "Blender"] };
    expect(recommend(fixture, profile, "Cozy", 30, 15).map(item => item.recipe.title)).toEqual(["Salad"]);
  });

  it("enforces every selected diner's allergen", () => {
    const shared = profileForDiners(defaultProfile, [{ id: "guest", name: "Guest", relationship: "Friend", diet: "Anything", allergies: ["Dairy"] }]);
    expect(safeRecipes(fixture, { ...shared, equipment: ["Stovetop", "Oven", "Blender"] }).every(recipe => !recipe.allergens.includes("Dairy"))).toBe(true);
  });
});
