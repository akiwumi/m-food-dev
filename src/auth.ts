import { supabase, isSupabaseConfigured } from "./supabase";
import type { Session } from "@supabase/supabase-js";

// Thin wrapper over Supabase Auth. Every function is a no-op / safe default when
// Supabase isn't configured, so the app still runs in pilot mode (localStorage).
// A real session is what unlocks the AI features (the gateways require it).

export { isSupabaseConfigured };

export type SignUpResult = { ok: boolean; hasSession: boolean; error?: string };

// Create an account. If the project has "Confirm email" ON, no session is
// returned until the user clicks the email link (hasSession=false → show verify).
// If it's OFF, a session is returned immediately (hasSession=true → straight in).
export async function signUp(email: string, password: string, name: string): Promise<SignUpResult> {
  if (!supabase) return { ok: false, hasSession: false, error: "Backend not configured." };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name }, emailRedirectTo: window.location.origin },
  });
  if (error) return { ok: false, hasSession: false, error: error.message };
  return { ok: true, hasSession: !!data.session };
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "Backend not configured." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { ok: !error, error: error?.message };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

export async function hasSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

export async function isEmailConfirmed(): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  return !!user?.email_confirmed_at;
}

// Subscribe to auth changes (e.g. the user confirming their email in another tab,
// or signing out elsewhere). Returns an unsubscribe function.
export function onAuthChange(cb: (event: string, session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(event, session));
  return () => data.subscription.unsubscribe();
}
