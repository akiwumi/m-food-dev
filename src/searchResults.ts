import type { Recipe } from "./data";
import type { RecipeFilters } from "./searchFilters";
import type { Profile } from "./store";
import { safeRecipes } from "./recommendation";

// Maps every Course value the search UI offers (see MEAL_TYPES in searchFilters)
// onto the mealTypes our recipes actually carry, so the Course filter is honored
// offline exactly like the live backend honors Spoonacular's `type`.
const CATEGORY_TYPES: Record<string, string[]> = {
  breakfast: ["breakfast", "morning meal", "brunch"],
  lunch: ["lunch", "main course", "salad", "soup", "sandwich", "side dish"],
  dinner: ["dinner", "main course"],
  snacks: ["snack", "appetizer", "finger food", "starter", "side"],
  dessert: ["dessert"],
  // legacy values still used elsewhere
  main: ["main course", "dinner", "lunch"],
  snack: ["snack", "appetizer", "finger food", "starter", "side"],
  starter: ["appetizer", "salad", "soup", "side dish", "starter"],
};

// Sort the matched recipes to match the search UI's "Sort by" choice. Bundled
// recipes have no nutrition score, so Healthiest/Most popular keep curated order.
function sortRecipes(recipes: Recipe[], sort?: string): Recipe[] {
  const s = (sort ?? "").toLowerCase();
  const list = [...recipes];
  if (s.includes("quick")) return list.sort((a, b) => a.time - b.time);
  if (s.includes("calorie") || s.includes("light")) return list.sort((a, b) => a.calories - b.calories);
  if (s.includes("protein")) return list.sort((a, b) => Number(b.diets.includes("High protein")) - Number(a.diets.includes("High protein")));
  if (s.includes("surprise") || s.includes("random")) return list.sort(() => Math.random() - 0.5);
  return recipes;
}
const LAND_MEAT = /\b(beef|steak|veal|chicken|turkey|duck|pork|bacon|ham|sausage|lamb|mutton|goat|venison|rabbit)\b/i;
const FISH = /\b(fish|salmon|tuna|cod|haddock|trout|sardine|anchov|prawn|shrimp|crab|lobster|mussel|clam|oyster|scallop|seafood)\b/i;
const CUISINE_FAMILIES: Record<string, string[]> = {
  asian: ["asian", "chinese", "indian", "japanese", "korean", "thai", "vietnamese"],
};

function matchesCuisine(recipeCuisine: string, requestedCuisine: string) {
  const recipe = recipeCuisine.toLowerCase();
  const requested = requestedCuisine.toLowerCase();
  return (CUISINE_FAMILIES[requested] ?? [requested]).some(cuisine => recipe.includes(cuisine));
}

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

  const matched = safeRecipes(recipes, profile).filter(recipe => {
    const text = `${recipe.title} ${recipe.cuisine} ${recipe.ingredients.join(" ")}`.toLowerCase();
    const title = recipe.title.trim().toLowerCase().replace(/\s+/g, " ");
    if (seenIds.has(recipe.id) || seenTitles.has(title)) return false;
    if (filters.maxReadyTime && recipe.time > filters.maxReadyTime) return false;
    if (filters.cuisines?.length && !filters.cuisines.some(cuisine => matchesCuisine(recipe.cuisine, cuisine))) return false;
    if (allowedTypes && !(recipe.mealTypes ?? []).some(type => allowedTypes.includes(type.toLowerCase()))) return false;
    if (include.length && !include.every(item => text.includes(item.toLowerCase()))) return false;
    if (exclude.some(item => text.includes(item.toLowerCase()))) return false;
    if (filters.maxCalories && recipe.calories > filters.maxCalories) return false;
    // No per-recipe protein figure offline, so a min-protein filter narrows to
    // recipes explicitly tagged high-protein.
    if (filters.minProtein && !recipe.diets.map(d => d.toLowerCase()).includes("high protein")) return false;
    if (!matchesRequestedDiet(recipe, filters.diet)) return false;
    seenIds.add(recipe.id);
    seenTitles.add(title);
    return true;
  });
  return sortRecipes(matched, filters.sort).slice(0, limit);
}
