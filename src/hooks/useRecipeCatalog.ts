import { useCallback, useMemo, useState } from "react";
import { bundledRecipes } from "../bundledRecipes";
import { safeRecipes as applySafety } from "../recommendation";
import { buildFoodHistory } from "../recipes";
import type { Recipe } from "../data";
import type { Profile } from "../store";
import type { DiaryEntry } from "../appTypes";

// The recipe catalog (bundled seed + anything fetched), its safety-filtered view,
// the derived food history, and the shared catalog-upsert (H6: open / save /
// share all add to the catalog first so the recipe persists).
export function useRecipeCatalog(sharedProfile: Profile, diary: DiaryEntry[], saved: string[], profile: Profile) {
  const [catalog, setCatalog] = useState<Recipe[]>(bundledRecipes);
  const safeRecipes = useMemo(() => applySafety(catalog, sharedProfile), [catalog, sharedProfile]);
  // What the user has actually cooked, logged, and saved, so the AI learns from
  // behaviour, not just the stated profile. Recomputed as those change.
  const foodHistory = useMemo(
    () => buildFoodHistory(diary, profile.photoLogs, catalog.filter(r => saved.includes(r.id))),
    [diary, profile.photoLogs, saved, catalog],
  );
  // Add a recipe to the catalog if it isn't already there (stable identity —
  // setCatalog from useState never changes).
  const addToCatalog = useCallback((recipe: Recipe) => {
    setCatalog(prev => prev.some(r => r.id === recipe.id) ? prev : [recipe, ...prev]);
  }, []);
  return { catalog, setCatalog, addToCatalog, safeRecipes, foodHistory };
}
