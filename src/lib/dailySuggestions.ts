import type { Recipe } from "../data";
import type { Profile } from "../store";
import type { DiaryEntry } from "../appTypes";

// Pure: derive the "for you today" carousel picks from diary affinity, saves,
// and the safe catalog. Seeded by the date so picks rotate daily, not per render.
export function deriveDailySuggestions(
  diary: DiaryEntry[],
  saved: string[],
  catalog: Recipe[],
  profile: Profile,
  count = 5,
): Recipe[] {
  // Stable seed from today's date so picks rotate overnight but don't shuffle on re-render.
  const seed = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seededRandom = (n: number) => {
    let h = parseInt(seed) ^ (n * 2654435761);
    h = ((h >>> 16) ^ h) * 0x45d9f3b;
    h = ((h >>> 16) ^ h);
    return (h >>> 0) / 0xffffffff;
  };

  // Build cuisine affinity from diary — high ratings weight more.
  const cuisineScore: Record<string, number> = {};
  diary.forEach(({ recipe, rating }) => {
    const weight = rating >= 4 ? 2 : rating >= 3 ? 1 : 0.3;
    cuisineScore[recipe.cuisine] = (cuisineScore[recipe.cuisine] ?? 0) + weight;
  });

  const recentIds = new Set(diary.slice(0, 7).map(d => d.recipe.id));
  const savedSet = new Set(saved);

  const pool = catalog.filter(r =>
    r.status === "published" &&
    (!profile.diet || profile.diet === "Everything" || profile.diet === "Any" || r.diets.includes(profile.diet)) &&
    !profile.allergies.some(a => r.allergens.map(x => x.toLowerCase()).includes(a.toLowerCase())),
  );

  const scored = pool.map((r, i) => {
    const affinity = cuisineScore[r.cuisine] ?? 0;
    const savedBonus = savedSet.has(r.id) && !recentIds.has(r.id) ? 1.5 : 0;
    const freshnessBonus = recentIds.has(r.id) ? -3 : 0;
    const jitter = seededRandom(i) * 0.8;
    return { recipe: r, score: affinity + savedBonus + freshnessBonus + jitter };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick with cuisine variety — no two consecutive cards share a cuisine.
  const picks: Recipe[] = [];
  const usedCuisines = new Set<string>();
  for (const { recipe } of scored) {
    if (picks.length >= count) break;
    if (usedCuisines.has(recipe.cuisine) && picks.length < count - 1) continue;
    picks.push(recipe);
    usedCuisines.add(recipe.cuisine);
  }

  // If variety filtering left us short, fill from the top of the scored list.
  if (picks.length < count) {
    const pickIds = new Set(picks.map(r => r.id));
    for (const { recipe } of scored) {
      if (picks.length >= count) break;
      if (!pickIds.has(recipe.id)) { picks.push(recipe); pickIds.add(recipe.id); }
    }
  }

  return picks;
}
