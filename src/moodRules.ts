import type { Recipe, RecipeTags } from "./data";

export const canonicalMoods = [
  "Tired", "Stressed", "Happy", "Romantic",
  "Healthy", "Focused",
] as const;

export type MoodName = typeof canonicalMoods[number];
export type MoodRule = {
  description: string;
  positive: Record<string, number>;
  negative: Record<string, number>;
};

const aliases: Record<string, MoodName> = {
  Energised: "Focused",
};

export function normalizeMood(mood: string): string {
  return aliases[mood] ?? mood;
}

// Evidence-informed mood → food weighting.
//
// The primary weight of each mood stays its original culinary intent (comfort,
// calm, celebration…). Layered ON TOP are MODEST nutrition nudges drawn from the
// Food & Mood evidence in docs/clinically-backed-mood-analysis-report.md:
//   • The Mediterranean / whole-food pattern (SMILES RCT, Jacka et al. 2017) —
//     vegetables, whole grains, legumes, oily fish (omega-3), leafy greens,
//     fermented foods — has moderate-strength support as an adjunctive lifestyle
//     factor for low mood and well-being.
//   • For anxious / stressed states the evidence also points to steady-energy
//     (slow-release) carbohydrates and going easy on caffeine and added sugar.
// These are secondary weights (single digits to low-teens) so they refine
// ordering without overriding the mood the user actually picked. This is food
// guidance, not medical advice or diagnosis — see the report's Clinical Boundary.
export const moodRules: Record<MoodName, MoodRule> = {
  Tired: {
    description: "Low-effort, nourishing comfort — warm, familiar, and easy on your energy.",
    // Comfort/effort stays primary; a light nudge toward steady-energy foods and
    // away from a sugar crash that tends to deepen fatigue.
    positive: { low_effort: 25, quick: 20, warm: 15, comforting: 15, one_pot: 10, simple_steps: 10, familiar: 8, few_ingredients: 8, slow_release_energy: 10, whole_grain: 8, balanced: 6 },
    negative: { complex: -25, long_prep: -20, technical: -20, many_steps: -15, high_sugar: -8 },
  },
  Stressed: {
    description: "Calming, simple meals with steady-energy carbs — gentle on caffeine and sugar.",
    // Anxiety evidence: favour slow-release carbs, omega-3, magnesium-rich greens
    // and fermented foods; ease off caffeine, added sugar, and ultra-processed.
    positive: { calming: 25, simple_steps: 20, warm: 15, gentle_flavour: 15, one_pot: 10, balanced: 10, predictable: 8, slow_release_energy: 12, omega_3: 10, leafy_greens: 8, whole_grain: 8, fermented: 6 },
    negative: { messy: -20, experimental: -18, very_spicy: -15, many_steps: -15, caffeine: -12, high_sugar: -12, ultra_processed: -10 },
  },
  Happy: {
    description: "Bright, colourful, fun food for a good mood.",
    // Kept celebratory; only a faint lean toward fresh produce and away from
    // ultra-processed so joy isn't over-medicalised.
    positive: { colourful: 22, fresh: 18, bright: 18, flavourful: 15, crispy: 10, zesty: 10, shareable: 8, vegetable_rich: 6 },
    negative: { plain: -12, dull: -15, heavy: -8, ultra_processed: -8 },
  },
  Romantic: {
    description: "Elegant, shareable meals for date-night or special moments.",
    positive: { elegant: 25, special_occasion: 20, shareable: 15, beautiful_presentation: 15, rich_flavour: 12, restaurant_style: 12 },
    negative: { messy: -15, meal_prep: -15, too_simple: -10, difficult_to_share: -10 },
  },
  Healthy: {
    description: "Fresh, balanced, Mediterranean-leaning plates — vegetables, whole grains, legumes, and omega-3.",
    // The mood that maps most directly to the SMILES / Mediterranean evidence.
    positive: { balanced: 22, vegetable_rich: 18, high_protein: 12, high_fibre: 12, fresh: 10, nutrient_dense: 10, low_sugar: 8, omega_3: 12, whole_grain: 12, legumes: 10, leafy_greens: 10, mediterranean: 10, fermented: 6 },
    negative: { deep_fried: -20, high_sugar: -18, very_heavy: -12, ultra_processed: -22 },
  },
  Focused: {
    description: "Steady fuel for concentration — protein, slow-release carbs, and omega-3, low on sugar.",
    // slow_release_energy is now actually inferred (whole grains / legumes), so
    // this weight finally fires; omega-3 added for its cognition support.
    positive: { high_protein: 22, balanced: 20, slow_release_energy: 18, light: 12, fresh: 10, low_sugar: 10, meal_prep_friendly: 8, omega_3: 12, whole_grain: 10 },
    negative: { greasy: -15, high_sugar: -18, very_heavy: -15, sleepy_food: -15, ultra_processed: -10 },
  },
};

