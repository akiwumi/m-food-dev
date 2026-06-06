import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Single shared Supabase client for the whole app.
// Both values are browser-safe: the anon key is designed to be public and
// Row-Level Security (see supabase/migrations) is what actually protects data.
//
// If the env vars are missing we export `null` instead of throwing, so the app
// still boots in pilot mode (AI/auth simply fall back to local behavior). Copy
// .env.example to .env.local to switch the real backend on. See BACKEND_SETUP.md §2a.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;
