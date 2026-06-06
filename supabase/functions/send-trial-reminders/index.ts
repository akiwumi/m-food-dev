// send-trial-reminders — finds trials ending in the next ~24h that haven't been
// reminded yet, and emails the user. Replaces the scheduled "trial ends
// tomorrow" push in src/notifications.ts (scheduleTrial). Meant to be called on
// a schedule by pg_cron (see BACKEND_SETUP.md Step H), not by the browser.
//
// Secrets this needs:
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="..."   (Project Settings → API)
//   supabase secrets set RESEND_API_KEY="re_..."           (or your email provider)
//   supabase secrets set REMINDER_FROM="MoodFood <hello@yourdomain.com>"
// SUPABASE_URL is injected automatically.
//
// Deploy: supabase functions deploy send-trial-reminders --no-verify-jwt
// (the cron job authenticates with the service-role bearer token instead.)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@^2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const REMINDER_FROM = Deno.env.get("REMINDER_FROM") ?? "MoodFood <onboarding@resend.dev>";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Only the service role may call this. Guard with the same key as a shared secret.
function authorized(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${SERVICE_ROLE_KEY}`;
}

async function sendEmail(to: string, name: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — logging instead of sending to", to);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: REMINDER_FROM,
      to,
      subject: "Your free trial ends tomorrow",
      text: `Hi ${name || "there"} — your MoodFood trial ends tomorrow. ` +
        `You'll be charged for your plan unless you cancel before then. ` +
        `Manage anytime in Settings → Subscription.`,
    }),
  });
  if (!res.ok) console.error("Resend error:", await res.text());
  return res.ok;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  // Need the user's email (auth.users) — join via the admin API per row.
  const now = Date.now();
  const windowEnd = new Date(now + 24 * 60 * 60 * 1000).toISOString();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, display_name, trial_ends_at")
    .eq("subscription_status", "trialing")
    .is("trial_reminder_sent_at", null)
    .lte("trial_ends_at", windowEnd)
    .gt("trial_ends_at", new Date(now).toISOString());

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const p of profiles ?? []) {
    const { data: userRes } = await admin.auth.admin.getUserById(p.id);
    const email = userRes?.user?.email;
    if (!email) continue;
    const ok = await sendEmail(email, p.display_name ?? "");
    if (ok) {
      await admin.from("profiles").update({ trial_reminder_sent_at: new Date().toISOString() }).eq("id", p.id);
      sent++;
    }
  }

  return Response.json({ checked: profiles?.length ?? 0, sent });
});
