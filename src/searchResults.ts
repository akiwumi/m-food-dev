import type { Recipe } from "./data";
import type { RecipeFilters } from "./searchFilters";
import type { Profile } from "./store";
import { safeRecipes } from "./recommendation";

const CATEGORY_TYPES: Record<string, string[]> = {
  main: ["main course"],
  starter: ["appetizer", "salad", "soup", "side dish"],
  dessert: ["dessert"],
  snack: ["snack"],
};
const LAND_MEAT = /\b(beef|steak|veal|chicken|turkey|duck|pork|bacon|ham|sausage|lamb|mutton|goat|venison|rabbit)\b/i;
const FISH = /\b(fish|salmon|tuna|cod|haddock|trout|sardine|anchov|prawn|shrimp|crab|lobster|mussel|clam|oyster|scallop|seafood)\b/i;

function matchesRequestedDiet(recipe: Recipe, requested?: string) {
  const diet = (requested ?? "").toLowerCase();
  const text = `${recipe.title} ${recipe.ingredients.join(" ")}`;
  const tags = recipe.diets.map(value => value.toLowerCase());
  if (diet.includes("vegan")) return tags.includes("vegan") && !LAND_MEAT.test(text) && !FISH.test(text);
  if (diet.includes("vegetarian")) return tags.some(tag => ["vegetarian", "vegan"].includes(tag)) && !LAND_MEAT.test(text) && !FISH.test(text);
  if (diet.includes("pesc")) return !LAND_MEAT.test(text);
  return true;
}

export function finalizeSearchResults(recipes: Recipe[], profile: Profile, filters: RecipeFilters, limit = 8): Recipe[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const allowedTypes = CATEGORY_TYPES[(filters.type ?? "").toLowerCase()];
  const include = filters.includeIngredients ?? [];
  const exclude = filters.excludeIngredients ?? [];

  return safeRecipes(recipes, profile).filter(recipe => {
    const text = `${recipe.title} ${recipe.cuisine} ${recipe.ingredients.join(" ")}`.toLowerCase();
    const title = recipe.title.trim().toLowerCase().replace(/\s+/g, " ");
    if (seenIds.has(recipe.id) || seenTitles.has(title)) return false;
    if (filters.maxReadyTime && recipe.time > filters.maxReadyTime) return false;
    if (filters.cuisines?.length && !filters.cuisines.some(cuisine => recipe.cuisine.toLowerCase().includes(cuisine.toLowerCase()))) return false;
    if (allowedTypes && !(recipe.mealTypes ?? []).some(type => allowedTypes.includes(type.toLowerCase()))) return false;
    if (include.length && !include.every(item => text.includes(item.toLowerCase()))) return false;
    if (exclude.some(item => text.includes(item.toLowerCase()))) return false;
    if (filters.maxCalories && recipe.calories > filters.maxCalories) return false;
    if (!matchesRequestedDiet(recipe, filters.diet)) return false;
    seenIds.add(recipe.id);
    seenTitles.add(title);
    return true;
  }).slice(0, limit);
}
