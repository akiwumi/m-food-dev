// redeem-invite — validates an invite code and grants the authenticated user a
// 1-year subscription. If STRIPE_SECRET_KEY is configured, it also creates a
// real Stripe customer + subscription (with a 365-day free trial) so Stripe
// records show the user as an active subscriber. Otherwise it marks the
// subscription purely in the database and the client stores the state locally.
//
// Secrets required:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY  (auto-injected)
//   STRIPE_SECRET_KEY   (optional — if absent, Stripe step is skipped)
//   STRIPE_PRICE_ID     (optional — the recurring price to subscribe to)
//   ALLOWED_ORIGINS     (comma-separated allowed browser origins)
//
// POST body:  { "code": "LAUNCH2026" }
// Response:   { "ok": true, "subscriptionEnd": "2027-06-08T…", "stripeSubId": "sub_…" }
//          or { "ok": false, "error": "…" }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY    = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_PRICE_ID      = Deno.env.get("STRIPE_PRICE_ID") ?? "";
const ALLOWED_ORIGINS      = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").filter(Boolean));

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...(allowed ? { "access-control-allow-origin": allowed, "vary": "Origin" } : {}),
  };
}

async function supabaseAdmin(path: string, opts: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      "prefer": "return=representation",
      ...(opts.headers as Record<string, string> ?? {}),
    },
  });
}

async function stripePost(path: string, params: Record<string, string>) {
  const body = new URLSearchParams(params);
  return fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, {
      headers: {
        ...corsHeaders(origin),
        "access-control-allow-methods": "POST",
        "access-control-allow-headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return Response.json({ ok: false, error: "Origin not allowed" }, { status: 403, headers: corsHeaders(origin) });

  // Authenticate the caller.
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: SUPABASE_ANON_KEY },
  });
  if (!userRes.ok) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  const { id: userId, email } = await userRes.json();

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: corsHeaders(origin) }); }

  const rawCode = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!rawCode) return Response.json({ ok: false, error: "No invite code provided." }, { status: 400, headers: corsHeaders(origin) });

  // ── 1. Fetch the invite code record ──────────────────────────────────────
  const codeRes = await supabaseAdmin(`/invite_codes?code=eq.${encodeURIComponent(rawCode)}&select=*`, { method: "GET" });
  if (!codeRes.ok) return Response.json({ ok: false, error: "Could not look up code." }, { status: 500, headers: corsHeaders(origin) });
  const codes: any[] = await codeRes.json();
  if (!codes.length) return Response.json({ ok: false, error: "Invalid invite code." }, { status: 400, headers: corsHeaders(origin) });

  const codeRow = codes[0];
  if (codeRow.used_count >= codeRow.max_uses) return Response.json({ ok: false, error: "This invite code has already been fully redeemed." }, { status: 400, headers: corsHeaders(origin) });
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) return Response.json({ ok: false, error: "This invite code has expired." }, { status: 400, headers: corsHeaders(origin) });

  // ── 2. Check for duplicate redemption ────────────────────────────────────
  const existRes = await supabaseAdmin(`/invite_redemptions?code=eq.${encodeURIComponent(rawCode)}&user_id=eq.${userId}&select=id`, { method: "GET" });
  const existing: any[] = existRes.ok ? await existRes.json() : [];
  if (existing.length) return Response.json({ ok: false, error: "You have already redeemed this code." }, { status: 400, headers: corsHeaders(origin) });

  // ── 3. Optionally create/fetch Stripe customer + subscription ─────────────
  const subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  let stripeCustomerId = "";
  let stripeSubId = "";

  if (STRIPE_SECRET_KEY && STRIPE_PRICE_ID) {
    try {
      // Find or create customer by email.
      const searchRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'`, {
        headers: { authorization: `Bearer ${STRIPE_SECRET_KEY}` },
      });
      const searchData = searchRes.ok ? await searchRes.json() : { data: [] };
      if (searchData.data?.length) {
        stripeCustomerId = searchData.data[0].id;
      } else {
        const custRes = await stripePost("/customers", { email, name: email, metadata: { supabase_user_id: userId } });
        if (custRes.ok) { const c = await custRes.json(); stripeCustomerId = c.id; }
      }

      // Create a subscription with a 1-year free trial.
      if (stripeCustomerId) {
        const trialEnd = Math.floor(Date.now() / 1000 + 365 * 24 * 60 * 60).toString();
        const subRes = await stripePost("/subscriptions", {
          customer: stripeCustomerId,
          "items[0][price]": STRIPE_PRICE_ID,
          trial_end: trialEnd,
          "metadata[invite_code]": rawCode,
          "metadata[supabase_user_id]": userId,
        });
        if (subRes.ok) { const s = await subRes.json(); stripeSubId = s.id; }
      }
    } catch {
      // Stripe failure is non-fatal — we still grant the DB subscription.
    }
  }

  // ── 4. Record the redemption ─────────────────────────────────────────────
  const redeemRes = await supabaseAdmin("/invite_redemptions", {
    method: "POST",
    body: JSON.stringify({
      code: rawCode,
      user_id: userId,
      stripe_customer_id: stripeCustomerId || null,
      stripe_sub_id: stripeSubId || null,
      subscription_end: subscriptionEnd,
    }),
  });
  if (!redeemRes.ok) {
    const err = await redeemRes.text();
    // Unique violation = already redeemed (race condition).
    if (err.includes("unique") || err.includes("23505")) {
      return Response.json({ ok: false, error: "You have already redeemed this code." }, { status: 400, headers: corsHeaders(origin) });
    }
    return Response.json({ ok: false, error: "Could not record redemption." }, { status: 500, headers: corsHeaders(origin) });
  }

  // ── 5. Increment used_count ───────────────────────────────────────────────
  await supabaseAdmin(`/invite_codes?code=eq.${encodeURIComponent(rawCode)}`, {
    method: "PATCH",
    body: JSON.stringify({ used_count: codeRow.used_count + 1 }),
  });

  return Response.json({
    ok: true,
    subscriptionEnd,
    stripeCustomerId: stripeCustomerId || null,
    stripeSubId: stripeSubId || null,
  }, { headers: corsHeaders(origin) });
});
