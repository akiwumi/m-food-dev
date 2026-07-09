import { nextSavedRecipeIds } from "../savedRecipes";

// Generic "toggle a value in a string array" — add if absent, remove if present.
// Aliased to nextSavedRecipeIds (identical semantics) and used across many
// multi-select controls. Not to be confused with DataPrivacyScreen's local
// async `toggle`, which is a different consent-writer.
export function toggle(values: string[], value: string) { return nextSavedRecipeIds(values, value); }
