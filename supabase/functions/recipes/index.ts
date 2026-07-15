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
import { applyCuratedRanking, dedupeRecipes, expandProviderCuisines, fetchTheMealDbRecipes, filterOutAccessoryTypes, filterRecipesByCategory, filterRecipesByMaxTime, filterRecipesForProfile, filterRecipesWithCompleteInstructions, normalizeSpoonacularRecipe } from "./provider.ts";
import { dairyFreeTag, dietTagsFor, getCachedRecipes, logSearch, normalizeMoodTag, saveRecipesToCache } from "./cache.ts";

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

function combineHardDiets(profileDiet: unknown, searchDiet: unknown): string {
  const values = [profileDiet, searchDiet]
    .filter((value): value is string => typeof value === "string")
    .flatMap(value => value.split("+"))
    .map(value => value.trim())
    .filter(value => value && !["any", "anything", "everything", "flexitarian"].includes(value.toLowerCase()));
  return [...new Set(values)].join(" + ");
}

function strictestProviderDiet(diet: string): string {
  const values = diet.split("+").map(value => mapDiet(value)).filter(Boolean);
  return ["vegan", "vegetarian", "pescetarian"].find(value => values.includes(value)) ?? values[0] ?? "";
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
  main: "main course", starter: "appetizer",
  breakfast: "breakfast", brunch: "breakfast",
  lunch: "main course", dinner: "main course",
  "late night": "main course", "meal prep": "main course",
  snacks: "snack", snack: "snack", dessert: "dessert", "side dish": "side dish",
  appetizer: "appetizer", salad: "salad", soup: "soup", bread: "bread",
  beverage: "beverage", drink: "drink", "main course": "main course",
};
function mapMealType(type: string): string {
  if ((type ?? "").toLowerCase().trim() === "starter") return "";
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
  const moodNeeds = profile?.moodNeeds && typeof profile.moodNeeds === "object"
    ? Object.entries(profile.moodNeeds)
      .filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string" && entry[1].trim().length > 0)
      .slice(0, 8)
      .map(([moodName, need]) => `${moodName}: ${need}`)
    : [];
  const sys = [
    "You are Moody, a dinner co-pilot. Rank these REAL recipes for the user and explain each briefly.",
    "First, read the user's full food-psychology profile and food history below; rank for THIS person, not the average person.",
    `User mood right now: ${mood}.`,
    profile?.diet ? `Diet: ${profile.diet}.` : "",
    list("Firm religious/ethical rules (never break)", profile?.dietReligious),
    list("Dislikes (avoid)", profile?.dislikedIngredients),
    profile?.foodRelationship ? `Relationship with food: ${profile.foodRelationship}.` : "",
    moodNeeds.length ? `Personal mood meanings — use these when the current mood matches: ${moodNeeds.join("; ")}.` : "",
    profile?.cookingMotivation ? `Primary cooking motivation: ${profile.cookingMotivation}.` : "",
    list("Comfort cues", profile?.comfortCues),
    list("Avoid cues", profile?.avoidCues),
    list("Sensory cues", profile?.sensoryCues),
    list("Prefers cuisines", profile?.cuisines, 10),
    list("Loves flavours", profile?.flavorLikes),
    list("Avoid flavours", profile?.flavorAvoids),
    list("Loves textures", profile?.textureLikes),
    list("Avoid textures", profile?.textureAvoids),
    list("Food-choice values", profile?.foodValues),
    list("Eating habits", profile?.eatingHabits),
    list("Emotional food triggers", profile?.emotionalTriggers),
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
        max_tokens: 400,
        messages: [{ role: "system", content: sys }, { role: "user", content: menu }],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return recipes;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const order = Array.isArray(parsed.ranked) ? parsed.ranked : [];
    return applyCuratedRanking(recipes, order);
  } catch {
    return recipes;
  }
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
  const identity = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(5_000),
  });
  if (!identity.ok) return Response.json({ error: "Unauthorized" }, { status: 401, headers: headers(origin) });
  // Capture the user id for the analytics search log (recipe_searches.user_id).
  let userId: string | null = null;
  try { userId = (await identity.json())?.id ?? null; } catch { /* logging is best-effort */ }

  if (!SPOONACULAR_API_KEY) return Response.json({ error: "Recipe source not configured" }, { status: 503, headers: headers(origin) });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: headers(origin) }); }
  const profile = body?.profile ?? {};
  const filters = body?.filters ?? {};
  const hardProfile = { ...profile, diet: combineHardDiets(profile.diet, filters.diet) };
  const history = body?.history ?? {};
  const mood = typeof body?.mood === "string" ? body.mood : "Cozy";
  const time = Number.isFinite(body?.time) ? Math.max(10, Math.min(180, body.time)) : 45;
  const query = typeof body?.query === "string" ? body.query.slice(0, 80)
    : typeof filters?.query === "string" ? filters.query.slice(0, 80) : "";
  const num = (v: unknown, lo: number, hi: number) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v as number))) : null;
  const maxTime = num(filters.maxReadyTime, 5, 180) ?? time;
  // relax=false (explicit filtered search) means "honor the filters exactly, even
  // to zero results". relax=true (default; the mood-based home feed) lets us loosen
  // quantitative limits to keep results flowing. Cuisine/course/diet are never
  // dropped either way — only numeric limits are.
  const relax = body?.relax !== false;
  // Slice 1 (roadmap v3): AI curation is OPT-IN. Normal search ranks the real,
  // safety-filtered provider candidates deterministically on the client; the
  // OpenAI re-rank only runs when the client explicitly asks for it (a clearly
  // labeled personalized experience). Default OFF keeps AI off the hot path.
  const shouldCurate = body?.curate === true;

  // Spoonacular bills per result AND per add-on. `number` and `addRecipeNutrition`
  // are the two biggest cost multipliers, so a 100-recipe hydrated search burned
  // ~65-100 of the daily 1000-point budget — roughly 10-15 searches/day before a
  // 402. 40 results still leaves plenty after the safety/diet/instructions filter
  // stack (we only ever serve 20), and nutrition is now requested only when the
  // search actually needs it (see `needsNutrition` below).
  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    number: "40",
    addRecipeInformation: "true",
    addRecipeInstructions: "true",
    instructionsRequired: "true",
    fillIngredients: "true",
    ignorePantry: "true",
    offset: String(num(body?.offset, 0, 900) ?? 0),
    maxReadyTime: String(maxTime),
  });
  // Only a real, user-typed query becomes a Spoonacular `query` (a hard title
  // match). Mood must NOT be injected here: multi-word vibe phrases like
  // "comforting hearty warm" match almost no recipe titles and made Spoonacular
  // return zero results for every mood-based check-in. Mood still personalises
  // results via normalizeSpoonacularRecipe(r, mood) and the AI curation step.
  if (query) params.set("query", query);

  // Sort: explicit search sort wins, else the profile's ranking preference.
  const { sort, dir } = mapSort(filters.sort ?? profile.rankingPreference ?? "popularity");
  params.set("sort", sort);
  params.set("sortDirection", dir);

  // Diet: a per-search override wins over the saved profile diet.
  const diet = strictestProviderDiet(hardProfile.diet);
  if (diet) params.set("diet", diet);

  const intolerances = mapIntolerances(profile.allergies ?? []);
  if (intolerances.length) params.set("intolerances", intolerances.join(","));

  // Cuisine is a HARD filter, so only apply it from an explicit search selection.
  // The profile's loved cuisines stay a SOFT preference handled by AI curation —
  // forcing them here would starve the home feed of variety.
  const cuisines = expandProviderCuisines(mapCuisines(Array.isArray(filters.cuisines) ? filters.cuisines : []));
  if (cuisines.length) params.set("cuisine", cuisines.slice(0, 8).join(","));

  // Meal type: explicit search selection only (same hard-filter reasoning).
  const category = typeof filters.type === "string" ? filters.type : "";
  const type = mapMealType(category);
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

  // Nutrition is Spoonacular's priciest add-on. Only pay for it when the search
  // actually surfaces calories/protein — a nutrient filter/goal, or a calorie/
  // protein/health sort. Otherwise recipes come back without a calorie badge
  // (identical to the TheMealDB path, which the UI already handles), and the
  // saved points roughly double how many searches fit in the daily quota.
  const needsNutrition = Boolean(targets.minProtein || targets.maxCalories) || ["calories", "protein", "healthiness"].includes(sort);
  if (needsNutrition) params.set("addRecipeNutrition", "true");

  // ── Recipe DB cache (roadmap Phase 2) ──────────────────────────────────────
  // Cache key: a normalized mood tag + diet tags (the 7×6 seed vocabulary). This
  // is used to WRITE THROUGH fresh results and as the quota-out backup source
  // (buildBackup) — it no longer short-circuits live search. EVERY search now
  // hits Spoonacular first; the owned cache / TheMealDB only stand in when the
  // provider genuinely can't answer (outage or the daily 402). Allergens are
  // per-user and NOT in the key, so any backup rows are re-run through the same
  // safety/diet filter as live results before serving.
  const moodTag = normalizeMoodTag(mood);
  const dietTags = [...dietTagsFor(hardProfile.diet), ...dairyFreeTag(intolerances)];

  // Best backup when Spoonacular yields nothing — an outage or, most commonly, the
  // daily 1000-point 402. Owned cache first (free), then TheMealDB (free). Applied
  // to BOTH the mood feed and explicit filtered searches, so a cuisine tap during
  // a quota-out degrades to real food instead of a dead-end spinner. Safety, diet
  // and course are still enforced; cuisine/nutrient limits may be approximated, so
  // the caller flags the response `degraded`.
  const applyBackupFilters = (list: any[]): any[] => {
    const byProfile = filterRecipesForProfile(safetyFilter(list, profile.allergies ?? []), hardProfile);
    const byCategory = filterRecipesByCategory(byProfile, category);
    return dedupeRecipes(filterRecipesWithCompleteInstructions(category ? byCategory : filterOutAccessoryTypes(byCategory)));
  };
  // Prefer backups that actually match what the user asked for — the tapped
  // cuisine or Moody's food query — over a generic diet-safe fill. Kept SOFT: if
  // fewer than 3 match we fall back to the full set rather than dead-end. The
  // response is flagged `degraded` either way, and cuisine coverage improves as
  // the write-through cache grows from real Spoonacular results.
  const wantCuisines = cuisines.map(c => c.toLowerCase());
  const wantQuery = query.trim().toLowerCase();
  const hasIntent = wantCuisines.length > 0 || wantQuery.length > 0;
  const matchesIntent = (r: any): boolean => {
    if (wantCuisines.length) {
      const rc = String(r?.cuisine ?? "").toLowerCase();
      if (!rc || !wantCuisines.some(c => rc.includes(c) || c.includes(rc))) return false;
    }
    if (wantQuery) {
      const text = `${r?.title ?? ""} ${(r?.ingredients ?? []).join(" ")}`.toLowerCase();
      if (!text.includes(wantQuery)) return false;
    }
    return true;
  };
  const preferIntent = (filtered: any[], cap: number): any[] => {
    if (!hasIntent) return filtered.slice(0, cap);
    const matched = filtered.filter(matchesIntent);
    return (matched.length >= 3 ? matched : filtered).slice(0, cap);
  };
  const buildBackup = async (): Promise<{ source: "cache" | "themealdb"; recipes: any[] }> => {
    try {
      const rows = await getCachedRecipes(moodTag, dietTags, 60);
      const cached = applyBackupFilters(rows.map(r => r.raw_data).filter(Boolean));
      if (cached.length >= 6) return { source: "cache", recipes: preferIntent(cached, 20) };
    } catch (e) {
      console.warn(`[recipes] backup cache read failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    const mealdb = applyBackupFilters(await fetchTheMealDbRecipes(query, mood));
    return { source: "themealdb", recipes: preferIntent(mealdb, 8) };
  };

  // ── Middle ground: quota-friendly freshness window ─────────────────────────
  // The plain mood feed (no query, no fine filters, first page) may serve from
  // cache ONLY when those rows were refreshed from Spoonacular within CACHE_TTL.
  // This collapses repeated home-feed re-opens onto a single live call, while a
  // genuinely new mood/diet — or the same one after the window lapses — still
  // hits Spoonacular. Filtered searches, text queries and pagination are never
  // short-circuited. A fresh-cache hit is `degraded`-free (it IS recent live
  // data), distinguishing it from the quota-out backup below.
  const CACHE_TTL_MS = 30 * 60_000; // 30 minutes
  const offsetReq = num(body?.offset, 0, 900) ?? 0;
  const isPlainMoodFeed = relax && !query &&
    !(Array.isArray(filters.cuisines) && filters.cuisines.length) &&
    !(typeof filters.type === "string" && filters.type) &&
    !(Array.isArray(filters.includeIngredients) && filters.includeIngredients.length) &&
    !(Array.isArray(filters.excludeIngredients) && filters.excludeIngredients.length) &&
    !(Array.isArray(filters.equipment) && filters.equipment.length) &&
    !Number.isFinite(filters.minServings) && !Number.isFinite(filters.maxCalories) &&
    !Number.isFinite(filters.minProtein) && !Number.isFinite(filters.maxReadyTime) &&
    offsetReq === 0;
  if (isPlainMoodFeed) {
    const freshSince = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const rows = await getCachedRecipes(moodTag, dietTags, 60, freshSince);
    const safeCached = applyBackupFilters(rows.map(r => r.raw_data).filter(Boolean));
    if (safeCached.length >= 6) {
      const top = safeCached.slice(0, 20);
      logSearch({ userId, moodTag, dietTags, query, resultIds: [], servedFrom: "cache" });
      console.log(`[recipes] fresh-cache hit: matched=${rows.length} safe=${safeCached.length} (<=${CACHE_TTL_MS / 60_000}min old)`);
      const curated = shouldCurate ? await curate(top, profile, mood, history) : top;
      return Response.json({ provider: "cache", relaxed: false, curated: shouldCurate, recipes: curated }, { headers: headers(origin) });
    }
    console.log(`[recipes] fresh-cache miss (rows=${rows.length}) — calling Spoonacular`);
  }

  let spoonStatus = 0, spoonCount = 0, spoonSafeCount = 0;
  let mealdbCount = 0, mealdbSafeCount = 0;
  let spoonErr = "";

  try {
    // One Spoonacular search + the full safety/quality filter stack. `maxTimeCap`
    // and `cat` let the relaxed retry below loosen the soft filters. Allergen
    // safety + diet (filterRecipesForProfile/safetyFilter) are ALWAYS applied.
    const spoon = async (sp: URLSearchParams, maxTimeCap: number, cat: string): Promise<any[]> => {
      const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${sp}`, { signal: AbortSignal.timeout(10_000) });
      spoonStatus = res.status;
      if (!res.ok) {
        spoonErr = await res.text().catch(() => "");
        console.warn(`[recipes] spoonacular failed: status=${res.status} body=${spoonErr.slice(0, 200)}`);
        return [];
      }
      const data = await res.json();
      const normalized = (data.results ?? []).map((r: any) => normalizeSpoonacularRecipe(r, mood));
      spoonCount = Math.max(spoonCount, normalized.length);
      const byProfile = filterRecipesForProfile(safetyFilter(normalized, profile.allergies ?? []), hardProfile);
      const byTime = Number.isFinite(maxTimeCap) ? filterRecipesByMaxTime(byProfile, maxTimeCap) : byProfile;
      const byCategory = filterRecipesByCategory(byTime, cat);
      return dedupeRecipes(filterRecipesWithCompleteInstructions(cat ? byCategory : filterOutAccessoryTypes(byCategory)));
    };

    // Attempt 1 — honour the full request (cuisine, time, nutrient targets, query).
    let safe = await spoon(params, maxTime, category);
    let relaxed = false;

    // Attempt 2 — loosen QUANTITATIVE limits (time, calories, protein, fibre,
    // sat-fat, required ingredients, equipment, servings, free-text query) but
    // KEEP cuisine, course/type, diet, allergens and exclusions — so a relaxed
    // result still matches the kind of food the user asked for, never random.
    // Always tried when strict returns nothing, regardless of relax flag, because
    // categorical filters are still honoured.
    if (!safe.length) {
      const loose = new URLSearchParams(params);
      for (const key of ["query", "maxReadyTime", "includeIngredients", "equipment", "minServings", "minProtein", "maxCalories", "minFiber", "maxSaturatedFat"]) loose.delete(key);
      safe = await spoon(loose, Infinity, category);
      relaxed = safe.length > 0;
    }

    spoonSafeCount = safe.length;
    console.log(`[recipes] spoonacular: status=${spoonStatus} total=${spoonCount} safe=${spoonSafeCount} relaxed=${relaxed}`);
    if (safe.length) {
      // Write-through: every live result grows the owned cache (roadmap Phase 2).
      saveRecipesToCache(safe, moodTag, dietTags);
      logSearch({ userId, moodTag, dietTags, query, resultIds: [], servedFrom: "api" });
      const curated = shouldCurate ? await curate(safe, profile, mood, history) : safe;
      return Response.json({ provider: "spoonacular", relaxed, curated: shouldCurate, recipes: curated }, { headers: headers(origin) });
    }

    // Both Spoonacular attempts came back empty (or it errored — most often the
    // daily 402). Serve the best free backup we have — owned cache, then TheMealDB
    // — for the mood feed AND explicit filtered searches, so a cuisine tap never
    // dead-ends. Diet/allergens/course are still enforced; the response is flagged
    // `degraded` so the client can note these are backup matches, not exact ones.
    const backup = await buildBackup();
    mealdbCount = backup.source === "themealdb" ? backup.recipes.length : 0;
    mealdbSafeCount = backup.recipes.length;
    console.log(`[recipes] backup: source=${backup.source} safe=${backup.recipes.length}`);
    if (backup.recipes.length) {
      if (backup.source !== "cache") saveRecipesToCache(backup.recipes, moodTag, dietTags);
      logSearch({ userId, moodTag, dietTags, query, resultIds: [], servedFrom: backup.source });
      return Response.json({ provider: backup.source, degraded: true, recipes: backup.recipes }, { headers: headers(origin) });
    }

    console.error(`[recipes] sources empty — relax=${relax} diet=${profile.diet} allergies=${JSON.stringify(profile.allergies)}`);
    logSearch({ userId, moodTag, dietTags, query, resultIds: [], servedFrom: "none" });
    return Response.json({
      error: "Recipe sources failed",
      diag: { spoonStatus, spoonCount, spoonSafeCount, spoonErr: spoonErr.slice(0, 100), mealdbCount, mealdbSafeCount },
    }, { status: 502, headers: headers(origin) });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`[recipes] exception: ${errMsg}`);
    // Serve the same free backup (cache → TheMealDB) after an exception, for the
    // mood feed AND filtered searches, so the user still gets real food.
    try {
      const backup = await buildBackup();
      mealdbSafeCount = backup.recipes.length;
      console.log(`[recipes] backup after exception: source=${backup.source} safe=${backup.recipes.length}`);
      if (backup.recipes.length) {
        if (backup.source !== "cache") saveRecipesToCache(backup.recipes, moodTag, dietTags);
        logSearch({ userId, moodTag, dietTags, query, resultIds: [], servedFrom: backup.source });
        return Response.json({ provider: backup.source, degraded: true, recipes: backup.recipes }, { headers: headers(origin) });
      }
    } catch (e2) {
      console.error(`[recipes] backup also threw: ${e2 instanceof Error ? e2.message : String(e2)}`);
    }
    logSearch({ userId, moodTag, dietTags, query, resultIds: [], servedFrom: "none" });
    return Response.json({
      error: "Recipe sources failed",
      diag: { spoonStatus, spoonErr: errMsg.slice(0, 100), mealdbCount, mealdbSafeCount },
    }, { status: 502, headers: headers(origin) });
  }
});
