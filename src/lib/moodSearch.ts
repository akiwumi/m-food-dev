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

const COURSE_QUERIES: Array<[RegExp, string]> = [
  [/^breakfasts?(?:\s+(?:recipes?|dishes|ideas))?$/i, "breakfast"],
  [/^lunch(?:es)?(?:\s+(?:recipes?|dishes|ideas))?$/i, "lunch"],
  [/^dinners?(?:\s+(?:recipes?|dishes|ideas))?$/i, "dinner"],
  [/^snacks?(?:\s+(?:recipes?|dishes|ideas))?$/i, "snacks"],
  // Accept the common desert/deserts misspelling as well as dessert/desserts.
  [/^des{1,2}erts?(?:\s+(?:recipes?|dishes|ideas))?$/i, "dessert"],
];

export function normalizeRecipeSearchIntent(query: string, selectedType = ""): { query: string; type: string } {
  const cleanQuery = String(query ?? "").trim();
  const inferredType = COURSE_QUERIES.find(([pattern]) => pattern.test(cleanQuery))?.[1] ?? "";
  if (inferredType && (!selectedType || selectedType.toLowerCase() === inferredType)) {
    return { query: "", type: inferredType };
  }
  return { query: cleanQuery, type: selectedType };
}
