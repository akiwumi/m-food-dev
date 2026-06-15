// taste-summary — turns the user's DETERMINISTIC taste signal into one warm,
// readable sentence (roadmap Slice 5). Language only: it never decides what is
// safe, never ranks search, and never invents or returns preferences. The
// canonical signal lives on the client; this just rephrases the facts it is given.
//
// Guardrails: minimum context (only the cuisines/mood-patterns passed in), a strict
// short output, a hard timeout, and a DETERMINISTIC fallback so AI failure degrades
// to plain copy. If OPENAI_API_KEY is unset, it returns the fallback immediately.
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY (optional), ALLOWED_ORIGINS
//
// POST body: { cuisine: { preferred: string[], support: {} }, moodCuisine: { byMood: {} } }
// Response:  { summary: string, source: "ai" | "fallback" }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, isAllowedOrigin, preflight } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY    = Deno.env.get("OPENAI_API_KEY") ?? "";

const arr = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map(s => s.slice(0, 40)).slice(0, max) : [];

function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Same deterministic copy the client uses — the floor the AI must not fall below.
function deterministicSummary(cuisines: string[], moods: string[]): string {
  if (!cuisines.length && !moods.length) return "Not enough cooking history yet to spot your patterns.";
  const parts: string[] = [];
  if (cuisines.length) parts.push(`You reach for ${listJoin(cuisines)} when you cook.`);
  if (moods.length) parts.push(`You tend toward ${listJoin(moods)}.`);
  return parts.join(" ");
}

async function rephrase(facts: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  const sys = [
    "You write one warm, plain sentence summarising a person's cooking tastes for them (second person, 'you').",
    "Use ONLY the facts provided. Do NOT add cuisines, foods, or preferences that aren't listed. Do NOT give advice.",
    "Max 2 short sentences. Reply with JSON only: {\"summary\":\"<text>\"}.",
  ].join(" ");
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 120,
        messages: [{ role: "system", content: sys }, { role: "user", content: facts }],
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 280) : "";
    return summary || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
    return preflight(origin);
  }
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  if (origin && !isAllowedOrigin(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers: corsHeaders(origin) });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  }
  const identity = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { authorization: auth, apikey: SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(5_000) });
  if (!identity.ok) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(origin) }); }

  const cuisines = arr(body?.cuisine?.preferred, 4);
  const byMood = (body?.moodCuisine?.byMood && typeof body.moodCuisine.byMood === "object") ? body.moodCuisine.byMood as Record<string, unknown> : {};
  const moods = Object.entries(byMood).slice(0, 3)
    .map(([m, cs]) => { const list = arr(cs, 1); return list.length ? `${list[0]} when you’re ${m.toLowerCase().slice(0, 30)}` : ""; })
    .filter(Boolean);

  const fallback = deterministicSummary(cuisines, moods);
  // Hand the AI only the structured facts — never raw user free-text.
  const facts = `Cuisines they cook often: ${cuisines.join(", ") || "none yet"}. Mood patterns: ${moods.join("; ") || "none yet"}.`;
  const ai = cuisines.length || moods.length ? await rephrase(facts) : null;

  return Response.json(
    ai ? { summary: ai, source: "ai" } : { summary: fallback, source: "fallback" },
    { headers: corsHeaders(origin) },
  );
});
