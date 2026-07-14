import type { Recipe } from "./data";
import type { Profile } from "./store";
import type { Diner } from "./store";
import { normalizeMood, scoreByMood } from "./moodRules";

export const RANKING_CONFIG_VERSION = "mood-tags-v2";
export const LEARNED_SIGNAL_VERSION = "cuisine-v1";

// Slice 2 (roadmap v3): the first deterministic LEARNED signal. Derived from the
// user's own validated ratings (see behavioral.ts), it names the cuisines they
// repeatedly rate highly. It is a SOFT ranking nudge only — it never overrides the
// hard allergy/diet safety filters, and its boost is capped so a couple of good
// ratings can't dominate the mood match.
export type CuisineSignal = {
  preferred: string[];               // cuisines that cleared the confidence bar
  support: Record<string, number>;   // observation count per preferred cuisine
  derivationVersion: string;
};

// Capped, explainable boost for a recipe given a learned cuisine signal. Capped at
// LEARNED_BOOST_CAP so learned preferences can nudge but never swamp the ranking.
export const LEARNED_BOOST_CAP = 14;
export function learnedBoost(recipe: Recipe, signal?: CuisineSignal): number {
  if (!signal || !recipe.cuisine) return 0;
  if (!signal.preferred.includes(recipe.cuisine)) return 0;
  const support = signal.support[recipe.cuisine] ?? 0;
  // Grow with support but flatten quickly and cap.
  return Math.min(LEARNED_BOOST_CAP, 8 + support * 2);
}

// Slice 4 (roadmap v3): a second deterministic signal — which cuisines the user
// rates highly *in a given mood*. Applied only when the current mood matches.
export const MOOD_BOOST = 8;
export type MoodCuisineSignal = {
  byMood: Record<string, string[]>;   // mood -> cuisines they enjoy in that mood
  derivationVersion: string;
};
export function moodBoost(recipe: Recipe, signal: MoodCuisineSignal | undefined, mood: string): number {
  if (!signal || !recipe.cuisine || !mood) return 0;
  const canonicalMood = normalizeMood(mood);
  const cuisines = Object.entries(signal.byMood)
    .filter(([key]) => normalizeMood(key) === canonicalMood)
    .flatMap(([, values]) => values);
  return cuisines.includes(recipe.cuisine) ? MOOD_BOOST : 0;
}

// The bundle of learned signals fed into ranking, and the diversity cap on their
// combined effect (roadmap Slice 4: cap the max boost so learning can't crowd out
// novelty and variety).
export type LearnedSignals = { cuisine?: CuisineSignal; moodCuisine?: MoodCuisineSignal };
export const LEARNED_TOTAL_CAP = 18;
export function combinedLearnedBoost(recipe: Recipe, signals: LearnedSignals | undefined, mood: string): number {
  if (!signals) return 0;
  return Math.min(LEARNED_TOTAL_CAP, learnedBoost(recipe, signals.cuisine) + moodBoost(recipe, signals.moodCuisine, mood));
}
const LAND_MEAT = /\b(beef|steak|veal|chicken|turkey|duck|pork|bacon|ham|sausage|lamb|mutton|goat|venison|rabbit)\b/i;
const FISH = /\b(fish|salmon|tuna|cod|haddock|trout|sardine|anchov|prawn|shrimp|crab|lobster|mussel|clam|oyster|scallop|seafood)\b/i;

