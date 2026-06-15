// nutrition-lookup — FatSecret food & nutrition search.
//
// Secrets:
//   supabase secrets set FATSECRET_CLIENT_ID="..."
//   supabase secrets set FATSECRET_CLIENT_SECRET="..."
//   supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://your-live-url"
//
// Deploy: supabase functions deploy nutrition-lookup
//
// Request body (JSON) — one of:
//   { "query": "chicken breast" }           → foods.search (up to 10 results)
//   { "food_id": "180173" }                 → food.get (single food, all servings)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, isAllowedOrigin, preflight } from "../_shared/cors.ts";
import { fsRequest, normalizeFood, type NutritionFood } from "../_shared/fatsecret.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

async function verifyAuth(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: authHeader, apikey: SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(5_000),
  });
  return res.ok;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
    return preflight(origin);
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  }

  if (origin && !isAllowedOrigin(origin)) {
    return Response.json({ error: "Origin not allowed" }, { status: 403, headers: corsHeaders(origin) });
  }

  const authed = await verifyAuth(request.headers.get("authorization"));
  if (!authed) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  }

  let body: { query?: string; food_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(origin) });
  }

  try {
    // Single food detail lookup.
    if (typeof body.food_id === "string" && body.food_id.trim()) {
      const data = await fsRequest("food.get", { food_id: body.food_id.trim() }) as any;
      const food: NutritionFood = normalizeFood(data.food ?? {});
      return Response.json({ food }, { headers: corsHeaders(origin) });
    }

    // Food search.
    if (typeof body.query === "string" && body.query.trim()) {
      const query = body.query.trim().slice(0, 100);
      const data = await fsRequest("foods.search", {
        search_expression: query,
        max_results: "10",
        page_number: "0",
      }) as any;

      // FatSecret returns null foods object when nothing matches.
      const raw = data.foods?.food ?? [];
      const foods: NutritionFood[] = (Array.isArray(raw) ? raw : [raw])
        .filter(Boolean)
        .map(normalizeFood);

      return Response.json({ foods }, { headers: corsHeaders(origin) });
    }

    return Response.json(
      { error: "Provide either query or food_id" },
      { status: 400, headers: corsHeaders(origin) },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[nutrition-lookup] ${msg}`);
    return Response.json(
      { error: "Nutrition lookup failed", detail: msg.slice(0, 100) },
      { status: 502, headers: corsHeaders(origin) },
    );
  }
});
