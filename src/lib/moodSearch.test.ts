import { describe, expect, it } from "vitest";
import { buildMoodSearchQuery, getMoodByValue, getMoodTags, normalizeRecipeSearchIntent } from "./moodSearch";

describe("getMoodByValue", () => {
  it("returns the matching mood tag", () => {
    expect(getMoodByValue("tired")?.label).toBe("Tired");
  });
});

describe("getMoodTags", () => {
  it("returns the hidden tags for a mood", () => {
    expect(getMoodTags("tired")).toEqual([
      "low-effort", "quick", "easy", "nourishing",
      "restorative", "minimal-prep", "one-pot", "gentle-energy",
    ]);
  });
});

describe("buildMoodSearchQuery", () => {
  it("keeps provider title search separate from mood and structured filters", () => {
    expect(buildMoodSearchQuery({
      mood: "tired",
      cuisine: "Italian",
      maxCookingTime: 30,
      query: "pasta",
    })).toBe("pasta");
  });

  it("does not invent a title query from filters alone", () => {
    expect(buildMoodSearchQuery({ cuisine: "Thai", maxCookingTime: 20 })).toBe("");
  });

  it("returns an empty string when nothing is provided", () => {
    expect(buildMoodSearchQuery({})).toBe("");
  });

  it("trims whitespace-only query text", () => {
    expect(buildMoodSearchQuery({ query: "   " })).toBe("");
  });
});

describe("normalizeRecipeSearchIntent", () => {
  it.each(["dessert", "desserts", "desert", "deserts", "dessert recipes"])(
    "maps %s to the dessert course instead of a strict title query",
    query => {
      expect(normalizeRecipeSearchIntent(query)).toEqual({ query: "", type: "dessert" });
    },
  );

  it("maps other course-only searches to structured course filters", () => {
    expect(normalizeRecipeSearchIntent("snacks")).toEqual({ query: "", type: "snacks" });
    expect(normalizeRecipeSearchIntent("breakfast recipes")).toEqual({ query: "", type: "breakfast" });
  });

  it("preserves concrete recipe searches", () => {
    expect(normalizeRecipeSearchIntent("chocolate cake")).toEqual({ query: "chocolate cake", type: "" });
  });
});
