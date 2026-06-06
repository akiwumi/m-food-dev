// create-checkout — starts a Stripe Checkout session with a free trial for the
// logged-in user, and returns the URL the browser should redirect to.
//
// Secrets this needs (set once):
//   supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
//   supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://your-live-url"
// SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.
//
// Deploy: supabase functions deploy create-checkout
//
// Request body (JSON): { "priceId": "price_...", "plan": "annual" }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@^17";
import { corsHeaders, isAllowedOrigin, preflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const TRIAL_DAYS = 7;

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return isAllowedOrigin(origin) ? preflight(origin) : new Response(null, { status: 403 });
  }
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  }
  if (origin && !isAllowedOrigin(origin)) {
    return Response.json({ error: "Origin not allowed" }, { status: 403, headers: corsHeaders(origin) });
  }

  // Identify the caller from their Supabase JWT.
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY || !STRIPE_SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  }
  const identity = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: SUPABASE_ANON_KEY },
  });
  if (!identity.ok) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  }
  const user = await identity.json();

  let body: { priceId?: string; plan?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders(origin) });
  }
  if (!body.priceId) {
    return Response.json({ error: "Missing priceId" }, { status: 400, headers: corsHeaders(origin) });
  }

  // Reuse a Stripe customer for this user if one already exists.
  const existing = await stripe.customers.list({ email: user.email, limit: 1 });
  const customer = existing.data[0] ??
    (await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } }));

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: body.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { supabase_user_id: user.id, plan: body.plan ?? "" },
    },
    // The webhook (stripe-webhook) is the source of truth; these just bring the
    // user back into the app. Adjust paths to your routes.
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancel`,
    metadata: { supabase_user_id: user.id, plan: body.plan ?? "" },
  });

  return Response.json({ url: session.url }, { headers: corsHeaders(origin) });
});
