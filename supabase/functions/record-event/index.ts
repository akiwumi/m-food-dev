// record-event — the consent-gated write path for BEHAVIOURAL data (roadmap
// Slice 2). Unlike `analytics` (operational, always allowed), nothing here is
// written unless the user has granted `behavioral_learning` consent. The consent
// check, identity, and validation are all server-side — RLS protects ownership but
// does not make client-submitted analytics trustworthy.
//
// Writes into the EXISTING learning tables rather than a parallel store:
//   recipe_rated        -> diary_entries
//   recommendation_run  -> recommendation_runs
//   cooking_completed   -> cooking_sessions
//
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ALLOWED_ORIGINS
//
// POST body: { id: uuid, type, payload }
// Response:  { ok: true } | { ok: false, error }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, isAllowedOrigin, preflight } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function admin(path: string, init: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.headers as Record<string, string> ?? {}),
    },
  });
}

// Map a validated request into the target table + row, or null to reject.
function buildRow(type: string, id: string, userId: string, payload: Record<string, unknown>):
  { table: string; row: Record<string, unknown> } | null {
  if (type === "recipe_rated") {
    const rating = Number(payload.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
    return {
      table: "diary_entries",
      row: {
        id, user_id: userId, recipe_id: null, rating: Math.round(rating),
        outcome_json: {
          provider_recipe_id: str(payload.provider_recipe_id, 80),
          title: str(payload.title, 160),
          cuisine: str(payload.cuisine, 60),
          source: str(payload.source, 40),
          mood: str(payload.mood, 40),
        },
      },
    };
  }
  if (type === "recommendation_run") {
    const candidates = Array.isArray(payload.candidates) ? payload.candidates.slice(0, 20).map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return { id: str(o.id, 80), title: str(o.title, 160), cuisine: str(o.cuisine, 60) };
    }) : [];
    return {
      table: "recommendation_runs",
      row: {
        id, user_id: userId,
        ranking_config_version: str(payload.ranking_config_version, 60) || null,
        candidates_json: { candidates, mood: str(payload.mood, 40), energy: typeof payload.energy === "number" ? payload.energy : null },
      },
    };
  }
  if (type === "cooking_completed") {
    return {
      table: "cooking_sessions",
      row: {
        id, user_id: userId, recipe_id: null, status: "completed",
        state_json: { provider_recipe_id: str(payload.provider_recipe_id, 80), title: str(payload.title, 160), cuisine: str(payload.cuisine, 60) },
      },
    };
  }
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
    return preflight(origin);
  }
  if (req.method !== "POST") return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  if (origin && !isAllowedOrigin(origin)) return Response.json({ ok: false, error: "Origin not allowed" }, { status: 403, headers: corsHeaders(origin) });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  }
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { authorization: auth, apikey: SUPABASE_ANON_KEY } });
  if (!userRes.ok) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  const { id: userId } = await userRes.json();
  if (!userId) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });

  // GATE: no behavioural write without a recorded, granted consent.
  const consentRes = await admin(`/consents?user_id=eq.${userId}&scope=eq.behavioral_learning&granted=is.true&select=user_id`, { method: "GET" });
  const consentRows = consentRes.ok ? await consentRes.json() : [];
  if (!Array.isArray(consentRows) || consentRows.length === 0) {
    return Response.json({ ok: false, error: "Consent required" }, { status: 403, headers: corsHeaders(origin) });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: corsHeaders(origin) }); }

  const id = typeof body.id === "string" && UUID_RE.test(body.id) ? body.id : "";
  const type = typeof body.type === "string" ? body.type : "";
  const payload = (body.payload && typeof body.payload === "object") ? body.payload as Record<string, unknown> : {};
  if (!id) return Response.json({ ok: false, error: "Missing event id" }, { status: 400, headers: corsHeaders(origin) });

  const built = buildRow(type, id, userId, payload);
  if (!built) return Response.json({ ok: false, error: "Unknown or invalid event" }, { status: 400, headers: corsHeaders(origin) });

  const insert = await admin(`/${built.table}`, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(built.row),
  });
  if (!insert.ok) {
    const errBody = await insert.text().catch(() => "");
    console.warn(`[record-event] insert into ${built.table} failed (HTTP ${insert.status}):`, errBody.slice(0, 200));
    return Response.json({ ok: false, error: "Store failed" }, { status: 502, headers: corsHeaders(origin) });
  }
  return Response.json({ ok: true }, { headers: corsHeaders(origin) });
});
