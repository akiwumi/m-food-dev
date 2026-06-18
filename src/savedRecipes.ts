export function nextSavedRecipeIds(saved: string[], recipeId: string): string[] {
  return saved.includes(recipeId) ? saved.filter(id => id !== recipeId) : [...saved, recipeId];
}
