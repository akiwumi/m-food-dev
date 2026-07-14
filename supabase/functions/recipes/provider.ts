type Fetcher = typeof fetch;

const MEALDB = "https://www.themealdb.com/api/json/v1/1";
const LAND_MEAT = /\b(beef|steak|veal|chicken|turkey|duck|pork|bacon|ham|sausage|lamb|mutton|goat|venison|rabbit)\b/i;
const FISH = /\b(fish|salmon|tuna|cod|haddock|trout|sardine|anchov|prawn|shrimp|crab|lobster|mussel|clam|oyster|scallop|seafood)\b/i;
const PROVIDER_CUISINE_FAMILIES: Record<string, string[]> = {
  asian: ["Asian", "Chinese", "Indian", "Japanese", "Korean", "Thai", "Vietnamese"],
};
const MEALDB_CATEGORY_FILTERS: Record<string, string[]> = {
  breakfast: ["Breakfast"],
  lunch: ["Chicken", "Pasta", "Seafood", "Vegetarian", "Vegan"],
  dinner: ["Beef", "Chicken", "Lamb", "Pasta", "Pork", "Seafood", "Vegetarian", "Vegan"],
  snacks: ["Starter", "Side"],
  snack: ["Starter", "Side"],
  starter: ["Starter", "Side"],
  dessert: ["Dessert"],
};
const MEALDB_AREAS = new Set([
  "American", "British", "Canadian", "Chinese", "Croatian", "Dutch", "Egyptian",
  "Filipino", "French", "Greek", "Indian", "Irish", "Italian", "Jamaican", "Japanese",
  "Kenyan", "Malaysian", "Mexican", "Moroccan", "Polish", "Portuguese", "Russian",
  "Spanish", "Thai", "Tunisian", "Turkish", "Ukrainian", "Vietnamese",
]);

function inferProviderTags(recipe: any) {
  const text = `${recipe.title ?? ""} ${recipe.reason ?? ""} ${(recipe.ingredients ?? []).join(" ")} ${(recipe.steps ?? []).map((step: any) => step?.text ?? "").join(" ")}`.toLowerCase();
  const tags: Record<string, string[]> = { mood: [], effort: [], sensory: [], nutrition: [], occasion: [], cookingStyle: [] };
  const add = (group: string, ...values: string[]) => tags[group].push(...values.filter(value => !tags[group].includes(value)));

  if (recipe.time <= 20) add("effort", "quick");
  if (recipe.time <= 30 && recipe.difficulty === "Easy") add("effort", "low_effort");
  if ((recipe.ingredients ?? []).length <= 5) add("effort", "few_ingredients");
  if ((recipe.steps ?? []).length <= 4) add("effort", "simple_steps");
  if (/\b(bake|baked|oven|roast|roasted)\b/.test(text)) add("cookingStyle", "baked");
  if (/\bone[- ]pot\b/.test(text)) add("cookingStyle", "one_pot");
  if (/\bgrill(ed)?\b/.test(text)) add("cookingStyle", "grilled");
  if (/\bno[- ]cook\b/.test(text)) add("cookingStyle", "no_cook");
  if (/\b(soup|stew|pasta|porridge|congee|casserole|curry)\b/.test(text)) add("mood", "comforting");
  if (/\b(cream|creamy|yogurt|cheese|butter)\b/.test(text)) add("sensory", "creamy");
  if (/\b(crisp|crispy|crunch|crunchy|fried)\b/.test(text)) add("sensory", "crispy", "crunchy");
  if (/\b(chili|chilli|jalapeno|harissa|hot sauce|spicy)\b/.test(text)) add("sensory", "spicy", "bold_flavour");
  else add("sensory", "not_spicy");
  if (!/\b(no[- ]cook|salad|raw)\b/.test(text)) add("sensory", "warm");
  if ((recipe.diets ?? []).some((diet: string) => diet.toLowerCase().includes("high protein"))) add("nutrition", "high_protein");
  if ((recipe.diets ?? []).some((diet: string) => ["vegetarian", "vegan"].includes(diet.toLowerCase()))) add("nutrition", "vegetable_rich");
  if (recipe.time <= 40) add("occasion", "weeknight");
  if ((recipe.ingredients ?? []).length <= 8) add("occasion", "solo_meal");
  return tags;
}

export function expandProviderCuisines(cuisines: string[]): string[] {
  return [...new Set(cuisines.flatMap(cuisine => PROVIDER_CUISINE_FAMILIES[cuisine.toLowerCase()] ?? [cuisine]))];
}

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

  const normalized = {
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
  return { ...normalized, tags: inferProviderTags(normalized) };
}

