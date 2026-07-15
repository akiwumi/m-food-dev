import { describe, expect, it } from "vitest";
import { recipeProfilePayload, withHardTimeout } from "./recipes";
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
      moodNeeds: { Tired: "soup, not baking" },
      sensoryCues: ["Bright"],
      textureAvoids: ["Mushy"],
    });

    expect(payload).toMatchObject({
      diet: "Pescatarian",
      foodRelationship: "Food helps me feel grounded",
      comfortCues: ["Warm bowls"],
      moodNeeds: { Tired: "soup, not baking" },
      sensoryCues: ["Bright"],
      textureAvoids: ["Mushy"],
    });
  });
});

describe("withHardTimeout", () => {
  it("does not report a timeout after the operation has already completed", async () => {
    let timedOut = false;

    await expect(withHardTimeout(Promise.resolve("done"), 1, "fallback", () => { timedOut = true; })).resolves.toBe("done");
    await new Promise(resolve => setTimeout(resolve, 5));

    expect(timedOut).toBe(false);
  });
});

describe("finalizeSearchResults", () => {
  const recipe = (patch: Partial<Recipe>): Recipe => ({
    id: "1", title: "Bean Stew", image: "", time: 20, difficulty: "Easy", calories: 300,
    moods: ["Cozy"], reason: "", ingredients: ["beans"], steps: [], cuisine: "African",
    diets: ["Vegetarian"], allergens: [], equipment: [], status: "published", mealTypes: ["main course"],
    ...patch,
  });

  it("can return a full unique candidate pool for display batching", () => {
    const recipes = Array.from({ length: 10 }, (_, index) => recipe({ id: String(index), title: `Main ${index}` }));
    recipes.push(recipe({ id: "duplicate", title: " main 1 " }));
    recipes.push(recipe({ id: "dessert", title: "Cake", mealTypes: ["dessert"] }));

    const results = finalizeSearchResults(recipes, defaultProfile, { type: "main" }, Infinity);

    expect(results).toHaveLength(10);
    expect(results.every(result => result.mealTypes?.includes("main course"))).toBe(true);
  });

  it("does not let a search diet weaken the saved vegetarian profile", () => {
    const results = finalizeSearchResults([
      recipe({ id: "meat", title: "Chicken salad", ingredients: ["chicken"], diets: ["Vegetarian"] }),
      recipe({ id: "veg", title: "Bean salad" }),
    ], { ...defaultProfile, diet: "Vegetarian" }, { diet: "Any" });

    expect(results.map(result => result.title)).toEqual(["Bean salad"]);
  });

  it("enforces an explicit vegan filter beyond a saved vegetarian profile", () => {
    const results = finalizeSearchResults([
      recipe({ id: "dairy", title: "Cheese pasta", ingredients: ["cheese", "pasta"], diets: ["Vegetarian"] }),
      recipe({ id: "vegan", title: "Bean pasta", diets: ["Vegetarian", "Vegan"] }),
    ], { ...defaultProfile, diet: "Vegetarian" }, { diet: "Vegan" });

    expect(results.map(result => result.title)).toEqual(["Bean pasta"]);
  });

  it("treats Asian as a cuisine family for vegetarian lunch results", () => {
    const results = finalizeSearchResults([
      recipe({ id: "thai", title: "Thai tofu lunch", cuisine: "Thai", mealTypes: ["main course"], diets: ["Vegetarian"], time: 25 }),
      recipe({ id: "chinese", title: "Chinese vegetable lunch", cuisine: "Chinese", mealTypes: ["lunch"], diets: ["Vegetarian"], time: 35 }),
      recipe({ id: "italian", title: "Italian lunch", cuisine: "Italian", mealTypes: ["lunch"], diets: ["Vegetarian"], time: 20 }),
    ], { ...defaultProfile, diet: "Vegetarian" }, { cuisines: ["Asian"], type: "lunch", diet: "Vegetarian", maxReadyTime: 45 }, Infinity);

    expect(results.map(result => result.id)).toEqual(["thai", "chinese"]);
  });

});
