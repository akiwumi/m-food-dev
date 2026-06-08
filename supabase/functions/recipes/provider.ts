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
  const allergies = (profile?.allergies ?? []).map((value: string) => value.toLowerCase().replace(/s$/, "")).filter(Boolean);
  const religious = (profile?.dietReligious ?? []).join(" ").toLowerCase();

  return recipes.filter(recipe => {
    const text = `${recipe.title ?? ""} ${(recipe.ingredients ?? []).join(" ")}`.toLowerCase();
    if (allergies.some((term: string) => text.includes(term))) return false;
    if ((diet.includes("pesc") || diet.includes("vegetarian") || diet.includes("vegan")) && LAND_MEAT.test(text)) return false;
    if ((diet.includes("vegetarian") || diet.includes("vegan")) && FISH.test(text)) return false;
    if (/no pork|halal|kosher|jewish|muslim|islam|seventh-day/.test(religious) && /\b(pork|bacon|ham)\b/i.test(text)) return false;
    if (/no beef|hindu/.test(religious) && /\b(beef|steak|veal)\b/i.test(text)) return false;
    return true;
  });
}

export function normalizeSpoonacularRecipe(recipe: any, mood: string) {
  const nutrients = recipe.nutrition?.nutrients ?? [];
  const calories = Math.round(nutrients.find((nutrient: any) => nutrient.name === "Calories")?.amount ?? 0);
  const time = recipe.readyInMinutes ?? 30;
  const steps = (recipe.analyzedInstructions?.[0]?.steps ?? []).map((step: any) => {
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
      const responses = await Promise.all(requests.map(url => fetcher(url)));
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
