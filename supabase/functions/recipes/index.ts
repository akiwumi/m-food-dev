// recipes — the AI-curated core. Pipeline:
//   1. Fetch real candidates from Spoonacular (filtered by diet + intolerances).
//   2. Hard safety backstop: drop anything whose ingredients mention an allergen.
//   3. AI curation (OpenAI): rank the safe candidates for this profile + mood and
//      write a one-line "why this fits you" reason. If the AI step fails, we keep
//      Spoonacular's order and a cleaned summary — recipes are still real + safe.
//
// Secrets:
//   supabase secrets set SPOONACULAR_API_KEY="..."   (required)
//   supabase secrets set OPENAI_API_KEY="sk-..."     (optional — enables curation)
//   supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://your-live-url"
//
// Deploy: supabase functions deploy recipes
//
// Request body (JSON):
//   {
//     "profile": { diet, allergies[], dislikedIngredients[], cuisines[], mealTypes[],
//                  nutritionGoals[], rankingPreference, dietReligious[], ...taste fields },
//     "mood": "Cozy", "energy": 45, "time": 30, "query": "",
//     "filters": {            // optional — the search screen sends these
//       query, cuisines[], type, diet, maxReadyTime, sort,
//       includeIngredients[], excludeIngredients[], equipment[],
//       minServings, maxCalories, minProtein
//     }
//   }
// Spoonacular complexSearch params exploited: query, diet, intolerances, cuisine,
// type, includeIngredients, excludeIngredients, equipment, maxReadyTime,
// minServings, maxCalories, minProtein, minFiber, maxSaturatedFat, sort,
// sortDirection, ignorePantry, plus full recipe info/nutrition/instructions.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { enrichSteps } from "./enrich.ts";
import { fetchTheMealDbRecipes, normalizeSpoonacularRecipe } from "./provider.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SPOONACULAR_API_KEY = Deno.env.get("SPOONACULAR_API_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ALLOWED_ORIGINS = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").filter(Boolean));

function headers(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...(allowed ? { "access-control-allow-origin": allowed, "vary": "Origin" } : {}),
  };
}

// Map our profile vocabulary onto Spoonacular's.
function mapDiet(diet: string): string {
  const d = (diet ?? "").toLowerCase();
  if (d.includes("vegan")) return "vegan";
  if (d.includes("lacto") && d.includes("ovo")) return "vegetarian";
  if (d.includes("lacto-vegetarian")) return "lacto-vegetarian";
  if (d.includes("ovo-vegetarian")) return "ovo-vegetarian";
  if (d.includes("vegetarian")) return "vegetarian";
  if (d.includes("pescatarian") || d.includes("pescetarian")) return "pescetarian";
  if (d.includes("paleo")) return "paleo";
  if (d.includes("primal")) return "primal";
  if (d.includes("keto")) return "ketogenic";
  if (d.includes("whole30")) return "whole30";
  if (d.includes("fodmap")) return "low fodmap";
  if (d.includes("gluten")) return "gluten free";
  return ""; // Everything / Flexitarian / Anything → no diet filter
}
const INTOLERANCE_MAP: Record<string, string> = {
  dairy: "dairy", "dairy (allergy)": "dairy", "lactose intolerance": "dairy",
  egg: "egg", eggs: "egg", gluten: "gluten", "gluten (all sources)": "gluten",
  grain: "grain", peanut: "peanut", peanuts: "peanut",
  seafood: "seafood", fish: "seafood", "all fish": "seafood",
  sesame: "sesame", shellfish: "shellfish", "all shellfish": "shellfish",
  crustaceans: "shellfish", molluscs: "shellfish",
  soy: "soy", "soy / soya": "soy", sulfite: "sulfite", sulphites: "sulfite",
  "tree nut": "tree nut", "tree nuts": "tree nut", "all tree nuts": "tree nut",
  nuts: "tree nut", wheat: "wheat",
};
function mapIntolerances(allergies: string[]): string[] {
  return [...new Set((allergies ?? []).map(a => INTOLERANCE_MAP[a.toLowerCase().trim()]).filter(Boolean))];
}

