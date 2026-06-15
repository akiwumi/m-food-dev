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
    expect(recommend(fixture, profile, "Cozy", 30, 30)[0].configVersion).toBe("mood-tags-v2");
  });

  it("never returns a recipe beyond the selected cook time", () => {
    const profile = { ...defaultProfile, equipment: ["Stovetop", "Oven", "Blender"] };
    expect(recommend(fixture, profile, "Cozy", 30, 15).map(item => item.recipe.title)).toEqual(["Salad"]);
  });

  it("enforces every selected diner's allergen", () => {
    const shared = profileForDiners(defaultProfile, [{ id: "guest", name: "Guest", relationship: "Friend", diet: "Anything", allergies: ["Dairy"] }]);
    expect(safeRecipes(fixture, { ...shared, equipment: ["Stovetop", "Oven", "Blender"] }).every(recipe => !recipe.allergens.includes("Dairy"))).toBe(true);
  });

  it("matches allergens case-insensitively and checks ingredient text", () => {
    const safe = safeRecipes([
      { ...fixture[1], id: "declared", title: "Nut bowl", allergens: ["Tree Nuts"], ingredients: ["rice"] },
      { ...fixture[1], id: "ingredient", title: "Creamy bowl", allergens: [], ingredients: ["milk", "rice"] },
    ], { ...defaultProfile, allergies: ["tree nuts", "Milk"], equipment: ["Stovetop"] });

    expect(safe).toEqual([]);
  });

  it("never relaxes conflicting household diets to Everything", () => {
    const shared = profileForDiners(
      { ...defaultProfile, diet: "Vegan" },
      [{ id: "guest", name: "Guest", relationship: "Friend", diet: "Keto", allergies: [] }],
    );

    expect(shared.diet).not.toBe("Everything");
    expect(safeRecipes([
      { ...fixture[1], id: "vegan-keto", title: "Tofu bowl", diets: ["Vegan", "Keto"], ingredients: ["tofu"] },
      { ...fixture[1], id: "vegan-only", title: "Bean bowl", diets: ["Vegan"], ingredients: ["beans"] },
    ], { ...shared, equipment: ["Stovetop"] }).map(recipe => recipe.id)).toEqual(["vegan-keto"]);
  });
});

describe("mood tag ranking", () => {
  const profile = { ...defaultProfile, cuisines: [], comfortFoods: [], flavorLikes: [], textureLikes: [], equipment: ["Stovetop"] };

  it("ranks recipes using weighted positive and negative mood tags", () => {
    const recipes: Recipe[] = [
      { ...fixture[0], id: "technical", moods: [], tags: { effort: ["technical", "many_steps", "long_prep"] } },
      { ...fixture[0], id: "comfort", moods: [], tags: { mood: ["comforting"], effort: ["low_effort", "quick"], sensory: ["warm"] } },
    ];

    expect(recommend(recipes, profile, "Tired", 60, 60)[0].recipe.id).toBe("comfort");
  });

  it("matches legacy recipe moods to canonical check-ins", () => {
    const legacy = { ...fixture[0], id: "legacy", moods: ["Cozy"], tags: {} };
    const unrelated = { ...fixture[0], id: "other", moods: ["Happy"], tags: {} };

    expect(recommend([unrelated, legacy], profile, "Sad", 60, 60)[0].recipe.id).toBe("legacy");
  });
});
