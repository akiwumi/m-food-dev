import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowRight, Check, ChefHat,
  Clock3, Play, RotateCcw, Search,
  Settings2, Sparkles, ShieldCheck, UserRound,
  Camera, Users,
  Globe2, Activity, Wheat, Droplets,
  FlameKindling,
} from "lucide-react";
import { moods, type Recipe } from "./data";
import { bundledRecipes } from "./bundledRecipes";
import { clearStored, defaultDiners, defaultProfile, useStoredState, type Diner, type Profile, type SocialPost } from "./store";
import { profileForDiners, recommend, safeRecipes as applySafety, RANKING_CONFIG_VERSION } from "./recommendation";
import { recordRating, recordRun } from "./behavioral";
import { compactPhotoLogs } from "./security";
import { SPOON_CUISINES, MEAL_TYPES, SEARCH_DIETS, SORT_OPTIONS, type RecipeFilters } from "./searchFilters";
import { sendConfirmationEmail, sendWelcomeEmail, unreadCount } from "./notifications";
import { sumNutrition, type FoodPhoto } from "./foodAnalysis";
import { persistFoodPhoto } from "./photoStorage";
import { fetchCuratedRecipes, buildFoodHistory } from "./recipes";
import {
  signOut as authSignOut,
  onAuthChange,
  isSupabaseConfigured,
} from "./auth";
import { supabase } from "./supabase";
import { finalizeSearchResults } from "./searchResults";
import { nextSavedRecipeIds } from "./savedRecipes";
import { trackSearch } from "./telemetry";
import { Landing } from "./Landing";
import { readDevTestState } from "./devTestState";
import { buildQuickStartProfilePatch } from "./activation";
import { appendUniqueRecipes, RESULT_BATCH_SIZE, takeUniqueBatch } from "./resultBatches";
import { moodSearchTags, type Mood } from "@/data/moodTags";
import { buildMoodSearchQuery, getMoodByValue } from "@/lib/moodSearch";
import { syncSubscriptionFromDB } from "./api/backend";
import { type DiaryEntry, type Entry, type Page, type SearchRequest } from "./appTypes";
import { MenuCtx } from "./components/MenuCtx";
import { usePullToRefresh } from "./hooks/usePullToRefresh";
import { useNotifications } from "./hooks/useNotifications";
import { useMoodyChat } from "./hooks/useMoodyChat";
import { useLearningSignals } from "./hooks/useLearningSignals";
import { useProfileSync, prefsForUpsert } from "./hooks/useProfileSync";
import { PullRefreshIndicator } from "./components/PullRefreshIndicator";
import { toggle } from "./lib/toggle";
import { deriveDailySuggestions } from "./lib/dailySuggestions";
import { FALLBACK_FOOD } from "./components/photos";
import { AppHeader, BottomNav, DesktopNav, TopBar } from "./components/AppChrome";
import { MainMenu } from "./components/MainMenu";
import { PickCard } from "./components/PickCard";
import { TokenInput } from "./components/TokenInput";
import { DailySuggestionCarousel } from "./components/DailySuggestionCarousel";
import { NotificationsPanel } from "./components/NotificationsPanel";
import { FoodCamera } from "./components/FoodCamera";
import { MoodyFab } from "./components/moody/MoodyFab";
import { GroceryScreen } from "./screens/GroceryScreen";
import { PantryScreen } from "./screens/PantryScreen";
import { PlannerScreen } from "./screens/PlannerScreen";
import { InsightsScreen } from "./screens/InsightsScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { ImportScreen } from "./screens/ImportScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { DinersScreen } from "./screens/DinersScreen";
import { HealthHub } from "./screens/health/HealthHub";
import { HealthDetail } from "./screens/health/HealthDetail";
import { FamilyHealth } from "./screens/health/FamilyHealth";
import { SettingsScreen } from "./screens/SettingsScreen";
import { DataPrivacyScreen } from "./screens/DataPrivacyScreen";
import { BillingScreen } from "./screens/BillingScreen";
import { AccountScreen } from "./screens/AccountScreen";
import { CommunityScreen } from "./screens/CommunityScreen";
import { SearchResultsScreen, EmptyResultsScreen } from "./screens/SearchResultsScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { CookScreen } from "./screens/CookScreen";
import { DiaryScreen } from "./screens/DiaryScreen";
import { FoodLogScreen } from "./screens/FoodLogScreen";
import { HelpScreen } from "./screens/HelpScreen";
import { MoodyPanel } from "./components/moody/MoodyPanel";
import { PsychProfileScreen } from "./screens/profile/PsychProfileScreen";
import { FoodProfileScreen } from "./screens/profile/FoodProfileScreen";
import { QuickTasteStartScreen } from "./screens/entry/QuickTasteStartScreen";
import { FirstPickScreen } from "./screens/entry/FirstPickScreen";
import { AccountSetupScreen } from "./screens/entry/AccountSetupScreen";
import { VerifyEmailScreen } from "./screens/entry/VerifyEmailScreen";
import { LoginScreen } from "./screens/entry/LoginScreen";
import { VerifiedScreen } from "./screens/entry/VerifiedScreen";
import { SubscriptionScreen } from "./screens/entry/SubscriptionScreen";
import { Onboarding } from "./screens/onboarding/Onboarding";

// The subscriptions table can hold statuses the client union doesn't model —
// stripe-webhook's mapStatus() also writes "past_due" (and future Stripe
// statuses may map to new values). Validate instead of casting.
const CLIENT_SUB_STATUSES = ["none", "trialing", "active", "canceled"] as const satisfies
  readonly Profile["subscriptionStatus"][];

function parseSubscriptionStatus(raw: unknown): Profile["subscriptionStatus"] {
  if (typeof raw === "string" && (CLIENT_SUB_STATUSES as readonly string[]).includes(raw)) {
    return raw as Profile["subscriptionStatus"];
  }
  // "past_due" = Stripe is retrying payment; access continues, so treat as active.
  if (raw === "past_due") return "active";
  // Unknown/new status: this parser runs right after a successful checkout, so
  // mirror the caller's own no-row-yet fallback ("trialing") rather than "none",
  // which would lock a paying user out.
  return "trialing";
}


