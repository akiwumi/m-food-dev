import { useCallback, useRef, useState } from "react";
import { finalizeSearchResults } from "../searchResults";
import { appendUniqueRecipes, RESULT_BATCH_SIZE, takeUniqueBatch } from "../resultBatches";
import { trackSearch } from "../telemetry";
import { RANKING_CONFIG_VERSION } from "../recommendation";
import { fetchCuratedRecipes, buildFoodHistory } from "../recipes";
import type { Recipe } from "../data";
import type { Profile } from "../store";
import type { SearchRequest, Page } from "../appTypes";

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
  const activeSearchId = useRef(0);
  const activeSearchAbort = useRef<AbortController | null>(null);

  const runSearch = async (request: SearchRequest, nextPage = false) => {
    // Each provider page contains 20 recipes while the UI reveals five at a
    // time. Use the buffered candidates first; fetch the next provider page only
    // after all 20 have been shown.
    if (nextPage) {
      const bufferedResults = appendUniqueRecipes(searchResults, searchCandidates, RESULT_BATCH_SIZE);
      if (bufferedResults.length > searchResults.length) {
        setSearchResults(bufferedResults);
        setPage("results");
        return;
      }
    }

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
    }
    setSearchLoading(true);
    setPage("results");
    window.scrollTo(0, 0);
    const startedAt = performance.now();
    try {
      // Explicit search honors the filters exactly — relax:false tells the backend
      // not to silently drop cuisine/course/time to force a result.
      const live = await fetchCuratedRecipes(sharedProfile, request.mood || mood, 50, request.filters.maxReadyTime ?? 60, request.query, request.filters, foodHistory, offset, false, false, controller.signal);
      if (!isActiveSearch()) return;
      const liveCandidates = finalizeSearchResults(live ?? [], sharedProfile, request.filters, Infinity);
      const strictCandidates = appendUniqueRecipes(
        nextPage ? searchCandidates : [],
        liveCandidates,
        Infinity,
      );
      const candidates = strictCandidates;
      const nextResults = nextPage
        ? appendUniqueRecipes(searchResults, candidates, RESULT_BATCH_SIZE)
        : takeUniqueBatch(candidates);
      setSearchRelaxed(false);
      setSearchCandidates(candidates);
      setSearchResults(nextResults);
      // Slice 0 telemetry: operational only, fire-and-forget (never awaited).
      trackSearch({
        mode: nextPage ? "load_more" : "search",
        durationMs: Math.round(performance.now() - startedAt),
        resultCount: nextResults.length,
        source: live?.length ? "spoonacular" : "none",
        aiAttempted: false,
        aiSucceeded: false,
        fallbackUsed: false,
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

  return { searchRequest, setSearchRequest, searchResults, searchLoading, searchRelaxed, runSearch, cancelSearch };
}
