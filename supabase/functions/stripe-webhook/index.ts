// stripe-webhook — Stripe's servers call this when billing state changes. This
// is the ONLY place public.profiles billing columns get written (it uses the
// service-role key, which bypasses RLS). It replaces the client-side runDue()
// "charge" simulation in src/notifications.ts.
//
// Secrets this needs:
//   supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
//   supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."   (from the webhook endpoint you create)
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."     (Project Settings → API)
// SUPABASE_URL is injected automatically.
//
// Deploy with JWT verification OFF (Stripe doesn't send a Supabase JWT):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Stripe dashboard → Developers → Webhooks → Add endpoint:
//   URL:  https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook
//   Events: checkout.session.completed, customer.subscription.updated,
//           customer.subscription.deleted, invoice.paid, invoice.payment_failed

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@^17";
import { createClient } from "npm:@supabase/supabase-js@^2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" });
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Map a Stripe subscription status onto our profiles.subscription_status enum.
function mapStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "trialing": return "trialing";
    case "active": return "active";
    case "past_due":
    case "unpaid": return "past_due";
    case "canceled":
    case "incomplete_expired": return "canceled";
    default: return "none";
  }
}

async function updateProfile(userId: string, fields: Record<string, unknown>) {
  if (!userId) return;
  const { error } = await admin.from("profiles").update(fields).eq("id", userId);
  if (error) console.error("profiles update failed:", error.message);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = request.headers.get("stripe-signature");
  if (!signature || !WEBHOOK_SECRET) return new Response("Missing signature", { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Signature verification failed:", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.metadata?.supabase_user_id ?? "";
        await updateProfile(userId, {
          stripe_customer_id: typeof s.customer === "string" ? s.customer : s.customer?.id,
          plan: s.metadata?.plan ?? null,
          subscription_status: "trialing",
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id ?? "";
        await updateProfile(userId, {
          subscription_status: mapStatus(sub.status),
          plan: sub.metadata?.plan ?? null,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        });
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const sub = typeof inv.subscription === "string"
          ? await stripe.subscriptions.retrieve(inv.subscription)
          : inv.subscription as Stripe.Subscription | null;
        const userId = sub?.metadata?.supabase_user_id ?? "";
        await updateProfile(userId, { subscription_status: "active" });
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const sub = typeof inv.subscription === "string"
          ? await stripe.subscriptions.retrieve(inv.subscription)
          : inv.subscription as Stripe.Subscription | null;
        const userId = sub?.metadata?.supabase_user_id ?? "";
        await updateProfile(userId, { subscription_status: "past_due" });
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", (err as Error).message);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "content-type": "application/json" },
  });
});
