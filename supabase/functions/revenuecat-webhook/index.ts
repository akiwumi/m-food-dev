// revenuecat-webhook — RevenueCat calls this endpoint when a store subscription
// changes (Apple IAP from the native app; Google Play later). It mirrors the
// entitlement into the same `subscriptions` table stripe-webhook writes, so
// syncSubscriptionFromDB and everything downstream read native subscriptions
// exactly like web (Stripe) ones. Strategy doc §4 "Architecture B bonus".
//
// Secrets required:
//   REVENUECAT_WEBHOOK_AUTH  (the Authorization header value configured in
//                             RevenueCat → Project → Integrations → Webhooks)
//   SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL  (auto-injected)
//
// The app calls Purchases.logIn(<supabase user id>) after sign-in, so
// event.app_user_id is the Supabase auth user id. Anonymous ids
// ($RCAnonymousID:…) are skipped — there is no account row to unlock yet; the
// entitlement still works on-device via the RevenueCat SDK cache.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const AUTH_HEADER      = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

// Same mapping the client uses (src/subscription.ts planFromProductId).
function planFromProductId(productId: string): string | null {
  const id = productId.toLowerCase();
  if (id.includes("annual") || id.includes("year")) return "annual";
  if (id.includes("quarter") || id.includes("3month") || id.includes("three_month")) return "quarterly";
  if (id.includes("month")) return "monthly";
  return null;
}

// RevenueCat event → our internal status, or null to ignore the event.
// The client union is "none" | "trialing" | "active" | "canceled";
// "past_due" is also written (parseSubscriptionStatus maps it to active,
// matching how the Stripe webhook models a payment-retry grace period).
function mapStatus(event: Record<string, unknown>): string | null {
  const type = String(event.type ?? "");
  const active = String(event.period_type ?? "") === "TRIAL" ? "trialing" : "active";
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "SUBSCRIPTION_EXTENDED":
      return active;
    case "CANCELLATION":
      // UNSUBSCRIBE = auto-renew turned off; access legally runs to the period
      // end, and the EXPIRATION event flips it off. Anything else (refund,
      // customer support) ends access now.
      return String(event.cancel_reason ?? "") === "UNSUBSCRIBE" ? active : "canceled";
    case "EXPIRATION":
      return "canceled";
    case "BILLING_ISSUE":
      return "past_due";
    default:
      return null; // TEST, TRANSFER, etc. — nothing to record
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // RevenueCat sends the exact Authorization header value configured in the
  // dashboard. An unset secret rejects everything rather than allowing everything.
  if (!AUTH_HEADER || req.headers.get("authorization") !== AUTH_HEADER) {
    console.error("Webhook authorization failed");
    return new Response("Unauthorized", { status: 401 });
  }

  let event: Record<string, unknown>;
  try { event = (await req.json())?.event ?? {}; }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const userId = String(event.app_user_id ?? "");
  if (!userId || userId.startsWith("$RCAnonymousID:")) return new Response("ok");

  const status = mapStatus(event);
  if (!status) return new Response("ok");

  const expiresAt = typeof event.expiration_at_ms === "number"
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  try {
    // Stripe columns are intentionally omitted so merge-duplicates never
    // blanks an existing web subscription's ids.
    const res = await dbUpsert("subscriptions", {
      user_id:            userId,
      status,
      plan:               planFromProductId(String(event.product_id ?? "")),
      current_period_end: expiresAt,
      trial_end:          String(event.period_type ?? "") === "TRIAL" ? expiresAt : null,
      updated_at:         new Date().toISOString(),
    });
    if (!res.ok) {
      console.error("subscriptions upsert failed:", res.status, await res.text());
      return new Response("Internal error", { status: 500 });
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("ok");
});
