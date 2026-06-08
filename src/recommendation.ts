import type { Recipe } from "./data";
import type { Profile } from "./store";
import type { Diner } from "./store";

export const RANKING_CONFIG_VERSION = "pilot-v1";
const LAND_MEAT = /\b(beef|steak|veal|chicken|turkey|duck|pork|bacon|ham|sausage|lamb|mutton|goat|venison|rabbit)\b/i;
const FISH = /\b(fish|salmon|tuna|cod|haddock|trout|sardine|anchov|prawn|shrimp|crab|lobster|mussel|clam|oyster|scallop|seafood)\b/i;

function supportsDiet(recipe: Recipe, diet: string) {
  if (["Anything", "Everything", "Flexitarian"].includes(diet)) return true;
  if (diet === "Pescatarian") return recipe.diets.some(value => ["Pescatarian", "Vegetarian", "Vegan"].includes(value));
  return recipe.diets.includes(diet);
}

export function safeRecipes(recipes: Recipe[], profile: Profile) {
  return recipes.filter(recipe => {
    const text = `${recipe.title} ${recipe.ingredients.join(" ")}`;
    const diet = profile.diet.toLowerCase();
    return recipe.status === "published" &&
      !recipe.allergens.some(allergen => profile.allergies.includes(allergen)) &&
      supportsDiet(recipe, profile.diet) &&
      !(diet.includes("pesc") && LAND_MEAT.test(text)) &&
      !((diet.includes("vegetarian") || diet.includes("vegan")) && (LAND_MEAT.test(text) || FISH.test(text))) &&
      recipe.equipment.every(item => profile.equipment.includes(item));
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

  return (recipe.moods.includes(mood) ? 40 : 0) +
    (recipe.time <= time ? 25 : -20) +
    (energy < 50 && recipe.difficulty === "Easy" ? 15 : 0) +
    profileBoost + cuisineBoost + flavorBoost + textureBoost + comfortBoost + proteinBoost +
    dislikePenalty + flavorAvoidPenalty + textureAvoidPenalty + spicePenalty + goalBoost;
}

export function recommend(recipes: Recipe[], profile: Profile, mood: string, energy: number, time: number) {
  return safeRecipes(recipes, profile)
    .filter(recipe => recipe.time <= time)
    .map(recipe => ({ recipe, score: recipeScore(recipe, profile, mood, energy, time), configVersion: RANKING_CONFIG_VERSION }))
    .sort((a, b) => b.score - a.score);
}

export function profileForDiners(profile: Profile, diners: Diner[]) {
  const allergies = [...new Set([...profile.allergies, ...diners.flatMap(d => d.allergies)])];
  const diets = [profile.diet, ...diners.map(d => d.diet)].filter(d => !["Anything", "Everything", "Flexitarian"].includes(d));
  return { ...profile, allergies, diet: diets.length === 1 ? diets[0] : diets.length > 1 && new Set(diets).size === 1 ? diets[0] : "Everything" };
}
