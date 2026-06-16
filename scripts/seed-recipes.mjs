// seed-recipes.mjs — Recipe DB Roadmap, Phase 1 bulk seed.
//
// Pre-populates the owned `public.cached_recipes` cache across the 7 mood × 6 diet matrix
// (~48 each → ~2,016 rows) so the app can serve most searches from its own DB on
// day one instead of always hitting Spoonacular live.
//
// This is a Node ESM script (matches scripts/*.mjs). It writes through the same
// `upsert_recipes` RPC the edge function uses, so seeded rows and live write-through
// rows share the exact same shape and tag-union behaviour. Re-running is always
// safe (idempotent on external_id; tags accumulate, never shrink).
//
// Requires (NEVER commit these — service role + provider key are server secrets):
//   SUPABASE_URL                 (or VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY    (Project Settings → API → service_role)
//   SPOONACULAR_API_KEY
//
// Run:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SPOONACULAR_API_KEY=... \
//     node scripts/seed-recipes.mjs
//
// Cost warning: this makes 42 Spoonacular complexSearch calls with full recipe
// info/nutrition/instructions. Check your provider quota before running.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SPOONACULAR_API_KEY) {
  console.error("Missing env. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SPOONACULAR_API_KEY.");
  process.exit(1);
}

// Canonical tag vocabulary — MUST match supabase/functions/recipes/cache.ts.
const MOODS = ["happy", "anxious", "tired", "stressed", "energised", "sad", "focused"];
const DIETS = ["none", "vegan", "vegetarian", "gluten-free", "keto", "dairy-free"];

const PER_COMBO = 48;
const RATE_LIMIT_MS = 400;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Diet tag → Spoonacular `diet` param. dairy-free is expressed as an intolerance.
function spoonDiet(diet) {
  switch (diet) {
    case "vegan": return "vegan";
    case "vegetarian": return "vegetarian";
    case "gluten-free": return "gluten free";
    case "keto": return "ketogenic";
    default: return "";
  }
}

// ── Normalization (mirrors supabase/functions/recipes/provider.ts output) ─────
const stripHtml = (v) => String(v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

function spoonacularImage(recipe) {
  const image = String(recipe.image ?? "").trim();
  if (/^https?:\/\//.test(image)) return image;
  if (image) return `https://img.spoonacular.com/recipes/${image}`;
  return recipe.id && recipe.imageType ? `https://img.spoonacular.com/recipes/${recipe.id}-636x393.${recipe.imageType}` : "";
}

function inferProviderTags(recipe) {
  const text = `${recipe.title ?? ""} ${recipe.reason ?? ""} ${(recipe.ingredients ?? []).join(" ")} ${(recipe.steps ?? []).map((s) => s?.text ?? "").join(" ")}`.toLowerCase();
  const tags = { mood: [], effort: [], sensory: [], nutrition: [], occasion: [], cookingStyle: [] };
  const add = (g, ...vals) => tags[g].push(...vals.filter((v) => !tags[g].includes(v)));
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
  if ((recipe.diets ?? []).some((d) => d.toLowerCase().includes("high protein"))) add("nutrition", "high_protein");
  if ((recipe.diets ?? []).some((d) => ["vegetarian", "vegan"].includes(d.toLowerCase()))) add("nutrition", "vegetable_rich");
  if (recipe.time <= 40) add("occasion", "weeknight");
  if ((recipe.ingredients ?? []).length <= 8) add("occasion", "solo_meal");
  return tags;
}

function normalizeSpoonacularRecipe(recipe, mood) {
  const nutrients = recipe.nutrition?.nutrients ?? [];
  const calories = Math.round(nutrients.find((n) => n.name === "Calories")?.amount ?? 0);
  const time = recipe.readyInMinutes ?? 30;
  const steps = (recipe.analyzedInstructions ?? [])
    .flatMap((section) => section?.steps ?? [])
    .map((step) => {
      const text = String(step.step ?? "").trim();
      return {
        text, title: text, detail: text,
        image: step.image ? (/^https?:\/\//.test(step.image) ? step.image : `https://img.spoonacular.com/recipes/${step.image}`) : "",
        active: (step.ingredients ?? []).map((i) => i.name).filter(Boolean),
        equipment: (step.equipment ?? []).map((i) => i.name).filter(Boolean),
      };
    })
    .filter((s) => s.text);
  const ingredients = (recipe.extendedIngredients ?? []).map((i) => i.original).filter(Boolean);
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

// Only keep recipes with real, complete instructions (matches the function's gate).
function hasCompleteInstructions(recipe) {
  const placeholder = /\b(see|view|find)\b.*\b(full|original|source)\b.*\binstructions?\b/i;
  return Array.isArray(recipe.steps) && recipe.steps.length > 0 &&
    recipe.steps.every((s) => typeof s.text === "string" && s.text.trim() && !placeholder.test(s.text));
}

async function fetchSpoonacular(mood, diet, moodIndex, count) {
  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    number: String(count),
    // Vary the window per mood so each mood gets a distinct slice of the catalog.
    offset: String(moodIndex * count),
    addRecipeNutrition: "true",
    addRecipeInformation: "true",
    addRecipeInstructions: "true",
    instructionsRequired: "true",
    fillIngredients: "true",
    ignorePantry: "true",
    sort: "popularity",
    sortDirection: "desc",
  });
  const spoonDietParam = spoonDiet(diet);
  if (spoonDietParam) params.set("diet", spoonDietParam);
  if (diet === "dairy-free") params.set("intolerances", "dairy");

  const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Spoonacular ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.results ?? []).map((r) => normalizeSpoonacularRecipe(r, mood)).filter(hasCompleteInstructions);
}

function toCacheRecord(recipe, mood, diet) {
  return {
    external_id: String(recipe.id),
    source_api: "spoonacular",
    title: recipe.title,
    image_url: recipe.image || null,
    ready_in_minutes: Number.isFinite(recipe.time) ? recipe.time : null,
    servings: null,
    mood_tags: [mood],
    dietary_tags: diet === "none" ? [] : [diet],
    cuisine_type: recipe.cuisine || null,
    meal_type: Array.isArray(recipe.mealTypes) ? (recipe.mealTypes[0] ?? null) : null,
    raw_data: recipe,
  };
}

async function seedRecipes() {
  let total = 0;
  for (let m = 0; m < MOODS.length; m++) {
    const mood = MOODS[m];
    for (const diet of DIETS) {
      try {
        const recipes = await fetchSpoonacular(mood, diet, m, PER_COMBO);
        const payload = recipes.map((r) => toCacheRecord(r, mood, diet));
        if (payload.length) {
          const { error } = await supabase.rpc("upsert_recipes", { payload });
          if (error) throw new Error(error.message);
        }
        total += payload.length;
        console.log(`✓ ${mood} + ${diet}: ${payload.length} recipes (${total} total)`);
      } catch (e) {
        console.warn(`✗ ${mood} + ${diet}: ${e instanceof Error ? e.message : String(e)}`);
      }
      await sleep(RATE_LIMIT_MS);
    }
  }
  console.log(`\nSeed complete: ${total} recipes upserted.`);
}

seedRecipes().catch((e) => { console.error(e); process.exit(1); });
