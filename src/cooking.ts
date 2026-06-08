import type { RecipeStep } from "./data";

export function displayStepTitle(step: RecipeStep): string {
  return step.title?.trim() || step.text.trim();
}

export function displayStepDetail(step: RecipeStep): string {
  return step.detail?.trim() || step.text.trim();
}

export function stepImageSources(stepImage?: string, recipeImage?: string): string[] {
  return [...new Set([stepImage, recipeImage].map(value => value?.trim()).filter((value): value is string => !!value))];
}

export function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
