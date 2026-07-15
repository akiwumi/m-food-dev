import { useCallback, useRef, useState } from "react";
import { bundledRecipes } from "../bundledRecipes";
import { finalizeSearchResults } from "../searchResults";
import { appendUniqueRecipes, RESULT_BATCH_SIZE, takeUniqueBatch } from "../resultBatches";
import { trackSearch } from "../telemetry";
import { RANKING_CONFIG_VERSION } from "../recommendation";
import { fetchCuratedRecipes, buildFoodHistory, recipeProfilePayload } from "../recipes";
import { callFn } from "../api/backend";
import type { Recipe } from "../data";
import type { Profile } from "../store";
import type { SearchRequest, Page } from "../appTypes";

type MoodySearchReply = { message?: string; recipeId?: string; recipe?: Recipe | null; recipes?: Recipe[]; error?: string };

// Structured recipe search: request/results state, the abort-disciplined search
// runner (H5 — runSearch stays a plain per-render function so pagination reads
// the current render's closures), and the cancel that go() calls on navigation.
export function useRecipeSearch(
  sharedProfile: Profile,
  mood: string,
  foodHistory: ReturnType<typeof buildFoodHistory>,
  setPage: (p: Page) => void,
) {
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null);
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searchCandidates, setSearchCandidates] = useState<Recipe[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchRelaxed, setSearchRelaxed] = useState(false);
  // Backend served backup results (owned cache / TheMealDB) because live
  // Spoonacular was unavailable — usually the daily quota. Drives a distinct note.
  const [searchDegraded, setSearchDegraded] = useState(false);
  const activeSearchId = useRef(0);
  const activeSearchAbort = useRef<AbortController | null>(null);

  const runSearch = async (request: SearchRequest, nextPage = false) => {
    activeSearchAbort.current?.abort();
    const searchId = activeSearchId.current + 1;
    activeSearchId.current = searchId;
    const controller = new AbortController();
    activeSearchAbort.current = controller;
    const isActiveSearch = () => activeSearchId.current === searchId && !controller.signal.aborted;
    const offset = nextPage ? searchOffset + 20 : 0;
    setSearchRequest(request);
    setSearchOffset(offset);
    if (!nextPage) {
      setSearchResults([]);
      setSearchCandidates([]);
      setSearchRelaxed(false);
      setSearchDegraded(false);
    }
    setSearchLoading(true);
    setPage("results");
    window.scrollTo(0, 0);
    const startedAt = performance.now();
    try {
      // Show bundled matches immediately so the user sees results while the live
      // search is in flight. The spinner only appears when there are zero local
      // matches (niche queries). Live results arrive later and are ranked first.
      const offlineCandidates = finalizeSearchResults(bundledRecipes, sharedProfile, request.filters, Infinity);
      if (!nextPage && offlineCandidates.length) {
        setSearchCandidates(offlineCandidates);
        setSearchResults(takeUniqueBatch(offlineCandidates));
      }

      if (!nextPage && request.routedBy === "moody" && request.query.trim()) {
        try {
          const reply = await callFn<MoodySearchReply>("ai-gateway", {
            task: "chat",
            message: request.query,
            context: {
              profile: recipeProfilePayload(sharedProfile),
              candidates: offlineCandidates.slice(0, 30).map(r => ({ id: r.id, title: r.title, cuisine: r.cuisine, time: r.time, ingredients: r.ingredients })),
            },
          });
          if (!isActiveSearch()) return;
          const single = reply.recipe ?? (reply.recipeId ? offlineCandidates.find(r => r.id === reply.recipeId) ?? null : null);
          const moodyPicks = reply.recipes?.length ? reply.recipes : (single ? [single] : []);
          if (moodyPicks.length) {
            const candidates = appendUniqueRecipes(moodyPicks, offlineCandidates, Infinity);
            const nextResults = takeUniqueBatch(candidates);
            setSearchCandidates(candidates);
            setSearchResults(nextResults);
            trackSearch({
              mode: "search",
              durationMs: Math.round(performance.now() - startedAt),
              resultCount: nextResults.length,
              source: reply.recipe ? "spoonacular" : "local",
              aiAttempted: true,
              aiSucceeded: true,
              fallbackUsed: false,
              rankingConfigVersion: RANKING_CONFIG_VERSION,
              hasQuery: true,
              filterCount: 0,
            });
            return;
          }
        } catch {
          // Backend/auth unavailable: fall through to the existing deterministic search.
        }
      }

      // Explicit search honors the filters exactly — relax:false tells the backend
      // not to silently drop cuisine/course/time to force a result.
      const liveMeta: { degraded?: boolean } = {};
      const live = await fetchCuratedRecipes(sharedProfile, mood, 50, request.filters.maxReadyTime ?? 60, request.query, request.filters, foodHistory, offset, false, false, controller.signal, liveMeta);
      if (!isActiveSearch()) return;
      const liveCandidates = finalizeSearchResults(live ?? [], sharedProfile, request.filters, Infinity);
      const strictCandidates = appendUniqueRecipes(
        nextPage ? searchCandidates : [],
        [...liveCandidates, ...offlineCandidates],
        Infinity,
      );
      // When every strict filter combined yields nothing, fall back to a
      // diet-only pass over the bundled catalog so the user always sees
      // something (diet is the only safety-critical filter, so it's kept).
      const relaxedFallback = !nextPage && !strictCandidates.length
        ? finalizeSearchResults(bundledRecipes, sharedProfile, { diet: request.filters.diet }, Infinity)
        : [];
      const candidates = strictCandidates.length ? strictCandidates : relaxedFallback;
      const isRelaxed = relaxedFallback.length > 0 && !strictCandidates.length;
      const nextResults = nextPage
        ? appendUniqueRecipes(searchResults, candidates, RESULT_BATCH_SIZE)
        : takeUniqueBatch(candidates);
      const fallbackUsed = !liveCandidates.length && (offlineCandidates.length > 0 || relaxedFallback.length > 0);
      setSearchRelaxed(isRelaxed);
      // Backend backup results (quota-out) that DID come through — flag them so the
      // user knows these are stand-ins, distinct from the client's diet-only relax.
      setSearchDegraded(!isRelaxed && !!liveMeta.degraded && (live?.length ?? 0) > 0);
      setSearchCandidates(candidates);
      setSearchResults(nextResults);
      // Slice 0 telemetry: operational only, fire-and-forget (never awaited).
      trackSearch({
        mode: nextPage ? "load_more" : "search",
        durationMs: Math.round(performance.now() - startedAt),
        resultCount: nextResults.length,
        source: live?.length ? "spoonacular" : fallbackUsed && nextResults.length ? "local" : "none",
        aiAttempted: false,
        aiSucceeded: false,
        fallbackUsed,
        rankingConfigVersion: RANKING_CONFIG_VERSION,
        hasQuery: !!request.query,
        filterCount: Object.values(request.filters).filter(v => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)).length,
      });
    } finally {
      if (activeSearchId.current === searchId) {
        activeSearchAbort.current = null;
        setSearchLoading(false);
      }
    }
  };

  const cancelSearch = useCallback(() => {
    activeSearchAbort.current?.abort();
    activeSearchAbort.current = null;
    activeSearchId.current += 1;
    setSearchLoading(false);
  }, []);

  return { searchRequest, setSearchRequest, searchResults, searchLoading, searchRelaxed, searchDegraded, runSearch, cancelSearch };
}