const stripHtml = (value: string) => (value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const decodeHtml = (value: string) => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");

function instructionTextSteps(value: unknown): string[] {
  const source = String(value ?? "").trim();
  if (!source) return [];
  const blocks = source.match(/<(?:li|p)(?:\s[^>]*)?>[\s\S]*?<\/(?:li|p)>/gi) ?? [];
  const candidates = blocks.length
    ? blocks.map(block => decodeHtml(stripHtml(block)))
    : decodeHtml(stripHtml(source)).split(/\r?\n+|(?<=[.!?])\s+(?=[A-Z0-9])/);
  return candidates.map(step => step.replace(/^\s*(?:step\s*)?\d+[.):\-]?\s*/i, "").trim()).filter(Boolean);
}

export function loosenProviderParams(params: URLSearchParams): URLSearchParams {
  const loose = new URLSearchParams(params);
  for (const key of ["maxReadyTime", "includeIngredients", "equipment", "minServings", "minProtein", "maxCalories", "minFiber", "maxSaturatedFat"]) loose.delete(key);
  return loose;
}

export function rotateRecipes<T>(recipes: T[], seed: string): T[] {
  if (recipes.length < 2 || !seed) return [...recipes];
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const start = hash % recipes.length;
  return [...recipes.slice(start), ...recipes.slice(0, start)];
}
const spoonacularImage = (recipe: any) => {
  const image = String(recipe.image ?? "").trim();
  if (/^https?:\/\//.test(image)) return image;
  if (image) return `https://img.spoonacular.com/recipes/${image}`;
  return recipe.id && recipe.imageType ? `https://img.spoonacular.com/recipes/${recipe.id}-636x393.${recipe.imageType}` : "";
};

export function filterRecipesForProfile(recipes: any[], profile: any): any[] {
  const diet = String(profile?.diet ?? "").toLowerCase();
  const dietConstraints = diet.split("+").map(value => value.trim()).filter(value => value && !["any", "anything", "everything", "flexitarian", "omnivore", "no specific diet", "none"].includes(value));
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

const QUERY_FILLERS = new Set([
  "a", "an", "and", "dish", "easy", "food", "for", "healthy", "high", "low",
  "meal", "min", "minute", "minutes", "or", "over", "protein", "quick", "recipe",
  "recipes", "something", "the", "under", "with", "cozy", "comforting",
]);
const SECONDARY_INGREDIENT = /\b(bouillon|broth|extract|flavou?r|seasoning|stock)\b/i;

function searchTerms(query: string): string[] {
  return [...new Set(query.toLowerCase().match(/[a-z0-9]+/g)?.filter(term => term.length > 1 && !QUERY_FILLERS.has(term)) ?? [])];
}

export function filterRecipesByQuery(recipes: any[], query: string): any[] {
  const terms = searchTerms(query);
  if (!terms.length) return recipes;
  return recipes.filter(recipe => {
    const title = String(recipe?.title ?? "").toLowerCase();
    const ingredients = (recipe?.ingredients ?? []).map((ingredient: unknown) => String(ingredient).toLowerCase());
    return terms.every(term => title.includes(term) || ingredients.some((ingredient: string) => ingredient.includes(term) && !SECONDARY_INGREDIENT.test(ingredient)));
  });
}

const CATEGORY_TYPES: Record<string, string[]> = {
  // Legacy search values
  main: ["main course"],
  starter: ["appetizer", "salad", "soup", "side dish"],
  // Meal-time categories (home screen + search).
  // Each list covers both Spoonacular dishTypes AND TheMealDb strCategory values
  // (lowercase) so the fallback path isn't silently emptied.
  breakfast: ["breakfast", "morning meal", "brunch"],
  lunch: [
    "main course", "lunch", "salad", "soup", "side dish", "sandwich",
    // TheMealDb categories that are reasonable lunch options
    "chicken", "beef", "lamb", "pork", "pasta", "seafood",
    "vegetarian", "vegan", "miscellaneous", "side", "starter", "goat",
  ],
  dinner: [
    "main course", "dinner",
    // TheMealDb categories
    "beef", "chicken", "lamb", "pasta", "pork", "seafood",
    "vegetarian", "vegan", "miscellaneous", "goat",
  ],
  snacks: ["snack", "appetizer", "finger food", "starter", "side", "fingerfood"],
  snack:  ["snack", "appetizer", "finger food", "starter", "side", "fingerfood"],
  dessert: ["dessert"],
  drink: ["beverage", "drink"],
};

export function filterRecipesByCategory(recipes: any[], category: string): any[] {
  const allowed = CATEGORY_TYPES[(category ?? "").toLowerCase()];
  if (!allowed) return recipes;
  return recipes.filter(recipe => {
    const types = (recipe.mealTypes ?? []).map((t: string) => t.toLowerCase());
    // No type metadata (Spoonacular sometimes returns empty dishTypes even when
    // the `type` param was used) — pass through and trust the upstream filter.
    if (!types.length) return true;
    return types.some((t: string) => allowed.includes(t));
  });
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
  return recipes.filter(recipe => {
    if (!Array.isArray(recipe?.steps)) return false;
    const usable = recipe.steps
      .map((step: any) => typeof step?.text === "string" ? step.text.trim() : "")
      .filter((text: string) => text && !placeholder.test(text));
    return usable.length >= 2 || usable.some((text: string) => text.length >= 80);
  });
}

export function normalizeSpoonacularRecipe(recipe: any, mood: string) {
  const nutrients = recipe.nutrition?.nutrients ?? [];
  const calories = Math.round(nutrients.find((nutrient: any) => nutrient.name === "Calories")?.amount ?? 0);
  const time = recipe.readyInMinutes ?? 30;
  const analyzedSteps = (recipe.analyzedInstructions ?? []).flatMap((section: any) => section?.steps ?? []).map((step: any) => {
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
  const fallbackSteps = analyzedSteps.length ? [] : instructionTextSteps(recipe.instructions).map(text => ({ text, title: text, detail: text, image: "", active: [], equipment: [] }));
  const steps = analyzedSteps.length ? analyzedSteps : fallbackSteps;
  const ingredients = (recipe.extendedIngredients ?? []).map((ingredient: any) => ingredient.original).filter(Boolean);

  const normalized = {
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
  return { ...normalized, tags: inferProviderTags(normalized) };
}

export async function fetchTheMealDbRecipes(
  query: string,
  mood: string,
  limit = 10,
  fetcher: Fetcher = fetch,
  options: { category?: string; cuisines?: string[] } = {},
) {
  const randomUrls = () => Array.from({ length: Math.min(limit, 10) }, () => `${MEALDB}/random.php`);
  const requestedCategories = MEALDB_CATEGORY_FILTERS[(options.category ?? "").toLowerCase()] ?? [];
  const requestedAreas = [...new Set((options.cuisines ?? []).filter(cuisine => MEALDB_AREAS.has(cuisine)))];
  const urls = query.trim()
    ? [`${MEALDB}/search.php?s=${encodeURIComponent(query.trim())}`]
    : requestedAreas.length
      ? requestedAreas.map(area => `${MEALDB}/filter.php?a=${encodeURIComponent(area)}`)
      : requestedCategories.length
        ? requestedCategories.map(category => `${MEALDB}/filter.php?c=${encodeURIComponent(category)}`)
        : randomUrls();

  try {
    const load = async (requests: string[]) => {
      const responses = await Promise.all(requests.map(url => fetcher(url, { signal: AbortSignal.timeout(8_000) })));
      const payloads = await Promise.all(responses.filter(res => res.ok).map(res => res.json()));
      return payloads.flatMap(payload => Array.isArray(payload?.meals) ? payload.meals : []);
    };
    const meals = await load(urls);
    const unique = [...new Map(meals.map(meal => [String(meal.idMeal), meal])).values()];
    const summaries = unique.filter(meal => !String(meal.strInstructions ?? "").trim()).slice(0, Math.max(limit * 2, limit));
    const details = summaries.length
      ? await load(summaries.map(meal => `${MEALDB}/lookup.php?i=${encodeURIComponent(String(meal.idMeal))}`))
      : [];
    const detailedById = new Map(details.map(meal => [String(meal.idMeal), meal]));
    const normalized = filterRecipesByQuery(unique
      .map(meal => normalizeMeal(detailedById.get(String(meal.idMeal)) ?? meal, mood))
      .filter(recipe => !options.category || filterRecipesByCategory([recipe], options.category).length)
      .filter(recipe => !(options.cuisines?.length) || options.cuisines.some(cuisine => recipe.cuisine.toLowerCase() === cuisine.toLowerCase())), query);
    return normalized.slice(0, limit);
  } catch {
    return [];
  }
}
