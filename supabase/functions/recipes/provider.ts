type Fetcher = typeof fetch;

const MEALDB = "https://www.themealdb.com/api/json/v1/1";
const LAND_MEAT = /\b(beef|steak|veal|chicken|turkey|duck|pork|bacon|ham|sausage|lamb|mutton|goat|venison|rabbit)\b/i;
const FISH = /\b(fish|salmon|tuna|cod|haddock|trout|sardine|anchov|prawn|shrimp|crab|lobster|mussel|clam|oyster|scallop|seafood)\b/i;

function youtubeEmbed(url: string): string {
  const id = url.match(/[?&]v=([^&]+)/)?.[1] ?? "";
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

function normalizeMeal(meal: Record<string, unknown>, mood: string) {
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = String(meal[`strIngredient${i}`] ?? "").trim();
    if (!ingredient) continue;
    const measure = String(meal[`strMeasure${i}`] ?? "").trim();
    ingredients.push(`${measure} ${ingredient}`.trim());
  }

  const instructions = String(meal.strInstructions ?? "").trim();
  const mealText = `${String(meal.strMeal ?? "")} ${String(meal.strCategory ?? "")} ${ingredients.join(" ")}`;
  const diets = LAND_MEAT.test(mealText) ? [] : FISH.test(mealText) ? ["Pescatarian"] : ["Vegetarian"];
  const steps = instructions
    .split(/\r?\n+|(?<=[.!?])\s+/)
    .map(text => text.trim())
    .filter(Boolean)
    .map(text => ({ text, title: text, detail: text, image: String(meal.strMealThumb ?? "") }));

  return {
    id: `mealdb-${meal.idMeal}`,
    title: String(meal.strMeal ?? "Recipe"),
    image: String(meal.strMealThumb ?? ""),
    time: 30,
    difficulty: "Easy",
    calories: 0,
    moods: [mood],
    reason: `A real ${String(meal.strCategory ?? "meal").toLowerCase()} recipe for your ${mood.toLowerCase()} mood.`,
    ingredients,
    steps: steps.length ? steps : [{ text: "See the original recipe for instructions." }],
    cuisine: String(meal.strArea ?? ""),
    mealTypes: [String(meal.strCategory ?? "").toLowerCase()].filter(Boolean),
    diets,
    allergens: [],
    equipment: [],
    status: "published",
    video: youtubeEmbed(String(meal.strYoutube ?? "")),
    sourceUrl: String(meal.strSource ?? ""),
  };
}