export default function App() {
  const pullY = usePullToRefresh();
  const testState = readDevTestState(window.location.search, import.meta.env.DEV);
  const [splash, setSplash] = useState(true);
  const [entry, setEntry] = useStoredState<Entry>("moodfood-entry", "welcome");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const { storedProfile, setProfile, profile, cancelAccount } = useProfileSync();
  useEffect(() => { window.scrollTo(0, 0); }, [entry]);
  useEffect(() => onAuthChange((event) => {
    if (event !== "PASSWORD_RECOVERY") return;
    setSplash(false);
    setPasswordRecovery(true);
    setEntry("login");
  }), [setEntry]);
  const [page, setPage] = useState<Page>("home");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [detailReturnPage, setDetailReturnPage] = useState<Page>("results");
  const [mood, setMood] = useState("Tired");
  const [energy, setEnergy] = useState(45);
  const [time, setTime] = useState(30);
  const [quickMood, setQuickMood] = useState("Tired");
  const [quickEnergy, setQuickEnergy] = useState(25);
  const [quickTime, setQuickTime] = useState(30);
  const [mealCategory, setMealCategory] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [homeDiet, setHomeDiet] = useState("Any");
  const [results, setResults] = useState(false);
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null);
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searchCandidates, setSearchCandidates] = useState<Recipe[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchRelaxed, setSearchRelaxed] = useState(false);
  const activeSearchId = useRef(0);
  const activeSearchAbort = useRef<AbortController | null>(null);
  const [moodyOpen, setMoodyOpen] = useState(false);
  const [detailReturnMoody, setDetailReturnMoody] = useState(false);
  const [pendingShare, setPendingShare] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useStoredState<string[]>("moodfood-saved", []);
  const [diary, setDiary] = useStoredState("moodfood-diary", [] as { recipe: Recipe; rating: number; when: string }[]);
  const [groceries, setGroceries] = useStoredState("moodfood-groceries", [] as string[]);
  const [posts, setPosts] = useStoredState<SocialPost[]>("moodfood-posts", []);
  const [connections, setConnections] = useStoredState<string[]>("moodfood-connections", []);
  const [diners, setDiners] = useStoredState<Diner[]>("moodfood-diners", defaultDiners);
  const [selectedDiners, setSelectedDiners] = useState<string[]>(["self"]);
  const [eaterCount, setEaterCount] = useStoredState<number>("moodfood-eater-count", 1);
  const { aiCuration, setAiCuration, learnedSignals, setLearnedSignals, behavioralConsent, cuisineSignal, moodSignal, suppressedCuisines, setSuppressedCuisines, appliedSignals } = useLearningSignals(entry, page, diary);
  const sharedProfile = useMemo(() => profileForDiners(profile, diners.filter(d => selectedDiners.includes(d.id) && d.id !== "self")), [profile, diners, selectedDiners]);

  // Browser automation cannot use javascript: URLs to mutate localStorage.
  // Development-only test states provide explicit, repeatable access instead.
  useEffect(() => {
    if (!testState) return;
    setSplash(false);
    if (testState === "home") {
      setProfile(prev => ({ ...prev, name: prev.name || "Test Cook", email: prev.email || "test@example.com", onboarded: true, accountCreated: true }));
      setEntry("app");
    } else if (testState === "quick-start") {
      setEntry("quick-start");
    } else if (testState === "first-pick") {
      setProfile(prev => ({
        ...prev,
        diet: "Vegetarian",
        allergies: [],
        quickStartCompleted: true,
        quickStartSafetyConfirmed: true,
        path: "quick",
      }));
      setEntry("first-pick");
    } else if (testState === "activation-paywall") {
      setProfile(prev => ({
        ...prev,
        diet: "Vegetarian",
        allergies: [],
        quickStartCompleted: true,
        quickStartSafetyConfirmed: true,
        firstPickViewed: true,
        path: "quick",
      }));
      setEntry("subscription");
    } else {
      setEntry("account");
    }
  }, [testState, setEntry, setProfile]);
  // catalog = bundled recipes plus any fetched from the AI-curated recipes API.
  // aiRanked = the API's curated order when available; null falls back to local ranking.
  // Seeded with the offline catalog so the app always has real recipes to rank,
  // even before (or without) a live fetch.
  const [catalog, setCatalog] = useState<Recipe[]>(bundledRecipes);
  // aiRanked = the order returned by AI curation (only when the user opts into it).
  // liveSet = real provider candidates fetched WITHOUT AI curation, to be ranked
  // deterministically on the client (the Slice-1 default). Kept separate so the
  // deterministic path never silently displays raw provider order as if curated.
  const [aiRanked, setAiRanked] = useState<Recipe[] | null>(null);
  const [liveSet, setLiveSet] = useState<Recipe[] | null>(null);
  const [curating, setCurating] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [moreOffset, setMoreOffset] = useState(0);
  const [recipeNonce, setRecipeNonce] = useState(0); // bump to force a re-fetch (Retry)
  const safeRecipes = useMemo(() => applySafety(catalog, sharedProfile), [catalog, sharedProfile]);
  const ACCESSORY_TYPES = useMemo(() => new Set(["dessert", "desserts", "snack", "snacks", "drink", "drinks", "beverage", "beverages", "sweet", "sweets"]), []);
  // Offline fallback: rank the bundled catalog for this profile when a live fetch
  // fails/empties. Honors the home check-in's cuisine / course / diet selections
  // as hard filters (so offline picks match what the user asked for), then
  // mood-ranks what remains — relaxing the time cap if the strict pass is empty.
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

  // What the user has actually cooked, logged, and saved, so the AI learns from
  // behaviour, not just the stated profile. Recomputed as those change.
  const foodHistory = useMemo(
    () => buildFoodHistory(diary, profile.photoLogs, catalog.filter(r => saved.includes(r.id))),
    [diary, profile.photoLogs, saved, catalog],
  );
  const { moodyTurns, setMoodyTurns, loadMoodyCatalog } = useMoodyChat(catalog, setCatalog, foodHistory, mood, sharedProfile);

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

      // Explicit search honors the filters exactly — relax:false tells the backend
      // not to silently drop cuisine/course/time to force a result.
      const live = await fetchCuratedRecipes(sharedProfile, mood, 50, request.filters.maxReadyTime ?? 60, request.query, request.filters, foodHistory, offset, false, false, controller.signal);
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
      const results = nextPage
        ? appendUniqueRecipes(searchResults, candidates, RESULT_BATCH_SIZE)
        : takeUniqueBatch(candidates);
      const fallbackUsed = !liveCandidates.length && (offlineCandidates.length > 0 || relaxedFallback.length > 0);
      setSearchRelaxed(isRelaxed);
      setSearchCandidates(candidates);
      setSearchResults(results);
      // Slice 0 telemetry: operational only, fire-and-forget (never awaited).
      trackSearch({
        mode: nextPage ? "load_more" : "search",
        durationMs: Math.round(performance.now() - startedAt),
        resultCount: results.length,
        source: live?.length ? "spoonacular" : fallbackUsed && results.length ? "local" : "none",
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
    const nextOffset = moreOffset + 10;
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

  const { notifOpen, setNotifOpen, openNotifs, refreshNotifs } = useNotifications(setProfile);
  const [menuOpen, setMenuOpen] = useState(false);
  // One-time repair: older builds stored full-resolution photos (up to ~5.3 MB of
  // base64 each) in photoLogs, which can exhaust the ~5 MB localStorage quota
  // (writeStored swallows the failure). Recompress oversized entries in place and
  // blank images past a total budget — newest photos keep theirs, nutrition data
  // is always kept. compactPhotoLogs returns null when there is nothing to do,
  // so this is a cheap length-scan no-op on healthy profiles.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const compacted = await compactPhotoLogs(profile.photoLogs);
      if (!cancelled && compacted) setProfile(p => ({ ...p, photoLogs: compacted }));
    })();
    return () => { cancelled = true; };
    // Mount-only by design: repairs the profile as loaded from localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Real auth: keep the entry flow in sync with the session.
  //  • Sign out anywhere → back to welcome.
  //  • On sign-in, Supabase is the source of truth, restore preferences_json
  //    if it has a completed profile, otherwise push local data up.
  //  • Only route to onboarding for accounts created in the last 10 minutes
  //    (genuine new signups). Returning users whose data is missing (cleared
  //    browser, new device) go straight to the app, never re-onboard.
  useEffect(() => onAuthChange(async (event, session) => {
    if (testState) return;
    if (event === "SIGNED_OUT") { setEntry("welcome"); return; }
    if (!session) {
      setEntry(prev => prev === "app" ? "login" : prev);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from("profiles")
        .select("preferences_json")
        .eq("id", session.user.id)
        .maybeSingle();
      const prefs = data?.preferences_json as Record<string, unknown> | null;

      if (prefs && prefs.onboarded === true) {
        // Supabase has a completed profile, restore it (handles new-device login).
        // photoLogs never sync through preferences_json: drop any legacy remote
        // copy and keep whatever photos are already on this device.
        const { photoLogs: _remotePhotoLogs, ...remotePrefs } = prefs;
        const restored = { ...defaultProfile, ...remotePrefs, email: session.user.email ?? "" } as Profile;
        setProfile(prev => ({ ...restored, photoLogs: Array.isArray(prev.photoLogs) ? prev.photoLogs : [] }));
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
        return;
      }

      // Supabase profile is empty/incomplete. Check local storage first.
      if (storedProfile.onboarded) {
        // Local profile is complete: enter the app immediately (local data is
        // the source of truth on this branch), then push it up. The upsert must
        // be awaited — postgrest builders are lazy thenables and only issue the
        // HTTP request when then()/await is invoked.
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
        const { error } = await supabase.from("profiles").upsert({
          id: session.user.id,
          display_name: storedProfile.name,
          onboarded: true,
          preferences_json: prefsForUpsert(storedProfile),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        if (error) {
          // Non-fatal: the debounced profile-sync effect below retries on the
          // next profile change, and this handler re-runs on the next sign-in.
          console.error("[auth] failed to push local profile to Supabase:", error.message);
        }
        return;
      }

      // Neither Supabase nor localStorage has a completed profile.
      // Use account age: < 10 min = genuinely new signup → onboard.
      // Older accounts are returning users whose data is missing → skip re-onboarding.
      const accountAgeMs = Date.now() - new Date(session.user.created_at).getTime();
      if (accountAgeMs < 10 * 60 * 1000) {
        setProfile({ ...defaultProfile, email: session.user.email ?? "", accountCreated: true });
        setEntry("onboarding");
      } else {
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
      }
      return;
    }

    // Supabase not configured (pilot/local mode), use localStorage signal.
    if (storedProfile.onboarded && storedProfile.accountCreated) {
      setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
    }
  }), [storedProfile.onboarded, storedProfile.accountCreated, storedProfile, testState]);

  // Handle Stripe redirect back after Checkout (?checkout=success|canceled).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;
    // Clean the URL immediately so a refresh doesn't re-trigger.
    window.history.replaceState({}, "", window.location.pathname);
    if (checkout === "success") {
      // Poll the subscriptions table until the webhook has written the record.
      void syncSubscriptionFromDB().then(sub => {
        if (sub) {
          setProfile(p => ({ ...p, subscriptionStatus: parseSubscriptionStatus(sub.status), plan: sub.plan, trialEndsAt: sub.currentPeriodEnd }));
          setEntry("app");
        } else {
          // Webhook hasn't fired yet, optimistically mark as trialing and enter.
          setProfile(p => ({ ...p, subscriptionStatus: "trialing" }));
          setEntry("app");
        }
      });
    }
    // canceled: do nothing, stay on subscription screen
  }, []);

  const cancelSearch = useCallback(() => {
    activeSearchAbort.current?.abort();
    activeSearchAbort.current = null;
    activeSearchId.current += 1;
    setSearchLoading(false);
  }, []);

  const go = (next: Page) => {
    if (next !== "results") cancelSearch();
    setPage(next);
    window.scrollTo(0, 0);
  };
  const open = (recipe: Recipe) => {
    setCatalog(prev => prev.some(r => r.id === recipe.id) ? prev : [recipe, ...prev]);
    setDetailReturnMoody(false); setSelected(recipe); setDetailReturnPage(page); go("detail");
  };
  // Log a food photo: show it instantly (optimistic, inline data URL), then push
  // the binary to private Storage in the background and swap image→imagePath so it
  // stops riding in localStorage. Upload skipped/failed → the inline copy stays.
  const addPhoto = (p: FoodPhoto) => {
    setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }));
    void persistFoodPhoto(p).then(stored => {
      if (stored === p) return;
      setProfile(prev => ({ ...prev, photoLogs: prev.photoLogs.map(l => (l.id === stored.id ? stored : l)) }));
    });
  };
  const openFromMoody = (recipe: Recipe) => {
    setCatalog(prev => prev.some(r => r.id === recipe.id) ? prev : [recipe, ...prev]);
    setSelected(recipe);
    setDetailReturnPage(page);
    setDetailReturnMoody(true);
    setMoodyOpen(false);
    go("detail");
  };
  const toggleSavedRecipe = useCallback((recipe: Recipe) => {
    setCatalog(prev => prev.some(r => r.id === recipe.id) ? prev : [recipe, ...prev]);
    setSaved(current => nextSavedRecipeIds(current, recipe.id));
  }, [setSaved]);
  const backFromDetail = () => {
    go(detailReturnPage);
    if (detailReturnMoody) {
      setDetailReturnMoody(false);
      setMoodyOpen(true);
    }
  };
  // Share a recipe into the community feed: make sure it's in the catalog so the
  // post can link it, preselect it in the composer, and jump to Community.
  const shareRecipe = (recipe: Recipe) => {
    setCatalog(prev => prev.some(r => r.id === recipe.id) ? prev : [recipe, ...prev]);
    setPendingShare(recipe.id);
    go("community");
  };

  // The landing doubles as the splash: brand-new visitors (entry === "welcome")
  // begin onboarding from it; returning visitors mid-flow (splash still true)
  // resume whatever entry step they were on.
  if ((splash && entry !== "app") || entry === "welcome") {
    return <Landing
      begin={() => { setSplash(false); if (entry === "welcome") setEntry("quick-start"); }}
      signin={() => { setSplash(false); setEntry("login"); }}
    />;
  }
  if (entry === "login") return <LoginScreen back={() => { setPasswordRecovery(false); setEntry("welcome"); }} onSignedIn={() => setEntry("app")} recovery={passwordRecovery} doneRecovery={() => setPasswordRecovery(false)} />;
  if (entry === "quick-start") return (
    <QuickTasteStartScreen
      mood={quickMood}
      setMood={setQuickMood}
      energy={quickEnergy}
      setEnergy={setQuickEnergy}
      time={quickTime}
      setTime={setQuickTime}
      profile={profile}
      save={(patch) => {
        setProfile({ ...profile, ...buildQuickStartProfilePatch(patch) });
        setEntry("first-pick");
      }}
      signin={() => setEntry("login")}
    />
  );
  if (entry === "first-pick") return (
    <FirstPickScreen
      profile={profile}
      recipes={catalog}
      mood={quickMood}
      energy={quickEnergy}
      time={quickTime}
      setContext={(next) => {
        setQuickMood(next.mood);
        setQuickEnergy(next.energy);
        setQuickTime(next.time);
      }}
      openRecipe={(recipe) => {
        setSelected(recipe);
        setProfile({ ...profile, firstPickViewed: true });
        setEntry("subscription");
      }}
      continueToTrial={() => {
        setProfile({ ...profile, firstPickViewed: true });
        setEntry("subscription");
      }}
    />
  );
  if (entry === "onboarding") return <Onboarding profile={profile} save={setProfile} finish={(next) => { setProfile({ ...next, onboarded: true }); clearStored("moodfood-onboarding-step"); setEntry("account"); }} />;
  if (entry === "account") return <AccountSetupScreen profile={profile} back={() => setEntry("onboarding")} simulate={testState === "account"} submit={(patch, opts) => {
    const confirmed = !!opts?.hasSession; // session present = email confirmation is OFF, so they're in
    const next = { ...profile, ...patch, accountCreated: true, emailVerified: confirmed };
    setProfile(next);
    if (!isSupabaseConfigured) { sendConfirmationEmail(next.email, next.name); refreshNotifs(); setEntry("verify"); return; }
    if (confirmed) { sendWelcomeEmail(next.email, next.name); refreshNotifs(); setEntry("verified"); }
    else { setEntry("verify"); } // Supabase sent a real confirmation email
  }} />;
  if (entry === "verify") return <VerifyEmailScreen email={profile.email} realAuth={isSupabaseConfigured} resend={() => { sendConfirmationEmail(profile.email, profile.name); refreshNotifs(); }} back={() => setEntry("account")} onVerified={() => { setProfile({ ...profile, emailVerified: true }); sendWelcomeEmail(profile.email, profile.name); refreshNotifs(); setEntry("verified"); }} />;
  if (entry === "verified") return <VerifiedScreen name={profile.name} proceed={() => setEntry("subscription")} />;
  if (entry === "subscription") return <SubscriptionScreen profile={profile} save={setProfile} onStarted={refreshNotifs} proceed={() => { setProfile({ ...profile, activationPaywallSeen: true }); setEntry("app"); }} />;
  return <MenuCtx.Provider value={() => setMenuOpen(true)}><div className={page === "cook" ? "app cooking" : "app"}>
    <PullRefreshIndicator pullY={pullY} />
    {page !== "cook" && <DesktopNav page={page} go={go} openMoody={() => setMoodyOpen(true)} />}
    <main>
      {page === "home" && <HomeScreen profile={profile} diary={diary} saved={saved} catalog={catalog} mood={mood} setMood={setMood} energy={energy} setEnergy={setEnergy} time={time} setTime={setTime} mealCategory={mealCategory} setMealCategory={setMealCategory} cuisine={cuisine} setCuisine={setCuisine} diet={homeDiet} setDiet={setHomeDiet} results={false} setResults={setResults} beginResults={() => { setSearchRequest(null); setCurating(true); setAiRanked(null); setHasFetched(false); setResults(true); go("results"); }} ranked={ranked} curating={curating} loadMore={loadMore} live={aiRanked !== null || deterministicLive !== null} curated={aiRanked !== null} retry={() => setRecipeNonce(n => n + 1)} open={open} go={go} diners={diners} selectedDiners={selectedDiners} setSelectedDiners={setSelectedDiners} eaterCount={eaterCount} setEaterCount={setEaterCount} openNotifs={openNotifs} unread={unreadCount()} addPhoto={addPhoto} onPickSuggestion={r => runSearch({ query: r.title, filters: { query: r.title } })} toggleSave={toggleSavedRecipe} />}
      {page === "search" && <SearchScreen profile={sharedProfile} diary={diary} saved={saved} catalog={catalog} onSearch={request => runSearch(request)} />}
      {page === "results" && (searchRequest
        ? <SearchResultsScreen results={searchResults} loading={searchLoading} request={searchRequest} relaxed={searchRelaxed} more={() => runSearch(searchRequest, true)} home={() => go("home")} search={() => go("search")} open={open} saved={saved} toggleSave={toggleSavedRecipe} />
        : results
          ? <HomeScreen profile={profile} diary={diary} saved={saved} catalog={catalog} mood={mood} setMood={setMood} energy={energy} setEnergy={setEnergy} time={time} setTime={setTime} mealCategory={mealCategory} setMealCategory={setMealCategory} cuisine={cuisine} setCuisine={setCuisine} diet={homeDiet} setDiet={setHomeDiet} results setResults={v => { setResults(v); if (!v) go("home"); }} beginResults={() => {}} ranked={ranked} curating={curating} hasFetched={hasFetched} loadMore={loadMore} live={aiRanked !== null || deterministicLive !== null} curated={aiRanked !== null} retry={() => setRecipeNonce(n => n + 1)} open={open} go={go} diners={diners} selectedDiners={selectedDiners} setSelectedDiners={setSelectedDiners} eaterCount={eaterCount} setEaterCount={setEaterCount} openNotifs={openNotifs} unread={unreadCount()} addPhoto={addPhoto} onPickSuggestion={r => runSearch({ query: r.title, filters: { query: r.title } })} toggleSave={toggleSavedRecipe} />
          : <EmptyResultsScreen home={() => go("home")} search={() => go("search")} />)}
      {page === "detail" && selected && <DetailScreen recipe={selected} servings={eaterCount} back={backFromDetail} cook={() => go("cook")} saved={saved.includes(selected.id)} toggleSave={() => toggleSavedRecipe(selected)} addGroceries={() => setGroceries(v => [...new Set([...v, ...selected.ingredients])])} addPhoto={addPhoto} shareToCommunity={() => shareRecipe(selected)} allergies={profile.allergies} />}
      {page === "cook" && selected && <CookScreen recipe={selected} exit={() => go("detail")} allergies={profile.allergies} finish={(rating, photo) => { setDiary(v => [{ recipe: selected, rating, when: "Today" }, ...v]); if (photo) addPhoto(photo); if (behavioralConsent) void recordRating({ providerRecipeId: selected.id, title: selected.title, cuisine: selected.cuisine, source: aiCuration ? "ai" : "deterministic", rating, mood }); go("diary"); }} />}
      {page === "diary" && <DiaryScreen diary={diary} open={open} photoLogs={profile.photoLogs} addPhoto={addPhoto} goFoodLog={() => go("food-log")} allergies={profile.allergies} />}
      {page === "grocery" && <GroceryScreen items={groceries} setItems={setGroceries} />}
      {page === "pantry" && <PantryScreen items={profile.pantryStaples} setItems={items => setProfile(p => ({ ...p, pantryStaples: items }))} addToGrocery={item => setGroceries(v => v.includes(item) ? v : [...v, item])} />}
      {page === "planner" && <PlannerScreen open={open} />}
      {page === "insights" && <InsightsScreen diary={diary} />}
      {page === "settings" && <SettingsScreen profile={profile} save={setProfile} go={go} logout={() => { void authSignOut(); setEntry("welcome"); }} aiCuration={aiCuration} setAiCuration={setAiCuration} learnedSignals={learnedSignals} setLearnedSignals={setLearnedSignals} behavioralConsent={behavioralConsent} />}
      {page === "privacy" && <DataPrivacyScreen signal={cuisineSignal} moodSignal={moodSignal} suppressed={suppressedCuisines} learningOn={learnedSignals} onForget={c => setSuppressedCuisines(prev => [...new Set([...prev, c])])} onRestore={c => setSuppressedCuisines(prev => prev.filter(x => x !== c))} />}
      {page === "favorites" && <LibraryScreen title="Saved recipes" source={safeRecipes.filter(r => saved.includes(r.id))} open={open} remove={r => setSaved(saved.filter(id => id !== r.id))} />}
      {page === "import" && <ImportScreen />}
      {page === "admin" && <AdminScreen catalog={catalog} />}
      {page === "billing" && <BillingScreen profile={profile} save={setProfile} />}
      {page === "psych-profile" && <PsychProfileScreen profile={profile} save={setProfile} back={() => go("settings")} />}
      {page === "food-profile" && <FoodProfileScreen profile={profile} save={setProfile} back={() => go("settings")} />}
      {page === "account" && <AccountScreen profile={profile} save={setProfile} posts={posts.filter(p => p.author === profile.name)} back={() => go("settings")} cancelAccount={cancelAccount} />}
      {page === "community" && <CommunityScreen profile={profile} posts={posts} setPosts={setPosts} connections={connections} setConnections={setConnections} openRecipe={open} catalog={catalog} initialRecipeId={pendingShare} clearInitial={() => setPendingShare(undefined)} />}
      {page === "health" && <HealthHub diary={diary} go={go} />}
      {page === "health-nutrition" && <HealthDetail kind="nutrition" diary={diary} back={() => go("health")} />}
      {page === "health-variety" && <HealthDetail kind="variety" diary={diary} back={() => go("health")} />}
      {page === "health-patterns" && <HealthDetail kind="patterns" diary={diary} back={() => go("health")} />}
      {page === "family-health" && <FamilyHealth diary={diary} diners={diners} back={() => go("health")} />}
      {page === "diners" && <DinersScreen diners={diners} save={setDiners} back={() => go("settings")} />}
      {page === "food-log" && <FoodLogScreen logs={profile.photoLogs} addPhoto={addPhoto} back={() => go("diary")} allergies={profile.allergies} />}
      {page === "help" && <HelpScreen back={() => go("settings")} />}
    </main>
    {page !== "cook" && <BottomNav page={page} go={go} />}
    {page !== "cook" && <MoodyFab onOpen={() => setMoodyOpen(true)} />}
    {moodyOpen && <MoodyPanel profile={sharedProfile} catalog={safeRecipes} loadCatalog={loadMoodyCatalog} turns={moodyTurns} setTurns={setMoodyTurns} close={() => setMoodyOpen(false)} openRecipe={openFromMoody} />}
    {notifOpen && <NotificationsPanel close={() => setNotifOpen(false)} profile={profile} save={setProfile} refresh={refreshNotifs} />}
    {menuOpen && <MainMenu profile={profile} page={page} go={go} close={() => setMenuOpen(false)} openNotifs={openNotifs} unread={unreadCount()} logout={() => { void authSignOut(); setEntry("welcome"); }} />}
  </div></MenuCtx.Provider>;
}



