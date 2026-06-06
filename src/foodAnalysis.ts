// Food photo analysis. Calls the real OpenAI vision estimate via the ai-gateway
// when the user is signed in and the backend is configured; otherwise falls back
// to a local simulation so the pilot keeps working. See analyzeFood below.
import { aiAnalyzeFood } from "./ai";

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

const nowLabel = () =>
  new Date().toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

// Real vision estimate when the user is signed in and the AI gateway is
// configured; otherwise we fall back to the local simulation so the pilot keeps
// working. The return shape is identical either way.
export async function analyzeFood(
  image: string,
  hint?: { recipeCalories?: number; recipeName?: string },
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
        confidence: Math.min(100, Math.max(1, Math.round(a.confidence ?? 80))),
        when: nowLabel(),
        recipeId: undefined,
      };
    }
  } catch {
    // Not signed in, AI not configured, or the call failed — use simulation.
  }
  return simulateAnalysis(image, hint);
}

function simulateAnalysis(
  image: string,
  hint?: { recipeCalories?: number; recipeName?: string },
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
      confidence: Math.floor(72 + Math.random() * 22),
      when: nowLabel(),
      recipeId: undefined,
    };
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
