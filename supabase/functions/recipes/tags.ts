// tags.ts — pure cache-key normalization shared by the recipes edge function and
// (by mirrored copy) scripts/seed-recipes.mjs. No Deno/Node globals here so it is
// importable from both the edge runtime and the vitest test suite.
//
// The cache is keyed on a NORMALIZED mood tag + diet tags. Symmetry between what
// the seed writes and what a live search reads is what makes the cache work, so
// keep CANON_MOODS / the mappings below in sync with scripts/seed-recipes.mjs.

export const CANON_MOODS = ["happy", "tired", "stressed", "energised", "sad", "focused"];

// App mood labels (src/data.ts `moods` + the function's "Cozy" default + cooking
// moods) → one of the 7 canonical seed moods. Best-effort psychological grouping
// (the roadmap's pre-launch note); unknown moods fall back to "happy".
const MOOD_MAP: Record<string, string> = {
  happy: "happy", romantic: "happy", social: "happy", cozy: "happy", indulge: "happy", nostalgic: "happy",
  tired: "tired", "under the weather": "tired", ill: "tired",
  stressed: "stressed",
  energised: "energised", adventurous: "energised", healthy: "energised", creative: "energised", bored: "energised",
  sad: "sad", "low / sad": "sad",
  focused: "focused", "performance / focused": "focused", nourish: "focused", mindful: "focused",
};

export function normalizeMoodTag(mood: string): string {
  const key = (mood ?? "").toLowerCase().trim();
  return MOOD_MAP[key] ?? "happy";
}

// Profile/search diet → canonical diet tags (roadmap vocabulary). Returns [] for
// "no diet" so an everything-eater's cache read (contains []) matches every row.
export function dietTagsFor(diet: string): string[] {
  const d = (diet ?? "").toLowerCase();
  const tags = new Set<string>();
  for (const part of d.split("+").map(p => p.trim()).filter(Boolean)) {
    if (part.includes("vegan")) tags.add("vegan");
    else if (part.includes("vegetarian") || part.includes("lacto") || part.includes("ovo")) tags.add("vegetarian");
    else if (part.includes("keto")) tags.add("keto");
    else if (part.includes("gluten")) tags.add("gluten-free");
    else if (part.includes("pesc")) tags.add("pescatarian");
    else if (part.includes("paleo")) tags.add("paleo");
  }
  return [...tags];
}

// Dairy-free is expressed via allergies/intolerances, not the diet field.
export function dairyFreeTag(intolerances: string[]): string[] {
  return (intolerances ?? []).some(i => i.toLowerCase().includes("dairy")) ? ["dairy-free"] : [];
}
