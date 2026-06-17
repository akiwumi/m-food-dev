import { describe, expect, it } from "vitest";
import type { Recipe } from "./data";
import { canonicalMoods, flattenRecipeTags, inferRecipeTags, normalizeMood, scoreByMood } from "./moodRules";

const recipe = (patch: Partial<Recipe> = {}): Recipe => ({
  id: "recipe",
  title: "Tomato rice bowl",
  image: "",
  time: 20,
  difficulty: "Easy",
  calories: 420,
  moods: [],
  reason: "",
  ingredients: ["rice", "tomato", "spinach"],
  steps: [{ text: "Cook everything in one pot." }],
  cuisine: "Mediterranean",
  diets: ["Vegetarian"],
  allergens: [],
  equipment: ["Stovetop"],
  status: "published",
  ...patch,
});

describe("canonical mood taxonomy", () => {
  it("defines the approved 6 check-in moods", () => {
    expect(canonicalMoods).toEqual([
      "Tired", "Stressed", "Happy", "Romantic",
      "Healthy", "Focused",
    ]);
  });

  it("normalizes historical moods without rewriting stored records", () => {
    expect(normalizeMood("Energised")).toBe("Focused");
    expect(normalizeMood("Tired")).toBe("Tired");
  });
});

describe("recipe tag inference", () => {
  it("infers conservative tags from stable recipe facts", () => {
    const tags = flattenRecipeTags(inferRecipeTags(recipe()));
    expect(tags).toEqual(expect.arrayContaining([
      "quick", "low_effort", "few_ingredients", "simple_steps",
      "warm", "vegetable_rich", "weeknight", "solo_meal",
    ]));
    expect(tags).not.toContain("high_protein");
  });

  it("keeps explicit tags and removes duplicates", () => {
    const tags = flattenRecipeTags(inferRecipeTags(recipe({
      tags: { sensory: ["warm", "creamy"], effort: ["quick"] },
    })));
    expect(tags.filter(tag => tag === "warm")).toHaveLength(1);
    expect(tags).toContain("creamy");
  });
});

describe("weighted mood scoring", () => {
  it("rewards positive tags and applies negative penalties", () => {
    const comforting = recipe({ tags: { mood: ["comforting"], sensory: ["warm", "familiar"] } });
    const difficult = recipe({ tags: { effort: ["technical", "many_steps", "long_prep"] } });
    expect(scoreByMood(comforting, "Tired")).toBeGreaterThan(scoreByMood(difficult, "Tired"));
  });

  it("uses canonical rules for historical aliases", () => {
    const comforting = recipe({ tags: { mood: ["comforting"], sensory: ["warm", "familiar"] } });
    expect(scoreByMood(comforting, "Energised")).toBe(scoreByMood(comforting, "Focused"));
  });
});
