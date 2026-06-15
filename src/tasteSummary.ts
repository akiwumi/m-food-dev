import { supabase } from "./supabase";
import type { CuisineSignal, MoodCuisineSignal } from "./recommendation";

// Slice 5 (roadmap v3): AI summaries — language where it adds value, never in the
// search or safety path. The canonical taste profile stays the DETERMINISTIC signal
// (cuisine + mood patterns). AI only rephrases the facts already derived; it never
// invents preferences or overwrites the signal. There is always a deterministic
// fallback string, so AI failure degrades to plain copy, never to nothing.

function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// The always-available, deterministic summary. Pure and explainable: every phrase
// traces directly to the signal it was given. This is also the fallback copy.
export function deterministicTasteSummary(signal: CuisineSignal | null, moodSignal: MoodCuisineSignal | null): string {
  const cuisines = signal?.preferred.slice(0, 3) ?? [];
  const moods = Object.entries(moodSignal?.byMood ?? {}).slice(0, 2).map(([m, cs]) => `${cs[0]} when you’re ${m.toLowerCase()}`);
  if (!cuisines.length && !moods.length) {
    return "Not enough cooking history yet to spot your patterns — cook and rate a few meals and they’ll show up here.";
  }
  const parts: string[] = [];
  if (cuisines.length) parts.push(`You reach for ${listJoin(cuisines)} when you cook.`);
  if (moods.length) parts.push(`You tend toward ${listJoin(moods)}.`);
  return parts.join(" ");
}

export type TasteSummary = { summary: string; source: "ai" | "fallback" };

// Fetch an AI-rephrased summary on explicit request. Always resolves — on any
// failure (no backend, no session, AI down, invalid response) it returns the
// deterministic copy. Never call this on the search path.
export async function fetchTasteSummary(signal: CuisineSignal | null, moodSignal: MoodCuisineSignal | null): Promise<TasteSummary> {
  const fallback: TasteSummary = { summary: deterministicTasteSummary(signal, moodSignal), source: "fallback" };
  if (!supabase || !signal) return fallback;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return fallback;
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/taste-summary`, {
      method: "POST",
      headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
      body: JSON.stringify({
        cuisine: { preferred: signal.preferred, support: signal.support },
        moodCuisine: { byMood: moodSignal?.byMood ?? {} },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    if (typeof data?.summary === "string" && data.summary.trim()) {
      return { summary: data.summary.trim(), source: data.source === "ai" ? "ai" : "fallback" };
    }
    return fallback;
  } catch {
    return fallback;
  }
}
