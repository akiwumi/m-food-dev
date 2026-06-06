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
//   { "profile": { diet, allergies[], dislikedIngredients[], cuisines[] }, "mood": "Cozy", "energy": 45, "time": 30, "query": "" }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
  if (d.includes("vegetarian")) return "vegetarian";
  if (d.includes("pescatarian")) return "pescetarian";
  if (d.includes("paleo")) return "paleo";
  if (d.includes("keto")) return "ketogenic";
  return ""; // Everything / Flexitarian / Anything → no diet filter
}
const INTOLERANCE_MAP: Record<string, string> = {
  dairy: "dairy", egg: "egg", eggs: "egg", gluten: "gluten", grain: "grain",
  peanut: "peanut", peanuts: "peanut", seafood: "seafood", fish: "seafood",
  sesame: "sesame", shellfish: "shellfish", soy: "soy", sulfite: "sulfite",
  "tree nut": "tree nut", "tree nuts": "tree nut", nuts: "tree nut", wheat: "wheat",
};
function mapIntolerances(allergies: string[]): string[] {
  return [...new Set((allergies ?? []).map(a => INTOLERANCE_MAP[a.toLowerCase().trim()]).filter(Boolean))];
}

const stripHtml = (s: string) => (s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

function normalize(r: any, mood: string) {
  const nutrients = r.nutrition?.nutrients ?? [];
  const calories = Math.round(nutrients.find((n: any) => n.name === "Calories")?.amount ?? 0);
  const time = r.readyInMinutes ?? 30;
  const steps = (r.analyzedInstructions?.[0]?.steps ?? []).map((s: any) => ({ text: s.step }));
  const ingredients = (r.extendedIngredients ?? []).map((i: any) => i.original).filter(Boolean);
  return {
    id: String(r.id),
    title: r.title ?? "Recipe",
    image: r.image ?? "",
    time,
    difficulty: time <= 30 ? "Easy" : "Medium",
    calories,
    moods: [mood],
    reason: stripHtml(r.summary).split(". ").slice(0, 1).join(". "),
    ingredients,
    steps: steps.length ? steps : [{ text: "See full instructions on the recipe source." }],
    cuisine: r.cuisines?.[0] ?? "",
    diets: r.diets ?? [],
    allergens: [], // Spoonacular already excluded the user's intolerances
    equipment: [], // empty passes the client-side equipment filter
    status: "published",
  };
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

async function curate(recipes: any[], profile: any, mood: string): Promise<any[]> {
  if (!OPENAI_API_KEY || recipes.length === 0) return recipes;
  const menu = recipes.map((r, i) => `${i}: ${r.title} | ${r.time}min | ${r.calories}cal | ${r.cuisine}`).join("\n");
  const sys = [
    "You are Moody, a dinner co-pilot. Rank these REAL recipes for the user and explain each briefly.",
    `User mood: ${mood}.`,
    profile?.diet ? `Diet: ${profile.diet}.` : "",
    Array.isArray(profile?.dislikedIngredients) && profile.dislikedIngredients.length ? `Dislikes: ${profile.dislikedIngredients.join(", ")}.` : "",
    Array.isArray(profile?.cuisines) && profile.cuisines.length ? `Prefers cuisines: ${profile.cuisines.join(", ")}.` : "",
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
  const mood = typeof body?.mood === "string" ? body.mood : "Cozy";
  const time = Number.isFinite(body?.time) ? Math.max(10, Math.min(180, body.time)) : 45;
  const query = typeof body?.query === "string" ? body.query.slice(0, 80) : "";

  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    number: "10",
    addRecipeNutrition: "true",
    addRecipeInformation: "true",
    instructionsRequired: "true",
    fillIngredients: "true",
    sort: "popularity",
    maxReadyTime: String(time),
  });
  if (query) params.set("query", query);
  const diet = mapDiet(profile.diet);
  if (diet) params.set("diet", diet);
  const intolerances = mapIntolerances(profile.allergies ?? []);
  if (intolerances.length) params.set("intolerances", intolerances.join(","));

  try {
    const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`);
    if (!res.ok) return Response.json({ error: "Recipe source failed" }, { status: 502, headers: headers(origin) });
    const data = await res.json();
    const normalized = (data.results ?? []).map((r: any) => normalize(r, mood));
    const safe = safetyFilter(normalized, profile.allergies ?? []);
    const curated = await curate(safe, profile, mood);
    return Response.json({ provider: "spoonacular", recipes: curated }, { headers: headers(origin) });
  } catch {
    return Response.json({ error: "Recipe source failed" }, { status: 502, headers: headers(origin) });
  }
});