const stripHtml = (value: string) => (value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const spoonacularImage = (recipe: any) => {
  const image = String(recipe.image ?? "").trim();
  if (/^https?:\/\//.test(image)) return image;
  if (image) return `https://img.spoonacular.com/recipes/${image}`;
  return recipe.id && recipe.imageType ? `https://img.spoonacular.com/recipes/${recipe.id}-636x393.${recipe.imageType}` : "";
};

export function filterRecipesForProfile(recipes: any[], profile: any): any[] {
  const diet = String(profile?.diet ?? "").toLowerCase();
  const dietConstraints = diet.split("+").map(value => value.trim()).filter(value => value && !["any", "anything", "everything", "flexitarian"].includes(value));
  const allergies = (profile?.allergies ?? []).map((value: string) => value.toLowerCase().replace(/s$/, "")).filter(Boolean);
  const religious = (profile?.dietReligious ?? []).join(" ").toLowerCase();

  return recipes.filter(recipe => {
    const text = `${recipe.title ?? ""} ${(recipe.ingredients ?? []).join(" ")}`.toLowerCase();
    const tags = (recipe.diets ?? []).map((value: string) => value.toLowerCase());
    if (allergies.some((term: string) => text.includes(term))) return false;
    if ((diet.includes("pesc") || diet.includes("vegetarian") || diet.includes("vegan")) && LAND_MEAT.test(text)) return false;
    if ((diet.includes("vegetarian") || diet.includes("vegan")) && FISH.test(text)) return false;
    if (!dietConstraints.every(constraint => {
      if (constraint.includes("vegan")) return tags.includes("vegan");
      if (constraint.includes("vegetarian")) return tags.some((tag: string) => ["vegetarian", "vegan"].includes(tag));
      if (constraint.includes("pesc")) return !tags.length || tags.some((tag: string) => ["pescatarian", "vegetarian", "vegan"].includes(tag));
      if (constraint.includes("keto")) return tags.some((tag: string) => tag.includes("keto"));
      return tags.some((tag: string) => tag.includes(constraint));
    })) return false;
    if (/no pork|halal|kosher|jewish|muslim|islam|seventh-day/.test(religious) && /\b(pork|bacon|ham)\b/i.test(text)) return false;
    if (/no beef|hindu/.test(religious) && /\b(beef|steak|veal)\b/i.test(text)) return false;
    return true;
  });
}

export function filterRecipesByMaxTime(recipes: any[], maxTime: number): any[] {
  return recipes.filter(recipe => Number.isFinite(recipe?.time) && recipe.time <= maxTime);
}

const CATEGORY_TYPES: Record<string, string[]> = {
  main: ["main course"],
  starter: ["appetizer", "salad", "soup", "side dish"],
  dessert: ["dessert"],
  snack: ["snack"],
};

export function filterRecipesByCategory(recipes: any[], category: string): any[] {
  const allowed = CATEGORY_TYPES[(category ?? "").toLowerCase()];
  if (!allowed) return recipes;
  return recipes.filter(recipe => (recipe.mealTypes ?? []).some((type: string) => allowed.includes(type.toLowerCase())));
}

export function dedupeRecipes(recipes: any[]): any[] {
  const ids = new Set<string>();
  const titles = new Set<string>();
  return recipes.filter(recipe => {
    const id = String(recipe?.id ?? "").trim();
    const title = String(recipe?.title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if ((id && ids.has(id)) || (title && titles.has(title))) return false;
    if (id) ids.add(id);
    if (title) titles.add(title);
    return true;
  });
}

export function applyCuratedRanking(recipes: any[], ranking: any[]): any[] {
  const rankedIndexes = new Set<number>();
  const ranked = (Array.isArray(ranking) ? ranking : []).flatMap(item => {
    const index = Number.isInteger(item?.i) ? item.i : -1;
    const recipe = recipes[index];
    if (!recipe || rankedIndexes.has(index)) return [];
    rankedIndexes.add(index);
    return [{ ...recipe, reason: typeof item.reason === "string" && item.reason.trim() ? item.reason.trim() : recipe.reason }];
  });
  return [...ranked, ...recipes.filter((_, index) => !rankedIndexes.has(index))];
}

// Meal types that should not appear in default "Find tonight's dinner" results.
// They remain available as explicit search filter selections.
const ACCESSORY_TYPES = new Set([
  "dessert", "desserts", "snack", "snacks",
  "drink", "drinks", "beverage", "beverages",
  "sweet", "sweets",
]);

export function filterOutAccessoryTypes(recipes: any[]): any[] {
  return recipes.filter(recipe => {
    const types = (recipe.mealTypes ?? []).map((t: string) => t.toLowerCase());
    if (!types.length) return true; // no type info → keep
    return !types.every((t: string) => ACCESSORY_TYPES.has(t));
  });
}

export function filterRecipesWithCompleteInstructions(recipes: any[]): any[] {
  const placeholder = /\b(see|view|find)\b.*\b(full|original|source)\b.*\binstructions?\b/i;
  return recipes.filter(recipe =>
    Array.isArray(recipe?.steps) &&
    recipe.steps.length > 0 &&
    recipe.steps.every((step: any) => typeof step?.text === "string" && step.text.trim() && !placeholder.test(step.text))
  );
}

export function normalizeSpoonacularRecipe(recipe: any, mood: string) {
  const nutrients = recipe.nutrition?.nutrients ?? [];
  const calories = Math.round(nutrients.find((nutrient: any) => nutrient.name === "Calories")?.amount ?? 0);
  const time = recipe.readyInMinutes ?? 30;
  const steps = (recipe.analyzedInstructions ?? []).flatMap((section: any) => section?.steps ?? []).map((step: any) => {
    const text = String(step.step ?? "").trim();
    return {
      text,
      title: text,
      detail: text,
      image: step.image ? (/^https?:\/\//.test(step.image) ? step.image : `https://img.spoonacular.com/recipes/${step.image}`) : "",
      active: (step.ingredients ?? []).map((item: any) => item.name).filter(Boolean),
      equipment: (step.equipment ?? []).map((item: any) => item.name).filter(Boolean),
    };
  }).filter((step: { text: string }) => step.text);
  const ingredients = (recipe.extendedIngredients ?? []).map((ingredient: any) => ingredient.original).filter(Boolean);

  return {
    id: String(recipe.id),
    title: recipe.title ?? "Recipe",
    image: spoonacularImage(recipe),
    time,
    difficulty: time <= 30 ? "Easy" : "Medium",
    calories,
    moods: [mood],
    reason: stripHtml(recipe.summary).split(". ").slice(0, 1).join(". "),
    ingredients,
    steps: steps.length ? steps : [{ text: "See full instructions on the recipe source.", title: "See full instructions", detail: "See full instructions on the recipe source." }],
    cuisine: recipe.cuisines?.[0] ?? "",
    mealTypes: recipe.dishTypes ?? [],
    diets: recipe.diets ?? [],
    allergens: [],
    equipment: [],
    status: "published",
    video: "",
    sourceUrl: recipe.sourceUrl ?? recipe.spoonacularSourceUrl ?? "",
  };
}

export async function fetchTheMealDbRecipes(
  query: string,
  mood: string,
  limit = 10,
  fetcher: Fetcher = fetch,
) {
  const randomUrls = () => Array.from({ length: Math.min(limit, 10) }, () => `${MEALDB}/random.php`);
  const urls = query.trim()
    ? [`${MEALDB}/search.php?s=${encodeURIComponent(query.trim())}`]
    : randomUrls();

  try {
    const load = async (requests: string[]) => {
      const responses = await Promise.all(requests.map(url => fetcher(url, { signal: AbortSignal.timeout(8_000) })));
      const payloads = await Promise.all(responses.filter(res => res.ok).map(res => res.json()));
      return payloads.flatMap(payload => Array.isArray(payload?.meals) ? payload.meals : []);
    };
    let meals = await load(urls);
    if (!meals.length && query.trim()) meals = await load(randomUrls());
    const unique = [...new Map(meals.map(meal => [String(meal.idMeal), meal])).values()];
    return unique.slice(0, limit).map(meal => normalizeMeal(meal, mood));
  } catch {
    return [];
  }
}
