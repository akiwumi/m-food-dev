import { moodSearchTags, type Mood, type MoodTag } from "@/data/moodTags";

export type BuildMoodSearchQueryOptions = {
  mood?: Mood;
  cuisine?: string;
  maxCookingTime?: number;
  query?: string;
};

export function getMoodByValue(mood: Mood): MoodTag | undefined {
  return moodSearchTags.find((item) => item.mood === mood);
}

export function getMoodTags(mood: Mood): string[] {
  return getMoodByValue(mood)?.tags ?? [];
}

export function buildMoodSearchQuery({
  query
}: BuildMoodSearchQueryOptions): string {
  // Spoonacular treats `query` as a title/keyword match. Mood, cuisine, and
  // timing travel as separate structured fields so they cannot corrupt it.
  return String(query ?? "").trim();
}
