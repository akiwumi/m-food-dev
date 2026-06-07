// stripe-webhook — Stripe calls this endpoint when subscription state changes.
// It is the single authoritative writer of the `subscriptions` table.
// No user JWT is required — Stripe signs requests with STRIPE_WEBHOOK_SECRET.
//
// Secrets required:
//   STRIPE_WEBHOOK_SECRET   (whsec_… — from Stripe Dashboard → Webhooks)
//   STRIPE_SECRET_KEY       (needed to fetch subscription objects)
//   SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL  (auto-injected)
//
// Events handled:
//   checkout.session.completed          — trial started, record customer/sub IDs
//   customer.subscription.updated       — status change (active, past_due, …)
//   customer.subscription.deleted       — canceled / expired

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const WEBHOOK_SECRET      = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const STRIPE_SECRET_KEY   = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const SUPABASE_URL        = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Stripe's timestamp tolerance (5 minutes).
const TOLERANCE_SECS = 300;

async function verifyStripeSignature(body: string, header: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=")));
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECS) return false;
  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

async function dbUpsert(table: string, row: Record<string, unknown>) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  return res.ok ? res.json() : null;
}

// Map Stripe subscription status to our internal status.
function mapStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "canceled",
    incomplete: "none",
    incomplete_expired: "none",
    paused: "canceled",
  };
  return map[stripeStatus] ?? "none";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body   = await req.text();
  const header = req.headers.get("stripe-signature") ?? "";

  if (!(await verifyStripeSignature(body, header))) {
    console.error("Webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(body); } catch { return new Response("Invalid JSON", { status: 400 }); }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode !== "subscription") return new Response("ok");

      const userId     = session.metadata?.supabase_user_id ?? session.subscription_data?.metadata?.supabase_user_id;
      const subId      = session.subscription;
      const customerId = session.customer;
      if (!userId || !subId) return new Response("ok");

      // Fetch the full subscription object to get trial/period dates.
      const sub = await stripeGet(`/subscriptions/${subId}`);
      const plan = sub?.metadata?.plan ?? "annual";

      await dbUpsert("subscriptions", {
        user_id:            userId,
        stripe_customer_id: customerId,
        stripe_sub_id:      subId,
        status:             mapStatus(sub?.status ?? "trialing"),
        plan,
        current_period_end: sub?.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        trial_end:          sub?.trial_end          ? new Date(sub.trial_end          * 1000).toISOString() : null,
        updated_at:         new Date().toISOString(),
      });
    }

    else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub      = event.data.object;
      const userId   = sub.metadata?.supabase_user_id;
      if (!userId) return new Response("ok");

      await dbUpsert("subscriptions", {
        user_id:            userId,
        stripe_customer_id: sub.customer,
        stripe_sub_id:      sub.id,
        status:             mapStatus(sub.status),
        plan:               sub.metadata?.plan ?? null,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        trial_end:          sub.trial_end          ? new Date(sub.trial_end          * 1000).toISOString() : null,
        updated_at:         new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("ok");
});