const unique = (values: string[]) => [...new Set(values)];
const add = (tags: RecipeTags, group: keyof RecipeTags, ...values: string[]) => {
  tags[group] = unique([...(tags[group] ?? []), ...values]);
};

export function flattenRecipeTags(tags: RecipeTags = {}): string[] {
  return unique(Object.values(tags).flatMap(values => values ?? []));
}

export function inferRecipeTags(recipe: Recipe): RecipeTags {
  const tags: RecipeTags = Object.fromEntries(
    Object.entries(recipe.tags ?? {}).map(([group, values]) => [group, [...(values ?? [])]]),
  );
  const text = `${recipe.title} ${recipe.reason} ${recipe.ingredients.join(" ")} ${recipe.steps.map(step => typeof step === "string" ? step : step.text).join(" ")}`.toLowerCase();
  const stepCount = recipe.steps.length;

  if (recipe.time <= 20) add(tags, "effort", "quick");
  if (recipe.time <= 30 && recipe.difficulty === "Easy") add(tags, "effort", "low_effort");
  if (recipe.time > 60) add(tags, "effort", "long_prep");
  if (recipe.ingredients.length <= 5) add(tags, "effort", "few_ingredients");
  if (stepCount <= 4) add(tags, "effort", "simple_steps");
  if (stepCount >= 9) add(tags, "effort", "many_steps");
  if (recipe.difficulty === "Medium" && stepCount >= 7) add(tags, "effort", "technical");

  if (/\bone[- ]pot\b/.test(text)) add(tags, "cookingStyle", "one_pot");
  if (/\bone[- ]pan\b/.test(text)) add(tags, "cookingStyle", "one_pan");
  if (/\b(bake|baked|oven|roast|roasted)\b/.test(text)) add(tags, "cookingStyle", "baked");
  if (/\bgrill(ed)?\b/.test(text)) add(tags, "cookingStyle", "grilled");
  if (/\bno[- ]cook\b/.test(text)) add(tags, "cookingStyle", "no_cook");

  if (/\b(soup|stew|pasta|porridge|congee|casserole|curry)\b/.test(text)) add(tags, "mood", "comforting");
  if (/\b(cream|creamy|yogurt|cheese|butter)\b/.test(text)) add(tags, "sensory", "creamy");
  if (/\b(crisp|crispy|crunch|crunchy|fried)\b/.test(text)) add(tags, "sensory", "crispy", "crunchy");
  if (/\b(chili|chilli|jalapeno|harissa|hot sauce|spicy)\b/.test(text)) add(tags, "sensory", "spicy", "bold_flavour");
  else add(tags, "sensory", "not_spicy");
  if (/\b(lemon|lime|citrus)\b/.test(text)) add(tags, "sensory", "zesty", "bright");
  if (/\b(salad|fresh|herb|parsley|basil|cilantro)\b/.test(text)) add(tags, "sensory", "fresh");
  if (/\b(soup|stew|pasta|rice|noodle|baked|roast|curry|porridge|congee)\b/.test(text)) add(tags, "sensory", "warm");
  if (/\b(soup|stew|porridge|congee|mash|creamy|scrambled)\b/.test(text)) add(tags, "sensory", "soft_texture");
  if (recipe.moods.some(mood => ["Cozy", "Tired", "Stressed"].includes(mood))) add(tags, "sensory", "familiar");

  if (recipe.diets.some(diet => diet.toLowerCase().includes("high protein"))) add(tags, "nutrition", "high_protein");
  if (recipe.diets.some(diet => ["vegetarian", "vegan"].includes(diet.toLowerCase())) || /\b(spinach|broccoli|kale|vegetable|beans|lentils|peas)\b/.test(text)) add(tags, "nutrition", "vegetable_rich");
  if (recipe.calories > 0 && recipe.calories <= 550) add(tags, "nutrition", "balanced");
  if (recipe.calories > 0 && recipe.calories <= 450) add(tags, "nutrition", "light");

  // Evidence-based nutrition signals (Food & Mood report). Conservative,
  // whole-ingredient matches so they only fire on genuine Mediterranean / SMILES
  // pattern components — and on the "limit" list the evidence flags.
  if (/\b(salmon|mackerel|sardine|sardines|trout|herring|anchov|kipper|tuna|walnut|walnuts|flaxseed|flax seed|linseed|chia)\b/.test(text)) add(tags, "nutrition", "omega_3");
  if (/\b(oat|oats|oatmeal|porridge|brown rice|wild rice|quinoa|wholemeal|whole[- ]?wheat|wholegrain|whole grain|barley|buckwheat|bulgur|bulghur|farro|freekeh|rye|millet|spelt)\b/.test(text)) add(tags, "nutrition", "whole_grain", "slow_release_energy");
  if (/\b(lentil|lentils|chickpea|chickpeas|hummus|houmous|black beans?|kidney beans?|cannellini|butter beans?|borlotti|edamame|split pea|dal|dhal|daal)\b/.test(text)) add(tags, "nutrition", "legumes", "slow_release_energy");
  if (/\b(spinach|kale|chard|rocket|arugula|watercress|collard|cavolo nero)\b/.test(text)) add(tags, "nutrition", "leafy_greens");
  if (/\b(yogurt|yoghurt|kefir|kimchi|sauerkraut|miso|tempeh|kombucha|natto)\b/.test(text)) add(tags, "nutrition", "fermented");
  if (/\b(dessert|cake|brownie|cookie|cookies|biscuit|pie|pudding|ice[- ]cream|candy|frosting|icing|caramel|syrup|condensed milk|doughnut|donut)\b/.test(text)) add(tags, "nutrition", "high_sugar");
  if (/\b(instant noodle|instant ramen|packet mix|ready[- ]meal|hot ?dog|chicken nugget|nuggets|ultra[- ]processed|boxed mix)\b/.test(text)) add(tags, "nutrition", "ultra_processed");
  if (/\b(coffee|espresso|matcha|cold brew)\b/.test(text)) add(tags, "nutrition", "caffeine");
  // Mediterranean composite: olive oil plus at least one plant/fish component.
  const nutritionSoFar = new Set(flattenRecipeTags(tags));
  if (/\bolive oil\b/.test(text) && ["omega_3", "legumes", "whole_grain", "vegetable_rich", "leafy_greens"].some(t => nutritionSoFar.has(t))) add(tags, "nutrition", "mediterranean");

  if (recipe.time <= 40) add(tags, "occasion", "weeknight");
  if (recipe.ingredients.length <= 8) add(tags, "occasion", "solo_meal");
  if (/\b(platter|sharing|family|party|tacos|pizza)\b/.test(text)) add(tags, "occasion", "shareable", "family_style");
  if (/\b(date night|special occasion|restaurant)\b/.test(text)) add(tags, "occasion", "special_occasion");

  return tags;
}

export const recipeTags = inferRecipeTags;

export function scoreByMood(recipe: Recipe, mood: string): number {
  const rule = moodRules[normalizeMood(mood) as MoodName];
  if (!rule) return 0;
  const tags = new Set(flattenRecipeTags(inferRecipeTags(recipe)));
  let score = 0;
  for (const [tag, weight] of Object.entries(rule.positive)) if (tags.has(tag)) score += weight;
  for (const [tag, weight] of Object.entries(rule.negative)) if (tags.has(tag)) score += weight;
  return score;
}
