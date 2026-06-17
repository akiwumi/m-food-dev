import type { Recipe } from "./data";
import type { Profile } from "./store";
import { recommend, safeRecipes } from "./recommendation";

export type QuickStartInput = {
  diet: string;
  allergies: string[];
};

export type ActivationPickInput = {
  recipes: Recipe[];
  profile: Profile;
  mood: string;
  energy: number;
  time: number;
};

export type ActivationPicks = {
  hero: Recipe | null;
  backups: Recipe[];
};

export function buildQuickStartProfilePatch(input: QuickStartInput): Partial<Profile> {
  return {
    diet: input.diet,
    allergies: input.allergies,
    quickStartCompleted: true,
    quickStartSafetyConfirmed: true,
    path: "quick",
  };
}

export function selectActivationPicks(input: ActivationPickInput): ActivationPicks {
  const safe = safeRecipes(input.recipes, input.profile);
  const ranked = recommend(safe, input.profile, input.mood, input.energy, input.time)
    .map(item => item.recipe);
  const unique = ranked.filter((recipe, index, list) => list.findIndex(item => item.id === recipe.id) === index);

  return {
    hero: unique[0] ?? null,
    backups: unique.slice(1, 3),
  };
}

export type ActivationFitReasonInput = {
  recipe: Recipe;
  mood: string;
  energy: number;
  time: number;
  profile: Profile;
};

export function activationFitReason(input: ActivationFitReasonInput): string {
  const mood = input.mood.toLowerCase();
  const effort = input.energy < 35 ? "low effort" : input.energy > 70 ? "interesting enough for higher energy" : "balanced effort";
  const time = `${input.recipe.time} minutes`;
  const diet = input.profile.diet && input.profile.diet !== "Everything" ? ` It fits your ${input.profile.diet} preference.` : "";
  const allergies = input.profile.allergies.length
    ? ` It avoids ${input.profile.allergies.join(", ")}.`
    : " No saved allergens are in the way.";

  return `Because you're feeling ${mood}, I picked ${input.recipe.title}: ${effort}, ready in ${time}, and matched to tonight's ${input.time}-minute limit.${diet}${allergies}`;
}
