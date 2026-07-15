import { profileCompletion, type OnboardingQuestion } from "./onboarding";
import type { Profile } from "./store";

const DRIP_AFTER_COOKS = 3;
const MAX_DRIP_QUESTIONS = 2;

export type ProfileDrip = {
  headline: string;
  text: string;
  questions: OnboardingQuestion[];
};

export function profileDrip(profile: Profile, cookedMeals: number): ProfileDrip | null {
  if (cookedMeals < DRIP_AFTER_COOKS) return null;
  const completion = profileCompletion(profile);
  const questions = completion.remaining
    .filter(q => !q.quick && (!q.showIf || q.showIf(profile)))
    .slice(0, MAX_DRIP_QUESTIONS);
  if (!questions.length) return null;
  return {
    headline: "You've cooked three meals — mind if I sharpen your taste profile?",
    text: "Answer one or two quick profile prompts here, and Moody will make the next pick feel more personal.",
    questions,
  };
}
