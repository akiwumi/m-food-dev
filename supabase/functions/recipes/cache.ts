// cache.ts — the owned recipe cache that fronts Spoonacular (Recipe DB Roadmap,
// Phase 2). Reads/writes public.cached_recipes + public.recipe_searches via PostgREST
// with the service-role key (injected into edge functions automatically). All
// access is mediated by this function, so RLS keeps the tables read-only for end
// users while the service role does the writing.
//
// IMPORTANT — cache correctness:
//   * The cache is keyed on a NORMALIZED mood tag + diet tags (the 7×6 roadmap
//     vocabulary) — see tags.ts. The same normalizer must be mirrored by
//     scripts/seed-recipes.mjs so seeded rows and live write-through rows share keys.
//   * Allergens are PER USER and are NOT part of the cache key. Callers MUST still
//     run cached rows through the same safety/diet filter they apply to live
//     provider results before serving (see index.ts). We therefore over-fetch from
//     cache and only treat it as a hit if enough survive that filter.

// Re-exported so index.ts keeps importing tag helpers from "./cache.ts".
export { CANON_MOODS, dairyFreeTag, dietTagsFor, normalizeMoodTag } from "./tags.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const cacheEnabled = (): boolean => Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

function restHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: SERVICE_ROLE_KEY,
    authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

// PostgREST array literal for a `cs.` (contains) filter: {a,b}
const pgArray = (values: string[]) => `{${values.map(v => `"${v.replace(/"/g, "")}"`).join(",")}}`;

export type CachedRow = { id: string; raw_data: unknown };

// Read up to `limit` cached recipes matching the mood + diet tags, most-searched
// first. Returns rows with their DB id (for popularity bumps + search logging) and
// the ready-to-serve normalized recipe in raw_data.
export async function getCachedRecipes(
  moodTag: string,
  dietTags: string[],
  limit = 24,
): Promise<CachedRow[]> {
  if (!cacheEnabled()) return [];
  const params = new URLSearchParams({
    select: "id,raw_data",
    mood_tags: `cs.${pgArray([moodTag])}`,
    order: "search_count.desc",
    limit: String(limit),
  });
  // contains([]) matches all rows, so only add the diet filter when there are tags.
  if (dietTags.length) params.set("dietary_tags", `cs.${pgArray(dietTags)}`);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cached_recipes?${params}`, {
      headers: restHeaders(),
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) {
      console.warn(`[recipes:cache] read failed: status=${res.status}`);
      return [];
    }
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn(`[recipes:cache] read threw: ${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
}

// Fire-and-forget popularity bump on a cache hit.
export function bumpSearchCount(ids: string[]): void {
  if (!cacheEnabled() || !ids.length) return;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_search_count`, {
    method: "POST",
    headers: restHeaders(),
    body: JSON.stringify({ recipe_ids: ids }),
    signal: AbortSignal.timeout(4_000),
  }).catch(() => {});
}

// Map a normalized recipe (provider.ts shape) onto a cache row for upsert_recipes.
function toCacheRecord(recipe: any, moodTag: string, dietTags: string[]) {
  const source = String(recipe?.id ?? "").startsWith("mealdb-") ? "themealdb" : "spoonacular";
  return {
    external_id: String(recipe?.id ?? ""),
    source_api: source,
    title: String(recipe?.title ?? ""),
    image_url: recipe?.image ?? null,
    ready_in_minutes: Number.isFinite(recipe?.time) ? recipe.time : null,
    servings: null,
    mood_tags: [moodTag],
    dietary_tags: dietTags,
    cuisine_type: recipe?.cuisine || null,
    meal_type: Array.isArray(recipe?.mealTypes) ? (recipe.mealTypes[0] ?? null) : null,
    raw_data: recipe,
  };
}

// Write-through: save freshly fetched provider recipes into the cache (tag-unioning
// upsert). Fire-and-forget — never blocks or fails the user's response.
export function saveRecipesToCache(recipes: any[], moodTag: string, dietTags: string[]): void {
  if (!cacheEnabled() || !recipes?.length) return;
  const payload = recipes.map(r => toCacheRecord(r, moodTag, dietTags)).filter(r => r.external_id && r.title);
  if (!payload.length) return;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_recipes`, {
    method: "POST",
    headers: restHeaders(),
    body: JSON.stringify({ payload }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => {});
}

// Append a row to the analytics log. Fire-and-forget.
export function logSearch(input: {
  userId: string | null;
  moodTag: string;
  dietTags: string[];
  query: string;
  resultIds: string[];
  servedFrom: "cache" | "api" | "themealdb" | "none";
}): void {
  if (!cacheEnabled()) return;
  fetch(`${SUPABASE_URL}/rest/v1/recipe_searches`, {
    method: "POST",
    headers: restHeaders({ prefer: "return=minimal" }),
    body: JSON.stringify({
      user_id: input.userId,
      mood: input.moodTag,
      dietary: input.dietTags,
      query: input.query || null,
      result_ids: input.resultIds,
      served_from: input.servedFrom,
    }),
    signal: AbortSignal.timeout(4_000),
  }).catch(() => {});
}