function HomeScreen({ profile, diary, saved, catalog, mood, setMood, energy, setEnergy, time, setTime, mealCategory, setMealCategory, cuisine, setCuisine, diet, setDiet, results, setResults, beginResults, ranked, curating, hasFetched, loadMore, live, curated, retry, open, go, diners, selectedDiners, setSelectedDiners, eaterCount, setEaterCount, openNotifs, unread, addPhoto, onPickSuggestion, toggleSave }: {
  profile: Profile; diary: DiaryEntry[]; saved: string[]; catalog: Recipe[];
  mood: string; setMood: (v: string) => void; energy: number; setEnergy: (v: number) => void; time: number; setTime: (v: number) => void;
  mealCategory: string; setMealCategory: (v: string) => void;
  cuisine: string; setCuisine: (v: string) => void;
  diet: string; setDiet: (v: string) => void;
  results: boolean; setResults: (v: boolean) => void; beginResults: () => void; ranked: Recipe[]; curating?: boolean; hasFetched?: boolean; loadMore?: () => void; live?: boolean; curated?: boolean; retry?: () => void; open: (r: Recipe) => void; go: (p: Page) => void;
  diners: Diner[]; selectedDiners: string[]; setSelectedDiners: (v: string[]) => void;
  eaterCount: number; setEaterCount: (v: number) => void; openNotifs?: () => void; unread?: number;
  addPhoto: (p: FoodPhoto) => void; onPickSuggestion: (r: Recipe) => void; toggleSave: (r: Recipe) => void;
}) {
  const [rejected, setRejected] = useState<string[]>([]);
  const [shownCount, setShownCount] = useState(RESULT_BATCH_SIZE);
  const visible = ranked.filter(r => !rejected.includes(r.id)).slice(0, shownCount);
  const hero = ranked[0];
  const suggestions = useMemo(
    () => deriveDailySuggestions(diary, saved, catalog, profile),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diary.length, saved.length, catalog.length, profile.diet, profile.allergies.join()],
  );
  // Reset rejections whenever a fresh set of picks arrives.
  useEffect(() => { setRejected([]); setShownCount(RESULT_BATCH_SIZE); }, [results]);
  const showMore = async () => {
    await loadMore?.();
    setShownCount(count => count + RESULT_BATCH_SIZE);
  };

  // Results view, same layout container, different content
  if (results) return (
    <div className="home-screen">
      <AppHeader profile={profile} openNotifs={openNotifs} unread={unread} />
      {(curating || !hasFetched) ? <div className="thinking-state">
        <div className="thinking-orbit"><Sparkles /><i /><i /><i /></div>
        <span>MOODY IS THINKING</span>
        <h1>Finding {mealCategory || "dinner"} that fits tonight.</h1>
        <p>Reading your mood, {cuisine ? `${cuisine} cuisine, ` : ""}safety rules, {time}-minute limit, and food profile.</p>
        <div className="thinking-lines"><i /><i /><i /></div>
      </div> : <>
      <div className="home-greeting">
        <h1>{mealCategory ? `${mealCategory[0].toUpperCase()}${mealCategory.slice(1)} picks.` : "Tonight’s picks."}</h1>
        <p>{energy < 50 ? "Low-effort" : "Interesting"}, {mood.toLowerCase()}{mealCategory ? `, ${mealCategory}` : ""}{cuisine ? `, ${cuisine}` : ""}, within {time} min · {eaterCount} {eaterCount === 1 ? "person" : "people"}</p>
        {live && curated && <p className="source-note live"><Check size={13} /> Live picks, freshly curated by Moody for you.</p>}
        {live && !curated && <p className="source-note live"><Check size={13} /> Live picks, matched to your mood.</p>}
        {!live && hasFetched && visible.length > 0 && <p className="source-note">Offline picks from your cookbook — live recipes are unavailable right now.</p>}
      </div>
      {visible.length ? (
        <div style={{ padding: "0 16px", display: "grid", gap: 14 }}>
          {visible.map(r => <PickCard key={r.id} recipe={r} servings={eaterCount} open={() => open(r)} reject={() => setRejected([...rejected, r.id])} save={() => toggleSave(r)} saved={saved.includes(r.id)} />)}
          {loadMore && (
            <button className="secondary" style={{ width: "100%" }} disabled={curating} onClick={showMore}>
              {curating ? "Finding more…" : <>Show me 5 more <RotateCcw size={16} /></>}
            </button>
          )}
        </div>
      ) : (
        <div style={{ margin: "0 16px" }} className="empty-state">
          <ChefHat />
          <h2>{rejected.length ? "Want a fresh set?" : "No results from Moody"}</h2>
          <p>{rejected.length
            ? "None of those landed, Moody can pull a completely new batch that still respects your profile and safety rules."
            : "Moody couldn't find matching recipes right now. Try adjusting your mood, time, or cuisine and search again."}</p>
          {rejected.length && loadMore
            ? <button className="primary" disabled={curating} onClick={showMore}>{curating ? "Finding more…" : <>Show me 5 more <RotateCcw size={16} /></>}</button>
            : <>{retry && <button className="primary" onClick={retry} style={{ marginBottom: 8 }}><RotateCcw size={16} /> Retry</button>}<button className="secondary" onClick={() => setResults(false)}>Adjust check-in</button></>}
        </div>
      )}
      <div style={{ padding: "14px 16px 0" }}>
        <button className="secondary" style={{ width: "100%" }} onClick={() => setResults(false)}>← Change meal choice</button>
      </div>
      </>}
    </div>
  );

  return (
    <div className="home-screen">
      {/* Header: avatar/logo + greeting + bell, cloned from reference */}
      <AppHeader profile={profile} openNotifs={openNotifs} unread={unread} />

      <div className="home-greeting">
        <h1>How does dinner feel tonight?</h1>
        <p>Pick a mood, time, and energy level. Moody will choose one safe answer and keep backups ready.</p>
      </div>

      {/* ── Hero recipe photo (45vh, rounded, like the fitness hero image) ── */}
      <div className="home-hero" onClick={hero ? () => open(hero) : undefined}>
        <img src={hero?.image || FALLBACK_FOOD} alt={hero?.title || "Tonight’s dinner"} />
        <div className="hveil" />
        {/* Frosted glass chips top-left, copied from reference overlay chips */}
        <div className="hero-chips">
          <span className="hero-chip"><Clock3 size={13} /> {time} min</span>
          <span className="hero-chip">{mood}</span>
          {selectedDiners.some(id => id !== "self") && <span className="hero-chip"><ShieldCheck size={13} /> Shared safety</span>}
        </div>
        {/* Recipe name + sub bottom-left */}
        {hero ? (
          <>
            <div className="hero-info">
              <b>{hero.title}</b>
              <span>{hero.reason}</span>
            </div>
            {/* Blue circular arrow, "Start" button from reference */}
            <button className="hero-go" aria-label="View recipe" onClick={e => { e.stopPropagation(); open(hero); }}>
              <Play size={18} fill="currentColor" />
            </button>
          </>
        ) : (
          <div className="hero-no-pick">
            <div><ChefHat size={32} /><p>Complete your check-in below to get a pick</p></div>
          </div>
        )}
      </div>

      {/* ── Daily suggestions carousel ── */}
      <div style={{ padding: "14px 16px 0" }}>
        <DailySuggestionCarousel suggestions={suggestions} onPick={onPickSuggestion} showHero={false} />
      </div>

      {/* ── Check-in card, bottom-sheet style glass card ── */}
      <div className="home-checkin">
        <span className="section-label">How are you feeling?</span>
        {/* Mood pill row, all 9 moods */}
        <div className="mood-pills">
          {moods.map(v => (
            <button key={v} className={mood === v ? "active" : ""} onClick={() => setMood(v)}>{v}</button>
          ))}
        </div>

        <span className="section-label">Time available</span>
        {/* Number-pill selector, faithful to 10·20·30·40·50 in reference */}
        <div className="time-pills">
          {[15, 20, 30, 45, 60].map(v => (
            <button key={v} className={time === v ? "active" : ""} onClick={() => setTime(v)}>
              {v}
            </button>
          ))}
        </div>
        <div className="range-label" style={{ marginTop: 6 }}>
          <span>15 min</span><span style={{ color: "var(--blue-deep)", fontWeight: 700 }}>{time} min selected</span><span>60 min</span>
        </div>

        <span className="section-label">Energy level: {energy}%</span>
        <input type="range" value={energy} onChange={e => setEnergy(+e.target.value)} style={{ width: "100%" }} />
        <div className="range-label"><span>Low: easy recipes</span><span>High: adventurous</span></div>

        <span className="section-label">Meal type</span>
        <div className="meal-category-pills">
          {["Breakfast", "Lunch", "Dinner", "Snacks", "Dessert"].map(cat => (
            <button
              key={cat}
              className={mealCategory === cat.toLowerCase() ? "active" : ""}
              onClick={() => setMealCategory(mealCategory === cat.toLowerCase() ? "" : cat.toLowerCase())}
            >{cat}</button>
          ))}
        </div>
        {!mealCategory && <p className="meal-type-hint">Pick a meal type to search</p>}

        <span className="section-label" style={{ marginTop: 14 }}>Cuisine style</span>
        <select
          className="cuisine-select"
          value={cuisine}
          onChange={e => setCuisine(e.target.value)}
        >
          <option value="">Any cuisine</option>
          {SPOON_CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <span className="section-label" style={{ marginTop: 14 }}>Dietary preference</span>
        <select
          className="cuisine-select"
          value={diet}
          onChange={e => setDiet(e.target.value)}
        >
          {SEARCH_DIETS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <button
          className="primary"
          style={{ width: "100%", marginTop: 14, minHeight: 54 }}
          disabled={!mealCategory}
          onClick={beginResults}
        >
          Choose <ArrowRight size={18} />
        </button>
      </div>

      <details className="home-more">
        <summary>More tools</summary>
        {/* ── Stat cards, today’s logged nutrition + Moody’s pick ── */}
        {(() => {
          const today = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
          const todayLogs = profile.photoLogs.filter(l => l.when.startsWith(today));
          const totals = sumNutrition(todayLogs);
          return (
            <div className="home-stats">
              <div className="stat-card" style={{ cursor: "pointer" }} onClick={() => go("food-log")}>
                <div className="sc-icon"><FlameKindling size={20} /></div>
                <div className="sc-label">Today’s calories</div>
                {totals.calories > 0
                  ? <div><span className="sc-value">{totals.calories}</span><span className="sc-unit"> kcal</span></div>
                  : <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Log a meal →</div>}
              </div>
              <div className="stat-card">
                <div className="sc-icon"><Clock3 size={20} /></div>
                <div className="sc-label">{hero ? "Cook time" : "Tonight’s pick"}</div>
                {hero
                  ? <div><span className="sc-value">{hero.time}</span><span className="sc-unit"> min</span></div>
                  : <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Check in above</div>}
              </div>
            </div>
          );
        })()}

        {/* ── Photo log shortcut ── */}
        <div className="home-photo-shortcut">
          <FoodCamera label="Log a meal with photo" onSave={addPhoto} allergies={profile.allergies} />
        </div>

        {/* ── Quick-link cards, styled like the bottom rows in reference ── */}
        <div className="home-links">
          <button className="home-link-card" onClick={() => go("food-log")}>
            <span className="hlc-icon"><Camera size={20} /></span>
            <span className="hlc-text"><b>Food photo log</b><small>Photograph meals for calorie estimates</small></span>
            <span className="hlc-arr"><ArrowRight size={16} /></span>
          </button>
          <button className="home-link-card" onClick={() => go("health")}>
            <span className="hlc-icon"><Activity size={20} /></span>
            <span className="hlc-text"><b>Your health trends</b><small>Nutrition, variety, and patterns</small></span>
            <span className="hlc-arr"><ArrowRight size={16} /></span>
          </button>
          <button className="home-link-card" onClick={() => go("community")}>
            <span className="hlc-icon"><Users size={20} /></span>
            <span className="hlc-text"><b>MoodFood community</b><small>Share cooks, recipes, and tips</small></span>
            <span className="hlc-arr"><ArrowRight size={16} /></span>
          </button>
          <button className="home-link-card" onClick={() => go("settings")}>
            <span className="hlc-icon"><UserRound size={20} /></span>
            <span className="hlc-text"><b>Your food profile</b><small>Safety, moods, and preferences</small></span>
            <span className="hlc-arr"><ArrowRight size={16} /></span>
          </button>
        </div>
      </details>
    </div>
  );
}


function SearchScreen({
  profile, diary, saved, catalog, onSearch,
}: {
  profile: Profile;
  diary: DiaryEntry[];
  saved: string[];
  catalog: Recipe[];
  onSearch: (request: SearchRequest) => void;
}) {
  const [query, setQuery] = useState("");
  const [mood, setMood] = useState<Mood | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [type, setType] = useState("");
  const [diet, setDiet] = useState("Any");
  const [maxTime, setMaxTime] = useState(60);
  const [sort, setSort] = useState(profile.rankingPreference || "Most popular");
  const [include, setInclude] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [maxCalories, setMaxCalories] = useState(0);   // 0 = off
  const [minProtein, setMinProtein] = useState(0);     // 0 = off

  const suggestions = useMemo(
    () => deriveDailySuggestions(diary, saved, catalog, profile),
    // Recompute only when the underlying data changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diary.length, saved.length, catalog.length, profile.diet, profile.allergies.join()],
  );

  const selectedMood = mood ? getMoodByValue(mood) : undefined;

  const activeFilterCount =
    cuisines.length + include.length + exclude.length +
    (mood ? 1 : 0) +
    (type ? 1 : 0) + (diet !== "Any" ? 1 : 0) + (maxTime !== 60 ? 1 : 0) +
    (sort !== (profile.rankingPreference || "Most popular") ? 1 : 0) +
    (maxCalories ? 1 : 0) + (minProtein ? 1 : 0);

  const run = () => {
    const searchQuery = buildMoodSearchQuery({
      mood: mood || undefined,
      cuisine: cuisines.join(" ") || undefined,
      maxCookingTime: maxTime,
      query,
    });
    const filters: RecipeFilters = {
      query: searchQuery, cuisines,
      type: type || undefined,
      diet: diet === "Any" ? undefined : diet,
      maxReadyTime: maxTime, sort,
      includeIngredients: include, excludeIngredients: exclude,
      maxCalories: maxCalories || undefined,
      minProtein: minProtein || undefined,
    };
    onSearch({ query: searchQuery, filters });
  };

  const pickSuggestion = (r: Recipe) => {
    onSearch({ query: r.title, filters: { query: r.title } });
  };

  return <div className="screen">
    <TopBar title="Search recipes" />
    <DailySuggestionCarousel suggestions={suggestions} onPick={pickSuggestion} />
    <div className="ai-search-intro"><Search size={15} /><p>Search with structured filters. Your saved diet, allergies, and exclusions always remain protected.</p></div>
    <div className="filter-block">
      <span className="filter-label">How are you feeling?</span>
      <div className="choice">
        {moodSearchTags.map(m => <button key={m.mood} className={mood === m.mood ? "active" : ""} onClick={() => setMood(prev => prev === m.mood ? "" : m.mood)}>{m.label}</button>)}
      </div>
      {selectedMood && <p className="mood-helper"><b>{selectedMood.label}</b> {selectedMood.description}</p>}
    </div>
    <form className="search-box" onSubmit={e => { e.preventDefault(); run(); }}>
      <Search />
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="“Something cozy and high-protein under 30 min”" />
    </form>
    <div className="search-actions">
      <button className={"filter-toggle" + (showFilters ? " open" : "")} onClick={() => setShowFilters(v => !v)}>
        <Settings2 size={15} /> Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
      </button>
      <button className="primary search-go" onClick={run}>Search <ArrowRight size={15} /></button>
    </div>

    {showFilters && <div className="search-filters">
      <div className="filter-block">
        <span className="filter-label">Sort by</span>
        <div className="choice">{SORT_OPTIONS.map(o => <button key={o.id} className={sort === o.id ? "active" : ""} onClick={() => setSort(o.id)} title={o.hint}>{o.label}</button>)}</div>
      </div>
      <div className="filter-block">
        <span className="filter-label">Course (results never mix courses)</span>
        <select className="cuisine-select" value={type} onChange={e => setType(e.target.value)}>
          <option value="">Any course</option>
          {MEAL_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>
      <div className="filter-block">
        <span className="filter-label">Cuisine</span>
        <div className="choice">{SPOON_CUISINES.map(c => <button key={c} className={cuisines.includes(c) ? "active" : ""} onClick={() => setCuisines(toggle(cuisines, c))}>{c}</button>)}</div>
      </div>
      <div className="filter-block">
        <span className="filter-label">Additional diet filter</span>
        <select className="cuisine-select" value={diet} onChange={e => setDiet(e.target.value)}>
          {SEARCH_DIETS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="filter-block">
        <span className="filter-label">Max cook time: {maxTime} min</span>
        <input type="range" min={10} max={120} step={5} value={maxTime} onChange={e => setMaxTime(+e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="filter-block">
        <span className="filter-label">Max calories: {maxCalories ? `${maxCalories} kcal` : "off"}</span>
        <input type="range" min={0} max={1200} step={50} value={maxCalories} onChange={e => setMaxCalories(+e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="filter-block">
        <span className="filter-label">Min protein: {minProtein ? `${minProtein} g` : "off"}</span>
        <input type="range" min={0} max={60} step={5} value={minProtein} onChange={e => setMinProtein(+e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="filter-block">
        <span className="filter-label">Must include</span>
        <TokenInput tokens={include} setTokens={setInclude} placeholder="e.g. chicken, spinach" />
      </div>
      <div className="filter-block">
        <span className="filter-label">Must exclude</span>
        <TokenInput tokens={exclude} setTokens={setExclude} placeholder="e.g. mushrooms" />
      </div>
      {!!activeFilterCount && <button className="secondary" style={{ width: "100%" }} onClick={() => { setMood(""); setCuisines([]); setType(""); setDiet("Any"); setMaxTime(60); setSort(profile.rankingPreference || "Most popular"); setInclude([]); setExclude([]); setMaxCalories(0); setMinProtein(0); }}>Clear filters</button>}
    </div>}

    <p className="quiet">Your saved allergies and diet always remain hard rules. Search filters can only narrow them further.</p>
  </div>;
}

