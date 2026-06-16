// recipes-top-up — Recipe DB Roadmap, Phase 3 maintenance job.
//
// Tops up thin mood × diet combos in the owned cache so the DB keeps maturing
// toward API independence. For each combo with fewer than TARGET cached recipes,
// it fetches a small fresh batch from Spoonacular and write-throughs via the same
// tag-unioning upsert the live function and seed use.
//
// Invoked on a schedule (pg_cron → net.http_post), not by end users, so it is
// guarded by a shared secret header instead of a user JWT.
//
// Secrets:
//   supabase secrets set SPOONACULAR_API_KEY="..."
//   supabase secrets set RECIPES_TOPUP_SECRET="<long-random-string>"
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Deploy: supabase functions deploy recipes-top-up
//
// Trigger (the scheduler sends this header):
//   POST /functions/v1/recipes-top-up   header: x-cron-secret: <RECIPES_TOPUP_SECRET>

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { filterRecipesWithCompleteInstructions, normalizeSpoonacularRecipe } from "../recipes/provider.ts";
import { cacheEnabled, saveRecipesToCache } from "../recipes/cache.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SPOONACULAR_API_KEY = Deno.env.get("SPOONACULAR_API_KEY") ?? "";
const TOPUP_SECRET = Deno.env.get("RECIPES_TOPUP_SECRET") ?? "";

// Must match scripts/seed-recipes.mjs + cache.ts.
const MOODS = ["happy", "anxious", "tired", "stressed", "energised", "sad", "focused"];
const DIETS = ["none", "vegan", "vegetarian", "gluten-free", "keto", "dairy-free"];
const TARGET = 60;     // top up any combo below this many cached recipes
const BATCH = 20;      // recipes fetched per under-target combo

function spoonDiet(diet: string): string {
  switch (diet) {
    case "vegan": return "vegan";
    case "vegetarian": return "vegetarian";
    case "gluten-free": return "gluten free";
    case "keto": return "ketogenic";
    default: return "";
  }
}

const pgArray = (values: string[]) => `{${values.map(v => `"${v}"`).join(",")}}`;

// Count cached recipes for a mood × diet combo via a PostgREST head request.
async function countCombo(mood: string, diet: string): Promise<number> {
  const params = new URLSearchParams({ select: "id", mood_tags: `cs.${pgArray([mood])}` });
  if (diet !== "none") params.set("dietary_tags", `cs.${pgArray([diet])}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cached_recipes?${params}`, {
    headers: { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, prefer: "count=exact", range: "0-0" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) return TARGET; // on error, assume full → skip (fail safe, no extra spend)
  const range = res.headers.get("content-range") ?? "";        // e.g. "0-0/123"
  const total = Number(range.split("/")[1]);
  return Number.isFinite(total) ? total : TARGET;
}

async function fetchCombo(mood: string, diet: string): Promise<any[]> {
  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    number: String(BATCH),
    offset: String(Math.floor(Math.random() * 400)),   // a fresh slice each run
    addRecipeNutrition: "true",
    addRecipeInformation: "true",
    addRecipeInstructions: "true",
    instructionsRequired: "true",
    fillIngredients: "true",
    ignorePantry: "true",
    sort: "popularity",
    sortDirection: "desc",
  });
  const d = spoonDiet(diet);
  if (d) params.set("diet", d);
  if (diet === "dairy-free") params.set("intolerances", "dairy");

  const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  const data = await res.json();
  const normalized = (data.results ?? []).map((r: any) => normalizeSpoonacularRecipe(r, mood));
  return filterRecipesWithCompleteInstructions(normalized);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  if (!TOPUP_SECRET || request.headers.get("x-cron-secret") !== TOPUP_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!cacheEnabled() || !SPOONACULAR_API_KEY) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }

  let toppedUp = 0, added = 0, skipped = 0;
  for (const mood of MOODS) {
    for (const diet of DIETS) {
      const count = await countCombo(mood, diet);
      if (count >= TARGET) { skipped++; continue; }
      const fresh = await fetchCombo(mood, diet);
      if (fresh.length) {
        saveRecipesToCache(fresh, mood, diet === "none" ? [] : [diet]);
        toppedUp++; added += fresh.length;
      }
      await sleep(400); // respect Spoonacular rate limits
    }
  }
  console.log(`[recipes-top-up] combos topped up=${toppedUp} added~${added} skipped=${skipped}`);
  return Response.json({ ok: true, toppedUp, added, skipped });
});
