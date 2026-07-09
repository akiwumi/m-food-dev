// Backend edge-function calls and the localStorage-key registry.
// Extracted verbatim from App.tsx (roadmap Phase 3 PR 1).
import { supabase } from "../supabase";

const SUPABASE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function callFn<T>(fn: string, body: unknown): Promise<T> {
  if (!supabase) throw new Error("Backend not configured.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");
  const res = await fetch(`${SUPABASE_FN}/${fn}`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export async function redeemInviteCode(code: string): Promise<{ ok: boolean; subscriptionEnd?: string; error?: string }> {
  try { return await callFn("redeem-invite", { code: code.trim().toUpperCase() }); }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function startCheckout(plan: string): Promise<{ url?: string; error?: string }> {
  try { return await callFn("create-checkout", { plan }); }
  catch (e) { return { error: (e as Error).message }; }
}

// Permanently delete the signed-in user: cancels any Stripe subscription,
// removes their rows, and deletes the auth account server-side.
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  try { return await callFn("delete-account", {}); }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

// Every localStorage key MoodFood owns, wiped when an account is cancelled.
export const MOODFOOD_KEYS = [
  "moodfood-entry", "moodfood-profile", "moodfood-saved", "moodfood-diary",
  "moodfood-groceries", "moodfood-posts", "moodfood-connections", "moodfood-diners",
  "moodfood-eater-count", "moodfood-onboarding-step", "moodfood-a2hs-dismissed",
];

// After Stripe redirects back with ?checkout=success, poll the subscriptions
// table for up to 10 s to get the confirmed status.
export async function syncSubscriptionFromDB(): Promise<{ status: string; plan: string; currentPeriodEnd: string } | null> {
  if (!supabase) return null;
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 500 : 2000));
    const { data } = await supabase.from("subscriptions").select("*").maybeSingle();
    if (data?.status && data.status !== "none") {
      return { status: data.status, plan: data.plan ?? "annual", currentPeriodEnd: data.current_period_end ?? "" };
    }
  }
  return null;
}
