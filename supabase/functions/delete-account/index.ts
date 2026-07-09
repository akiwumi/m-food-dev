// delete-account — permanently deletes the authenticated user. Cancels any
// Stripe subscription, removes the user's database rows, and deletes the auth
// account itself via the admin API. Irreversible.
//
// Secrets required:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   STRIPE_SECRET_KEY   (optional — if absent, Stripe cancellation is skipped)
//   ALLOWED_ORIGINS     (comma-separated allowed browser origins)
//
// POST body:  {}
// Response:   { "ok": true }  or  { "ok": false, "error": "…" }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, isAllowedOrigin, preflight } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

async function supabaseAdmin(path: string, opts: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(opts.headers as Record<string, string> ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
    return preflight(origin);
  }

  if (req.method !== "POST") return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  if (origin && !isAllowedOrigin(origin)) return Response.json({ ok: false, error: "Origin not allowed" }, { status: 403, headers: corsHeaders(origin) });

  // Authenticate the caller.
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: SUPABASE_ANON_KEY },
  });
  if (!userRes.ok) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  const { id: userId } = await userRes.json();

  // ── 1. Best-effort: cancel any Stripe subscriptions on record ────────────
  if (STRIPE_SECRET_KEY) {
    try {
      const subsRes = await supabaseAdmin(`/subscriptions?user_id=eq.${userId}&select=stripe_sub_id`, { method: "GET" });
      const subs: { stripe_sub_id?: string }[] = subsRes.ok ? await subsRes.json() : [];
      for (const s of subs) {
        if (!s.stripe_sub_id) continue;
        await fetch(`https://api.stripe.com/v1/subscriptions/${s.stripe_sub_id}`, {
          method: "DELETE",
          headers: { authorization: `Bearer ${STRIPE_SECRET_KEY}` },
        });
      }
    } catch {
      // Non-fatal — proceed with account deletion regardless.
    }
  }

  // ── 2. Remove the user's database rows ───────────────────────────────────
  // The auth-user delete in step 3 cascades EVERY public FK to auth.users (all are
  // ON DELETE CASCADE — verified invariant, see 013/governance test), so this is
  // the single enforcement path the Data Governance gate requires. We still delete
  // the sensitive behavioural + health-adjacent classes explicitly first, so the
  // intent is auditable and ordering is defined rather than implicit.
  const byUserId = [
    "consents", "events",                                  // telemetry + consent of record
    "mood_entries", "recommendation_runs", "cooking_sessions", "diary_entries", // behavioural learning
    "health_trend_snapshots",                              // health-adjacent
    "subscriptions", "invite_redemptions",                 // billing
  ];
  for (const table of byUserId) {
    try { await supabaseAdmin(`/${table}?user_id=eq.${userId}`, { method: "DELETE" }); } catch { /* cascade backstops in step 3 */ }
  }
  // These two key on owner_id, not user_id.
  for (const table of ["household_diners", "family_health_snapshots"]) {
    try { await supabaseAdmin(`/${table}?owner_id=eq.${userId}`, { method: "DELETE" }); } catch { /* cascade backstops in step 3 */ }
  }

  // ── 2b. Best-effort: purge the user's Storage objects ────────────────────
  // Deleting the auth user does NOT cascade to storage.objects, so remove them
  // explicitly. Scoped to the caller's own "<uid>/" folder in each private bucket.
  for (const bucket of ["food-photos", "avatars", "community-images"]) {
    try {
      const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ prefix: `${userId}/`, limit: 1000 }),
      });
      const objects: { name: string }[] = listRes.ok ? await listRes.json() : [];
      const prefixes = objects.map(o => `${userId}/${o.name}`);
      if (prefixes.length) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
          method: "DELETE",
          headers: { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}`, "content-type": "application/json" },
          body: JSON.stringify({ prefixes }),
        });
      }
    } catch {
      // Non-fatal — proceed with account deletion regardless.
    }
  }

  // ── 3. Delete the auth user itself ───────────────────────────────────────
  const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  if (!delRes.ok) {
    return Response.json({ ok: false, error: "Could not delete account. Please try again." }, { status: 500, headers: corsHeaders(origin) });
  }

  return Response.json({ ok: true }, { headers: corsHeaders(origin) });
});
