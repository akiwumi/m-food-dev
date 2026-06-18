import { describe, expect, it } from "vitest";
import { nextSavedRecipeIds } from "./savedRecipes";

describe("nextSavedRecipeIds", () => {
  it("uses the latest saved ids when toggling a search result", () => {
    expect(nextSavedRecipeIds(["existing"], "search-result")).toEqual(["existing", "search-result"]);
    expect(nextSavedRecipeIds(["existing", "search-result"], "search-result")).toEqual(["existing"]);
  });
});
