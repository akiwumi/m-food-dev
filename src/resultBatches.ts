import type { Recipe } from "./data";

export const RESULT_BATCH_SIZE = 5;

const normalizedTitle = (recipe: Recipe) => recipe.title.trim().toLowerCase().replace(/\s+/g, " ");

export function takeUniqueBatch(candidates: Recipe[], existing: Recipe[] = [], limit = RESULT_BATCH_SIZE): Recipe[] {
  const ids = new Set(existing.map(recipe => recipe.id));
  const titles = new Set(existing.map(normalizedTitle));
  const batch: Recipe[] = [];

  for (const recipe of candidates) {
    const title = normalizedTitle(recipe);
    if (ids.has(recipe.id) || titles.has(title)) continue;
    batch.push(recipe);
    ids.add(recipe.id);
    titles.add(title);
    if (batch.length >= limit) break;
  }

  return batch;
}

export function appendUniqueRecipes(existing: Recipe[], candidates: Recipe[], limit = RESULT_BATCH_SIZE): Recipe[] {
  return [...existing, ...takeUniqueBatch(candidates, existing, limit)];
}
