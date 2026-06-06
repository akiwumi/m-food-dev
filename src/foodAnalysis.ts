// Food photo analysis — simulates a vision-AI calorie/macro estimation.
// In production this calls a multimodal endpoint (e.g. GPT-4o Vision, Gemini,
// or a dedicated food-recognition API). The interface is identical so the swap
// is a one-line change: replace `simulateAnalysis` with a real fetch.

export type FoodPhoto = {
  id: string;
  image: string;         // base64 data-URL — safe to store in localStorage
  dish: string;          // detected or user-supplied name
  calories: number;
  protein: number;       // grams
  carbs: number;         // grams
  fat: number;           // grams
  fiber: number;         // grams
  confidence: number;    // 0-100 — shown as "Estimated with X% confidence"
  when: string;          // human-readable datetime
  recipeId?: string;     // if logged after cooking a specific recipe
  note?: string;
};

// Realistic presets the simulation draws from
const PRESETS: Omit<FoodPhoto, "id" | "image" | "when" | "confidence">[] = [
  { dish: "Pasta bowl",              calories: 620, protein: 18, carbs: 82, fat: 22, fiber: 8 },
  { dish: "Chicken & quinoa bowl",   calories: 540, protein: 42, carbs: 48, fat: 16, fiber: 6 },
  { dish: "Tomato basil soup",       calories: 430, protein: 12, carbs: 52, fat: 18, fiber: 5 },
  { dish: "Vegetable tacos",         calories: 480, protein: 14, carbs: 62, fat: 18, fiber: 9 },
  { dish: "Green salad bowl",        calories: 380, protein: 16, carbs: 38, fat: 20, fiber: 7 },
  { dish: "Rice & protein bowl",     calories: 510, protein: 28, carbs: 68, fat: 14, fiber: 6 },
  { dish: "Hearty stew",             calories: 450, protein: 26, carbs: 48, fat: 14, fiber: 10 },
  { dish: "Stir-fry with noodles",   calories: 560, protein: 22, carbs: 72, fat: 18, fiber: 7 },
  { dish: "Lentil & vegetable soup", calories: 340, protein: 18, carbs: 55, fat:  6, fiber: 12 },
  { dish: "Grilled fish with greens",calories: 420, protein: 44, carbs: 18, fat: 18, fiber: 4 },
];

const jitter = (n: number, range = 0.12) =>
  Math.round(n * (1 + (Math.random() - 0.5) * range));

// Simulate a ~1.8 s "AI processing" delay
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function analyzeFood(
  image: string,
  hint?: { recipeCalories?: number; recipeName?: string },
): Promise<FoodPhoto> {
  await delay(1800);

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
    confidence: Math.floor(72 + Math.random() * 22),
    when: new Date().toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    }),
    recipeId: undefined,
  };
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
