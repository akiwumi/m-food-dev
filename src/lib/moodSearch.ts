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
  mood,
  cuisine,
  maxCookingTime,
  query
}: BuildMoodSearchQueryOptions): string {
  const moodTags = mood ? getMoodTags(mood) : [];

  const parts = [
    cuisine,
    ...moodTags,
    maxCookingTime ? `${maxCookingTime}-minute` : undefined,
    query
  ];

  return parts
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter((part) => part.length > 0)
    .join(" ");
}
