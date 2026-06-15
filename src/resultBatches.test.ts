import { describe, expect, it } from "vitest";
import type { Recipe } from "./data";
import { appendUniqueRecipes, takeUniqueBatch } from "./resultBatches";

const recipe = (id: string, title = `Recipe ${id}`): Recipe => ({
  id,
  title,
  image: "",
  time: 20,
  difficulty: "Easy",
  calories: 300,
  moods: ["Cozy"],
  reason: "",
  ingredients: ["beans"],
  steps: [],
  cuisine: "African",
  diets: ["Vegetarian"],
  allergens: [],
  equipment: [],
  status: "published",
});

describe("result batches", () => {
  it("takes exactly five unique recipes from a candidate pool", () => {
    const candidates = [
      ...Array.from({ length: 7 }, (_, index) => recipe(String(index))),
      recipe("duplicate-id"),
      recipe("duplicate-id", "Different title"),
      recipe("duplicate-title", " recipe 2 "),
    ];

    expect(takeUniqueBatch(candidates).map(item => item.id)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("appends five unseen recipes without replacing visible results", () => {
    const visible = Array.from({ length: 5 }, (_, index) => recipe(String(index)));
    const candidates = [
      recipe("1"),
      recipe("duplicate-title", " recipe 2 "),
      ...Array.from({ length: 7 }, (_, index) => recipe(String(index + 5))),
    ];

    const appended = appendUniqueRecipes(visible, candidates);

    expect(appended.map(item => item.id)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  });
});
