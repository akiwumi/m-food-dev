import { describe, expect, it } from "vitest";
import { defaultProfile } from "./store";
import { buildQuickStartProfilePatch, selectActivationPicks, activationFitReason } from "./activation";
import type { Recipe } from "./data";

describe("quick-start activation", () => {
  it("stores only the minimum first-run inputs needed for a safe first pick", () => {
    const patch = buildQuickStartProfilePatch({
      diet: "Vegetarian",
      allergies: ["Dairy"],
    });

    expect(patch).toEqual({
      diet: "Vegetarian",
      allergies: ["Dairy"],
      quickStartCompleted: true,
      quickStartSafetyConfirmed: true,
      path: "quick",
    });
  });

  it("does not mark the full deep profile as onboarded", () => {
    const profile = {
      ...defaultProfile,
      ...buildQuickStartProfilePatch({ diet: "Vegan", allergies: [] }),
    };

    expect(profile.onboarded).toBe(false);
    expect(profile.quickStartCompleted).toBe(true);
  });
});

const activationRecipes: Recipe[] = [
  {
    id: "comfort-orzo",
    title: "One-Pot Tomato Orzo",
    image: "",
    time: 22,
    difficulty: "Easy",
    calories: 520,
    moods: ["Tired", "Stressed"],
    reason: "Warm, simple, and low effort.",
    cuisine: "Italian",
    mealTypes: ["dinner"],
    diets: ["Vegetarian"],
    allergens: [],
    equipment: ["Stovetop"],
    status: "published",
    ingredients: ["orzo", "tomatoes", "stock"],
    steps: [],
    tags: { effort: ["low_effort", "one_pot", "quick"], sensory: ["warm"], mood: ["comforting"] },
  },
  {
    id: "quick-salad",
    title: "Chickpea Crunch Salad",
    image: "",
    time: 15,
    difficulty: "Easy",
    calories: 430,
    moods: ["Healthy"],
    reason: "Fresh and fast.",
    cuisine: "Mediterranean",
    mealTypes: ["dinner"],
    diets: ["Vegetarian", "Gluten-free"],
    allergens: [],
    equipment: ["Stovetop"],
    status: "published",
    ingredients: ["chickpeas", "cucumber"],
    steps: [],
  },
  {
    id: "rice-bowl",
    title: "Egg Rice Bowl",
    image: "",
    time: 18,
    difficulty: "Easy",
    calories: 480,
    moods: ["Tired"],
    reason: "Fast pantry dinner.",
    cuisine: "Japanese",
    mealTypes: ["dinner"],
    diets: ["Vegetarian"],
    allergens: ["Eggs"],
    equipment: ["Stovetop"],
    status: "published",
    ingredients: ["rice", "egg"],
    steps: [],
  },
  {
    id: "long-roast",
    title: "Slow Roast Vegetables",
    image: "",
    time: 90,
    difficulty: "Medium",
    calories: 650,
    moods: ["Happy"],
    reason: "Lovely, but slow.",
    cuisine: "Mediterranean",
    mealTypes: ["dinner"],
    diets: ["Vegetarian"],
    allergens: [],
    equipment: ["Oven"],
    status: "published",
    ingredients: ["vegetables"],
    steps: [],
  },
];

describe("activation picks", () => {
  it("returns one hero pick and two backups from safe ranked recipes", () => {
    const picks = selectActivationPicks({
      recipes: activationRecipes,
      profile: { ...defaultProfile, diet: "Vegetarian", allergies: [], equipment: ["Stovetop", "Oven"] },
      mood: "Tired",
      energy: 20,
      time: 30,
    });

    expect(picks.hero?.id).toBe("comfort-orzo");
    expect(picks.backups.map(recipe => recipe.id)).toEqual(["rice-bowl", "quick-salad"]);
  });

  it("never includes recipes blocked by allergies or time limit", () => {
    const picks = selectActivationPicks({
      recipes: activationRecipes,
      profile: { ...defaultProfile, diet: "Vegetarian", allergies: ["Eggs"], equipment: ["Stovetop", "Oven"] },
      mood: "Tired",
      energy: 20,
      time: 30,
    });

    expect([picks.hero, ...picks.backups].filter(Boolean).map(recipe => recipe!.id)).not.toContain("rice-bowl");
    expect([picks.hero, ...picks.backups].filter(Boolean).map(recipe => recipe!.id)).not.toContain("long-roast");
  });
});

describe("activation fit explanation", () => {
  it("explains the recommendation using mood, energy, time, safety, and recipe facts", () => {
    const recipe = activationRecipes[0];
    const text = activationFitReason({
      recipe,
      mood: "Tired",
      energy: 20,
      time: 30,
      profile: { ...defaultProfile, diet: "Vegetarian", allergies: ["Dairy"] },
    });

    expect(text).toContain("tired");
    expect(text).toContain("low effort");
    expect(text).toContain("22 minutes");
    expect(text).toContain("Vegetarian");
    expect(text).toContain("avoids Dairy");
  });
});

import { adjustQuickStartAfterRejection } from "./activation";

describe("activation rejection learning", () => {
  it("turns too much effort into lower energy and lower time", () => {
    expect(adjustQuickStartAfterRejection({ mood: "Tired", energy: 50, time: 45 }, "too-much-effort")).toEqual({
      mood: "Tired",
      energy: 20,
      time: 30,
    });
  });

  it("turns not in the mood into a comfort-seeking tired pick", () => {
    expect(adjustQuickStartAfterRejection({ mood: "Happy", energy: 60, time: 45 }, "not-in-the-mood")).toEqual({
      mood: "Tired",
      energy: 35,
      time: 45,
    });
  });
});
