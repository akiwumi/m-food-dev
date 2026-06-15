// FatSecret Platform API — OAuth 2.0 client credentials helper.
// Token is cached in module scope (per edge function cold start) and refreshed
// 60s before expiry, so most requests skip the token round-trip.
//
// Secrets required:
//   supabase secrets set FATSECRET_CLIENT_ID="..."
//   supabase secrets set FATSECRET_CLIENT_SECRET="..."

interface CachedToken {
  access_token: string;
  expires_at: number; // epoch ms
}

let cachedToken: CachedToken | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = Deno.env.get("FATSECRET_CLIENT_ID");
  const clientSecret = Deno.env.get("FATSECRET_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("FatSecret credentials not configured");

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=basic",
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FatSecret auth failed: ${res.status} ${body.slice(0, 100)}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.access_token;
}

export async function fsRequest(
  method: string,
  params: Record<string, string>,
): Promise<unknown> {
  const token = await getToken();
  const url = new URL("https://platform.fatsecret.com/rest/server.api");
  url.searchParams.set("method", method);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { "Authorization": `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FatSecret API error: ${res.status} ${body.slice(0, 100)}`);
  }

  return res.json();
}

// Normalised shape returned to the client.
export interface NutritionServing {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface NutritionFood {
  food_id: string;
  name: string;
  type: "Brand" | "Generic";
  servings: NutritionServing[];
}

// FatSecret returns a single object instead of a 1-item array — normalise both.
function toArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : v != null ? [v] : [];
}

function parseNum(v: unknown): number {
  return Math.max(0, +(Number(v) || 0));
}

function normalizeServing(s: Record<string, unknown>): NutritionServing {
  return {
    description: String(s.serving_description ?? "1 serving"),
    calories: parseNum(s.calories),
    protein: parseNum(s.protein),
    carbs: parseNum(s.carbohydrate),
    fat: parseNum(s.fat),
    fiber: parseNum(s.fiber),
    sugar: parseNum(s.sugar),
    sodium: parseNum(s.sodium),
  };
}

export function normalizeFood(raw: Record<string, unknown>): NutritionFood {
  const servingRaw = (raw.servings as any)?.serving ?? [];
  const servings = toArray<Record<string, unknown>>(servingRaw).map(normalizeServing);
  return {
    food_id: String(raw.food_id ?? ""),
    name: String(raw.food_name ?? ""),
    type: raw.food_type === "Brand" ? "Brand" : "Generic",
    servings: servings.length ? servings : [],
  };
}
