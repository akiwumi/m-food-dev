import { useEffect } from "react";
import { syncCookedMeals, syncSavedRecipes, communityReady } from "../community";
import type { Recipe } from "../data";
import type { DiaryEntry } from "../appTypes";

// Mirrors the local diary (cooked/reviewed meals) and saved recipes (favourites)
// up to Supabase so friends can see them on the member profile. Debounced, and a
// no-op when there's no backend/session (pilot mode keeps everything local). The
// server copy is display-only; localStorage stays the working source of truth.
export function useSocialSync(diary: DiaryEntry[], savedRecipes: Recipe[]) {
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!(await communityReady()) || cancelled) return;
      await syncCookedMeals(diary.map(d => ({
        recipe_ref: d.recipe.id,
        recipe_title: d.recipe.title,
        recipe_image: d.recipe.image || null,
        cuisine: d.recipe.cuisine || null,
        rating: typeof d.rating === "number" ? d.rating : null,
        cooked_label: d.when || null,
      })));
    }, 2000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [diary]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!(await communityReady()) || cancelled) return;
      await syncSavedRecipes(savedRecipes.map(r => ({
        recipe_ref: r.id,
        recipe_title: r.title,
        recipe_image: r.image || null,
        cuisine: r.cuisine || null,
      })));
    }, 2000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [savedRecipes]);
}
