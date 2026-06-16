import { describe, expect, it } from "vitest";
import { CANON_MOODS, dairyFreeTag, dietTagsFor, normalizeMoodTag } from "../supabase/functions/recipes/tags";

// The recipe cache (roadmap Phase 2) is keyed on a normalized mood tag + diet
// tags. These tests pin the normalization so the seed script, the live
// write-through, and the cache read stay symmetric — a drift here silently turns
// every search into a cache miss.

describe("normalizeMoodTag", () => {
  it("passes the 7 canonical moods through unchanged", () => {
    for (const mood of CANON_MOODS) expect(normalizeMoodTag(mood)).toBe(mood);
  });

  it("maps the app's mood labels onto canonical tags", () => {
    expect(normalizeMoodTag("Tired")).toBe("tired");
    expect(normalizeMoodTag("Stressed")).toBe("stressed");
    expect(normalizeMoodTag("Anxious")).toBe("anxious");
    expect(normalizeMoodTag("Focused")).toBe("focused");
    expect(normalizeMoodTag("Adventurous")).toBe("energised");
    expect(normalizeMoodTag("Romantic")).toBe("happy");
    expect(normalizeMoodTag("Lazy")).toBe("tired");
    expect(normalizeMoodTag("Angry")).toBe("stressed");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(normalizeMoodTag("  HAPPY ")).toBe("happy");
    expect(normalizeMoodTag("LOW / SAD")).toBe("sad");
  });

  it("falls back to happy for the Cozy default and unknown moods", () => {
    expect(normalizeMoodTag("Cozy")).toBe("happy");
    expect(normalizeMoodTag("undefined-mood")).toBe("happy");
    expect(normalizeMoodTag("")).toBe("happy");
  });

  it("always returns one of the canonical moods", () => {
    for (const m of ["Healthy", "Social", "Creative", "Bored", "Nourish", "x"]) {
      expect(CANON_MOODS).toContain(normalizeMoodTag(m));
    }
  });
});

describe("dietTagsFor", () => {
  it("returns [] for everything-eaters so the cache read matches every row", () => {
    expect(dietTagsFor("")).toEqual([]);
    expect(dietTagsFor("Anything")).toEqual([]);
    expect(dietTagsFor("Flexitarian")).toEqual([]);
  });

  it("maps single diets to canonical tags", () => {
    expect(dietTagsFor("Vegan")).toEqual(["vegan"]);
    expect(dietTagsFor("Lacto-vegetarian")).toEqual(["vegetarian"]);
    expect(dietTagsFor("Ketogenic")).toEqual(["keto"]);
    expect(dietTagsFor("Gluten free")).toEqual(["gluten-free"]);
    expect(dietTagsFor("Pescatarian")).toEqual(["pescatarian"]);
  });

  it("handles combined diets (a + b)", () => {
    const tags = dietTagsFor("vegan + gluten free");
    expect(tags).toContain("vegan");
    expect(tags).toContain("gluten-free");
    expect(tags).toHaveLength(2);
  });
});

describe("dairyFreeTag", () => {
  it("flags dairy-free only when a dairy intolerance is present", () => {
    expect(dairyFreeTag(["dairy"])).toEqual(["dairy-free"]);
    expect(dairyFreeTag(["gluten", "egg"])).toEqual([]);
    expect(dairyFreeTag([])).toEqual([]);
  });
});
