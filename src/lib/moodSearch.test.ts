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
  it("matches the documented example output", () => {
    expect(buildMoodSearchQuery({
      mood: "tired",
      cuisine: "Italian",
      maxCookingTime: 30,
      query: "pasta",
    })).toBe(
      "Italian low-effort quick easy nourishing restorative minimal-prep one-pot gentle-energy 30-minute pasta",
    );
  });

  it("omits empty parts and keeps cuisine/time when no mood is set", () => {
    expect(buildMoodSearchQuery({ cuisine: "Thai", maxCookingTime: 20 })).toBe("Thai 20-minute");
  });

  it("returns an empty string when nothing is provided", () => {
    expect(buildMoodSearchQuery({})).toBe("");
  });

  it("trims whitespace-only query text", () => {
    expect(buildMoodSearchQuery({ query: "   " })).toBe("");
  });
});
