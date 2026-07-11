import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { safeRecipes as applySafety } from "../recommendation";
import { fetchCuratedRecipes, buildFoodHistory } from "../recipes";
import type { ChatTurn } from "../ai";
import type { Recipe } from "../data";
import type { Profile } from "../store";
import { foodQueryFromChat } from "../lib/moodyQuery";

// Moody chat transcript + the catalog loader Moody uses to ground its answers.
export function useMoodyChat(
  catalog: Recipe[],
  setCatalog: Dispatch<SetStateAction<Recipe[]>>,
  foodHistory: ReturnType<typeof buildFoodHistory>,
  mood: string,
  sharedProfile: Profile,
) {
  const [moodyTurns, setMoodyTurns] = useState<ChatTurn[]>([]);
  const loadMoodyCatalog = useCallback(async (query = "") => {
    // Reduce the chat message to a clean food term (e.g. "Yaki Udon" not
    // "show me a Yaki Udon recipe"), stripping only leading/trailing filler.
    const foodQuery = foodQueryFromChat(query);
    const [moodLive, queryLive] = await Promise.all([
      fetchCuratedRecipes(sharedProfile, mood, 20, 180, "", {}, foodHistory, 0, true, false),
      foodQuery ? fetchCuratedRecipes(sharedProfile, mood, 10, 180, foodQuery, {}, foodHistory, 0, true, false) : Promise.resolve(null),
    ]);
    const combined = [
      ...(queryLive ?? []),
      ...(moodLive ?? []).filter(r => !queryLive?.some(q => q.id === r.id)),
    ];
    const merged = combined.length
      ? [...combined, ...catalog.filter(existing => !combined.some(recipe => recipe.id === existing.id))]
      : catalog;
    if (combined.length) setCatalog(merged);
    return applySafety(merged, sharedProfile);
  }, [catalog, foodHistory, mood, sharedProfile]);
  return { moodyTurns, setMoodyTurns, loadMoodyCatalog };
}