// Spoonacular's coarse cuisine set. We map both the profile's detailed cuisine
// labels (e.g. "West African / Ghanaian", "Chinese / Cantonese") and the search
// UI's coarse selections onto this vocabulary via keyword matching.
const CUISINE_RULES: [RegExp, string][] = [
  [/nigeria|ghana|senegal|african|ethiop|eritrea|kenya|moroc/, "African"],
  [/jamaic|caribbean/, "Caribbean"],
  [/latin|colombia|brazil|peru|argentin/, "Latin American"],
  [/mexic/, "Mexican"],
  [/southern|bbq|cajun|creole/, "Southern"],
  [/american|canad/, "American"],
  [/ital/, "Italian"],
  [/french/, "French"],
  [/spanish|catalan|spain/, "Spanish"],
  [/greek|mediterran/, "Mediterranean"],
  [/british|irish|england|scott/, "British"],
  [/german|austria/, "German"],
  [/eastern europe|polish|poland|russia|ukrain|hungar/, "Eastern European"],
  [/scandinav|nordic|swedish|danish|norweg|finnish/, "Nordic"],
  [/turkish|lebanese|levantine|persia|iran|israel|afghan|middle east|arab/, "Middle Eastern"],
  [/jewish|kosher/, "Jewish"],
  [/india|pakistan|sri lank|banglad|south asia/, "Indian"],
  [/chinese|canton|szechuan/, "Chinese"],
  [/japan/, "Japanese"],
  [/korea/, "Korean"],
  [/thai/, "Thai"],
  [/vietnam/, "Vietnamese"],
  [/filipin|indonesia|malaysia|singapor|asian/, "Asian"],
];
function mapCuisines(cuisines: string[]): string[] {
  const out = new Set<string>();
  for (const c of cuisines ?? []) {
    const lc = (c ?? "").toLowerCase();
    for (const [re, name] of CUISINE_RULES) if (re.test(lc)) { out.add(name); break; }
  }
  return [...out];
}

// App meal-type label → Spoonacular `type`.
const MEAL_TYPE_MAP: Record<string, string> = {
  breakfast: "breakfast", brunch: "breakfast", lunch: "main course",
  dinner: "main course", "late night": "main course", "meal prep": "main course",
  snacks: "snack", snack: "snack", dessert: "dessert", "side dish": "side dish",
  appetizer: "appetizer", salad: "salad", soup: "soup", bread: "bread",
  beverage: "beverage", drink: "drink", "main course": "main course",
};
function mapMealType(type: string): string {
  return MEAL_TYPE_MAP[(type ?? "").toLowerCase().trim()] ?? "";
}

// App ranking preference / search sort label → Spoonacular sort + direction.
const SORT_MAP: Record<string, { sort: string; dir: "asc" | "desc" }> = {
  "most popular": { sort: "popularity", dir: "desc" },
  popularity: { sort: "popularity", dir: "desc" },
  healthiest: { sort: "healthiness", dir: "desc" },
  healthiness: { sort: "healthiness", dir: "desc" },
  quickest: { sort: "time", dir: "asc" },
  time: { sort: "time", dir: "asc" },
  "fewest calories": { sort: "calories", dir: "asc" },
  lightest: { sort: "calories", dir: "asc" },
  calories: { sort: "calories", dir: "asc" },
  "most protein": { sort: "protein", dir: "desc" },
  protein: { sort: "protein", dir: "desc" },
  cheapest: { sort: "price", dir: "asc" },
  "surprise me": { sort: "random", dir: "desc" },
  random: { sort: "random", dir: "desc" },
};
function mapSort(label: string): { sort: string; dir: "asc" | "desc" } {
  return SORT_MAP[(label ?? "").toLowerCase().trim()] ?? { sort: "popularity", dir: "desc" };
}

