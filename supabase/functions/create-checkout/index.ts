// create-checkout — creates a Stripe Checkout Session for a MoodFood subscription.
// The client redirects to session.url; Stripe handles card collection and the
// 7-day free trial. On success Stripe calls the stripe-webhook edge function
// which writes the subscription status to the `subscriptions` table.
//
// Secrets required:
//   STRIPE_SECRET_KEY   (sk_live_… or sk_test_…)
//   ALLOWED_ORIGINS
//   SUPABASE_URL, SUPABASE_ANON_KEY  (auto-injected)
//
// POST body: { "plan": "annual" | "quarterly" | "monthly", "successUrl": "…", "cancelUrl": "…" }
// Response:  { "url": "https://checkout.stripe.com/…" }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ALLOWED_ORIGINS   = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").filter(Boolean));

// Live price IDs created 2026-06-08 on Stripe account acct_1TEm1p8YlDEG0APM
const PRICE_IDS: Record<string, string> = {
  annual:    "price_1Tfp5A8YlDEG0APMukUSJRbf",  // $120/year
  quarterly: "price_1Tfp5B8YlDEG0APMj5s9wJmY",  // $36/quarter
  monthly:   "price_1Tfp5B8YlDEG0APMlLLKiuPA",  // $15/month
};

const APP_URL = "https://m-food-dev.vercel.app";

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...(allowed ? { "access-control-allow-origin": allowed, "vary": "Origin" } : {}),
  };
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

  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers: corsHeaders(origin) });
  if (!STRIPE_SECRET_KEY) return Response.json({ error: "Stripe not configured" }, { status: 503, headers: corsHeaders(origin) });

  // Authenticate the caller.
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: SUPABASE_ANON_KEY },
  });
  if (!userRes.ok) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  const { id: userId, email } = await userRes.json();

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(origin) }); }

  const plan    = typeof body?.plan === "string" && PRICE_IDS[body.plan] ? body.plan : "annual";
  const priceId = PRICE_IDS[plan];

  // Find or create a Stripe customer for this Supabase user.
  let customerId = "";
  try {
    const searchRes = await fetch(
      `https://api.stripe.com/v1/customers/search?query=metadata['supabase_user_id']:'${userId}'&limit=1`,
      { headers: { authorization: `Bearer ${STRIPE_SECRET_KEY}` } },
    );
    if (searchRes.ok) {
      const s = await searchRes.json();
      if (s.data?.length) customerId = s.data[0].id;
    }
  } catch { /* fall through */ }

  if (!customerId) {
    const custRes = await stripePost("/customers", {
      email,
      "metadata[supabase_user_id]": userId,
    });
    if (custRes.ok) { const c = await custRes.json(); customerId = c.id; }
  }

  // Create the Checkout Session.
  const sessionParams: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "subscription_data[trial_period_days]": "7",
    "subscription_data[metadata][supabase_user_id]": userId,
    "subscription_data[metadata][plan]": plan,
    "success_url": `${APP_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    "cancel_url":  `${APP_URL}/?checkout=canceled`,
    "allow_promotion_codes": "true",
  };
  if (customerId) sessionParams.customer = customerId;
  else sessionParams.customer_email = email;

  const sessionRes = await stripePost("/checkout/sessions", sessionParams);
  if (!sessionRes.ok) {
    const err = await sessionRes.json();
    return Response.json({ error: err?.error?.message ?? "Stripe checkout error" }, { status: 502, headers: corsHeaders(origin) });
  }
  const session = await sessionRes.json();
  return Response.json({ url: session.url, sessionId: session.id }, { headers: corsHeaders(origin) });
});
