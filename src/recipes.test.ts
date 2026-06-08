import { describe, expect, it } from "vitest";
import { recipeProfilePayload } from "./recipes";
import { defaultProfile } from "./store";
import { finalizeSearchResults } from "./searchResults";
import type { Recipe } from "./data";

describe("recipeProfilePayload", () => {
  it("sends the user's full food psychology profile to Moody", () => {
    const payload = recipeProfilePayload({
      ...defaultProfile,
      diet: "Pescatarian",
      foodRelationship: "Food helps me feel grounded",
      comfortCues: ["Warm bowls"],
      sensoryCues: ["Bright"],
      textureAvoids: ["Mushy"],
    });

    expect(payload).toMatchObject({
      diet: "Pescatarian",
      foodRelationship: "Food helps me feel grounded",
      comfortCues: ["Warm bowls"],
      sensoryCues: ["Bright"],
      textureAvoids: ["Mushy"],
    });
  });
});

describe("finalizeSearchResults", () => {
  const recipe = (patch: Partial<Recipe>): Recipe => ({
    id: "1", title: "Bean Stew", image: "", time: 20, difficulty: "Easy", calories: 300,
    moods: ["Cozy"], reason: "", ingredients: ["beans"], steps: [], cuisine: "African",
    diets: ["Vegetarian"], allergens: [], equipment: [], status: "published", mealTypes: ["main course"],
    ...patch,
  });

  it("returns eight unique results matching the selected category", () => {
    const recipes = Array.from({ length: 10 }, (_, index) => recipe({ id: String(index), title: `Main ${index}` }));
    recipes.push(recipe({ id: "duplicate", title: " main 1 " }));
    recipes.push(recipe({ id: "dessert", title: "Cake", mealTypes: ["dessert"] }));

    const results = finalizeSearchResults(recipes, defaultProfile, { type: "main" });

    expect(results).toHaveLength(8);
    expect(results.every(result => result.mealTypes?.includes("main course"))).toBe(true);
  });

  it("does not let a search diet weaken the saved vegetarian profile", () => {
    const results = finalizeSearchResults([
      recipe({ id: "meat", title: "Chicken salad", ingredients: ["chicken"], diets: ["Vegetarian"] }),
      recipe({ id: "veg", title: "Bean salad" }),
    ], { ...defaultProfile, diet: "Vegetarian" }, { diet: "Any" });

    expect(results.map(result => result.title)).toEqual(["Bean salad"]);
  });
});