// Derive Spoonacular nutrient targets from the user's nutrition goals. Gentle
// numbers — these widen the funnel toward goal-aligned recipes, not hard cages.
function nutrientTargetsFromGoals(goals: string[]): Record<string, string> {
  const g = (goals ?? []).map(x => x.toLowerCase());
  const t: Record<string, string> = {};
  if (g.some(x => x.includes("protein") || x.includes("muscle"))) t.minProtein = "25";
  if (g.some(x => x.includes("lighter") || x.includes("weight"))) t.maxCalories = "550";
  if (g.some(x => x.includes("fiber") || x.includes("fibre") || x.includes("gut"))) t.minFiber = "8";
  if (g.some(x => x.includes("heart"))) t.maxSaturatedFat = "8";
  return t;
}

// Comma-joined, length-bounded, deduped list for a query param.
function joinList(values: unknown, max: number, itemMax = 40): string {
  if (!Array.isArray(values)) return "";
  return [...new Set(values
    .filter((v): v is string => typeof v === "string")
    .map(v => v.trim().slice(0, itemMax))
    .filter(Boolean))].slice(0, max).join(",");
}

// Best-effort: attach a cooking video to recipes when one exists. Spoonacular's
// complexSearch has no video field, so we make ONE videos search and fuzzy-match
// titles by shared significant words. Cheap (1 call) and only adds when found.
const STOP = new Set(["the", "and", "with", "a", "an", "of", "in", "to", "for", "easy", "best", "quick", "recipe", "homemade", "style", "your"]);
const sig = (s: string) => new Set((s ?? "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
async function attachVideos(recipes: any[], query: string, hint: string) {
  if (!recipes.length) return recipes;
  try {
    const q = (query || hint || recipes[0]?.title || "dinner").slice(0, 80);
    const res = await fetch(`https://api.spoonacular.com/food/videos/search?${new URLSearchParams({ apiKey: SPOONACULAR_API_KEY, query: q, number: "20" })}`);
    if (!res.ok) return recipes;
    const vids = (await res.json())?.videos ?? [];
    if (!vids.length) return recipes;
    return recipes.map(r => {
      if (r.video) return r;
      const rw = sig(r.title);
      let best: any = null, bestScore = 0;
      for (const v of vids) {
        const vw = sig(v.shortTitle || v.title);
        let overlap = 0;
        for (const w of rw) if (vw.has(w)) overlap++;
        if (overlap > bestScore) { bestScore = overlap; best = v; }
      }
      return bestScore >= 2 && best?.youTubeId
        ? { ...r, video: `https://www.youtube.com/embed/${best.youTubeId}` }
        : r;
    });
  } catch {
    return recipes;
  }
}

// Belt-and-suspenders: never let an allergen through even if the upstream filter slips.
function safetyFilter(recipes: any[], allergies: string[]): any[] {
  const terms = (allergies ?? []).map(a => a.toLowerCase().replace(/s$/, "")).filter(Boolean);
  if (!terms.length) return recipes;
  return recipes.filter(r => {
    const text = `${r.title} ${r.ingredients.join(" ")}`.toLowerCase();
    return !terms.some(t => text.includes(t));
  });
}

async function curate(recipes: any[], profile: any, mood: string, history: any): Promise<any[]> {
  if (!OPENAI_API_KEY || recipes.length === 0) return recipes;
  const menu = recipes.map((r, i) => `${i}: ${r.title} | ${r.time}min | ${r.calories}cal | ${r.cuisine}`).join("\n");
  const arr = (v: unknown): string[] => Array.isArray(v) ? v.filter(x => typeof x === "string") : [];
  const list = (label: string, v: unknown, max = 8) => { const a = arr(v).slice(0, max); return a.length ? `${label}: ${a.join(", ")}.` : ""; };
  const sys = [
    "You are Moody, a dinner co-pilot. Rank these REAL recipes for the user and explain each briefly.",
    "First, read the user's full food-psychology profile and food history below; rank for THIS person, not the average person.",
    `User mood right now: ${mood}.`,
    profile?.diet ? `Diet: ${profile.diet}.` : "",
    list("Firm religious/ethical rules (never break)", profile?.dietReligious),
    list("Dislikes (avoid)", profile?.dislikedIngredients),
    list("Prefers cuisines", profile?.cuisines, 10),
    list("Loves flavours", profile?.flavorLikes),
    list("Avoid flavours", profile?.flavorAvoids),
    list("Loves textures", profile?.textureLikes),
    list("Favourite proteins", profile?.proteins),
    list("Comfort foods", profile?.comfortFoods),
    list("Working toward", profile?.nutritionGoals),
    typeof profile?.spiceTolerance === "number" ? `Heat tolerance: ${profile.spiceTolerance}/100${arr(profile?.spiceTypes).length ? ` (enjoys ${arr(profile.spiceTypes).join(", ")})` : ""}.` : "",
    profile?.skill ? `Cooking skill: ${profile.skill}.` : "",
    profile?.weeknightTime ? `Typical weeknight time: ${profile.weeknightTime}.` : "",
    typeof profile?.novelty === "number" ? `Adventurousness: ${profile.novelty}/100 (low = favourites, high = surprise me).` : "",
    arr(profile?.moodSignals).length ? `How this user relates to cooking — weight these heavily: ${arr(profile.moodSignals).join(" ")}` : "",
    // Food history — learn from what they actually cook, rate, and log.
    list("Recently cooked & rated (don't repeat unless highly rated)", history?.cooked, 10),
    list("Recently photographed meals", history?.photographed, 8),
    list("Saved/favourite recipes (lean toward this style)", history?.favorites, 8),
    list("Cuisines they cook most (history)", history?.topCuisines, 6),
    "Use history to avoid suggesting something they just made, and to bias toward patterns they clearly enjoy.",
    "Reply ONLY with JSON: {\"ranked\":[{\"i\":<index>,\"reason\":\"<<=14 word why-this-fits>\"}]}. Best first. Include every index.",
  ].filter(Boolean).join(" ");
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 600,
        messages: [{ role: "system", content: sys }, { role: "user", content: menu }],
      }),
    });
    if (!res.ok) return recipes;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const order = Array.isArray(parsed.ranked) ? parsed.ranked : [];
    const out: any[] = [];
    for (const item of order) {
      const r = recipes[item.i];
      if (r && !out.includes(r)) out.push({ ...r, reason: item.reason || r.reason });
    }
    // Append any the model dropped, so we never lose a safe recipe.
    for (const r of recipes) if (!out.includes(r)) out.push(r);
    return out;
  } catch {
    return recipes;
  }
}

