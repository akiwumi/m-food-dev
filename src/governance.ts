import { supabase } from "./supabase";

// Slice 1.5 (roadmap v3): the client side of the Data Governance gate. Consent of
// record, export, and learning-data reset. Every function is a safe no-op when
// Supabase isn't configured or no one is signed in, so the pilot still runs.
//
// Consent default is OFF (no row = not granted). Learning does not run and no
// behavioural event is written until the user turns the relevant scope on.

export type ConsentScope = "behavioral_learning" | "mood_health_context";

// Bump when the consent copy / collected event set materially changes — that is
// what triggers re-consent (stored rows carry the version they agreed to).
export const CONSENT_VERSION = "2026-06-15";

export type ConsentState = Record<ConsentScope, boolean>;
export const NO_CONSENT: ConsentState = { behavioral_learning: false, mood_health_context: false };

async function uid(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// Current consent for the signed-in user. Missing rows read as "not granted".
export async function getConsents(): Promise<ConsentState> {
  if (!supabase) return NO_CONSENT;
  const userId = await uid();
  if (!userId) return NO_CONSENT;
  const { data, error } = await supabase.from("consents").select("scope, granted").eq("user_id", userId);
  if (error || !data) return NO_CONSENT;
  const state = { ...NO_CONSENT };
  for (const row of data as { scope: ConsentScope; granted: boolean }[]) {
    if (row.scope in state) state[row.scope] = row.granted;
  }
  return state;
}

// Record a consent decision (version + timestamp stamped). Returns false on any
// failure so the caller can keep the UI honest rather than show a false "saved".
export async function setConsent(scope: ConsentScope, granted: boolean): Promise<boolean> {
  if (!supabase) return false;
  const userId = await uid();
  if (!userId) return false;
  const { error } = await supabase.from("consents").upsert(
    { user_id: userId, scope, granted, version: CONSENT_VERSION, decided_at: new Date().toISOString() },
    { onConflict: "user_id,scope" },
  );
  return !error;
}

// "Pause learning" = revoke the behavioural_learning consent. New writes stop and
// existing signals are frozen (use is gated on consent); nothing is erased.
export async function pauseLearning(): Promise<boolean> {
  return setConsent("behavioral_learning", false);
}

// "Reset / forget" = delete the learning data this user has accumulated, WITHOUT
// deleting the account. Distinct from pause. RLS lets a user delete their own rows.
const LEARNING_TABLES = ["events", "mood_entries", "recommendation_runs", "cooking_sessions", "diary_entries"];
export async function resetLearningData(): Promise<boolean> {
  if (!supabase) return false;
  const userId = await uid();
  if (!userId) return false;
  let ok = true;
  for (const table of LEARNING_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) ok = false;
  }
  return ok;
}

// Export the user's stored behavioural + profile data via the export-data edge
// function. Returns the parsed JSON document, or null on failure.
export async function exportMyData(): Promise<unknown | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-data`, {
      method: "POST",
      headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
