import { supabase } from "./supabase";
import type { Recipe } from "./data";
import type { Profile } from "./store";

// Fetches AI-curated, real recipes from the `recipes` edge function (Spoonacular
// + hard safety filter + OpenAI ranking). Returns null on any failure (not signed
// in, backend not configured, network error) so callers fall back to the local
// deterministic ranking over the bundled recipes — the pilot keeps working.

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipes`;

export async function fetchCuratedRecipes(
  profile: Profile,
  mood: string,
  energy: number,
  time: number,
  query = "",
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
          allergies: profile.allergies,
          dislikedIngredients: profile.dislikedIngredients,
          cuisines: profile.cuisines,
        },
        mood, energy, time, query,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.recipes) && data.recipes.length ? (data.recipes as Recipe[]) : null;
  } catch {
    return null;
  }
}