const normalize = (value: string) => value.trim().toLowerCase().replace(/s$/, "");
const containsTerm = (text: string, term: string) => {
  const escaped = normalize(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped ? new RegExp(`\\b${escaped}(?:s)?\\b`, "i").test(text) : false;
};

function supportsDiet(recipe: Recipe, diet: string) {
  const unrestricted = new Set(["", "any", "anything", "everything", "flexitarian", "omnivore", "no specific diet", "none"]);
  const constraints = diet.split("+").map(value => value.trim()).filter(value => !unrestricted.has(value.toLowerCase()));
  const recipeDiets = recipe.diets.map(value => value.toLowerCase());
  return constraints.every(constraint => {
    const value = constraint.toLowerCase();
    if (value.includes("pesc")) return recipeDiets.some(tag => ["pescatarian", "vegetarian", "vegan"].includes(tag));
    if (value.includes("vegetarian")) return recipeDiets.some(tag => ["vegetarian", "vegan"].includes(tag));
    if (value.includes("vegan")) return recipeDiets.includes("vegan");
    return recipeDiets.includes(value);
  });
}

export function safeRecipes(recipes: Recipe[], profile: Profile) {
  return recipes.filter(recipe => {
    const text = `${recipe.title} ${recipe.ingredients.join(" ")}`;
    const diet = profile.diet.toLowerCase();
    const declaredAllergens = recipe.allergens.map(normalize);
    const hasAllergen = profile.allergies.some(allergen =>
      declaredAllergens.includes(normalize(allergen)) || containsTerm(text, allergen)
    );
    return recipe.status === "published" &&
      !hasAllergen &&
      supportsDiet(recipe, profile.diet) &&
      !(diet.includes("pesc") && LAND_MEAT.test(text)) &&
      !((diet.includes("vegetarian") || diet.includes("vegan")) && (LAND_MEAT.test(text) || FISH.test(text)));
  });
}

// Maps comfort-food categories and flavor/texture cues to the words we expect
// to see in a recipe's text. Keeps the matcher honest about synonyms.
const TAG_KEYWORDS: Record<string, string[]> = {
  "Pasta": ["pasta", "spaghetti", "noodle", "linguine", "penne"],
  "Soup or stew": ["soup", "stew", "broth", "chowder", "bisque"],
  "Fresh & light": ["fresh", "light", "salad", "bright", "crisp"],
  "Fried & crispy": ["fried", "crispy", "crunchy", "golden"],
  "Cheesy dishes": ["cheese", "parmesan", "cheddar", "mozzarella", "creamy"],
  "Rice or noodle bowls": ["rice", "bowl", "noodle", "quinoa"],
  "Curry": ["curry", "coconut", "spiced", "masala"],
  "Grilled meats": ["grill", "roast", "chicken", "steak", "pork"],
  "Spicy food": ["spicy", "chili", "chilli", "harissa", "jalapeno"],
  "Creamy": ["creamy", "cream", "yogurt", "buttery"],
  "Crunchy": ["crunchy", "crisp", "toasted"],
  "Brothy/Soupy": ["broth", "soup", "stock"],
  "Hearty/Chunky": ["hearty", "chunky", "stew", "roast"],
  "Savory/Umami": ["savory", "umami", "parmesan", "mushroom", "tomato"],
  "Smoky": ["smoky", "smoked", "chipotle", "paprika"],
  "Bright/Citrusy": ["lemon", "lime", "citrus", "bright"],
  "Garlicky": ["garlic"],
  "Herby/Fresh": ["herb", "basil", "cilantro", "parsley", "fresh"],
};

function matchesTag(recipeText: string, tag: string) {
  const keys = TAG_KEYWORDS[tag] || [tag.toLowerCase()];
  return keys.some(k => recipeText.includes(k));
}

export function recipeScore(recipe: Recipe, profile: Profile, mood: string, energy: number, time: number) {
  const recipeText = `${recipe.reason} ${recipe.title} ${recipe.moods.join(" ")} ${recipe.cuisine} ${recipe.ingredients.join(" ")}`.toLowerCase();
  const profileText = `${profile.foodRelationship} ${profile.comfortCues.join(" ")} ${profile.sensoryCues.join(" ")}`.toLowerCase();
  const profileBoost = profileText.split(/\W+/).filter(word => word.length > 4 && recipeText.includes(word)).length * 3;

  // --- Deep-profile signal (taste phenotype, comfort, FCQ values, goals) ---
  const cuisineBoost = profile.cuisines.includes(recipe.cuisine) ? 18 : 0;
  const flavorBoost = profile.flavorLikes.filter(f => matchesTag(recipeText, f)).length * 6;
  const textureBoost = profile.textureLikes.filter(t => matchesTag(recipeText, t)).length * 5;
  const comfortBoost = profile.comfortFoods.filter(c => matchesTag(recipeText, c)).length * 8;
  const proteinBoost = profile.proteins.filter(p => recipeText.includes(p.split("/")[0].toLowerCase())).length * 4;

  // Soft penalties: disliked ingredients and texture/flavor aversions push a
  // recipe down without ever overriding the hard allergy/diet safety filters.
  const dislikePenalty = profile.dislikedIngredients.filter(d => recipeText.includes(d.toLowerCase().split(" ")[0])).length * -30;
  const flavorAvoidPenalty = profile.flavorAvoids.filter(f => matchesTag(recipeText, f)).length * -8;
  const textureAvoidPenalty = profile.textureAvoids.filter(t => recipeText.includes(t.toLowerCase())).length * -10;

  // Heat comfort: penalize spicy recipes when tolerance is low.
  const spicy = /spicy|chili|chilli|harissa|jalapeno/.test(recipeText);
  const spicePenalty = spicy && profile.spiceTolerance < 35 ? -15 : 0;

  // Nutrition goals (gentle nudges only).
  let goalBoost = 0;
  if (profile.nutritionGoals.includes("Lighter meals") && recipe.calories <= 480) goalBoost += 8;
  if (profile.nutritionGoals.includes("More protein") && recipe.diets.includes("High protein")) goalBoost += 8;
  if (profile.nutritionGoals.includes("More vegetables") && recipe.diets.some(d => ["Vegetarian", "Vegan"].includes(d))) goalBoost += 5;

  const canonicalMood = normalizeMood(mood);
  const directMoodBoost = recipe.moods.some(value => normalizeMood(value) === canonicalMood) ? 40 : 0;

  return directMoodBoost + scoreByMood(recipe, mood) +
    (recipe.time <= time ? 25 : -20) +
    (energy < 50 && recipe.difficulty === "Easy" ? 15 : 0) +
    profileBoost + cuisineBoost + flavorBoost + textureBoost + comfortBoost + proteinBoost +
    dislikePenalty + flavorAvoidPenalty + textureAvoidPenalty + spicePenalty + goalBoost;
}

// `signal` is the optional learned cuisine preference (Slice 2). When omitted (the
// default, and whenever the learned-signals flag is off or consent is absent), the
// ranking is identical to before — so turning learning on is the only thing that
// can change results, and turning it off is a clean revert.
export function recommend(recipes: Recipe[], profile: Profile, mood: string, energy: number, time: number, signals?: LearnedSignals) {
  return safeRecipes(recipes, profile)
    .filter(recipe => recipe.time <= time)
    .map(recipe => ({
      recipe,
      score: recipeScore(recipe, profile, mood, energy, time) + combinedLearnedBoost(recipe, signals, mood),
      configVersion: RANKING_CONFIG_VERSION,
    }))
    .sort((a, b) => b.score - a.score);
}

export function profileForDiners(profile: Profile, diners: Diner[]) {
  const allergies = [...new Set([...profile.allergies, ...diners.flatMap(d => d.allergies)])];
  const unrestricted = new Set(["", "any", "anything", "everything", "flexitarian", "omnivore", "no specific diet", "none"]);
  const diets = [...new Set([profile.diet, ...diners.map(d => d.diet)].filter(d => !unrestricted.has(d.toLowerCase())))];
  return { ...profile, allergies, diet: diets.length ? diets.join(" + ") : "Everything" };
}
