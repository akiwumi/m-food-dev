import { useEffect, useMemo, useState } from "react";
import { useStoredState } from "../store";
import { getConsents } from "../governance";
import { fetchRatingHistory, deriveCuisineSignal, deriveMoodCuisineSignal, suppressSignal } from "../behavioral";
import type { CuisineSignal, MoodCuisineSignal, LearnedSignals } from "../recommendation";
import type { DiaryEntry, Entry, Page } from "../appTypes";

// Owns the opt-in, consent-gated learning surface (Slices 1-3): AI-curation and
// learned-signal toggles, the mirrored server consent, and the derived cuisine /
// mood signals. entry/page/diary come from the app and drive the two effects.
export function useLearningSignals(entry: Entry, page: Page, diary: DiaryEntry[]) {
  const [aiCuration, setAiCuration] = useStoredState<boolean>("moodfood-ai-curation", false);
  const [learnedSignals, setLearnedSignals] = useStoredState<boolean>("moodfood-learned-signals", false);
  const [behavioralConsent, setBehavioralConsent] = useState(false);
  const [cuisineSignal, setCuisineSignal] = useState<CuisineSignal | null>(null);
  const [moodSignal, setMoodSignal] = useState<MoodCuisineSignal | null>(null);
  const [suppressedCuisines, setSuppressedCuisines] = useStoredState<string[]>("moodfood-suppressed-cuisines", []);

  // The learned boost is applied to ranking ONLY when the toggle is on; the signal
  // stays visible (Taste memory) either way. Memoized (H3) so ranking consumers
  // keep a stable reference across renders.
  const appliedSignals: LearnedSignals | undefined = useMemo(
    () => learnedSignals && (cuisineSignal || moodSignal)
      ? { cuisine: cuisineSignal ?? undefined, moodCuisine: moodSignal ?? undefined }
      : undefined,
    [learnedSignals, cuisineSignal, moodSignal],
  );

  // Slice 2: mirror the server consent so we never record or apply learning without
  // it, and (when learning is on + consented) derive the cuisine signal from the
  // user's own validated ratings.
  useEffect(() => {
    if (entry !== "app") return;
    let cancelled = false;
    void getConsents().then(c => { if (!cancelled) setBehavioralConsent(c.behavioral_learning); });
    return () => { cancelled = true; };
  }, [entry, page]);
  // Derive the signal whenever the user has consented — so they can SEE what we've
  // learned (Slice 3) independently of whether the ranking boost is switched on.
  // Suppressed cuisines (an explicit "forget") are removed from the signal.
  useEffect(() => {
    if (entry !== "app" || !behavioralConsent) { setCuisineSignal(null); setMoodSignal(null); return; }
    let cancelled = false;
    void fetchRatingHistory().then(h => {
      if (cancelled) return;
      setCuisineSignal(suppressSignal(deriveCuisineSignal(h), suppressedCuisines));
      // Mood-pattern signal, with the same "forget" list applied to each mood's list.
      const ms = deriveMoodCuisineSignal(h);
      const drop = new Set(suppressedCuisines);
      const byMood: Record<string, string[]> = {};
      for (const [m, cs] of Object.entries(ms.byMood)) { const kept = cs.filter(c => !drop.has(c)); if (kept.length) byMood[m] = kept; }
      setMoodSignal({ ...ms, byMood });
    });
    return () => { cancelled = true; };
  }, [entry, behavioralConsent, suppressedCuisines, diary]);

  return { aiCuration, setAiCuration, learnedSignals, setLearnedSignals, behavioralConsent, cuisineSignal, moodSignal, suppressedCuisines, setSuppressedCuisines, appliedSignals };
}
