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

describe("evidence-based nutrition inference (Food & Mood report)", () => {
  const tagsOf = (patch: Partial<Recipe>) => flattenRecipeTags(inferRecipeTags(recipe(patch)));

  it("detects Mediterranean / SMILES pattern components", () => {
    expect(tagsOf({ title: "Baked salmon", ingredients: ["salmon", "olive oil", "lemon"] })).toEqual(expect.arrayContaining(["omega_3", "mediterranean"]));
    expect(tagsOf({ title: "Oat porridge", ingredients: ["oats", "milk"] })).toEqual(expect.arrayContaining(["whole_grain", "slow_release_energy"]));
    expect(tagsOf({ title: "Lentil stew", ingredients: ["lentils", "onion"] })).toEqual(expect.arrayContaining(["legumes", "slow_release_energy"]));
    expect(tagsOf({ title: "Kale side", ingredients: ["kale", "garlic"] })).toContain("leafy_greens");
    expect(tagsOf({ title: "Yoghurt bowl", ingredients: ["yoghurt", "berries"] })).toContain("fermented");
  });

  it("flags the evidence 'limit' list (added sugar, ultra-processed, caffeine)", () => {
    expect(tagsOf({ title: "Chocolate brownie", ingredients: ["chocolate", "flour"] })).toContain("high_sugar");
    expect(tagsOf({ title: "Espresso martini", ingredients: ["espresso", "coffee"] })).toContain("caffeine");
    expect(tagsOf({ title: "Speedy dinner", ingredients: ["instant noodle", "hot dog"] })).toContain("ultra_processed");
  });

  it("does not mislabel white rice as a whole grain", () => {
    expect(tagsOf({ title: "Rice bowl", ingredients: ["rice", "tomato"] })).not.toContain("whole_grain");
  });
});

describe("evidence-informed mood weighting", () => {
  it("Stressed favours steady-energy, omega-3 meals over caffeine/sugar ones", () => {
    const steady = recipe({ title: "Salmon quinoa bowl", ingredients: ["salmon", "quinoa", "spinach", "olive oil"], tags: { sensory: ["warm"], mood: ["calming"] } });
    const jittery = recipe({ title: "Espresso brownie", ingredients: ["espresso", "brownie"] });
    expect(scoreByMood(steady, "Stressed")).toBeGreaterThan(scoreByMood(jittery, "Stressed"));
  });

  it("Focused rewards slow-release whole grains (weight was previously dead)", () => {
    const wholegrain = recipe({ title: "Chicken quinoa bowl", ingredients: ["chicken", "quinoa", "broccoli"], diets: ["High protein"] });
    const sugary = recipe({ title: "Syrup pancake stack", ingredients: ["flour", "syrup"] });
    expect(scoreByMood(wholegrain, "Focused")).toBeGreaterThan(scoreByMood(sugary, "Focused"));
  });

  it("Healthy ranks a Mediterranean plate above a deep-fried, ultra-processed one", () => {
    const med = recipe({ title: "Mediterranean salmon", ingredients: ["salmon", "lentils", "spinach", "olive oil"] });
    const fried = recipe({ title: "Fried chicken bucket", ingredients: ["chicken", "flour"], tags: { nutrition: ["deep_fried", "high_sugar", "ultra_processed"] } });
    expect(scoreByMood(med, "Healthy")).toBeGreaterThan(scoreByMood(fried, "Healthy"));
  });
});
