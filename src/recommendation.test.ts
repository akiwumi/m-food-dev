import { describe, expect, it } from "vitest";
import { recipes } from "./data";
import { defaultProfile } from "./store";
import { profileForDiners, recommend, safeRecipes } from "./recommendation";

describe("recommendation safety", () => {
  it("never returns recipes containing a hard allergen", () => {
    const safe = safeRecipes(recipes, { ...defaultProfile, allergies: ["Dairy"], equipment: ["Stovetop", "Oven", "Blender"] });
    expect(safe.every(recipe => !recipe.allergens.includes("Dairy"))).toBe(true);
  });

  it("never relaxes dietary exclusions", () => {
    const safe = safeRecipes(recipes, { ...defaultProfile, diet: "Gluten-free", equipment: ["Stovetop", "Oven", "Blender"] });
    expect(safe.every(recipe => recipe.diets.includes("Gluten-free"))).toBe(true);
  });

  it("ranks deterministically and records the config version", () => {
    const profile = { ...defaultProfile, equipment: ["Stovetop", "Oven", "Blender"] };
    expect(recommend(recipes, profile, "Cozy", 30, 30)).toEqual(recommend(recipes, profile, "Cozy", 30, 30));
    expect(recommend(recipes, profile, "Cozy", 30, 30)[0].configVersion).toBe("pilot-v1");
  });

  it("enforces every selected diner's allergen", () => {
    const shared = profileForDiners(defaultProfile, [{ id: "guest", name: "Guest", relationship: "Friend", diet: "Anything", allergies: ["Dairy"] }]);
    expect(safeRecipes(recipes, { ...shared, equipment: ["Stovetop", "Oven", "Blender"] }).every(recipe => !recipe.allergens.includes("Dairy"))).toBe(true);
  });
});
