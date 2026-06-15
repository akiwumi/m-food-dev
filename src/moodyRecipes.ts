import type { Recipe } from "./data";
import { safeRecipes } from "./recommendation";
import type { Profile } from "./store";

export type MoodyRecipeCandidate = {
  id: string;
  title: string;
  time: number;
  cuisine: string;
  reason: string;
  ingredients: string[];
};

export function moodyCandidates(recipes: Recipe[]): MoodyRecipeCandidate[] {
  return recipes.map(({ id, title, time, cuisine, reason, ingredients }) => ({
    id,
    title,
    time,
    cuisine,
    reason,
    ingredients,
  }));
}

export function resolveMoodyRecipe(recipeId: string | undefined, catalog: Recipe[], profile: Profile): Recipe | undefined {
  if (!recipeId) return undefined;
  return safeRecipes(catalog, profile).find(recipe => recipe.id === recipeId);
}
