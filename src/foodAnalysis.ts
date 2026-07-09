// Food photo analysis. Calls the real OpenAI vision estimate via the ai-gateway
// when the user is signed in and the backend is configured; otherwise falls back
// to a local simulation so the pilot keeps working. See analyzeFood below.
import { aiAnalyzeFood } from "./ai";

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
  dish: string;          // detected or user-supplied name
  calories: number;
  protein: number;       // grams
  carbs: number;         // grams
  fat: number;           // grams
  fiber: number;         // grams
  vitamins: Vitamin[];   // notable micronutrients (vitamins + minerals)
  allergens: string[];   // allergens detected/likely in the dish
  confidence: number;    // 0-100, shown as "Estimated with X% confidence"
  when: string;          // human-readable datetime
  recipeId?: string;     // if logged after cooking a specific recipe
  note?: string;
};

// Realistic presets the simulation draws from
type Preset = Omit<FoodPhoto, "id" | "image" | "when" | "confidence" | "vitamins">;
const PRESETS: Preset[] = [
  { dish: "Pasta bowl",              calories: 620, protein: 18, carbs: 82, fat: 22, fiber: 8,  allergens: ["Gluten", "Wheat", "Dairy"] },
  { dish: "Chicken & quinoa bowl",   calories: 540, protein: 42, carbs: 48, fat: 16, fiber: 6,  allergens: [] },
  { dish: "Tomato basil soup",       calories: 430, protein: 12, carbs: 52, fat: 18, fiber: 5,  allergens: ["Dairy"] },
  { dish: "Vegetable tacos",         calories: 480, protein: 14, carbs: 62, fat: 18, fiber: 9,  allergens: [] },
  { dish: "Green salad bowl",        calories: 380, protein: 16, carbs: 38, fat: 20, fiber: 7,  allergens: ["Tree nuts"] },
  { dish: "Rice & protein bowl",     calories: 510, protein: 28, carbs: 68, fat: 14, fiber: 6,  allergens: ["Soy"] },
  { dish: "Hearty stew",             calories: 450, protein: 26, carbs: 48, fat: 14, fiber: 10, allergens: ["Celery"] },
  { dish: "Stir-fry with noodles",   calories: 560, protein: 22, carbs: 72, fat: 18, fiber: 7,  allergens: ["Soy", "Gluten", "Sesame"] },
  { dish: "Lentil & vegetable soup", calories: 340, protein: 18, carbs: 55, fat:  6, fiber: 12, allergens: ["Celery"] },
  { dish: "Grilled fish with greens",calories: 420, protein: 44, carbs: 18, fat: 18, fiber: 4,  allergens: ["Fish"] },
];

// Pool of notable micronutrients the simulation surfaces (base ~ amount per serving).
const MICRO_POOL: { name: string; unit: string; base: number; dv: number }[] = [
  { name: "Vitamin C", unit: "mg",  base: 24,  dv: 90 },
  { name: "Vitamin A", unit: "mcg", base: 180, dv: 900 },
  { name: "Iron",      unit: "mg",  base: 3.5, dv: 18 },
  { name: "Calcium",   unit: "mg",  base: 140, dv: 1300 },
  { name: "Potassium", unit: "mg",  base: 480, dv: 4700 },
  { name: "Folate",    unit: "mcg", base: 90,  dv: 400 },
  { name: "Vitamin D", unit: "mcg", base: 2.2, dv: 20 },
  { name: "Sodium",    unit: "mg",  base: 560, dv: 2300 },
];

function simVitamins(scale: number): Vitamin[] {
  return [...MICRO_POOL]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
    .map(m => {
      const amount = +(m.base * scale * (0.7 + Math.random() * 0.6)).toFixed(m.base < 10 ? 1 : 0);
      return { name: m.name, amount, unit: m.unit, percentDV: Math.min(95, Math.round((amount / m.dv) * 100)) };
    });
}

function cleanVitamins(v: unknown): Vitamin[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof (x as any).name === "string")
    .slice(0, 8)
    .map(x => ({
      name: String(x.name).slice(0, 40),
      amount: Math.max(0, +(Number(x.amount) || 0).toFixed(1)),
      unit: typeof x.unit === "string" ? x.unit.slice(0, 8) : "",
      percentDV: Math.min(100, Math.max(0, Math.round(Number(x.percentDV) || 0))),
    }));
}

function cleanAllergens(a: unknown): string[] {
  if (!Array.isArray(a)) return [];
  return [...new Set(a.filter((x): x is string => typeof x === "string").map(x => x.trim().slice(0, 30)).filter(Boolean))].slice(0, 12);
}

const jitter = (n: number, range = 0.12) =>
  Math.round(n * (1 + (Math.random() - 0.5) * range));

// Simulate a ~1.8 s "AI processing" delay
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const nowLabel = () =>
  new Date().toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

// Real vision estimate when the user is signed in and the AI gateway is
// configured; otherwise we fall back to the local simulation so the pilot keeps
// working. The return shape is identical either way.
export async function analyzeFood(
  image: string,
  hint?: { recipeCalories?: number; recipeName?: string; allergies?: string[] },
): Promise<FoodPhoto> {
  try {
    const a = await aiAnalyzeFood(image, hint);
    if (a && typeof a.calories === "number" && a.calories > 0) {
      return {
        id: crypto.randomUUID(),
        image,
        dish: a.dish || (hint?.recipeName ? `Your ${hint.recipeName}` : "Your meal"),
        calories: Math.round(a.calories),
        protein: Math.max(0, Math.round(a.protein ?? 0)),
        carbs: Math.max(0, Math.round(a.carbs ?? 0)),
        fat: Math.max(0, Math.round(a.fat ?? 0)),
        fiber: Math.max(0, Math.round(a.fiber ?? 0)),
        vitamins: cleanVitamins(a.vitamins),
        allergens: cleanAllergens(a.allergens),
        confidence: Math.min(100, Math.max(1, Math.round(a.confidence ?? 80))),
        when: nowLabel(),
        recipeId: undefined,
      };
    }
  } catch {
    // Not signed in, AI not configured, or the call failed, use simulation.
  }
  return simulateAnalysis(image, hint);
}

function simulateAnalysis(
  image: string,
  hint?: { recipeCalories?: number; recipeName?: string; allergies?: string[] },
): Promise<FoodPhoto> {
  return delay(1800).then(() => {
    const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    const baseCalories = hint?.recipeCalories ?? preset.calories;
    const scale = jitter(baseCalories, 0.1) / preset.calories;

    return {
      id: crypto.randomUUID(),
      image,
      dish: hint?.recipeName ? `Your ${hint.recipeName}` : preset.dish,
      calories: Math.round(baseCalories * scale),
      protein:  Math.max(2,  Math.round(preset.protein  * scale)),
      carbs:    Math.max(4,  Math.round(preset.carbs    * scale)),
      fat:      Math.max(2,  Math.round(preset.fat      * scale)),
      fiber:    Math.max(1,  Math.round(preset.fiber    * scale)),
      vitamins: simVitamins(scale),
      allergens: preset.allergens,
      confidence: Math.floor(72 + Math.random() * 22),
      when: nowLabel(),
      recipeId: undefined,
    };
  });
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
