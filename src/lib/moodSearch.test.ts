import { describe, expect, it } from "vitest";
import { buildMoodSearchQuery, getMoodByValue, getMoodTags } from "./moodSearch";

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
