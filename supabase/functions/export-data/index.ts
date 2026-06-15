// export-data — returns the authenticated user's stored behavioural + profile
// data in a single readable JSON document (roadmap Slice 1.5, Data Governance).
//
// Mirrors the deletion path's coverage: the same tables `delete-account` clears
// are the tables this exports, so "what we hold about you" and "what we delete"
// stay in lockstep. Read-only; uses the service role to gather rows but scopes
// every query to the caller's own id (derived from the verified token).
//
// Secrets required:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   ALLOWED_ORIGINS                                             (browser origins)
//
// POST body: {}
// Response:  { ok: true, exported_at, user_id, data: { <table>: [...] } }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, isAllowedOrigin, preflight } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Behavioural + health-adjacent + profile data, keyed by the column that holds
// the owning user. Kept in lockstep with delete-account's coverage.
const BY_USER_ID = [
  "profiles", "consents", "events",
  "mood_entries", "recommendation_runs", "cooking_sessions", "diary_entries",
  "health_trend_snapshots", "subscriptions", "invite_redemptions",
];
const BY_OWNER_ID = ["household_diners", "family_health_snapshots"];

async function adminSelect(path: string): Promise<unknown[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  return res.ok ? await res.json() : [];
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

  const data: Record<string, unknown[]> = {};
  for (const table of BY_USER_ID) {
    const idCol = table === "profiles" ? "id" : "user_id";
    data[table] = await adminSelect(`/${table}?${idCol}=eq.${userId}&select=*`);
  }
  for (const table of BY_OWNER_ID) {
    data[table] = await adminSelect(`/${table}?owner_id=eq.${userId}&select=*`);
  }

  return Response.json(
    { ok: true, exported_at: new Date().toISOString(), user_id: userId, data },
    { headers: corsHeaders(origin) },
  );
});
