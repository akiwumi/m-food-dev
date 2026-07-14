type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function communityPreferenceKey(identity: string): string {
  return `moodfood-community-dismissed:${identity.trim().toLowerCase() || "pilot"}`;
}

export function readDismissedRecipes(storage: PreferenceStorage, identity: string): Set<string> {
  try {
    const value = JSON.parse(storage.getItem(communityPreferenceKey(identity)) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter(item => typeof item === "string" && item) : []);
  } catch {
    return new Set();
  }
}

export function addDismissedRecipe(storage: PreferenceStorage, identity: string, recipeId: string): Set<string> {
  const next = readDismissedRecipes(storage, identity);
  if (recipeId) next.add(recipeId);
  storage.setItem(communityPreferenceKey(identity), JSON.stringify([...next]));
  return next;
}

export function resetDismissedRecipes(storage: PreferenceStorage, identity: string): void {
  storage.removeItem(communityPreferenceKey(identity));
}
