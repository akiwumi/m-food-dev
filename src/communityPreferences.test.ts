import { describe, expect, it } from "vitest";
import { addDismissedRecipe, communityPreferenceKey, readDismissedRecipes, resetDismissedRecipes } from "./communityPreferences";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("community dish preferences", () => {
  it("namespaces dismissed dishes by normalized account identity", () => {
    expect(communityPreferenceKey("  Person@Example.COM ")).toBe("moodfood-community-dismissed:person@example.com");
    expect(communityPreferenceKey("")).toBe("moodfood-community-dismissed:pilot");
  });

  it("persists unique dismissals and can reset them", () => {
    const storage = new MemoryStorage();
    addDismissedRecipe(storage, "person@example.com", "dish-1");
    addDismissedRecipe(storage, "person@example.com", "dish-1");
    addDismissedRecipe(storage, "person@example.com", "dish-2");
    expect(readDismissedRecipes(storage, "person@example.com")).toEqual(new Set(["dish-1", "dish-2"]));

    resetDismissedRecipes(storage, "person@example.com");
    expect(readDismissedRecipes(storage, "person@example.com")).toEqual(new Set());
  });
});
