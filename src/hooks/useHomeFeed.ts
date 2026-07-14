import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { bundledRecipes } from "../bundledRecipes";
import { recommend, RANKING_CONFIG_VERSION, type LearnedSignals } from "../recommendation";
import { finalizeSearchResults } from "../searchResults";
import { fetchCuratedRecipes, buildFoodHistory } from "../recipes";
import { trackSearch } from "../telemetry";
import { recordRun } from "../behavioral";
import type { Recipe } from "../data";
import type { Profile } from "../store";
import type { Entry } from "../appTypes";

// The mood check-in → curated-fetch pipeline: the check-in inputs, the fetched
// candidate state, the deterministic ranking memos, the fetch effect, and
// "show more". Extracted verbatim (roadmap Hook F). The fetch effect's dep array
// is copied byte-for-byte — it intentionally omits foodHistory / behavioralConsent
// / localFallback (H4); "fixing" it re-fires on every diary/save change and
// recreates the 502 fetch-loop the profile memo (H2) guards against.
export function useHomeFeed(
  entry: Entry,
  sharedProfile: Profile,
  foodHistory: ReturnType<typeof buildFoodHistory>,
  appliedSignals: LearnedSignals | undefined,
  aiCuration: boolean,
  behavioralConsent: boolean,
  setCatalog: Dispatch<SetStateAction<Recipe[]>>,
) {
  const [mood, setMood] = useState("Tired");
  const [energy, setEnergy] = useState(45);
  const [time, setTime] = useState(30);
  const [mealCategory, setMealCategory] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [homeDiet, setHomeDiet] = useState("Any");
  const [results, setResults] = useState(false);
  const [aiRanked, setAiRanked] = useState<Recipe[] | null>(null);
  const [liveSet, setLiveSet] = useState<Recipe[] | null>(null);
  const [curating, setCurating] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [moreOffset, setMoreOffset] = useState(0);
  const [recipeNonce, setRecipeNonce] = useState(0); // bump to force a re-fetch (Retry)

  const ACCESSORY_TYPES = useMemo(() => new Set(["dessert", "desserts", "snack", "snacks", "drink", "drinks", "beverage", "beverages", "sweet", "sweets"]), []);
  // Ranks any candidate pool for the current check-in: applies the home filters as
  // hard constraints + client safety, mood-ranks what remains, and relaxes the time
  // cap if the strict pass is empty. Shared by the bundled fallback and the live
  // (uncurated) provider set so both honor exactly the same hard constraints.
  const rankForCheckin = useCallback((pool: Recipe[]) => {
    const filters = {
      cuisines: cuisine ? [cuisine] : undefined,
      type: mealCategory || undefined,
      diet: homeDiet !== "Any" ? homeDiet : undefined,
    };
    const filtered = finalizeSearchResults(pool, sharedProfile, filters, 999);
    const strict = recommend(filtered, sharedProfile, mood, energy, time, appliedSignals).map(item => item.recipe);
    return strict.length ? strict : recommend(filtered, sharedProfile, mood, energy, 999, appliedSignals).map(item => item.recipe);
  }, [sharedProfile, mood, energy, time, cuisine, mealCategory, homeDiet, appliedSignals]);

  const localFallback = useMemo(() => rankForCheckin(bundledRecipes), [rankForCheckin]);
  // Deterministic ranking of the live, uncurated provider candidates (Slice-1
  // default). Null until a live fetch lands.
  const deterministicLive = useMemo(
    () => (liveSet?.length ? rankForCheckin(liveSet) : null),
    [liveSet, rankForCheckin],
  );

  const ranked = useMemo(() => {
    // Order of preference: AI-curated (opt-in) → deterministic ranking of live
    // provider recipes → deterministic ranking of the bundled offline catalog.
    const base = aiRanked ?? deterministicLive ?? localFallback;
    if (mealCategory) return base;
    return base.filter(r => {
      const types = (r.mealTypes ?? []).map((t: string) => t.toLowerCase());
      return !types.length || !types.every((t: string) => ACCESSORY_TYPES.has(t));
    });
  }, [aiRanked, deterministicLive, localFallback, mealCategory, ACCESSORY_TYPES]);

  // When the user asks for recommendations, fetch real recipes (deterministic by
  // default; AI-curated only when opted in).
  useEffect(() => {
    if (entry !== "app" || !results) return;
    let cancelled = false;
    setCurating(true);
    setAiRanked(null); // clear stale results immediately so loading state shows
    setLiveSet(null);
    setMoreOffset(0);
    const startedAt = performance.now();
    void fetchCuratedRecipes(sharedProfile, mood, energy, time, "", { type: mealCategory || undefined, cuisines: cuisine ? [cuisine] : undefined, diet: homeDiet !== "Any" ? homeDiet : undefined }, foodHistory, 0, true, aiCuration)
      .then(list => {
        if (cancelled) return;
        if (list?.length) {
          setCatalog(prev => { const ids = new Set(list.map(r => r.id)); return [...list, ...prev.filter(r => !ids.has(r.id))]; });
          // Trust the AI order only when curation was actually requested; otherwise
          // rank the real candidates deterministically (the Slice-1 default).
          if (aiCuration) setAiRanked(list); else setLiveSet(list);
          // Slice 2: record the run (candidates + ranking version) so later outcomes
          // can be tied back to it. Consent-gated, best-effort, never awaited.
          if (behavioralConsent) void recordRun({ rankingConfigVersion: RANKING_CONFIG_VERSION, candidates: list.map(r => ({ id: r.id, title: r.title, cuisine: r.cuisine })), mood, energy });
        } else {
          setAiRanked(null); setLiveSet(null); // not signed in / configured → bundled ranking
        }
        // Telemetry: home check-in is a search. On the local-fallback path the user
        // sees `localFallback`, so report its size as the result count.
        trackSearch({
          mode: "home",
          durationMs: Math.round(performance.now() - startedAt),
          resultCount: list?.length ? list.length : localFallback.length,
          source: list?.length ? "spoonacular" : localFallback.length ? "local" : "none",
          aiAttempted: aiCuration,
          aiSucceeded: aiCuration && !!list?.length,
          fallbackUsed: !list?.length,
          rankingConfigVersion: RANKING_CONFIG_VERSION,
        });
      })
      .finally(() => { if (!cancelled) { setCurating(false); setHasFetched(true); } });
    return () => { cancelled = true; };
  }, [results, mood, energy, time, sharedProfile, entry, recipeNonce, mealCategory, cuisine, homeDiet, aiCuration]);

  // "Show me 5 more", fetch a fresh page (next offset) and append. Falls back to
  // simply revealing more of the local ranking when the backend isn't available.
  const loadMore = async () => {
    setCurating(true);
    const nextOffset = moreOffset + 20;
    setMoreOffset(nextOffset);
    const startedAt = performance.now();
    try {
      const list = await fetchCuratedRecipes(sharedProfile, mood, energy, time, "", { type: mealCategory || undefined, cuisines: cuisine ? [cuisine] : undefined, diet: homeDiet !== "Any" ? homeDiet : undefined }, foodHistory, nextOffset, true, aiCuration);
      if (list?.length) {
        setCatalog(prev => { const ids = new Set(prev.map(r => r.id)); return [...prev, ...list.filter(r => !ids.has(r.id))]; });
        // Append to whichever ranking path is active so "show more" extends the
        // same list the user is looking at (AI-curated vs deterministic-live).
        const append = (prev: Recipe[] | null) => { const seen = new Set((prev ?? []).map(r => r.id)); return [...(prev ?? []), ...list.filter(r => !seen.has(r.id))]; };
        if (aiCuration) setAiRanked(append); else setLiveSet(append);
      }
      trackSearch({
        mode: "load_more",
        durationMs: Math.round(performance.now() - startedAt),
        resultCount: list?.length ?? 0,
        source: list?.length ? "spoonacular" : "none",
        aiAttempted: aiCuration,
        aiSucceeded: aiCuration && !!list?.length,
        fallbackUsed: false,
        rankingConfigVersion: RANKING_CONFIG_VERSION,
      });
    } finally {
      setCurating(false);
    }
  };

  // The home check-in "Choose" resets the feed to a fresh loading state, then
  // flips `results` on to trigger the fetch effect. Caller pairs this with
  // clearing any search request and navigating to the results route.
  const beginResults = () => {
    setCurating(true);
    setAiRanked(null);
    setHasFetched(false);
    setResults(true);
  };
  const retry = () => setRecipeNonce(n => n + 1);

  return {
    mood, setMood, energy, setEnergy, time, setTime,
    mealCategory, setMealCategory, cuisine, setCuisine, homeDiet, setHomeDiet,
    results, setResults, ranked, curating, hasFetched, loadMore,
    live: aiRanked !== null || deterministicLive !== null,
    curated: aiRanked !== null,
    beginResults, retry,
  };
}
