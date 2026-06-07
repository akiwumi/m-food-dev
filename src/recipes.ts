import { supabase } from "./supabase";
import { cookingMoods, type Recipe } from "./data";
import type { Profile } from "./store";
import type { RecipeFilters } from "./searchFilters";

// Fetches AI-curated, real recipes from the `recipes` edge function (Spoonacular
// + hard safety filter + OpenAI ranking). Returns null on any failure (not signed
// in, backend not configured, network error) so callers fall back to the local
// deterministic ranking over the bundled recipes — the pilot keeps working.

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipes`;

export type FoodHistory = {
  cooked?: string[];        // "Lemony Green Pasta (5★)"
  photographed?: string[];  // dishes logged from photos
  favorites?: string[];     // saved recipe titles
  topCuisines?: string[];   // most-cooked cuisines
};

export async function fetchCuratedRecipes(
  profile: Profile,
  mood: string,
  energy: number,
  time: number,
  query = "",
  filters: RecipeFilters = {},
  history: FoodHistory = {},
  offset = 0,
): Promise<Recipe[] | null> {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
      body: JSON.stringify({
        profile: {
          diet: profile.diet,
          dietReligious: profile.dietReligious,
          allergies: profile.allergies,
          dislikedIngredients: profile.dislikedIngredients,
          cuisines: profile.cuisines,
          mealTypes: profile.mealTypes,
          flavorLikes: profile.flavorLikes,
          flavorAvoids: profile.flavorAvoids,
          textureLikes: profile.textureLikes,
          spiceTolerance: profile.spiceTolerance,
          spiceTypes: profile.spiceTypes,
          comfortFoods: profile.comfortFoods,
          proteins: profile.proteins,
          ingredientPhilosophy: profile.ingredientPhilosophy,
          skill: profile.skill,
          weeknightTime: profile.weeknightTime,
          nutritionGoals: profile.nutritionGoals,
          rankingPreference: profile.rankingPreference,
          // The aiSignal for each cooking mood the user identifies with — the
          // single richest steer for curation.
          moodSignals: cookingMoods.filter(m => profile.cookingMoods.includes(m.label)).map(m => m.aiSignal),
          novelty: profile.novelty,
        },
        mood, energy, time, query, filters, history, offset,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.recipes) && data.recipes.length ? (data.recipes as Recipe[]) : null;
  } catch {
    return null;
  }
}

// Summarise what the user has actually cooked, logged, and saved so the AI can
// learn from behaviour, not just the stated profile. Kept compact to stay cheap.
export function buildFoodHistory(
  diary: { recipe: Recipe; rating: number }[],
  photoLogs: { dish: string }[],
  savedRecipes: Recipe[],
): FoodHistory {
  const cuisineCount: Record<string, number> = {};
  for (const d of diary) if (d.recipe?.cuisine) cuisineCount[d.recipe.cuisine] = (cuisineCount[d.recipe.cuisine] ?? 0) + 1;
  return {
    cooked: diary.slice(0, 10).map(d => `${d.recipe.title} (${d.rating}★)`),
    photographed: [...new Set(photoLogs.map(p => p.dish))].slice(0, 8),
    favorites: savedRecipes.slice(0, 8).map(r => r.title),
    topCuisines: Object.entries(cuisineCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c),
  };
}
