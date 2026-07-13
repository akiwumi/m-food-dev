// Food photo logging. No AI, no guessing from the pixels: a meal photo is logged
// with numbers that come from an honest source only —
//   • "recipe":   the calorie count of the recipe you just cooked,
//   • "database":  a real per-serving lookup from the FatSecret food database,
//   • "manual":    whatever you choose to type in (blank = unknown, never faked).
// See FoodCamera for the capture/entry UI and src/nutrition.ts for the lookup.

export type Vitamin = {
  name: string;          // e.g. "Vitamin C", "Iron"
  amount: number;        // quantity in `unit`
  unit: string;          // "mg" | "mcg" | etc.
  percentDV: number;     // 0-100, share of daily value
};

export type FoodPhoto = {
  id: string;
  image: string;         // compressed JPEG data-URL (≤1024 px); "" once uploaded to Storage or blanked by compaction
  imagePath?: string;    // Storage object path "<uid>/<id>.jpg" in bucket food-photos
  dish: string;          // user-supplied or recipe name
  calories: number;      // 0 when unknown (not logged), never invented
  protein: number;       // grams (0 = not logged)
  carbs: number;         // grams
  fat: number;           // grams
  fiber: number;         // grams
  vitamins?: Vitamin[];  // only present if a source supplied them; new logs omit
  allergens: string[];   // real allergens carried from the logged recipe, else []
  source?: "recipe" | "database" | "manual"; // provenance of the numbers
  when: string;          // human-readable datetime
  recipeId?: string;     // if logged after cooking a specific recipe
  note?: string;
};

const nowLabel = () =>
  new Date().toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

const clampNum = (n: number) => Math.max(0, Math.round(Number.isFinite(n) ? n : 0));

// Build a food-diary entry from values the user chose or looked up. Every number
// is taken as-is (clamped to a sane non-negative integer) — nothing is estimated.
export function makeFoodLog(fields: {
  image: string;
  dish: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  allergens?: string[];
  source?: FoodPhoto["source"];
  recipeId?: string;
}): FoodPhoto {
  return {
    id: crypto.randomUUID(),
    image: fields.image,
    dish: fields.dish.trim() || "Your meal",
    calories: clampNum(fields.calories),
    protein: clampNum(fields.protein),
    carbs: clampNum(fields.carbs),
    fat: clampNum(fields.fat),
    fiber: clampNum(fields.fiber),
    allergens: fields.allergens ?? [],
    source: fields.source,
    when: nowLabel(),
    recipeId: fields.recipeId,
  };
}

// Which of the dish's allergens are ones THIS user must avoid. Matching is
// loose (substring, singular/plural) so "Tree nuts" flags "tree nut" etc.
export function flaggedAllergens(photoAllergens: string[], userAllergies: string[]): string[] {
  const norm = (s: string) => s.toLowerCase().replace(/s$/, "").trim();
  const mine = (userAllergies ?? []).map(norm).filter(Boolean);
  return (photoAllergens ?? []).filter(a => {
    const n = norm(a);
    return mine.some(m => n.includes(m) || m.includes(n));
  });
}

// Totals across an array of logs (e.g. today's entries)
export function sumNutrition(logs: FoodPhoto[]) {
  return logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein:  acc.protein  + l.protein,
      carbs:    acc.carbs    + l.carbs,
      fat:      acc.fat      + l.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