async function enrichRecipeInstructions(recipes: any[]) {
  return Promise.all(recipes.map(async recipe => ({
    ...recipe,
    steps: await enrichSteps(recipe.steps ?? [], recipe.title ?? "Recipe", OPENAI_API_KEY),
  })));
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { headers: { ...headers(origin), "access-control-allow-methods": "POST", "access-control-allow-headers": "authorization, content-type" } });
  }
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: headers(origin) });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers: headers(origin) });

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) return Response.json({ error: "Unauthorized" }, { status: 401, headers: headers(origin) });
  const identity = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { authorization: auth, apikey: SUPABASE_ANON_KEY } });
  if (!identity.ok) return Response.json({ error: "Unauthorized" }, { status: 401, headers: headers(origin) });

  if (!SPOONACULAR_API_KEY) return Response.json({ error: "Recipe source not configured" }, { status: 503, headers: headers(origin) });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: headers(origin) }); }
  const profile = body?.profile ?? {};
  const filters = body?.filters ?? {};
  const history = body?.history ?? {};
  const mood = typeof body?.mood === "string" ? body.mood : "Cozy";
  const time = Number.isFinite(body?.time) ? Math.max(10, Math.min(180, body.time)) : 45;
  const query = typeof body?.query === "string" ? body.query.slice(0, 80)
    : typeof filters?.query === "string" ? filters.query.slice(0, 80) : "";
  const num = (v: unknown, lo: number, hi: number) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v as number))) : null;

  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    number: "10",
    addRecipeNutrition: "true",
    addRecipeInformation: "true",
    addRecipeInstructions: "true",
    instructionsRequired: "true",
    fillIngredients: "true",
    ignorePantry: "true",
    offset: String(num(body?.offset, 0, 900) ?? 0),
    maxReadyTime: String(num(filters.maxReadyTime, 5, 180) ?? time),
  });
  if (query) params.set("query", query);

  // Sort: explicit search sort wins, else the profile's ranking preference.
  const { sort, dir } = mapSort(filters.sort ?? profile.rankingPreference ?? "popularity");
  params.set("sort", sort);
  params.set("sortDirection", dir);

  // Diet: a per-search override wins over the saved profile diet.
  const diet = mapDiet(filters.diet ?? profile.diet);
  if (diet) params.set("diet", diet);

  const intolerances = mapIntolerances(profile.allergies ?? []);
  if (intolerances.length) params.set("intolerances", intolerances.join(","));

  // Cuisine is a HARD filter, so only apply it from an explicit search selection.
  // The profile's loved cuisines stay a SOFT preference handled by AI curation —
  // forcing them here would starve the home feed of variety.
  const cuisines = mapCuisines(Array.isArray(filters.cuisines) ? filters.cuisines : []);
  if (cuisines.length) params.set("cuisine", cuisines.slice(0, 6).join(","));

  // Meal type: explicit search selection only (same hard-filter reasoning).
  const type = mapMealType(filters.type ?? "");
  if (type) params.set("type", type);

  // Exclude: hard dislikes always; pork/beef when a religious rule forbids it.
  const religious = (profile.dietReligious ?? []).map((r: string) => r.toLowerCase()).join(" ");
  const forbidden: string[] = [];
  if (/no pork|halal|kosher|jewish|muslim|islam|seventh-day/.test(religious)) forbidden.push("pork", "bacon", "ham");
  if (/no beef|hindu/.test(religious)) forbidden.push("beef");
  const excludeIngredients = [
    joinList(profile.dislikedIngredients, 12),
    joinList(filters.excludeIngredients, 12),
    forbidden.join(","),
  ].filter(Boolean).join(",");
  if (excludeIngredients) params.set("excludeIngredients", excludeIngredients);

  // Include: pantry-led / search-led required ingredients.
  const includeIngredients = joinList(filters.includeIngredients, 8);
  if (includeIngredients) params.set("includeIngredients", includeIngredients);

  // Equipment the user owns (search-led; profile equipment is too broad to force).
  const equipment = joinList(filters.equipment, 4);
  if (equipment) params.set("equipment", equipment);

  // Servings — at least the number of people eating.
  const minServings = num(filters.minServings, 1, 20);
  if (minServings) params.set("minServings", String(minServings));

  // Nutrient targets: explicit search overrides, else derived from goals.
  const targets = nutrientTargetsFromGoals(profile.nutritionGoals ?? []);
  const maxCalories = num(filters.maxCalories, 100, 2000);
  if (maxCalories) targets.maxCalories = String(maxCalories);
  const minProtein = num(filters.minProtein, 0, 200);
  if (minProtein) targets.minProtein = String(minProtein);
  for (const [k, v] of Object.entries(targets)) params.set(k, v);

  try {
    const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`);
    if (res.ok) {
      const data = await res.json();
      const normalized = (data.results ?? []).map((r: any) => normalizeSpoonacularRecipe(r, mood));
      const safe = safetyFilter(normalized, profile.allergies ?? []);
      if (safe.length) {
        const curated = await curate(safe, profile, mood, history);
        const withVideos = await attachVideos(curated, query, cuisines[0] ?? mood);
        return Response.json({ provider: "spoonacular", recipes: await enrichRecipeInstructions(withVideos) }, { headers: headers(origin) });
      }
    }

    const fallback = safetyFilter(await fetchTheMealDbRecipes(query, mood), profile.allergies ?? []);
    if (fallback.length) return Response.json({ provider: "themealdb", recipes: await enrichRecipeInstructions(fallback) }, { headers: headers(origin) });
    return Response.json({ error: "Recipe sources failed" }, { status: 502, headers: headers(origin) });
  } catch {
    const fallback = safetyFilter(await fetchTheMealDbRecipes(query, mood), profile.allergies ?? []);
    if (fallback.length) return Response.json({ provider: "themealdb", recipes: await enrichRecipeInstructions(fallback) }, { headers: headers(origin) });
    return Response.json({ error: "Recipe sources failed" }, { status: 502, headers: headers(origin) });
  }
});
