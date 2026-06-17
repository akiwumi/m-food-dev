import type { Profile } from "./store";

export type QuickStartInput = {
  diet: string;
  allergies: string[];
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
