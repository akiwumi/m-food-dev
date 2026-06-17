import { describe, expect, it } from "vitest";
import { defaultProfile } from "./store";
import { buildQuickStartProfilePatch } from "./activation";

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
