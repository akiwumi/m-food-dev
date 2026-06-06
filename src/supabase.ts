import { createClient } from "@supabase/supabase-js";

// Single shared Supabase client for the whole app.
// Both values are browser-safe: the anon key is designed to be public and
// Row-Level Security (see supabase/migrations) is what actually protects data.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in dev so a missing .env.local isn't a silent mystery.
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill them in (see BACKEND_SETUP.md §2a).",
  );
}

export const supabase = createClient(url, anonKey);
