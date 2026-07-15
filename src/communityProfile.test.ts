import { describe, expect, it } from "vitest";
import { buildFoodPersonalityCard, suggestionCompatibility, type Suggestion } from "./community";
import { publicFoodProfile } from "./hooks/useProfileSync";
import { defaultProfile } from "./store";

describe("community food personality", () => {
  it("turns the public food profile into a curated share card", () => {
    const member = {
      cuisines: ["Thai", "Mexican"],
      flavorLikes: ["Savory/Umami", "Bright"],
      textureLikes: ["Crunchy"],
      comfortCues: ["Warm bowls", "One-pot"],
      comfortFoods: ["Soup"],
      cookingMoods: ["Comfort", "Stress baking"],
    };
    const viewer = {
      cuisines: ["Thai", "Italian"],
      flavorLikes: ["Savory/Umami"],
      textureLikes: ["Creamy"],
      comfortCues: ["Warm bowls"],
      comfortFoods: ["Soup"],
      cookingMoods: ["Comfort"],
    };

    const card = buildFoodPersonalityCard(member, viewer);

    expect(card.phenotype).toContain("Savory/Umami");
    expect(card.phenotype).toContain("Crunchy");
    expect(card.comfortCues).toEqual(["Warm bowls", "One-pot", "Soup"]);
    expect(card.signatureMoods).toEqual(["Comfort", "Stress baking"]);
    expect(card.sharedSignals).toEqual(expect.arrayContaining(["Thai", "Savory/Umami", "Warm bowls", "Soup", "Comfort"]));
    expect(card.overlap).toMatch(/both/i);
    expect(card.privacyNote).toMatch(/curated/i);
  });

  it("keeps the synced public profile curated but includes community card signals", () => {
    const shared = publicFoodProfile({
      ...defaultProfile,
      comfortCues: ["Warm bowls"],
      comfortFoods: ["Soup"],
      cookingMoods: ["Comfort"],
      moodNeeds: { Comfort: "soup, not baking" },
      emotionalTriggers: ["Stress"],
    });

    expect(shared).toMatchObject({
      comfortCues: ["Warm bowls"],
      comfortFoods: ["Soup"],
      cookingMoods: ["Comfort"],
    });
    expect(shared).not.toHaveProperty("moodNeeds");
    expect(shared).not.toHaveProperty("emotionalTriggers");
    expect(shared).not.toHaveProperty("accountCreated");
    expect(shared).not.toHaveProperty("subscriptionStatus");
    expect(shared).not.toHaveProperty("photoLogs");
  });

  it("labels suggestions from mood and profile compatibility before cuisine alone", () => {
    const suggestion: Suggestion = {
      id: "person-1",
      name: "Alex",
      avatar: "",
      sharedCuisines: 1,
      sharedMoods: 2,
      sharedComfortCues: 1,
      sharedFlavors: 1,
      compatibilityScore: 14,
    };

    const summary = suggestionCompatibility(suggestion);

    expect(summary.label).toBe("Mood/profile match");
    expect(summary.detail).toContain("4 shared profile signals");
    expect(summary.signals).toEqual(["2 mood", "1 comfort", "1 flavour", "1 cuisine"]);
  });
});
