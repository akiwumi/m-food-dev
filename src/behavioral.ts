import { supabase } from "./supabase";
import { LEARNED_SIGNAL_VERSION, type CuisineSignal, type MoodCuisineSignal } from "./recommendation";

// Slice 2 (roadmap v3): one measurable learning loop. The client records validated
// outcomes (ratings, runs) through the consent-gated `record-event` edge function,
// reads its own rating history back, and derives one deterministic learned signal
// (preferred cuisines). All functions no-op safely without a session.
//
// The canonical signal is computed deterministically from source ratings here —
// AI is not involved. Re-deriving from the same ratings always yields the same
// signal (a tested invariant), which is what makes the learning explainable.

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-event`;

async function token(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function post(body: unknown): Promise<boolean> {
  const t = await token();
  if (!t) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok; // server rejects (403) when behavioural_learning consent is absent
  } catch {
    return false;
  }
}

export type RatingInput = { providerRecipeId: string; title: string; cuisine: string; source?: string; rating: number; mood?: string };
export async function recordRating(r: RatingInput): Promise<boolean> {
  return post({
    id: crypto.randomUUID(),
    type: "recipe_rated",
    payload: { provider_recipe_id: r.providerRecipeId, title: r.title, cuisine: r.cuisine, source: r.source ?? "", rating: r.rating, mood: r.mood ?? "" },
  });
}

export type RunInput = { rankingConfigVersion: string; candidates: { id: string; title: string; cuisine: string }[]; mood?: string; energy?: number };
export async function recordRun(r: RunInput): Promise<boolean> {
  return post({
    id: crypto.randomUUID(),
    type: "recommendation_run",
    payload: { ranking_config_version: r.rankingConfigVersion, candidates: r.candidates.slice(0, 20), mood: r.mood ?? "", energy: r.energy ?? null },
  });
}

export type RatingObservation = { cuisine: string; rating: number; mood?: string; at?: string };

// Read the user's own rating history (RLS-scoped) for deriving signals.
export async function fetchRatingHistory(): Promise<RatingObservation[]> {
  if (!supabase) return [];
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from("diary_entries")
    .select("rating, outcome_json, created_at")
    .eq("user_id", session.user.id)
    .not("rating", "is", null);
  if (error || !data) return [];
  return (data as { rating: number; created_at?: string; outcome_json: { cuisine?: string; mood?: string } }[])
    .map(row => ({ cuisine: (row.outcome_json?.cuisine ?? "").trim(), rating: row.rating, mood: (row.outcome_json?.mood ?? "").trim() || undefined, at: row.created_at }))
    .filter(o => o.cuisine && o.rating > 0);
}

// Minimum number of ratings for a cuisine before we trust it as a preference, and
// the average rating bar it must clear. Conservative on purpose — a few ratings
// must never become a permanent verdict (roadmap principle #4).
export const MIN_SUPPORT = 3;
export const PREFERENCE_BAR = 4;
// Slice 4: recency decay. An observation's weight halves every HALF_LIFE_DAYS, so
// recent behaviour counts more and old behaviour fades rather than locking in.
// Observations without a timestamp weigh 1 (no decay) — keeps derivation stable.
export const HALF_LIFE_DAYS = 60;

function weight(at: string | undefined, now: number): number {
  if (!at) return 1;
  const ageDays = Math.max(0, (now - Date.parse(at)) / 86_400_000);
  return Number.isFinite(ageDays) ? Math.pow(0.5, ageDays / HALF_LIFE_DAYS) : 1;
}

// Per-cuisine, decay-weighted stats. `count` is the raw observation count (for an
// honest "N cooks" display); `weighted` and the weighted average drive the
// confidence decision so recent ratings carry more weight.
function cuisineStats(observations: RatingObservation[], now: number) {
  const stats: Record<string, { count: number; weighted: number; weightedRating: number }> = {};
  for (const o of observations) {
    const w = weight(o.at, now);
    const s = stats[o.cuisine] ?? (stats[o.cuisine] = { count: 0, weighted: 0, weightedRating: 0 });
    s.count += 1;
    s.weighted += w;
    s.weightedRating += w * o.rating;
  }
  return stats;
}

function preferredFromStats(stats: ReturnType<typeof cuisineStats>) {
  const preferred: string[] = [];
  const support: Record<string, number> = {};
  for (const cuisine of Object.keys(stats)) {
    const s = stats[cuisine];
    const avg = s.weighted > 0 ? s.weightedRating / s.weighted : 0;
    if (s.weighted >= MIN_SUPPORT && avg >= PREFERENCE_BAR) {
      preferred.push(cuisine);
      support[cuisine] = s.count;
    }
  }
  preferred.sort((a, b) => support[b] - support[a] || a.localeCompare(b));
  return { preferred, support };
}

// Deterministic derivation: cuisines with enough recent, highly-rated observations
// become "preferred". Pure and order-independent — the same observations always
// produce the same signal (decay aside, which is a pure function of time).
export function deriveCuisineSignal(observations: RatingObservation[], now: number = Date.now()): CuisineSignal {
  return { ...preferredFromStats(cuisineStats(observations, now)), derivationVersion: LEARNED_SIGNAL_VERSION };
}

// Slice 4: mood→cuisine patterns. For each mood, which cuisines the user rates
// highly *in that mood*. Same confidence bar, computed per mood.
export function deriveMoodCuisineSignal(observations: RatingObservation[], now: number = Date.now()): MoodCuisineSignal {
  const byMoodObs: Record<string, RatingObservation[]> = {};
  for (const o of observations) {
    if (!o.mood) continue;
    (byMoodObs[o.mood] ?? (byMoodObs[o.mood] = [])).push(o);
  }
  const byMood: Record<string, string[]> = {};
  for (const mood of Object.keys(byMoodObs)) {
    const { preferred } = preferredFromStats(cuisineStats(byMoodObs[mood], now));
    if (preferred.length) byMood[mood] = preferred;
  }
  return { byMood, derivationVersion: LEARNED_SIGNAL_VERSION };
}

// Slice 3: apply the user's explicit "forget" list. Removing a cuisine here is an
// explicit correction and always wins over the inferred signal.
export function suppressSignal(signal: CuisineSignal, suppressed: string[]): CuisineSignal {
  const drop = new Set(suppressed);
  const preferred = signal.preferred.filter(c => !drop.has(c));
  const support: Record<string, number> = {};
  for (const c of preferred) support[c] = signal.support[c];
  return { ...signal, preferred, support };
}
