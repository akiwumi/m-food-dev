import { supabase } from "./supabase";
import { cookingMoods, type Recipe } from "./data";
import type { Profile } from "./store";
import type { RecipeFilters } from "./searchFilters";

declare global {
  interface Window {
    __MOODFOOD_TEST_LIVE_RECIPES__?: Recipe[];
  }
}

// Fetches real recipes from the `recipes` edge function (Spoonacular/TheMealDB +
// hard safety filter). AI curation (OpenAI ranking) is OPT-IN via `curate` — off
// by default for normal search, which is ranked deterministically by the caller
// (roadmap v3, Slice 1). Returns null on any failure (not signed in, backend not
// configured, network error) so callers fall back to local deterministic ranking
// over the bundled recipes and the pilot keeps working.

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipes`;

export type FoodHistory = {
  cooked?: string[];        // "Lemony Green Pasta (5★)"
  photographed?: string[];  // dishes logged from photos
  favorites?: string[];     // saved recipe titles
  topCuisines?: string[];   // most-cooked cuisines
};

function combineAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      abort();
      break;
    }
    signal.addEventListener("abort", abort, { once: true });
  }
  return controller.signal;
}

export function withHardTimeout<T>(operation: Promise<T>, ms: number, fallback: T, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      resolve(fallback);
    }, ms);
    operation.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

export function recipeProfilePayload(profile: Profile) {
  return {
    diet: profile.diet,
    dietReligious: profile.dietReligious,
    allergies: profile.allergies,
    dislikedIngredients: profile.dislikedIngredients,
    foodRelationship: profile.foodRelationship,
    moodNeeds: profile.moodNeeds,
    comfortCues: profile.comfortCues,
    avoidCues: profile.avoidCues,
    sensoryCues: profile.sensoryCues,
    cookingMotivation: profile.cookingMotivation,
    cuisines: profile.cuisines,
    mealTypes: profile.mealTypes,
    flavorLikes: profile.flavorLikes,
    flavorAvoids: profile.flavorAvoids,
    textureLikes: profile.textureLikes,
    textureAvoids: profile.textureAvoids,
    spiceTolerance: profile.spiceTolerance,
    spiceTypes: profile.spiceTypes,
    comfortFoods: profile.comfortFoods,
    proteins: profile.proteins,
    vegetables: profile.vegetables,
    carbs: profile.carbs,
    foodValues: profile.foodValues,
    eatingHabits: profile.eatingHabits,
    emotionalTriggers: profile.emotionalTriggers,
    ingredientPhilosophy: profile.ingredientPhilosophy,
    skill: profile.skill,
    weeknightTime: profile.weeknightTime,
    nutritionGoals: profile.nutritionGoals,
    rankingPreference: profile.rankingPreference,
    moodSignals: cookingMoods.filter(m => profile.cookingMoods.includes(m.label)).map(m => m.aiSignal),
    novelty: profile.novelty,
  };
}

export async function fetchCuratedRecipes(
  profile: Profile,
  mood: string,
  energy: number,
  time: number,
  query = "",
  filters: RecipeFilters = {},
  history: FoodHistory = {},
  offset = 0,
  relax = true,
  curate = false,
  signal?: AbortSignal,
): Promise<Recipe[] | null> {
  // Playwright injects provider-shaped recipes in development so mobile flows
  // exercise the live-only client path without requiring production credentials.
  // Vite removes this branch from production builds (`DEV` is statically false).
  if (import.meta.env.DEV && typeof window !== "undefined" && Array.isArray(window.__MOODFOOD_TEST_LIVE_RECIPES__)) {
    return window.__MOODFOOD_TEST_LIVE_RECIPES__;
  }
  if (!supabase) { console.info("[recipes] Supabase not configured (.env.local), showing local recipes."); return null; }

  const run = async (): Promise<Recipe[] | null> => {
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) { console.info("[recipes] Not signed in, live recipes need an authenticated session."); return null; }

      const body = JSON.stringify({
        profile: recipeProfilePayload(profile),
        mood, energy, time, query, filters, history, offset, relax, curate,
        variationSeed: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      });

      const post = (token: string) => fetch(ENDPOINT, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body,
        // Must exceed the edge function's own worst case: identity check (5s) +
        // up to TWO Spoonacular calls (the relax-and-retry path) + AI curation
        // (5s). An 8s budget here aborted slow-but-successful searches before the
        // server could answer, surfacing a false "no results".
        signal: combineAbortSignals(AbortSignal.timeout(22_000), signal),
      });

      let res = await post(session.access_token);
      // A stale/expired access token returns 401, refresh once and retry before
      // giving up (otherwise we'd silently fall back to local recipes).
      if (res.status === 401) {
        const { data: { session: fresh } } = await supabase!.auth.refreshSession();
        if (fresh?.access_token) res = await post(fresh.access_token);
      }
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.warn(`[recipes] Live curation failed (HTTP ${res.status}):`, errBody);
        return null;
      }
      const data = await res.json();
      if (!Array.isArray(data.recipes) || !data.recipes.length) {
        console.warn("[recipes] Edge function returned no recipes:", JSON.stringify(data).slice(0, 300));
        return null;
      }
      console.info(`[recipes] Got ${data.recipes.length} recipes from ${data.provider ?? "unknown"}`);
      return data.recipes as Recipe[];
    } catch (e) {
      console.warn("[recipes] Live curation request failed, showing local recipes.", e);
      return null;
    }
  };

  // Hard ceiling: Supabase auth calls have no built-in timeout and can hang
  // indefinitely under network stress. Set just above the fetch budget (22s) so
  // a genuinely successful-but-slow search isn't cut short, while still
  // guaranteeing we give up rather than hang forever.
  return withHardTimeout(run(), 25_000, null, () => {
      console.warn("[recipes] Hard timeout (25 s), falling back to local recipes.");
  });
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
