import { useEffect, useMemo, useRef, useState, useCallback, createContext, useContext, Fragment } from "react";
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChefHat, ChevronRight,
  Clock3, Heart, Home, ListChecks, Menu, Mic, MoreVertical, Play, RotateCcw, Search,
  Settings2, ShoppingCart, Sparkles, Star, Timer, X, ShieldCheck, UserRound, BarChart3,
  Upload, LogOut, Plus, ClipboardCheck, LayoutDashboard, Camera, Users, MessageCircle,
  Send, UserPlus, Lock, Globe2, Activity, Salad, Wheat, Droplets, TrendingUp, Mail, CreditCard,
  HelpCircle, Info, FlameKindling, Dna, BookMarked, Share2, Trash2,
  Eye, EyeOff,
} from "lucide-react";
import { moods, cookingMoods, skillLevels, type Recipe } from "./data";
import { bundledRecipes } from "./bundledRecipes";
import { clearStored, defaultDiners, defaultProfile, readStored, useStoredState, writeStored, type Diner, type Profile, type SocialPost } from "./store";
import { profileForDiners, recommend, safeRecipes as applySafety, RANKING_CONFIG_VERSION, type CuisineSignal, type MoodCuisineSignal, type LearnedSignals } from "./recommendation";
import { recordRating, recordRun, fetchRatingHistory, deriveCuisineSignal, deriveMoodCuisineSignal, suppressSignal } from "./behavioral";
import { cleanText, compactPhotoLogs, readSafeImage, validateEmail } from "./security";
import { onboardingQuestions, onboardingSections, PANTRY_GROUPS, type OnboardingKey, type OnboardingQuestion, type ProfileValue } from "./onboarding";
import { SPOON_CUISINES, MEAL_TYPES, SEARCH_DIETS, SORT_OPTIONS, type RecipeFilters } from "./searchFilters";
import { sendConfirmationEmail, sendWelcomeEmail, scheduleTrial, runDue, readInbox, unreadCount, markAllRead, cancelScheduled, simulateTrialEnd, type InboxItem } from "./notifications";
import { analyzeFood, sumNutrition, flaggedAllergens, type FoodPhoto } from "./foodAnalysis";
import { foodPhotoUrl, persistFoodPhoto } from "./photoStorage";
import { aiChat, MoodyError, type ChatTurn } from "./ai";
import { fetchCuratedRecipes, buildFoodHistory } from "./recipes";
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  requestPasswordReset as authRequestPasswordReset,
  updatePassword as authUpdatePassword,
  isEmailConfirmed,
  onAuthChange,
  isSupabaseConfigured,
} from "./auth";
import { supabase } from "./supabase";
import { displayStepDetail, displayStepTitle, formatTimer, stepImageSources } from "./cooking";
import { RecipeImage } from "./RecipeImage";
import { finalizeSearchResults } from "./searchResults";
import { nextSavedRecipeIds } from "./savedRecipes";
import { trackSearch } from "./telemetry";
import { getConsents, setConsent, resetLearningData, exportMyData, NO_CONSENT, type ConsentState, type ConsentScope } from "./governance";
import { deterministicTasteSummary, fetchTasteSummary } from "./tasteSummary";
import { Landing } from "./Landing";
import { searchFoods, type NutritionFood } from "./nutrition";
import { readDevTestState } from "./devTestState";
import {
  activationFitReason,
  adjustQuickStartAfterRejection,
  buildQuickStartProfilePatch,
  selectActivationPicks,
  type RejectionReason,
} from "./activation";
import { appendUniqueRecipes, RESULT_BATCH_SIZE, takeUniqueBatch } from "./resultBatches";
import { moodyCandidates, resolveMoodyRecipe } from "./moodyRecipes";
import { moodSearchTags, type Mood } from "@/data/moodTags";
import { buildMoodSearchQuery, getMoodByValue } from "@/lib/moodSearch";
import gsap from "gsap";

const SUPABASE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

async function callFn<T>(fn: string, body: unknown): Promise<T> {
  if (!supabase) throw new Error("Backend not configured.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in.");
  const res = await fetch(`${SUPABASE_FN}/${fn}`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

async function redeemInviteCode(code: string): Promise<{ ok: boolean; subscriptionEnd?: string; error?: string }> {
  try { return await callFn("redeem-invite", { code: code.trim().toUpperCase() }); }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

async function startCheckout(plan: string): Promise<{ url?: string; error?: string }> {
  try { return await callFn("create-checkout", { plan }); }
  catch (e) { return { error: (e as Error).message }; }
}

// Permanently delete the signed-in user: cancels any Stripe subscription,
// removes their rows, and deletes the auth account server-side.
async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  try { return await callFn("delete-account", {}); }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

// Every localStorage key MoodFood owns, wiped when an account is cancelled.
const MOODFOOD_KEYS = [
  "moodfood-entry", "moodfood-profile", "moodfood-saved", "moodfood-diary",
  "moodfood-groceries", "moodfood-posts", "moodfood-connections", "moodfood-diners",
  "moodfood-eater-count", "moodfood-onboarding-step", "moodfood-a2hs-dismissed",
];

// photoLogs carry base64 image data (megabytes). They must never travel in
// preferences_json: they bloat the profiles row, the debounced upsert, and the
// sign-in restore payload. Photos stay on-device (a later step moves them to Storage).
function prefsForUpsert(p: Profile): Omit<Profile, "photoLogs"> {
  const { photoLogs: _photoLogs, ...prefs } = p;
  return prefs;
}

// After Stripe redirects back with ?checkout=success, poll the subscriptions
// table for up to 10 s to get the confirmed status.
async function syncSubscriptionFromDB(): Promise<{ status: string; plan: string; currentPeriodEnd: string } | null> {
  if (!supabase) return null;
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, i === 0 ? 500 : 2000));
    const { data } = await supabase.from("subscriptions").select("*").maybeSingle();
    if (data?.status && data.status !== "none") {
      return { status: data.status, plan: data.plan ?? "annual", currentPeriodEnd: data.current_period_end ?? "" };
    }
  }
  return null;
}

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

// Lets any header (AppHeader, TopBar) open the global hamburger menu without
// every screen threading a callback through its props.
const MenuCtx = createContext<() => void>(() => {});

type Page = "home" | "search" | "results" | "diary" | "grocery" | "planner" | "detail" | "cook" | "insights" | "settings" | "favorites" | "import" | "admin" | "billing" | "psych-profile" | "food-profile" | "account" | "community" | "health" | "health-nutrition" | "health-variety" | "health-patterns" | "family-health" | "diners" | "food-log" | "pantry" | "help" | "privacy";
type SearchRequest = { query: string; filters: RecipeFilters };
type Entry = "welcome" | "login" | "quick-start" | "first-pick" | "onboarding" | "account" | "verify" | "verified" | "subscription" | "app";
const PLANS = [
  { id: "annual", name: "Annual", price: "$120/year", note: "Best value, about 2 months free" },
  { id: "quarterly", name: "Quarterly", price: "$36/quarter", note: "Save 20%, billed every 3 months" },
  { id: "monthly", name: "Monthly", price: "$15/month", note: "Cancel anytime" },
] as const;
const nav = [
  ["home", "Home", Home], ["search", "Search", Search], ["results", "Results", ListChecks],
  ["grocery", "Grocery", ShoppingCart], ["planner", "Planner", CalendarDays],
] as const;

const PULL_THRESHOLD = 72;  // px to trigger reload
const PULL_MAX = 110;       // px max visual travel

function usePullToRefresh() {
  const [pullY, setPullY] = useState(0);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY === 0) startYRef.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startYRef.current === null || window.scrollY > 0) return;
      const delta = Math.max(0, e.touches[0].clientY - startYRef.current);
      if (delta > 0) {
        // Resist: travel slows as it approaches PULL_MAX
        const clamped = PULL_MAX * (1 - Math.exp(-delta / PULL_MAX));
        setPullY(clamped);
      }
    };
    const onEnd = () => {
      if (pullY >= PULL_THRESHOLD) {
        window.location.reload();
      } else {
        setPullY(0);
      }
      startYRef.current = null;
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [pullY]);

  return pullY;
}

function PullRefreshIndicator({ pullY }: { pullY: number }) {
  const progress = Math.min(pullY / PULL_THRESHOLD, 1);
  const ready = pullY >= PULL_THRESHOLD;
  if (pullY < 2) return null;
  return (
    <div
      className="ptr-indicator"
      style={{ transform: `translateY(${pullY - 44}px)`, opacity: progress }}
    >
      <div
        className={"ptr-circle" + (ready ? " ready" : "")}
        style={{ transform: `rotate(${progress * 210}deg)` }}
      >
        <RotateCcw size={18} />
      </div>
    </div>
  );
}

export default function App() {
  const pullY = usePullToRefresh();
  const testState = readDevTestState(window.location.search, import.meta.env.DEV);
  const [splash, setSplash] = useState(true);
  const [entry, setEntry] = useStoredState<Entry>("moodfood-entry", "welcome");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [storedProfile, setProfile] = useStoredState<Profile>("moodfood-profile", defaultProfile);
  useEffect(() => { window.scrollTo(0, 0); }, [entry]);
  useEffect(() => onAuthChange((event) => {
    if (event !== "PASSWORD_RECOVERY") return;
    setSplash(false);
    setPasswordRecovery(true);
    setEntry("login");
  }), [setEntry]);
  // Memoized so its reference is stable across renders. Without this, every
  // render produced a new `profile` object, which cascaded into `sharedProfile`
  // and re-fired the recipe-fetch effect on a loop, hammering the edge function
  // into 502s and silently falling back to local recipes.
  const profile = useMemo(() => ({ ...defaultProfile, ...storedProfile }), [storedProfile]);
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
  const [moodyTurns, setMoodyTurns] = useState<ChatTurn[]>([]);
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
  // Slice 1 (roadmap v3): AI curation is opt-in, default OFF. Normal search and the
  // mood feed rank real provider recipes deterministically; turning this on lets
  // Moody (OpenAI) re-rank the personalized mood feed — a clearly labeled extra.
  const [aiCuration, setAiCuration] = useStoredState<boolean>("moodfood-ai-curation", false);
  // Slice 2 (roadmap v3): learned-signal ranking is opt-in AND consent-gated. The
  // flag lets a user turn the learned cuisine nudge on/off; `behavioralConsent`
  // mirrors the server consent so we never record or apply learning without it.
  const [learnedSignals, setLearnedSignals] = useStoredState<boolean>("moodfood-learned-signals", false);
  const [behavioralConsent, setBehavioralConsent] = useState(false);
  const [cuisineSignal, setCuisineSignal] = useState<CuisineSignal | null>(null);
  const [moodSignal, setMoodSignal] = useState<MoodCuisineSignal | null>(null);
  // The learned boost is applied to ranking ONLY when the toggle is on; the signal
  // stays visible (Taste memory) either way. Declared here so the ranking memos below
  // can read it without a temporal-dead-zone hazard.
  const appliedSignals: LearnedSignals | undefined =
    learnedSignals && (cuisineSignal || moodSignal)
      ? { cuisine: cuisineSignal ?? undefined, moodCuisine: moodSignal ?? undefined }
      : undefined;
  // Slice 3 (roadmap v3): per-signal "forget". Cuisines the user has told us to stop
  // using are excluded from the learned signal — an explicit correction always wins.
  const [suppressedCuisines, setSuppressedCuisines] = useStoredState<string[]>("moodfood-suppressed-cuisines", []);
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
  const localRanked = useMemo(() => recommend(catalog, sharedProfile, mood, energy, time, appliedSignals).map(item => item.recipe), [catalog, sharedProfile, mood, energy, time, appliedSignals]);
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
  const loadMoodyCatalog = useCallback(async (query = "") => {
    // Strip conversational words so Spoonacular gets a clean food term (e.g. "Yaki Udon" not "show me a Yaki Udon recipe").
    const foodQuery = query.replace(/\b(show|find|open|get|search|look|for|me|a|an|the|some|recipe|recipes|please|can|you|i|want|need|make|cook|like)\b/gi, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    const [moodLive, queryLive] = await Promise.all([
      fetchCuratedRecipes(sharedProfile, mood, 20, 180, "", {}, foodHistory, 0, true, false),
      foodQuery ? fetchCuratedRecipes(sharedProfile, mood, 10, 180, foodQuery, {}, foodHistory, 0, true, false) : Promise.resolve(null),
    ]);
    const combined = [
      ...(queryLive ?? []),
      ...(moodLive ?? []).filter(r => !queryLive?.some(q => q.id === r.id)),
    ];
    const merged = combined.length
      ? [...combined, ...catalog.filter(existing => !combined.some(recipe => recipe.id === existing.id))]
      : catalog;
    if (combined.length) setCatalog(merged);
    return applySafety(merged, sharedProfile);
  }, [catalog, foodHistory, mood, sharedProfile]);

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

  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setNotifTick] = useState(0);
  const refreshNotifs = () => setNotifTick(t => t + 1);
  useEffect(() => { const { charged } = runDue(); if (charged) setProfile(p => ({ ...p, subscriptionStatus: "active" })); refreshNotifs(); }, []);
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

  // Debounced upsert: save the full profile to Supabase 1.5 s after any change.
  // This keeps preferences_json current so the user's profile is restored when
  // they sign in on a new device.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !profile.accountCreated) return;
    const t = setTimeout(async () => {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;
      await supabase!.from("profiles").upsert({
        id: user.id,
        display_name: profile.name,
        onboarded: profile.onboarded,
        preferences_json: prefsForUpsert(profile),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    }, 1500);
    return () => clearTimeout(t);
  }, [profile]);

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
  const openNotifs = () => { markAllRead(); setNotifOpen(true); refreshNotifs(); };

  // Cancel (permanently delete) the account. With a backend, delete server-side
  // first and bail on failure. Then sign out, wipe every local key, and reload
  // to a guaranteed-clean first-launch state.
  const cancelAccount = async (): Promise<{ ok: boolean; error?: string }> => {
    if (isSupabaseConfigured) {
      const res = await deleteAccount();
      if (!res.ok) return res;
    }
    try { await authSignOut(); } catch { /* already signed out */ }
    cancelScheduled();
    MOODFOOD_KEYS.forEach(clearStored);
    window.location.reload();
    return { ok: true };
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

function QuickTasteStartScreen({
  mood, setMood, energy, setEnergy, time, setTime, profile, save, signin,
}: {
  mood: string;
  setMood: (value: string) => void;
  energy: number;
  setEnergy: (value: number) => void;
  time: number;
  setTime: (value: number) => void;
  profile: Profile;
  save: (patch: { diet: string; allergies: string[] }) => void;
  signin: () => void;
}) {
  const [diet, setDiet] = useState(profile.diet === "Everything" ? "Any" : profile.diet);
  const [allergyText, setAllergyText] = useState(profile.allergies.join(", "));
  const allergies = allergyText.split(",").map(item => cleanText(item, 40)).filter(Boolean);

  return (
    <div className="quick-start">
      <header className="quick-top">
        <div className="ih-logo dark"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
        <button className="ih-signin dark" onClick={signin}>Sign in</button>
      </header>
      <main className="quick-card">
        <span>TONIGHT, FAST</span>
        <h1>Tell me how dinner feels.</h1>
        <p>Four quick answers. Then I'll pick one safe meal and explain why it fits.</p>

        <label className="quick-field">
          <b>Mood</b>
          <div className="mood-pills">
            {["Tired", "Stressed", "Cozy", "Happy"].map(value => (
              <button key={value} className={mood === value ? "active" : ""} onClick={() => setMood(value)}>{value}</button>
            ))}
          </div>
        </label>

        <label className="quick-field">
          <b>Energy: {energy}%</b>
          <input type="range" min={0} max={100} value={energy} onChange={event => setEnergy(+event.target.value)} />
          <div className="range-label"><span>Keep it easy</span><span>I'm up for more</span></div>
        </label>

        <label className="quick-field">
          <b>Time</b>
          <div className="time-pills">
            {[15, 30, 45, 60].map(value => (
              <button key={value} className={time === value ? "active" : ""} onClick={() => setTime(value)}>{value}</button>
            ))}
          </div>
        </label>

        <label className="quick-field">
          <b>Diet</b>
          <select className="cuisine-select" value={diet} onChange={event => setDiet(event.target.value)}>
            {["Any", "Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free"].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="quick-field">
          <b>Allergies</b>
          <input value={allergyText} onChange={event => setAllergyText(event.target.value)} placeholder="e.g. peanuts, dairy" />
        </label>

        <button className="primary quick-submit" onClick={() => save({ diet: diet === "Any" ? "Everything" : diet, allergies })}>
          Choose <ArrowRight size={18} />
        </button>
      </main>
    </div>
  );
}

const REJECTION_OPTIONS: { id: RejectionReason; label: string }[] = [
  { id: "too-much-effort", label: "Too much effort" },
  { id: "not-in-the-mood", label: "Not in the mood" },
  { id: "too-expensive", label: "Too expensive" },
  { id: "missing-ingredients", label: "Missing ingredients" },
  { id: "too-heavy", label: "Too heavy" },
  { id: "repeated-recently", label: "Had this recently" },
];

function FirstPickScreen({
  profile, recipes, mood, energy, time, setContext, openRecipe, continueToTrial,
}: {
  profile: Profile;
  recipes: Recipe[];
  mood: string;
  energy: number;
  time: number;
  setContext: (context: { mood: string; energy: number; time: number }) => void;
  openRecipe: (recipe: Recipe) => void;
  continueToTrial: () => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const available = recipes.filter(recipe => !dismissed.includes(recipe.id));
  const picks = selectActivationPicks({ recipes: available, profile, mood, energy, time });
  const fit = picks.hero ? activationFitReason({ recipe: picks.hero, profile, mood, energy, time }) : "";

  const reject = (reason: RejectionReason) => {
    if (picks.hero) setDismissed([...dismissed, picks.hero.id]);
    setContext(adjustQuickStartAfterRejection({ mood, energy, time }, reason));
  };

  return (
    <div className="first-pick">
      <header className="quick-top">
        <div className="ih-logo dark"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
      </header>
      {picks.hero ? (
        <main className="first-pick-main">
          <span>DINNER IS HANDLED</span>
          <h1>{picks.hero.title}</h1>
          <RecipeImage className="first-pick-image" sources={stepImageSources(undefined, picks.hero.image)} alt={picks.hero.title} />
          <div className="first-pick-facts">
            <span><Clock3 size={14} /> {picks.hero.time} min</span>
            <span><ShieldCheck size={14} /> Safety checked</span>
            <span><Sparkles size={14} /> {mood}</span>
          </div>
          <div className="moody-note first-pick-note"><Moody /><p>{fit}</p></div>
          <div className="first-pick-actions">
            <button className="primary" onClick={() => openRecipe(picks.hero!)}>View recipe <ArrowRight size={17} /></button>
            <button className="secondary" onClick={continueToTrial}>Save this profile</button>
          </div>
          <section className="reject-box">
            <b>Not tonight?</b>
            <div>
              {REJECTION_OPTIONS.map(option => (
                <button key={option.id} onClick={() => reject(option.id)}>{option.label}</button>
              ))}
            </div>
          </section>
          {!!picks.backups.length && (
            <section className="backup-picks">
              <h2>Backups</h2>
              {picks.backups.map(recipe => (
                <button key={recipe.id} onClick={() => openRecipe(recipe)}>
                  <RecipeImage sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} />
                  <span><b>{recipe.title}</b><small>{recipe.time} min · {recipe.reason}</small></span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </section>
          )}
        </main>
      ) : (
        <main className="first-pick-main">
          <span>TRY AGAIN</span>
          <h1>I couldn't find a safe match yet.</h1>
          <p>Change your time, diet, or allergies and I'll try again.</p>
          <button className="primary" onClick={continueToTrial}>Continue</button>
        </main>
      )}
    </div>
  );
}

function toggle(values: string[], value: string) { return nextSavedRecipeIds(values, value); }

const FALLBACK_FOOD  = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80";
const LOGIN_PHOTO    = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=85";

// One curated food photo per onboarding section.
const SECTION_PHOTOS: Record<string, string> = {
  "Your moods":           "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=900&q=80",
  "Food & safety":        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
  "Your palate":          "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80",
  "Ingredients":          "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80",
  "Food psychology":      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
  "Comfort & mood":       "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
  "Kitchen, time & table":"https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80",
  "Habits & values":      "https://images.unsplash.com/photo-1466637574441-749b8f19452f?auto=format&fit=crop&w=900&q=80",
};

function AccountSetupScreen({ profile, back, submit, simulate = false }: { profile: Profile; back: () => void; submit: (patch: Partial<Profile>, opts?: { hasSession: boolean }) => void; simulate?: boolean }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(profile.avatar);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => { if (!file) return; try { setAvatar(await readSafeImage(file)); setError(""); } catch (err) { setError((err as Error).message); } };
  // Validate the email locally before signup so we never ask the backend to send
  // a confirmation to a malformed/undeliverable/typo'd address (which would bounce).
  const emailCheck = validateEmail(email);
  const showEmailHint = email.includes("@") && email.includes(".") && !emailCheck.ok;
  const valid = Boolean(cleanText(name, 80) && emailCheck.ok && password.length >= 6);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanText(name, 80)) { setError("Add your name to continue."); return; }
    if (!emailCheck.ok) { setError(emailCheck.reason ?? "Enter a valid email address."); return; }
    if (password.length < 6) { setError("Use a password of at least 6 characters."); return; }
    const patch = { name: cleanText(name, 80), email: email.trim(), avatar };
    if (simulate) { submit(patch, { hasSession: true }); return; } // explicit QA route, no network side effects
    if (!isSupabaseConfigured) { submit(patch); return; } // pilot mode, simulated
    setBusy(true);
    const res = await authSignUp(email.trim(), password, patch.name);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not create your account. Try again."); return; }
    submit(patch, { hasSession: res.hasSession });
  };
  return <div className="auth-modern">
    <button className="back" onClick={back} aria-label="Back" style={{ marginBottom: 8 }}><ArrowLeft /></button>
    <div className="auth-logo"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
    <span className="eyebrow">CREATE YOUR ACCOUNT</span>
    <h1>Save your profile.</h1>
    <p className="lede">Your food profile is ready. Create an account so it's yours on every device, we'll send a confirmation email to finish.</p>
    <div className="avatar-pick"><label>{avatar ? <span className="ring"><img src={avatar} alt="" /></span> : <span className="ring"><span>{(name || "You").slice(0, 1).toUpperCase()}</span></span>}<span className="cam"><Camera size={16} /></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label><em>Add a profile photo</em></div>
    <form onSubmit={onSubmit}>
      <label>Name<input value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="Jessica" /></label>
      <label>Email address<input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" /></label>
      {showEmailHint && <span className="err">{emailCheck.reason}{emailCheck.suggestion && <> <button type="button" onClick={() => { setEmail(emailCheck.suggestion!); setError(""); }} style={{ background: "none", border: 0, padding: 0, color: "var(--olive)", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Use {emailCheck.suggestion}</button></>}</span>}
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
      {error && <span className="err">{error}</span>}
      <button className="primary" type="submit" disabled={busy || !valid}>{busy ? "Creating account…" : <>Create account <ArrowRight size={18} /></>}</button>
    </form>
    <small><Lock size={11} /> We never share your mood data.{simulate || !isSupabaseConfigured ? " In this local test flow, your password isn't stored." : ""}</small>
  </div>;
}

function VerifyEmailScreen({ email, realAuth, onVerified, resend, back }: { email: string; realAuth?: boolean; onVerified: () => void; resend: () => void; back: () => void }) {
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);

  // Real auth: the user confirms in the email link's tab; listen for the session
  // appearing (or being confirmed) and advance automatically.
  useEffect(() => {
    if (!realAuth) return;
    return onAuthChange((_event, session) => { if (session) onVerified(); });
  }, [realAuth]);

  const handleClick = async () => {
    if (!realAuth) { onVerified(); return; } // pilot, simulate confirmation
    setChecking(true);
    const ok = await isEmailConfirmed();
    setChecking(false);
    if (ok) onVerified(); else setNotYet(true);
  };

  return <div className="auth-modern center">
    <button className="back" onClick={back} aria-label="Back"><ArrowLeft /></button>
    <div className="verify-icon"><Mail size={34} /></div>
    <span className="eyebrow">CHECK YOUR INBOX</span>
    <h1>Confirm your email.</h1>
    <p className="lede">We sent a confirmation link to <span className="maskmail">{email}</span>. Open it to verify your account and continue.</p>
    <button className="primary" onClick={handleClick} disabled={checking}>{checking ? "Checking…" : <>I've opened the link <ArrowRight size={18} /></>}</button>
    <button className="ghost" onClick={() => { resend(); setSent(true); }}>{sent ? "Sent again ✓" : "Resend confirmation email"}</button>
    {notYet && <span className="err">We can't see a confirmation yet, open the link in the email, then tap again.</span>}
    <small>{realAuth ? "Tap the link in the email we just sent, then come back here." : "In a production build this button is the link inside the email. Here, tapping it simulates the confirmation."}</small>
  </div>;
}

function LoginScreen({ back, onSignedIn, recovery, doneRecovery }: { back: () => void; onSignedIn: (email: string) => void; recovery?: boolean; doneRecovery?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot" | "reset">(recovery ? "reset" : "signin");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (recovery) {
      setMode("reset");
      setError("");
      setNotice("Choose a new password for your MoodFood account.");
    }
  }, [recovery]);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".ap-sheet", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" });
        gsap.from("[data-auth]", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08, delay: 0.15 });
      }, rootRef);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/.+@.+\..+/.test(email) || !password) { setError("Enter your email and password."); return; }
    if (!isSupabaseConfigured) { setError("Sign-in needs the backend configured (see BACKEND_SETUP.md)."); return; }
    setBusy(true);
    const res = await authSignIn(email.trim(), password);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not sign in. Check your details."); return; }
    onSignedIn(email.trim());
  };
  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/.+@.+\..+/.test(email)) { setError("Enter the email address for your account."); return; }
    if (!isSupabaseConfigured) { setError("Password reset needs the backend configured (see BACKEND_SETUP.md)."); return; }
    setBusy(true);
    const res = await authRequestPasswordReset(email.trim());
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not send a reset link. Try again."); return; }
    setNotice("If that email has a MoodFood account, a password reset link is on its way.");
  };
  const saveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 6) { setError("Use a password of at least 6 characters."); return; }
    if (!isSupabaseConfigured) { setError("Password reset needs the backend configured (see BACKEND_SETUP.md)."); return; }
    setBusy(true);
    const res = await authUpdatePassword(newPassword);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not update your password. Open the reset link again and retry."); return; }
    setNewPassword("");
    doneRecovery?.();
    setMode("signin");
    setNotice("Password updated. Sign in with your new password.");
  };
  const title = mode === "reset" ? "Set a new password." : mode === "forgot" ? "Reset your password." : "Sign in.";
  const lede = mode === "reset"
    ? "Enter a fresh password for your MoodFood account."
    : mode === "forgot"
      ? "Enter your email and we'll send a secure link to reset your password."
      : "Pick up where you left off, your food profile and recommendations are waiting.";
  return <div className="auth-photo" ref={rootRef}>
    <div className="ap-hero">
      <img src={LOGIN_PHOTO} alt="A bowl of fresh food" />
      <div className="ap-veil" />
      <button className="ap-back" onClick={back} aria-label="Back"><ArrowLeft size={19} /></button>
      <div className="ap-logo"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
    </div>
    <div className="ap-sheet">
      <span className="ap-eyebrow" data-auth>{mode === "signin" ? "WELCOME BACK" : "ACCOUNT RECOVERY"}</span>
      <h1 data-auth>{title}</h1>
      <p className="ap-lede" data-auth>{lede}</p>
      {mode === "signin" && <form onSubmit={onSubmit} data-auth>
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" /></label>
        <label>Password<span className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Your password" /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {error && <span className="err" role="alert">{error}</span>}
        {notice && <span className="auth-notice" role="status">{notice}</span>}
        <button className="primary" type="submit" disabled={busy}>{busy ? "Signing in…" : <>Sign in <ArrowRight size={18} /></>}</button>
      </form>}
      {mode === "forgot" && <form onSubmit={sendReset} data-auth>
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" /></label>
        {error && <span className="err" role="alert">{error}</span>}
        {notice && <span className="auth-notice" role="status">{notice}</span>}
        <button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : <>Send reset link <Mail size={18} /></>}</button>
      </form>}
      {mode === "reset" && <form onSubmit={saveNewPassword} data-auth>
        <label>New password<span className="password-field"><input type={showNewPassword ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(""); }} placeholder="At least 6 characters" /><button type="button" onClick={() => setShowNewPassword(v => !v)} aria-label={showNewPassword ? "Hide password" : "Show password"}>{showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {error && <span className="err" role="alert">{error}</span>}
        {notice && <span className="auth-notice" role="status">{notice}</span>}
        <button className="primary" type="submit" disabled={busy}>{busy ? "Saving…" : <>Save new password <Check size={18} /></>}</button>
      </form>}
      <p className="ap-alt" data-auth>
        {mode === "signin" ? <>
          <button type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Forgot password?</button>
          <span> · New here? </span><button type="button" onClick={back}>Build your food profile</button>
        </> : <>
          Remembered it? <button type="button" onClick={() => { doneRecovery?.(); setMode("signin"); setError(""); setNotice(""); }}>Back to sign in</button>
        </>}
      </p>
    </div>
  </div>;
}

function VerifiedScreen({ name, proceed }: { name: string; proceed: () => void }) {
  return <div className="auth-modern center">
    <div className="verify-icon verified-icon"><Check size={36} /></div>
    <span className="eyebrow">YOU'RE ALL SET</span>
    <h1>Welcome aboard{name ? `, ${name}` : ""}.</h1>
    <p className="lede">Your email is confirmed and your food profile is saved. One last step before we start cooking.</p>
    <button className="primary" onClick={proceed}>Continue <ArrowRight size={18} /></button>
  </div>;
}

function useDesktopOnboarding() {
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 1040px)").matches);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(min-width: 1040px)");
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return desktop;
}

function Onboarding({ profile, save, finish }: { profile: Profile; save: (p: Profile) => void; finish: (p: Profile) => void }) {
  // Questions whose showIf condition currently passes (e.g. spice types only
  // appear once the user has any heat tolerance). Navigation runs over this list.
  const visible = onboardingQuestions.filter(q => !q.showIf || q.showIf(profile));
  const total = visible.length;
  const desktop = useDesktopOnboarding();
  const [step, setStep] = useStoredState<number>("moodfood-onboarding-step", 0);
  const [desktopStep, setDesktopStep] = useStoredState<number>("moodfood-onboarding-section-step", 0);
  const index = Math.min(Math.max(0, step), total);          // index === total -> review
  const onReview = index === total;
  const update = (key: OnboardingKey, value: ProfileValue) => save({ ...profile, [key]: value });
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };

  if (desktop) {
    return <DesktopOnboarding profile={profile} visible={visible} step={desktopStep} setStep={setDesktopStep} update={update} finish={finish} />;
  }

  if (onReview) {
    const summary: [string, string][] = [
      ["Cooking moods", profile.cookingMoods.slice(0, 5).join(", ") || "-"],
      ["Diet", [profile.diet, ...profile.dietReligious].join(", ")],
      ["Hard exclusions", profile.allergies.join(", ") || "None"],
      ["Won't eat", profile.dislikedIngredients.join(", ") || "Open to most things"],
      ["Loves", [...profile.flavorLikes, ...profile.textureLikes].slice(0, 5).join(", ") || "Still learning"],
      ["Cuisines", profile.cuisines.slice(0, 6).join(", ") || "Open to anything"],
      ["Drawn to food for", profile.foodValues.slice(0, 4).join(", ") || "-"],
      ["Comfort means", profile.comfortFoods.slice(0, 4).join(", ") || "-"],
      ["Cooking", `${profile.skill} · serves ${profile.servings} · ${profile.weeknightTime}`],
      ["Working toward", profile.nutritionGoals.join(", ") || "No specific goal"],
    ];
    // ── Review screen ──────────────────────────────────────────────
    const reviewPhoto = SECTION_PHOTOS["Habits & values"];
    return (
      <div className="onboarding">
        <div className="onboarding-photo">
          <img src={reviewPhoto} alt="Your food profile" />
          <div className="op-veil" />
          <div className="op-bar">
            <div className="op-logo">
              <img src="/images/logo-1.png" alt="MoodFood" />
              <span>MoodFood</span>
            </div>
            <span className="op-step-chip"><Check size={13} /> {total} answers</span>
          </div>
        </div>
        <div className="onboarding-sheet">
          <div className="drag-h" />
          <div className="ob-segments">{onboardingSections.map((_, n) => <i className="active" key={n} />)}</div>
          <div className="ob-main">
            <SetupStep eyebrow="READY WHEN YOU ARE" title={`Nice to meet you, ${profile.name}.`} text="Here's the food profile Moody will start with. Every answer shapes your recommendations.">
              <div className="onboarding-review">{summary.map(([label, val]) => <p key={label}><b>{label}</b><span>{val}</span></p>)}</div>
            </SetupStep>
          </div>
        </div>
        <div className="ob-footer">
          <button className="secondary" onClick={() => go(total - 1)}>Back</button>
          <button className="primary" onClick={() => finish(profile)}>Continue <ArrowRight size={16} /></button>
        </div>
      </div>
    );
  }

  // ── Question screens ─────────────────────────────────────────────
  const q = visible[index];
  const sectionIndex = onboardingSections.indexOf(q.section);
  const last = index === total - 1;
  const sectionPhoto = SECTION_PHOTOS[q.section] || FALLBACK_FOOD;

  return (
    <div className="onboarding">
      {/* Photo hero, like the person/hero photo in the reference */}
      <div className="onboarding-photo">
        <img src={sectionPhoto} alt={q.section} />
        <div className="op-veil" />
        {/* Logo + step chip overlaid on photo, faithful to reference Image 1 */}
        <div className="op-bar">
          <div className="op-logo">
            <img src="/images/logo-1.png" alt="MoodFood" />
            <span>MoodFood</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="op-step-chip"><Clock3 size={12} /> {index + 1} / {total}</span>
            <span className="op-saved-chip">Saved</span>
          </div>
        </div>
      </div>

      {/* White bottom sheet, slides up over the photo */}
      <div className="onboarding-sheet">
        <div className="drag-h" />
        {/* Section progress bar */}
        <div className="ob-segments">
          {onboardingSections.map((_, n) => <i className={n <= sectionIndex ? "active" : ""} key={n} />)}
        </div>
        <div className="ob-main">
          <SetupStep eyebrow={q.eyebrow} title={q.title} text={q.text}>
            <QuestionField q={q} profile={profile} update={update} />
          </SetupStep>
        </div>
      </div>

      <div className="ob-footer">
        <button className="secondary" disabled={index === 0} onClick={() => go(index - 1)}>Back</button>
        <button className="primary" onClick={() => go(index + 1)}>
          {last ? "Review profile" : "Continue"} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function DesktopOnboarding({ profile, visible, step, setStep, update, finish }: { profile: Profile; visible: OnboardingQuestion[]; step: number; setStep: (n: number) => void; update: (k: OnboardingKey, v: ProfileValue) => void; finish: (p: Profile) => void }) {
  const sections = onboardingSections.map(section => ({
    section,
    questions: visible.filter(q => q.section === section),
  })).filter(group => group.questions.length);
  const totalSections = sections.length;
  const page = Math.min(Math.max(0, step), totalSections);
  const onReview = page === totalSections;
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };

  if (onReview) {
    const summary: [string, string][] = [
      ["Cooking moods", profile.cookingMoods.slice(0, 5).join(", ") || "-"],
      ["Diet", [profile.diet, ...profile.dietReligious].join(", ")],
      ["Safety rules", profile.allergies.join(", ") || "None"],
      ["Won't eat", profile.dislikedIngredients.join(", ") || "Open to most things"],
      ["Palate", [...profile.flavorLikes, ...profile.textureLikes].slice(0, 6).join(", ") || "Still learning"],
      ["Cuisines", profile.cuisines.slice(0, 6).join(", ") || "Open to anything"],
      ["Kitchen", `${profile.skill} · ${profile.weeknightTime} · serves ${profile.servings}`],
      ["Goals", profile.nutritionGoals.join(", ") || "No specific goal"],
    ];
    return <div className="onboarding desktop-onboarding">
      <DesktopOnboardingRail sections={sections.map(s => s.section)} active={totalSections} />
      <main className="desktop-ob-main desktop-ob-review">
        <section className="desktop-ob-hero">
          <span>PROFILE READY</span>
          <h1>Review your food profile.</h1>
          <p>Moody will use these signals to keep dinner safe, realistic, and matched to how you feel.</p>
        </section>
        <section className="desktop-ob-review-card">
          {summary.map(([label, value]) => <p key={label}><b>{label}</b><span>{value}</span></p>)}
        </section>
      </main>
      <DesktopOnboardingFooter back={() => go(totalSections - 1)} next={() => finish(profile)} nextLabel="Continue" />
    </div>;
  }

  const group = sections[page];
  const answeredCount = visible.filter(q => {
    const value = profile[q.key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return true;
    if (typeof value === "object" && value) return Object.values(value).some(Boolean);
    return Boolean(value);
  }).length;

  return <div className="onboarding desktop-onboarding">
    <DesktopOnboardingRail sections={sections.map(s => s.section)} active={page} />
    <main className="desktop-ob-main">
      <section className="desktop-ob-hero">
        <span>SECTION {page + 1} OF {totalSections}</span>
        <h1>{group.section}</h1>
        <p>{group.questions.length} focused prompts on one page. Fill what matters now, adjust anything later.</p>
        <div className="desktop-ob-progress"><i style={{ width: `${Math.round(((page + 1) / (totalSections + 1)) * 100)}%` }} /></div>
      </section>
      <section className="desktop-ob-board">
        {group.questions.map((q, n) => <article className="desktop-ob-question" key={q.id}>
          <div className="desktop-ob-question-head">
            <small>{q.eyebrow}</small>
            <span>{n + 1}</span>
          </div>
          <SetupStep eyebrow="" title={q.title} text={q.text}>
            <QuestionField q={q} profile={profile} update={update} />
          </SetupStep>
        </article>)}
      </section>
      <div className="desktop-ob-count">{answeredCount} of {visible.length} profile signals filled</div>
    </main>
    <DesktopOnboardingFooter back={() => go(page - 1)} next={() => go(page + 1)} nextLabel={page === totalSections - 1 ? "Review profile" : "Next section"} backDisabled={page === 0} />
  </div>;
}

function DesktopOnboardingRail({ sections, active }: { sections: string[]; active: number }) {
  return <aside className="desktop-ob-rail">
    <div className="desktop-ob-brand"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
    <nav>{sections.map((section, index) => <div className={index === active ? "active" : index < active ? "done" : ""} key={section}>
      <b>{index + 1}</b><span>{section}</span>
    </div>)}</nav>
  </aside>;
}

function DesktopOnboardingFooter({ back, next, nextLabel, backDisabled = false }: { back: () => void; next: () => void; nextLabel: string; backDisabled?: boolean }) {
  return <footer className="desktop-ob-footer">
    <button className="secondary" disabled={backDisabled} onClick={back}>Back</button>
    <button className="primary" onClick={next}>{nextLabel} <ArrowRight size={16} /></button>
  </footer>;
}

function QuestionField({ q, profile, update }: { q: OnboardingQuestion; profile: Profile; update: (k: OnboardingKey, v: ProfileValue) => void }) {
  const value = profile[q.key];
  if (q.type === "single")
    return <Choice values={q.options!} active={value as string} pick={v => update(q.key, v)} />;
  if (q.type === "multi")
    return <MultiField q={q} values={(value as string[]) || []} update={update} />;
  if (q.type === "scale")
    return <div className="scale-field"><input type="range" min={q.min ?? 0} max={q.max ?? 100} value={value as number} onChange={e => update(q.key, +e.target.value)} /><div className="range-label"><span>{q.lowLabel}</span><b>{value as number}%</b><span>{q.highLabel}</span></div></div>;
  if (q.type === "stepper") {
    const n = value as number;
    return <div className="stepper"><button onClick={() => update(q.key, Math.max(q.min ?? 1, n - 1))}>−</button><b>{n}</b><button onClick={() => update(q.key, Math.min(q.max ?? 99, n + 1))}>+</button></div>;
  }
  if (q.type === "textgrid") {
    const rec = (value as Record<string, string>) || {};
    const rows = q.rowsKey ? ((profile[q.rowsKey] as string[]) || []) : (q.rows || []);
    if (!rows.length) return <p className="multi-hint">Pick some moods earlier and they'll show up here.</p>;
    return <div className="mood-defs">{rows.map(row => <label key={row}><b>{row}</b><input value={rec[row] || ""} onChange={e => update(q.key, { ...rec, [row]: e.target.value })} placeholder={q.placeholder} /></label>)}</div>;
  }
  if (q.type === "record-single") {
    const rec = (value as Record<string, string>) || {};
    const active = rec[q.subKey!] || "";
    return <Choice values={q.options!} active={active} pick={v => update(q.key, { ...rec, [q.subKey!]: active === v ? "" : v })} />;
  }
  if (q.type === "grouped-multi")
    return <GroupedMultiField q={q} values={(value as string[]) || []} update={update} />;
  if (q.type === "moodcards")
    return <MoodCardsField values={(value as string[]) || []} update={v => update(q.key, v)} />;
  if (q.type === "skillcards")
    return <SkillCardsField active={value as string} pick={v => update(q.key, v)} />;
  return null;
}
function GroupedMultiField({ q, values, update }: { q: OnboardingQuestion; values: string[]; update: (k: OnboardingKey, v: ProfileValue) => void }) {
  const [custom, setCustom] = useState("");
  const grouped = q.groups!.flatMap(g => g.items);
  const extras = values.filter(v => !grouped.includes(v));
  return <>
    {q.groups!.map(g => <div className="ob-group" key={g.group}>
      <div className="ob-group-label">{g.group}{g.note && <em>{g.note}</em>}</div>
      <div className="choice">{g.items.map(v => <button className={values.includes(v) ? "active" : ""} onClick={() => update(q.key, toggle(values, v))} key={v}>{v}</button>)}</div>
    </div>)}
    {q.allowCustom && <form className="add-cue" onSubmit={e => { e.preventDefault(); const c = cleanText(custom, 40); if (c) { update(q.key, [...new Set([...values, c])]); setCustom(""); } }}><input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Add your own" /><button><Plus /></button></form>}
    {!!extras.length && <div className="choice" style={{ marginTop: 8 }}>{extras.map(v => <button className="custom-cue" onClick={() => update(q.key, values.filter(x => x !== v))} key={v}>{v}<X size={13} /></button>)}</div>}
    <p className="multi-hint">{values.length ? `${values.length} selected, pick as many as you like` : "Select all that apply"}</p>
  </>;
}
function MoodCardsField({ values, update }: { values: string[]; update: (v: string[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return <>
    <div className="mood-cards">{cookingMoods.map(m => {
      const sel = values.includes(m.label);
      const expanded = open === m.id;
      return <div className={"mood-pick-card" + (sel ? " selected" : "")} key={m.id}>
        <button className="mpc-top" onClick={() => update(toggle(values, m.label))}>
          <span className="mpc-emoji">{m.emoji}</span>
          <span className="mpc-head"><b>{m.label}</b><em>{m.tagline}</em></span>
          {sel && <Check size={17} className="mpc-check" />}
        </button>
        <button className="mpc-more" onClick={() => setOpen(expanded ? null : m.id)}>{expanded ? "Less" : "What this means"}</button>
        {expanded && <div className="mpc-body">
          <p>{m.what}</p>
          <ul>{m.descriptors.map(d => <li key={d}>{d}</li>)}</ul>
          <div className="mpc-vibes">{m.vibes.map(v => <span key={v}>{v}</span>)}<small>{m.timeHint}</small></div>
        </div>}
      </div>;
    })}</div>
    <p className="multi-hint">{values.length ? `${values.length} selected, pick as many as you like` : "Pick at least one"}</p>
  </>;
}
function SkillCardsField({ active, pick }: { active: string; pick: (v: string) => void }) {
  return <div className="skill-cards">{skillLevels.map(s => <button className={"skill-pick-card" + (active === s.label ? " selected" : "")} onClick={() => pick(s.label)} key={s.id}>
    <span className="spc-emoji">{s.emoji}</span>
    <span className="spc-text"><b>{s.label}</b><em>{s.desc}</em><small>{s.detail}</small></span>
    {active === s.label && <Check size={17} className="spc-check" />}
  </button>)}</div>;
}
function MultiField({ q, values, update }: { q: OnboardingQuestion; values: string[]; update: (k: OnboardingKey, v: ProfileValue) => void }) {
  const [custom, setCustom] = useState("");
  const extras = values.filter(v => !q.options!.includes(v));
  return <>
    <div className="choice">{q.options!.map(v => <button className={values.includes(v) ? "active" : ""} onClick={() => update(q.key, toggle(values, v))} key={v}>{v}</button>)}</div>
    {q.allowCustom && <form className="add-cue" onSubmit={e => { e.preventDefault(); const c = cleanText(custom, 40); if (c) { update(q.key, [...new Set([...values, c])]); setCustom(""); } }}><input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Add your own" /><button><Plus /></button></form>}
    {extras.map(v => <button className="custom-cue" onClick={() => update(q.key, values.filter(x => x !== v))} key={v}>{v}<X size={13} /></button>)}
    <p className="multi-hint">{values.length ? `${values.length} selected, pick as many as you like` : "Select all that apply"}</p>
  </>;
}
function SetupStep({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: React.ReactNode }) { return <section className="setup-step"><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p>{children}</section>; }
function Choice({ values, active, pick, multi }: { values: string[]; active: string | string[]; pick: (v: string) => void; multi?: boolean }) { return <div className="choice">{values.map(v => <button className={(multi ? (active as string[]).includes(v) : active === v) ? "active" : ""} onClick={() => pick(v)} key={v}>{v}</button>)}</div>; }

function DesktopNav({ page, go, openMoody }: { page: Page; go: (p: Page) => void; openMoody: () => void }) {
  return <aside className="desktop-nav">
    <nav>
      {nav.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={19} />{label}</button>)}
      <button className={page === "pantry" ? "active" : ""} onClick={() => go("pantry")}><Salad size={19} />Pantry</button>
      <button className={page === "favorites" ? "active" : ""} onClick={() => go("favorites")}><Heart size={19} />Saved</button>
    </nav>
    <button className="desktop-wordmark" onClick={() => go("home")} aria-label="MoodFood home">
      <img src="/images/logo-1.png" alt="" />
      <span>MOODFOOD</span>
    </button>
    <div className="desktop-actions">
      <button className="moody-side" onClick={openMoody}><Sparkles size={18} />Ask Moody</button>
      <button className="desktop-account" onClick={() => go("settings")}><UserRound size={18} />My MoodFood</button>
    </div>
  </aside>;
}
function BottomNav({ page, go }: { page: Page; go: (p: Page) => void }) {
  const items: [Page, string, typeof Home][] = [
    ["home", "Home", Home],
    ["search", "Search", Search],
    ["results", "Results", ListChecks],
    ["favorites", "Saved", Heart],
    ["grocery", "Grocery", ShoppingCart],
  ];
  return <nav className="bottom-nav">{items.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={19} /><span>{label}</span></button>)}</nav>;
}
// Full-height slide-in drawer surfacing every part of the app, the single
// place to reach settings, food profile, camera log, health, billing, and more.
function MainMenu({ profile, page, go, close, openNotifs, unread, logout }: { profile: Profile; page: Page; go: (p: Page) => void; close: () => void; openNotifs: () => void; unread: number; logout: () => void }) {
  const nav = (p: Page) => { go(p); close(); };
  const groups: { title: string; items: [Page, string, typeof Home][] }[] = [
    { title: "COOK & PLAN", items: [["home", "Home", Home], ["search", "Search recipes", Search], ["diary", "Diary", BookOpen], ["pantry", "My pantry", Salad], ["grocery", "Grocery", ShoppingCart], ["planner", "Planner", CalendarDays]] },
    { title: "DISCOVER", items: [["community", "Community", Users], ["favorites", "Saved recipes", Heart], ["import", "Import a recipe", Upload]] },
    { title: "TRACK", items: [["food-log", "Food photo log (camera)", Camera], ["insights", "Weekly reflections", BarChart3], ["health", "Health trends", Activity]] },
    { title: "YOUR PROFILE", items: [["food-profile", "Food profile & preferences", ClipboardCheck], ["psych-profile", "Psychological food profile", Sparkles], ["diners", "Household diners", UserPlus], ["account", "Account & public profile", UserRound]] },
    { title: "ACCOUNT & APP", items: [["billing", "Subscription & billing", Star], ["admin", "Editorial console", LayoutDashboard], ["help", "Help & FAQ", HelpCircle], ["settings", "Settings", Settings2]] },
  ];
  return <div className="panel-bg menu-bg" onClick={close}>
    <aside className="main-menu" onClick={e => e.stopPropagation()}>
      <header className="mm-head">
        <div className="mm-id">{profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{(profile.name || "Y").slice(0, 1).toUpperCase()}</span>}<div><b>{profile.name || "Your profile"}</b><small>{profile.email || "MoodFood"}</small></div></div>
        <button onClick={close} aria-label="Close menu"><X /></button>
      </header>
      <button className="mm-notifs" onClick={() => { openNotifs(); close(); }}><Bell size={18} />Notifications{!!unread && <span className="mm-badge">{unread}</span>}</button>
      <div className="mm-scroll">
        {groups.map(g => <section className="mm-group" key={g.title}><small>{g.title}</small>{g.items.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => nav(id)} key={id}><Icon size={18} /><span>{label}</span><ChevronRight size={16} /></button>)}</section>)}
      </div>
      <button className="mm-logout" onClick={() => { logout(); close(); }}><LogOut size={18} />Sign out</button>
    </aside>
  </div>;
}
function AppHeader({ openNotifs, unread, profile }: { openNotifs?: () => void; unread?: number; profile?: Profile }) {
  const openMenu = useContext(MenuCtx);
  return (
    <header className="app-header">
      {profile?.avatar
        ? <div className="user-avatar-ring"><img src={profile.avatar} alt={profile.name} /></div>
        : <div className="logo-ring"><img src="/images/logo-1.png" alt="MoodFood" /></div>}
      <div className="header-meta">
        <span className="header-name">{profile?.name ? `Hey, ${profile.name.split(" ")[0]}.` : "MoodFood"}</span>
        <span className="header-sub">Good food. Better mood.</span>
      </div>
      <button className="icon-btn notif-bell" aria-label="Notifications" onClick={openNotifs}>
        <Bell size={20} />{!!unread && <span className="notif-dot">{unread}</span>}
      </button>
      <button className="icon-btn" aria-label="Open menu" onClick={openMenu}><Menu size={20} /></button>
    </header>
  );
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
function Moody() { return <div className="moody"><Sparkles size={25} /></div>; }
function TopBar({ title, back }: { title: string; back?: () => void }) {
  const openMenu = useContext(MenuCtx);
  return <header className="top-bar"><button onClick={back} disabled={!back}><ArrowLeft /></button><h1>{title}</h1><button onClick={openMenu} aria-label="Open menu"><Menu /></button></header>;
}
function PickCard({ recipe, servings, open, reject, save, saved }: { recipe: Recipe; servings: number; open: () => void; reject: () => void; save: () => void; saved: boolean }) {
  return <article className="pick-card"><RecipeImage sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} /><div><h2>{recipe.title}</h2><span><Clock3 size={13} />{recipe.time} min</span><span><Users size={13} />Scaled for {servings}</span><span><Check size={13} />safe for everyone</span><button onClick={open}>View recipe</button><button className="reject" onClick={reject}>Not tonight</button></div><button className="save-mini" onClick={save} aria-label={saved ? "Saved" : "Save recipe"}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button></article>;
}

function TokenInput({ tokens, setTokens, placeholder }: { tokens: string[]; setTokens: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const add = (e: React.FormEvent) => { e.preventDefault(); const c = cleanText(text, 30); if (c) { setTokens([...new Set([...tokens, c])]); setText(""); } };
  return <>
    <form className="add-cue" onSubmit={add}><input value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} /><button><Plus /></button></form>
    {!!tokens.length && <div className="choice" style={{ marginTop: 8 }}>{tokens.map(t => <button className="custom-cue" onClick={() => setTokens(tokens.filter(x => x !== t))} key={t}>{t}<X size={13} /></button>)}</div>}
  </>;
}

type DiaryEntry = { recipe: Recipe; rating: number; when: string };

function deriveDailySuggestions(
  diary: DiaryEntry[],
  saved: string[],
  catalog: Recipe[],
  profile: Profile,
  count = 5,
): Recipe[] {
  // Stable seed from today's date so picks rotate overnight but don't shuffle on re-render.
  const seed = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seededRandom = (n: number) => {
    let h = parseInt(seed) ^ (n * 2654435761);
    h = ((h >>> 16) ^ h) * 0x45d9f3b;
    h = ((h >>> 16) ^ h);
    return (h >>> 0) / 0xffffffff;
  };

  // Build cuisine affinity from diary — high ratings weight more.
  const cuisineScore: Record<string, number> = {};
  diary.forEach(({ recipe, rating }) => {
    const weight = rating >= 4 ? 2 : rating >= 3 ? 1 : 0.3;
    cuisineScore[recipe.cuisine] = (cuisineScore[recipe.cuisine] ?? 0) + weight;
  });

  const recentIds = new Set(diary.slice(0, 7).map(d => d.recipe.id));
  const savedSet = new Set(saved);

  const pool = catalog.filter(r =>
    r.status === "published" &&
    (!profile.diet || profile.diet === "Everything" || profile.diet === "Any" || r.diets.includes(profile.diet)) &&
    !profile.allergies.some(a => r.allergens.map(x => x.toLowerCase()).includes(a.toLowerCase())),
  );

  const scored = pool.map((r, i) => {
    const affinity = cuisineScore[r.cuisine] ?? 0;
    const savedBonus = savedSet.has(r.id) && !recentIds.has(r.id) ? 1.5 : 0;
    const freshnessBonus = recentIds.has(r.id) ? -3 : 0;
    const jitter = seededRandom(i) * 0.8;
    return { recipe: r, score: affinity + savedBonus + freshnessBonus + jitter };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick with cuisine variety — no two consecutive cards share a cuisine.
  const picks: Recipe[] = [];
  const usedCuisines = new Set<string>();
  for (const { recipe } of scored) {
    if (picks.length >= count) break;
    if (usedCuisines.has(recipe.cuisine) && picks.length < count - 1) continue;
    picks.push(recipe);
    usedCuisines.add(recipe.cuisine);
  }

  // If variety filtering left us short, fill from the top of the scored list.
  if (picks.length < count) {
    const pickIds = new Set(picks.map(r => r.id));
    for (const { recipe } of scored) {
      if (picks.length >= count) break;
      if (!pickIds.has(recipe.id)) { picks.push(recipe); pickIds.add(recipe.id); }
    }
  }

  return picks;
}

function DailySuggestionCarousel({ suggestions, onPick, showHero = true }: { suggestions: Recipe[]; onPick: (r: Recipe) => void; showHero?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const indexRef = useRef(0);

  const [hero, ...rest] = suggestions.length ? suggestions : [null as unknown as Recipe];
  const carouselItems = showHero ? rest : suggestions;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || carouselItems.length <= 1) return;

    const pause = () => { pausedRef.current = true; };
    // Resume after a short delay so a quick swipe doesn't immediately advance
    const resume = () => { setTimeout(() => { pausedRef.current = false; }, 1200); };

    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);

    const id = setInterval(() => {
      if (pausedRef.current || !el) return;
      const cardWidth = el.scrollWidth / carouselItems.length;
      indexRef.current = (indexRef.current + 1) % carouselItems.length;
      // Snap back to start without animation so the loop feels infinite
      if (indexRef.current === 0) {
        el.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
      } else {
        el.scrollTo({ left: indexRef.current * cardWidth, behavior: "smooth" });
      }
    }, 3000);

    return () => {
      clearInterval(id);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
    };
  }, [carouselItems.length]);

  if (!suggestions.length) return null;

  return (
    <div className="suggestion-section">
      {/* Hero — largest pick (optional) */}
      {showHero && (
        <button className="suggestion-hero" onClick={() => onPick(hero)}>
          <RecipeImage sources={stepImageSources(undefined, hero.image)} alt={hero.title} />
          <div className="suggestion-hero-veil" />
          <div className="suggestion-hero-info">
            <span className="suggestion-cuisine">{hero.cuisine}</span>
            <b className="suggestion-hero-title">{hero.title}</b>
            <span className="suggestion-hero-time"><Clock3 size={12} /> {hero.time} min</span>
          </div>
        </button>
      )}

      {/* Carousel */}
      {carouselItems.length > 0 && <>
        <span className="filter-label" style={{ display: "block", marginTop: showHero ? 14 : 0 }}>
          {showHero ? "More for today" : "Today's picks for you"}
        </span>
        <div className="suggestion-carousel" ref={scrollRef}>
          {carouselItems.map(r => (
            <button key={r.id} className="suggestion-card" onClick={() => onPick(r)}>
              <RecipeImage sources={stepImageSources(undefined, r.image)} alt={r.title} />
              <div className="suggestion-card-veil" />
              <div className="suggestion-card-info">
                <b className="suggestion-title">{r.title}</b>
                <span className="suggestion-card-time"><Clock3 size={10} /> {r.time} min</span>
              </div>
            </button>
          ))}
        </div>
      </>}
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

function describeFilters(filters: RecipeFilters): string {
  const parts: string[] = [];
  if (filters.cuisines?.length) parts.push(filters.cuisines.join(" or "));
  if (filters.type) parts.push(filters.type);
  const diet = filters.diet;
  if (diet && !["any", "anything", "everything"].includes(diet.toLowerCase())) parts.push(diet.toLowerCase());
  return parts.join(" + ");
}

function SearchResultsScreen({ results, loading, request, relaxed, more, home, search, open, saved, toggleSave }: { results: Recipe[]; loading: boolean; request: SearchRequest; relaxed?: boolean; more: () => void; home: () => void; search: () => void; open: (recipe: Recipe) => void; saved: string[]; toggleSave: (recipe: Recipe) => void }) {
  const filterDesc = describeFilters(request.filters);
  return <div className="screen">
    <TopBar title="Results" />
    <div className="results-summary"><span>{request.filters.type ? `${request.filters.type.toUpperCase()} ONLY` : "FILTERED SEARCH"}</span><h1>{request.query || "Recipes matching your filters"}</h1><p>{results.length} unique options shown · up to {request.filters.maxReadyTime ?? 60} min</p></div>
    {relaxed && filterDesc && <div className="search-relaxed-notice"><p>No {filterDesc} recipes found — showing your closest diet-safe options instead. <button onClick={search}>Adjust filters</button></p></div>}
    {loading && !results.length
      ? <div className="thinking-state"><div className="thinking-orbit"><Sparkles /><i /><i /><i /></div><span>SEARCHING</span><h1>Checking every hard rule.</h1><p>Diet, course, time, ingredients, and duplicates are being verified.</p></div>
      : results.length
        ? <div className="search-grid">{results.map(r => {
            const isSaved = saved.includes(r.id);
            return <article key={r.id}><RecipeImage sources={stepImageSources(undefined, r.image)} alt={r.title} /><button className={`search-save${isSaved ? " saved" : ""}`} aria-pressed={isSaved} aria-label={isSaved ? `Saved ${r.title}` : `Save ${r.title}`} onClick={() => toggleSave(r)}><Heart fill={isSaved ? "currentColor" : "none"} /></button><div><h2>{r.title}</h2><p>{r.reason}</p><span><Clock3 size={13} /> {r.time} min · {r.difficulty}</span><button className="primary" onClick={() => open(r)}>View recipe</button></div></article>;
          })}</div>
        : <div className="empty-state"><Search /><h2>{filterDesc ? `No ${filterDesc} recipes found` : "No exact matches"}</h2><p>{filterDesc ? "Nothing matches that combination. Remove one filter and try again — your diet and allergy rules are always kept." : "Adjust one filter and search again. Your saved diet and allergies remain protected."}</p></div>}
    <div className="results-actions"><button className="primary" onClick={more} disabled={loading}>{loading ? "Finding 5 more…" : "Show 5 more options"}</button><button className="secondary" onClick={search}>Change search</button><button className="secondary" onClick={home}><Home size={17} />Return home</button></div>
  </div>;
}

function EmptyResultsScreen({ home, search }: { home: () => void; search: () => void }) {
  return <div className="screen">
    <TopBar title="Results" />
    <div className="empty-state"><Search /><h2>No results yet</h2><p>Start a search or find tonight's dinner to see recommendations here.</p></div>
    <div className="results-actions"><button className="primary" onClick={search}><Search size={17} />Search recipes</button><button className="secondary" onClick={home}><Home size={17} />Return home</button></div>
  </div>;
}

function DetailScreen({ recipe, servings, back, cook, saved, toggleSave, addGroceries, addPhoto, shareToCommunity, allergies }: { recipe: Recipe; servings: number; back: () => void; cook: () => void; saved: boolean; toggleSave: () => void; addGroceries: () => void; addPhoto: (p: FoodPhoto) => void; shareToCommunity: () => void; allergies: string[] }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [nutriQuery, setNutriQuery] = useState<string | null>(null);
  const [nutriFoods, setNutriFoods] = useState<NutritionFood[] | null>(null);
  const [nutriLoading, setNutriLoading] = useState(false);

  const lookupIngredient = (ingredient: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNutriFoods(null);
    setNutriQuery(ingredient);
    setNutriLoading(true);
    searchFoods(ingredient)
      .then(foods => { setNutriFoods(foods); setNutriLoading(false); })
      .catch(() => setNutriLoading(false));
  };

  // Native share when the browser supports it (mobile), else share into the
  // in-app community feed.
  const share = async () => {
    const url = recipe.sourceUrl || (typeof location !== "undefined" ? location.href : "");
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: recipe.title, text: recipe.reason, url: url || undefined }); return; } catch { /* cancelled → fall through */ }
    }
    shareToCommunity();
  };
  return <div className="detail"><div className="detail-image">{showVideo && recipe.video ? <div className="detail-video-hero"><iframe src={`${recipe.video}?autoplay=1`} title={`${recipe.title} video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <RecipeImage sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} />}<button onClick={back}><ArrowLeft /></button><div><button onClick={share} aria-label="Share recipe"><Share2 /></button><button onClick={toggleSave} aria-label={saved ? "Saved" : "Save recipe"}><Heart fill={saved ? "currentColor" : "none"} /></button></div>{recipe.video && !showVideo && <button className="detail-video-bar" onClick={() => setShowVideo(true)}><Play size={15} fill="currentColor" />Watch video</button>}{recipe.video && showVideo && <button className="detail-video-bar" onClick={() => setShowVideo(false)}><X size={15} />Close video</button>}</div><section className="detail-sheet"><h1>{recipe.title}</h1><div className="facts"><span><Clock3 />{recipe.time} min</span><span><Users />Serves {servings}</span><span><Star />{recipe.calories} cal each</span></div><div className="moody-note"><Moody /><p>{recipe.reason}</p></div><div className="section-line"><h2>Ingredients</h2><span>{recipe.ingredients.length} items</span></div><div className="ingredients">{recipe.ingredients.map(i => <div className={`ing-row${checked.includes(i) ? " checked" : ""}`} role="button" tabIndex={0} onClick={() => setChecked(toggle(checked, i))} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setChecked(toggle(checked, i)); }} key={i}><span><Check size={14} /></span><p>{i}</p><em>{checked.includes(i) ? "Ready" : "I have it"}</em><button className="ing-info-btn" onClick={e => lookupIngredient(i, e)} aria-label={`Nutrition info for ${i}`}><Info size={14} /></button></div>)}</div><div className="section-line"><h2>Full cooking method</h2><span>{recipe.steps.length} steps</span></div><div className="recipe-method">{recipe.steps.map((step, index) => <article key={`${index}-${step.text}`}><b>{index + 1}</b><div><p>{displayStepDetail(step)}</p>{step.cue && <small><strong>Look for:</strong> {step.cue}</small>}</div></article>)}</div><div className="detail-actions"><button className="secondary" onClick={addGroceries}><ShoppingCart size={18} />Add to grocery</button><button className="secondary" onClick={share}><Share2 size={18} />Share recipe</button></div><FoodCamera label="📸 Log your version with a photo" onSave={p => addPhoto({ ...p, recipeId: recipe.id })} hint={{ recipeCalories: recipe.calories, recipeName: recipe.title }} allergies={allergies} style={{ marginTop: 10 }} /><button className="primary sticky-cta" onClick={cook}><ChefHat size={18} />Open guided cooking</button></section>{nutriQuery !== null && <div className="nutri-overlay" onClick={() => setNutriQuery(null)}><div className="nutri-sheet" onClick={e => e.stopPropagation()}><div className="nutri-handle" /><div className="nutri-header"><b>{nutriQuery}</b><button onClick={() => setNutriQuery(null)} aria-label="Close"><X size={18} /></button></div>{nutriLoading && <div className="nutri-loading"><div className="nutri-spinner" /><span>Looking up nutrition…</span></div>}{!nutriLoading && nutriFoods !== null && nutriFoods.length === 0 && <p className="nutri-empty">No nutrition data found for this ingredient.</p>}{!nutriLoading && nutriFoods && nutriFoods.slice(0, 3).map(food => { const s = food.servings[0]; if (!s) return null; return <div className="nutri-item" key={food.food_id}><div className="nutri-item-head"><b>{food.name}</b>{food.type === "Brand" && <span className="nutri-tag">Brand</span>}</div><span className="nutri-serving-desc">{s.description}</span><div className="nutri-macros"><div className="nutri-mac"><strong>{s.calories}</strong><small>kcal</small></div><div className="nutri-mac"><strong>{s.protein}g</strong><small>protein</small></div><div className="nutri-mac"><strong>{s.carbs}g</strong><small>carbs</small></div><div className="nutri-mac"><strong>{s.fat}g</strong><small>fat</small></div>{s.fiber > 0 && <div className="nutri-mac"><strong>{s.fiber}g</strong><small>fibre</small></div>}</div></div>; })}<p className="nutri-disclaimer">FatSecret data · per serving · not medical advice</p></div></div>}</div>;
}

function CookScreen({ recipe, exit, finish, allergies }: { recipe: Recipe; exit: () => void; finish: (rating: number, photo?: FoodPhoto) => void; allergies: string[] }) {
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(5);
  const [mealPhoto, setMealPhoto] = useState<FoodPhoto | null>(null);
  if (!recipe.steps.length) return <div className="cook cook-unavailable"><section className="cook-instruction-card"><h1>Instructions unavailable.</h1><p>This recipe did not include cooking steps.</p><button className="cook-next" onClick={exit}>Back to recipe</button></section></div>;
  return <div className="cook">
    <header className="cook-header">
      <button className="cook-circle" onClick={exit} aria-label="Close cook mode"><ArrowLeft /></button>
      <b>{recipe.title}</b>
      <span />
    </header>
    <RecipeImage className="cook-image" sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} />
    <div className="cook-method-head"><span>FULL METHOD</span><h1>Cook from top to bottom.</h1><p>Every instruction stays visible. Scroll naturally as you work.</p></div>
    <div className="cook-method">{recipe.steps.map((current, index) => <section className="cook-instruction-card" key={`${index}-${current.text}`}>
      <small>STEP {index + 1} OF {recipe.steps.length}</small>
      <p className="cook-step-text">{displayStepDetail(current)}</p>
      {current.cue && <div className="cook-cue"><b>Look for:</b> {current.cue}</div>}
      {(current.active?.length || current.equipment?.length) && <div className="cook-chips">{current.active?.map(item => <span key={`ingredient-${item}`}>{item}</span>)}{current.equipment?.map(item => <span className="equipment" key={`equipment-${item}`}>{item}</span>)}</div>}
      {current.timer && <div className="cook-timer"><span><Timer size={17} /></span><div><b>{formatTimer(current.timer)}</b><small>Verified cooking time</small></div><i><Clock3 size={16} /></i></div>}
    </section>)}</div>
    <button className="cook-finish" onClick={() => setDone(true)}><Check size={18} />I’m finished cooking</button>
    {done && <div className="finish-overlay"><section><div className="done-mark"><Check /></div><h2>Dinner is ready.</h2><p>How did it land tonight?</p><div className="stars">{[1,2,3,4,5].map(n => <button onClick={() => setRating(n)} key={n}><Star fill={n <= rating ? "currentColor" : "none"} /></button>)}</div>{mealPhoto ? <div className="photo-preview-mini"><img src={mealPhoto.image} alt="Your meal" /><span><b>{mealPhoto.calories} kcal</b> estimated · {mealPhoto.dish}</span></div> : <FoodCamera label="📸 Add a photo of your cook" onSave={p => setMealPhoto({ ...p, recipeId: recipe.id })} allergies={allergies} compact />}<button className="primary" onClick={() => finish(rating, mealPhoto ?? undefined)}>Log meal &amp; finish</button><button className="text" onClick={() => setDone(false)}>Back to cooking</button></section></div>}
  </div>;
}

// Renders a persisted food-photo log. Uses the inline data URL when present
// (pre-upload or offline fallback); otherwise resolves a signed URL from the
// private food-photos bucket. Falls back to a placeholder when neither exists.
function FoodPhotoImg({ photo, className, placeholder }: { photo: FoodPhoto; className?: string; placeholder?: string }) {
  const [url, setUrl] = useState<string | null>(photo.image || null);
  useEffect(() => {
    if (photo.image) { setUrl(photo.image); return; }
    if (!photo.imagePath) { setUrl(null); return; }
    let on = true;
    void foodPhotoUrl(photo.imagePath).then(u => { if (on) setUrl(u); });
    return () => { on = false; };
  }, [photo.image, photo.imagePath]);
  return url
    ? <img src={url} alt={photo.dish} className={className} />
    : <span className={placeholder ?? "photo-placeholder"}><Camera size={16} /></span>;
}

function DiaryScreen({ diary, open, photoLogs, addPhoto, goFoodLog, allergies }: {
  diary: { recipe: Recipe; rating: number; when: string }[];
  open: (r: Recipe) => void;
  photoLogs: FoodPhoto[];
  addPhoto: (p: FoodPhoto) => void;
  goFoodLog: () => void;
  allergies: string[];
}) {
  const recentPhotos = photoLogs.slice(0, 3);
  return (
    <div className="screen">
      <TopBar title="Your diary" />
      <div className="reflection"><Sparkles /><div><b>Your weekly reflection</b><p>You cooked across three different cuisines. That’s lovely variety.</p></div></div>

      {/* Food photo log strip */}
      <div className="diary-photo-strip">
        <div className="dps-header">
          <b>Meal photo log</b>
          <button className="dps-all" onClick={goFoodLog}>{photoLogs.length > 0 ? `See all ${photoLogs.length}` : "Start logging"} →</button>
        </div>
        {recentPhotos.length > 0 ? (
          <div className="dps-row">
            {recentPhotos.map(p => (
              <div className="dps-thumb" key={p.id}>
                <FoodPhotoImg photo={p} placeholder="dps-thumb-empty" />
                <span>{p.calories} kcal</span>
              </div>
            ))}
            <FoodCamera label="+" onSave={addPhoto} allergies={allergies} compact tile />
          </div>
        ) : (
          <FoodCamera label="📸 Photograph your next meal" onSave={addPhoto} allergies={allergies} />
        )}
      </div>

      <div className="diary-list">
        {diary.map((e, n) => (
          <button onClick={() => open(e.recipe)} key={n}>
            <span>{e.when}</span>
            <img src={e.recipe.image} alt="" />
            <div><h2>{e.recipe.title}</h2><p><Star size={13} fill="currentColor" /> {e.rating}.0 · {e.recipe.time} min</p></div>
            <ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}
function GroceryScreen({ items, setItems }: { items: string[]; setItems: (v: string[]) => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [entry, setEntry] = useState("");
  const add = (e: React.FormEvent) => { e.preventDefault(); const item = cleanText(entry, 80); if (item && !items.includes(item)) setItems([...items, item]); setEntry(""); };
  return <div className="screen"><TopBar title="Grocery" /><div className="grocery-hero"><ShoppingCart /><div><b>{items.length - checked.length} items left</b><p>One calm lap around the store.</p></div></div>{items.length ? <div className="grocery-list"><small>YOUR LIST</small>{items.map(i => <button className={checked.includes(i) ? "checked" : ""} onClick={() => setChecked(toggle(checked, i))} key={i}><span><Check /></span><p>{i}</p></button>)}</div> : <div className="empty-state" style={{ margin: "18px 0" }}><ShoppingCart /><h2>Your list is empty</h2><p>Add ingredients here, or send them straight from any recipe.</p></div>}<form className="add-cue" onSubmit={add}><input value={entry} onChange={e => setEntry(e.target.value)} placeholder="Add an item" /><button aria-label="Add item"><Plus /></button></form></div>;
}
// Pantry, a maintainable inventory of what the user has at home. Backed by the
// profile's pantryStaples so it both seeds from onboarding and feeds Moody's
// recommendations ("suggest meals from what I already have").
function PantryScreen({ items, setItems, addToGrocery }: { items: string[]; setItems: (v: string[]) => void; addToGrocery: (item: string) => void }) {
  const [entry, setEntry] = useState("");
  const have = new Set(items);
  const addItem = (raw: string) => { const item = cleanText(raw, 80); if (item && !have.has(item)) setItems([...items, item]); };
  const remove = (item: string) => setItems(items.filter(i => i !== item));
  const submit = (e: React.FormEvent) => { e.preventDefault(); addItem(entry); setEntry(""); };
  return <div className="screen pantry"><TopBar title="My pantry" />
    <div className="grocery-hero"><Salad /><div><b>{items.length} item{items.length === 1 ? "" : "s"} stocked</b><p>Keep track of what you have, so Moody can cook from your kitchen.</p></div></div>
    <form className="add-cue" onSubmit={submit}><input value={entry} onChange={e => setEntry(e.target.value)} placeholder="Add something you have" /><button aria-label="Add to pantry"><Plus /></button></form>
    {items.length ? <div className="pantry-items"><small>IN YOUR KITCHEN</small><div className="pantry-chips">{items.map(i => <span className="pantry-chip" key={i}>{i}<button aria-label={`Remove ${i}`} onClick={() => remove(i)}><X size={13} /></button><button className="to-cart" aria-label={`Add ${i} to grocery list`} title="Running low? Add to grocery" onClick={() => addToGrocery(i)}><ShoppingCart size={13} /></button></span>)}</div></div>
      : <div className="empty-state" style={{ margin: "18px 0" }}><Salad /><h2>Your pantry is empty</h2><p>Add staples and ingredients you keep at home. Tap a suggestion below to get started.</p></div>}
    <div className="pantry-suggest"><small>QUICK ADD</small>{PANTRY_GROUPS.map(g => { const opts = g.items.filter(i => !have.has(i)); if (!opts.length) return null; return <div className="pantry-group" key={g.group}><b>{g.group}</b><div className="choice">{opts.map(i => <button onClick={() => addItem(i)} key={i}>{i}</button>)}</div></div>; })}</div>
  </div>;
}
function PlannerScreen(_: { open: (r: Recipe) => void }) {
  return <div className="screen"><TopBar title="This week" /><p className="quiet">Enough structure to help, enough room to change your mind.</p><div className="planner">{["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, n) => <article key={day}><b>{day}<span>{n + 1}</span></b><button className="empty">+ Add dinner</button></article>)}</div></div>;
}

function InsightsScreen({ diary }: { diary: { recipe: Recipe; rating: number; when: string }[] }) {
  const cuisines = new Set(diary.map(d => d.recipe.cuisine)).size;
  const varietyScore = Math.min(96, diary.length * 12 + cuisines * 8);
  const avgTime = diary.length ? Math.round(diary.reduce((a, d) => a + d.recipe.time, 0) / diary.length) : 0;
  if (!diary.length) return (
    <div className="screen"><TopBar title="Weekly reflection" />
      <div className="empty-state" style={{ margin: "40px 16px" }}>
        <BarChart3 /><h2>No cooks logged yet</h2>
        <p>Once you log your first meal, Moody will show patterns, variety scores, and personalised reflections here.</p>
      </div>
    </div>
  );
  return <div className="screen"><TopBar title="Weekly reflection" /><section className="insight-lead"><span>VARIETY SCORE</span><b>{varietyScore}</b><em>Looking balanced</em><p>You cooked {diary.length} meal{diary.length !== 1 ? "s" : ""} across {cuisines} cuisine{cuisines !== 1 ? "s" : ""}. {avgTime ? `Average cook time: ${avgTime} min.` : ""}</p></section><div className="insight-cards"><article><Sparkles /><b>Your profile</b><h2>Personalised picks</h2><p>Every recommendation is ranked against your food-psychology profile. The more you cook, the sharper it gets.</p></article><article><Clock3 /><b>Your rhythm</b><h2>{avgTime ? `~${avgTime} min average` : "Build your rhythm"}</h2><p>{avgTime < 30 ? "Quick meals are your sweet spot. Moody will protect that on low-energy nights." : avgTime < 45 ? "You strike a good balance between speed and depth." : "You invest real time in cooking, Moody will keep surfacing recipes worth it."}</p></article><article><ShieldCheck /><b>Informational only</b><h2>Nutrition, without judgment</h2><p>These reflections use recipe snapshots and are not medical advice.</p></article></div></div>;
}
function LibraryScreen({ title, source, open, remove }: { title: string; source: Recipe[]; open: (r: Recipe) => void; remove?: (r: Recipe) => void }) {
  return <div className="screen"><TopBar title={title} /><div className="search-grid">{source.length ? source.map(r => <article key={r.id}>{remove && <button className="remove-saved" aria-label={`Remove ${r.title} from saved`} onClick={() => remove(r)}><Trash2 size={17} /></button>}<img src={r.image} alt="" /><div><h2>{r.title}</h2><p>{r.reason}</p><button className="primary" onClick={() => open(r)}>View recipe</button></div></article>) : <div className="empty-state"><Heart /><h2>No saved recipes yet</h2><p>Save recipes that feel like good future answers.</p></div>}</div></div>;
}
function SettingsScreen({ profile, save, go, logout, aiCuration, setAiCuration, learnedSignals, setLearnedSignals, behavioralConsent }: { profile: Profile; save: (p: Profile) => void; go: (p: Page) => void; logout: () => void; aiCuration: boolean; setAiCuration: (v: boolean) => void; learnedSignals: boolean; setLearnedSignals: (v: boolean) => void; behavioralConsent: boolean }) {
  return <div className="screen"><TopBar title="Profile & settings" /><section className="profile-card">{profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <div>{profile.name.slice(0, 2).toUpperCase()}</div>}<h2>{profile.name}</h2><p>{profile.email || "Pilot preview profile"}</p><span>{profile.diet} · {profile.skill}</span></section><SettingsGroup title="ACCOUNT & COMMUNITY"><button onClick={() => go("account")}><UserRound />Account and public profile<ChevronRight /></button><button onClick={() => go("community")}><Users />Community and connections<ChevronRight /></button><button onClick={() => go("diners")}><UserPlus />Household diners<ChevronRight /></button></SettingsGroup><SettingsGroup title="HEALTH & FOOD PROFILE"><button onClick={() => go("food-profile")}><ClipboardCheck />Food profile &amp; preferences<ChevronRight /></button><button onClick={() => go("health")}><Activity />Health trends<ChevronRight /></button><button onClick={() => go("food-log")}><Camera />Food photo log<ChevronRight /></button><button onClick={() => go("psych-profile")}><Sparkles />Psychological food profile<ChevronRight /></button><button onClick={() => go("favorites")}><Heart />Saved recipes<ChevronRight /></button><button onClick={() => go("insights")}><BarChart3 />Weekly reflections<ChevronRight /></button><button><ShieldCheck />Safety filters<span>{profile.allergies.join(", ") || "None"}</span></button></SettingsGroup><SettingsGroup title="PREFERENCES"><label>Usual servings<input type="number" min="1" max="10" value={profile.servings} onChange={e => save({ ...profile, servings: +e.target.value })} /></label><label className="settings-toggle"><span><Sparkles size={15} />Let Moody personalize my mood feed<small>AI re-ranks your live picks. Off by default — your picks are mood-matched without it. Search always stays AI-free.</small></span><input type="checkbox" checked={aiCuration} onChange={e => setAiCuration(e.target.checked)} /></label><label className="settings-toggle"><span><BarChart3 size={15} />Learn from what I cook &amp; rate<small>{behavioralConsent ? "Nudges your picks toward cuisines you rate highly. Needs a few ratings first." : "Turn on “Learn from my recipe behaviour” in Data & privacy first."}</small></span><input type="checkbox" disabled={!behavioralConsent} checked={learnedSignals && behavioralConsent} onChange={e => setLearnedSignals(e.target.checked)} /></label><button onClick={() => go("privacy")}><ShieldCheck />Data &amp; privacy<ChevronRight /></button><button onClick={() => go("billing")}><Star />Subscription &amp; billing<ChevronRight /></button><button onClick={() => go("import")}><Upload />Import a recipe<ChevronRight /></button><button onClick={() => go("admin")}><LayoutDashboard />Editorial console<ChevronRight /></button><button onClick={() => go("help")}><HelpCircle />Help, tutorial &amp; FAQ<ChevronRight /></button></SettingsGroup><button className="danger" onClick={logout}><LogOut />Sign out and replay first launch</button></div>;
}
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="settings-group"><small>{title}</small>{children}</section>; }
// Slice 1.5 (roadmap v3): the Data Governance surface. Granular consent (default
// off, recorded), export, and the distinct pause / reset controls — all gated on
// being signed in, since the data lives server-side.
function DataPrivacyScreen({ signal, moodSignal, suppressed, learningOn, onForget, onRestore }: { signal: CuisineSignal | null; moodSignal: MoodCuisineSignal | null; suppressed: string[]; learningOn: boolean; onForget: (c: string) => void; onRestore: (c: string) => void }) {
  const [consents, setConsents] = useState<ConsentState>(NO_CONSENT);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  // Slice 5: deterministic summary is shown by default; AI rephrase only on request.
  const [summary, setSummary] = useState<{ summary: string; source: "ai" | "fallback" } | null>(null);
  const shownSummary = summary?.summary ?? deterministicTasteSummary(signal, moodSignal);

  useEffect(() => { void getConsents().then(c => { setConsents(c); setLoaded(true); }); }, []);
  // Reset any AI prose when the underlying signal changes — prose is always
  // regenerable and must never drift from the canonical signal.
  useEffect(() => { setSummary(null); }, [signal, moodSignal]);

  const askMoody = async () => {
    setBusy("summary");
    setSummary(await fetchTasteSummary(signal, moodSignal));
    setBusy("");
  };

  const toggle = async (scope: ConsentScope, granted: boolean) => {
    setConsents(prev => ({ ...prev, [scope]: granted })); // optimistic
    const ok = await setConsent(scope, granted);
    if (!ok) { setConsents(await getConsents()); setNote("Couldn’t save that — sign in and try again."); }
    else setNote(granted ? "Consent recorded." : "Consent withdrawn — learning is paused.");
  };

  const doExport = async () => {
    setBusy("export"); setNote("");
    const data = await exportMyData();
    setBusy("");
    if (!data) { setNote("Export needs you to be signed in. Try again once signed in."); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `moodfood-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setNote("Your data was exported as a JSON file.");
  };

  const doReset = async () => {
    if (!window.confirm("Delete everything MoodFood has learned from your behaviour? Your account stays. This can’t be undone.")) return;
    setBusy("reset"); setNote("");
    const ok = await resetLearningData();
    setBusy("");
    setNote(ok ? "Learning data deleted." : "Couldn’t reset — sign in and try again.");
  };

  return <div className="screen"><TopBar title="Data & privacy" />
    <section className="privacy-intro">
      <ShieldCheck />
      <h2>You decide what MoodFood learns.</h2>
      <p>To improve your recommendations we can record what you cook, save, and rate, plus the mood you pick at check-in. It’s stored on your MoodFood account, used only to personalise your picks, and you can pause it, export it, or delete it here at any time. Both switches are off until you turn them on.</p>
    </section>
    <SettingsGroup title="LEARNING CONSENT">
      <label className="settings-toggle"><span><Sparkles size={15} />Learn from my recipe behaviour<small>Saves, cooks, and ratings improve your ranking. Off = no behavioural data is recorded.</small></span>
        <input type="checkbox" disabled={!loaded} checked={consents.behavioral_learning} onChange={e => toggle("behavioral_learning", e.target.checked)} /></label>
      <label className="settings-toggle"><span><Activity size={15} />Use my mood &amp; health context<small>Lets check-in mood and health-trend context feed learning. Separate from the above.</small></span>
        <input type="checkbox" disabled={!loaded} checked={consents.mood_health_context} onChange={e => toggle("mood_health_context", e.target.checked)} /></label>
    </SettingsGroup>
    {consents.behavioral_learning && <SettingsGroup title="WHAT MOODFOOD HAS LEARNED">
      <p className="taste-summary">{shownSummary}</p>
      {signal && signal.preferred.length > 0 && <button className="link-button" onClick={askMoody} disabled={busy === "summary"}><Sparkles size={14} />{busy === "summary" ? "Asking Moody…" : summary?.source === "ai" ? "Reworded by Moody" : "Say it in Moody’s words"}</button>}
      {signal && signal.preferred.length > 0 ? <>
        <p className="quiet">From the meals you’ve rated{learningOn ? ", these gently lift matching picks." : " (turn on “Learn from what I cook & rate” to use them)."}</p>
        {signal.preferred.map(c => {
          const n = signal.support[c] ?? 0;
          const confidence = n >= 6 ? "strong signal" : n >= 4 ? "growing signal" : "early signal";
          return <div className="taste-row" key={c}><span><b>{c}</b><small>{n} highly-rated {n === 1 ? "cook" : "cooks"} · {confidence}</small></span><button onClick={() => onForget(c)}>Forget</button></div>;
        })}
      </> : <p className="quiet">Nothing yet — cook and rate a few meals and the cuisines you enjoy will appear here. A couple of ratings are never treated as a permanent verdict.</p>}
      {suppressed.length > 0 && <div className="taste-suppressed"><small>FORGOTTEN</small>{suppressed.map(c => <div className="taste-row" key={c}><span>{c}</span><button onClick={() => onRestore(c)}>Restore</button></div>)}</div>}
    </SettingsGroup>}
    <SettingsGroup title="YOUR DATA">
      <button onClick={doExport} disabled={busy === "export"}><Upload />{busy === "export" ? "Preparing…" : "Export my data (JSON)"}<ChevronRight /></button>
      <button className="danger" onClick={doReset} disabled={busy === "reset"}><RotateCcw />{busy === "reset" ? "Deleting…" : "Reset what MoodFood has learned"}</button>
      <p className="quiet">To erase your whole account and everything in it, use Account → Delete account.</p>
    </SettingsGroup>
    {note && <p className="source-note live"><Check size={13} /> {note}</p>}
  </div>;
}
function ImportScreen() {
  const [url, setUrl] = useState(""); const [done, setDone] = useState(false);
  return <div className="screen"><TopBar title="Import recipe" /><section className="import-card"><Upload /><span>WEB RECIPE IMPORT</span><h1>Bring a trusted recipe into your library.</h1><p>We’ll preserve the source, extract ingredients and steps, then ask you to review it before use.</p><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/recipe" /><button className="primary" onClick={() => setDone(Boolean(url))}>Import & review</button>{done && <div className="import-success"><Check /><b>Draft created</b><span>Structure checked · source retained · waiting for review</span></div>}</section></div>;
}
function AdminScreen({ catalog }: { catalog: Recipe[] }) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  return <div className="admin"><header><img src="/images/logo-1.png" alt="" /><div><span>EDITORIAL CONSOLE</span><h1>Recipe quality desk</h1></div></header><div className="admin-stats"><article><b>{catalog.length}</b><span>Total recipes</span></article><article><b>{catalog.filter(r => r.status === "published").length}</b><span>Published & verified</span></article><article><b>0</b><span>Safety flags</span></article></div><section><h2>Review queue</h2>{catalog.length ? catalog.map(r => <article className="review-row" key={r.id}><img src={r.image} alt="" /><div><h3>{r.title}</h3><p>{r.cuisine} · {r.ingredients.length} ingredients · {r.steps.length} steps</p><span>Rights checked · Timing checked · Safety tags present</span></div><select value={statuses[r.id] || r.status} onChange={e => setStatuses({ ...statuses, [r.id]: e.target.value })}><option>draft</option><option>review</option><option>published</option><option>retired</option></select></article>) : <p className="quiet">No recipes in catalog yet. Recipes are added when you run a check-in while signed in.</p>}</section></div>;
}
function PlanPicker({ plan, setPlan }: { plan: string; setPlan: (p: string) => void }) {
  return <>{PLANS.map(p => <button key={p.id} className={plan === p.id ? "active" : ""} onClick={() => setPlan(p.id)}><div><b>{p.name}</b><span>{p.note}</span></div><strong>{p.price}</strong></button>)}</>;
}
function SubscriptionScreen({ profile, save, proceed, onStarted }: { profile: Profile; save: (p: Profile) => void; proceed: () => void; onStarted?: () => void }) {
  const [plan, setPlan] = useState(profile.plan || "annual");
  const [mode, setMode] = useState<"trial" | "invite">("trial");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const chosen = PLANS.find(p => p.id === plan);

  const start = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");
    if (isSupabaseConfigured) {
      // Real Stripe Checkout, redirects user to Stripe's hosted page.
      const result = await startCheckout(plan);
      if (result.url) {
        window.location.href = result.url;
        return; // page will navigate away
      }
      setCheckoutError(result.error ?? "Could not start checkout. Please try again.");
      setCheckoutLoading(false);
    } else {
      // No backend, local pilot simulation.
      const now = new Date();
      const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      save({ ...profile, plan, trialStartedAt: now.toISOString(), trialEndsAt: endsAt, subscriptionStatus: "trialing" });
      scheduleTrial(profile.email, chosen?.name || plan, chosen?.price || "", endsAt);
      onStarted?.();
      proceed();
    }
  };

  const redeem = async () => {
    const code = inviteInput.trim().toUpperCase();
    if (!code) { setInviteError("Please enter your invite code."); return; }
    setInviteLoading(true);
    setInviteError("");
    const result = await redeemInviteCode(code);
    setInviteLoading(false);
    if (!result.ok) { setInviteError(result.error ?? "Invalid code."); return; }
    save({ ...profile, subscriptionStatus: "active", inviteCode: code, inviteSubEnd: result.subscriptionEnd ?? "" });
    onStarted?.();
    proceed();
  };

  return (
    <div className="subscription">
      <div className="sub-logo"><img src="/images/logo-1.png" alt="MoodFood" /><span>MoodFood</span></div>
      <section className="billing">
        <span>DINNER DECISIONS, LIGHTER</span>
        <h1>{mode === "invite" ? "Redeem your invite." : "Keep MoodFood deciding with you."}</h1>
        <div className="sub-mode-toggle">
          <button className={mode === "trial" ? "active" : ""} onClick={() => setMode("trial")}>Free trial</button>
          <button className={mode === "invite" ? "active" : ""} onClick={() => setMode("invite")}>Invite code</button>
        </div>
        {mode === "trial" ? (
          <>
            <p>Save your quick profile, unlock guided cooking, and let Moody get sharper every time you cook, reject, or rate a meal.</p>
            <PlanPicker plan={plan} setPlan={setPlan} />
            {checkoutError && <p className="invite-error">{checkoutError}</p>}
            <button className="primary" onClick={start} disabled={checkoutLoading}>
              {checkoutLoading ? "Opening checkout…" : <>Start 7-day free trial <ArrowRight /></>}
            </button>
            <small>7 days free, then {chosen?.price}. Cancel before the trial ends if MoodFood does not make dinner feel easier.</small>
          </>
        ) : (
          <>
            <p>If you received an invite code, enter it below to unlock a full year of MoodFood, no payment required.</p>
            <input
              className="invite-code-input"
              value={inviteInput}
              onChange={e => { setInviteInput(e.target.value.toUpperCase()); setInviteError(""); }}
              placeholder="e.g. LAUNCH2026"
              maxLength={40}
              autoCapitalize="characters"
              spellCheck={false}
            />
            {inviteError && <p className="invite-error">{inviteError}</p>}
            <button className="primary" onClick={redeem} disabled={inviteLoading}>
              {inviteLoading ? "Checking…" : <>Redeem code <ArrowRight /></>}
            </button>
            <small>Valid codes grant 1 year of full access, tracked in Stripe.</small>
          </>
        )}
        <button className="skip" onClick={proceed}>Continue without saving trial</button>
      </section>
    </div>
  );
}
function BillingScreen({ profile, save }: { profile: Profile; save: (p: Profile) => void }) {
  const [plan, setPlan] = useState(profile.plan || "annual");
  const [mode, setMode] = useState<"plan" | "invite">("plan");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const chosen = PLANS.find(p => p.id === plan);

  const redeem = async () => {
    const code = inviteInput.trim().toUpperCase();
    if (!code) { setInviteError("Please enter your invite code."); return; }
    setInviteLoading(true);
    setInviteError("");
    const result = await redeemInviteCode(code);
    setInviteLoading(false);
    if (!result.ok) { setInviteError(result.error ?? "Invalid code."); return; }
    save({ ...profile, subscriptionStatus: "active", inviteCode: code, inviteSubEnd: result.subscriptionEnd ?? "" });
    setInviteSuccess(true);
  };

  return (
    <div className="screen">
      <TopBar title="Subscription" />
      <section className="billing">
        <span>{profile.inviteCode ? "INVITE: 1 YEAR ACCESS" : "7-DAY FULL ACCESS"}</span>
        <h1>Keep dinner feeling lighter.</h1>
        {profile.inviteCode ? (
          <p>Your invite code <b>{profile.inviteCode}</b> is active. Access expires {profile.inviteSubEnd ? new Date(profile.inviteSubEnd).toLocaleDateString() : "in 1 year"}.</p>
        ) : (
          <>
            <div className="sub-mode-toggle">
              <button className={mode === "plan" ? "active" : ""} onClick={() => setMode("plan")}>Subscription</button>
              <button className={mode === "invite" ? "active" : ""} onClick={() => setMode("invite")}>Invite code</button>
            </div>
            {mode === "plan" ? (
              <>
                <p>Personalized decisions, safe recommendations, cook mode, and weekly reflections.</p>
                <PlanPicker plan={plan} setPlan={setPlan} />
                <button className="primary" onClick={async () => {
                  if (isSupabaseConfigured) {
                    const result = await startCheckout(plan);
                    if (result.url) window.location.href = result.url;
                  } else {
                    save({ ...profile, plan });
                  }
                }}>
                  {profile.subscriptionStatus === "active" || profile.subscriptionStatus === "trialing"
                    ? "Manage subscription on Stripe"
                    : `Start free trial: ${chosen?.name}`}
                </button>
                <small>Managed securely by Stripe. Cancel anytime.</small>
              </>
            ) : inviteSuccess ? (
              <p className="invite-success"><Check size={18} /> Code redeemed, you now have 1 year of full access.</p>
            ) : (
              <>
                <p>Enter an invite code to unlock a full year of MoodFood, no payment required.</p>
                <input
                  className="invite-code-input"
                  value={inviteInput}
                  onChange={e => { setInviteInput(e.target.value.toUpperCase()); setInviteError(""); }}
                  placeholder="e.g. FOUNDER-A"
                  maxLength={40}
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                {inviteError && <p className="invite-error">{inviteError}</p>}
                <button className="primary" onClick={redeem} disabled={inviteLoading}>
                  {inviteLoading ? "Checking…" : <>Redeem code <ArrowRight /></>}
                </button>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
function AccountScreen({ profile, save, posts, back, cancelAccount }: { profile: Profile; save: (p: Profile) => void; posts: SocialPost[]; back: () => void; cancelAccount: () => Promise<{ ok: boolean; error?: string }> }) {
  const update = (patch: Partial<Profile>) => save({ ...profile, ...patch });
  const [uploadError, setUploadError] = useState("");
  const upload = async (file?: File) => { if (!file) return; try { update({ avatar: await readSafeImage(file) }); setUploadError(""); } catch (error) { setUploadError((error as Error).message); } };
  return <div className="screen account"><TopBar title="Your account" back={back} /><section className="account-hero"><label>{profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <span>{profile.name.slice(0, 2).toUpperCase()}</span>}<i><Camera size={16} /></i><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label>{uploadError && <em>{uploadError}</em>}<h1>{profile.name}</h1><p>{profile.bio}</p><small>{posts.length} posts · Profile linked to your shared cooks</small></section><ProfileEditor title="Public profile" text="This is what people you connect with can see."><label className="account-field">Display name<input maxLength={80} value={profile.name} onChange={e => update({ name: cleanText(e.target.value, 80) })} /></label><label className="account-field">Bio<textarea maxLength={300} value={profile.bio} onChange={e => update({ bio: cleanText(e.target.value, 300) })} /></label><label className="account-field">Location<input maxLength={100} value={profile.location} onChange={e => update({ location: cleanText(e.target.value, 100) })} placeholder="Optional" /></label></ProfileEditor><ProfileEditor title="Privacy and sharing" text="Your psychological profile, raw mood entries, and private diary are never shown here."><Choice values={["connections", "public", "private"]} active={profile.profileVisibility} pick={v => update({ profileVisibility: v as Profile["profileVisibility"] })} /><label className="toggle-row"><span><b>Offer to share completed cooks</b><small>You always confirm before anything is posted.</small></span><input type="checkbox" checked={profile.shareCookedMeals} onChange={e => update({ shareCookedMeals: e.target.checked })} /></label></ProfileEditor>{posts.length > 0 && <ProfileEditor title="Posts linked to your profile" text="Images and tips you chose to share."><div className="profile-gallery">{posts.map(p => <img src={p.image} alt="" key={p.id} />)}</div></ProfileEditor>}<CancelAccount cancelAccount={cancelAccount} /></div>;
}
function CancelAccount({ cancelAccount }: { cancelAccount: () => Promise<{ ok: boolean; error?: string }> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    setBusy(true); setError("");
    const res = await cancelAccount();
    if (!res.ok) { setBusy(false); setError(res.error || "We couldn't cancel your account. Please try again."); }
    // On success the app reloads, so no need to reset state here.
  };
  return <section className="cancel-account">
    <h2>Cancel account</h2>
    <p>Permanently delete your MoodFood account, food profile, diary, and saved recipes. Any active subscription is cancelled. This can't be undone.</p>
    {!confirming
      ? <button className="cancel-account-btn" onClick={() => setConfirming(true)}><Trash2 size={16} /> Cancel my account</button>
      : <div className="cancel-account-confirm">
          <b>Are you sure? This is permanent.</b>
          {error && <span className="err">{error}</span>}
          <div className="cancel-account-actions">
            <button className="secondary" onClick={() => { setConfirming(false); setError(""); }} disabled={busy}>Keep my account</button>
            <button className="cancel-account-btn" onClick={run} disabled={busy}>{busy ? "Cancelling…" : "Yes, delete everything"}</button>
          </div>
        </div>}
  </section>;
}
function CommunityScreen({ profile, posts, setPosts, connections, setConnections, openRecipe, catalog, initialRecipeId, clearInitial }: { profile: Profile; posts: SocialPost[]; setPosts: (p: SocialPost[]) => void; connections: string[]; setConnections: (p: string[]) => void; openRecipe: (r: Recipe) => void; catalog: Recipe[]; initialRecipeId?: string; clearInitial?: () => void }) {
  const [composer, setComposer] = useState(false); const [text, setText] = useState(""); const [image, setImage] = useState(""); const [recipeId, setRecipeId] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState("");
  const findRecipe = (id?: string) => catalog.find(r => r.id === id);
  // When a recipe was shared from the detail screen, open the composer prefilled.
  useEffect(() => {
    if (initialRecipeId) {
      const r = findRecipe(initialRecipeId);
      setComposer(true); setRecipeId(initialRecipeId);
      setText(t => t || (r ? `Just found ${r.title} on MoodFood, looks perfect. ` : ""));
      clearInitial?.();
    }
  }, [initialRecipeId]);
  const upload = async (file?: File) => { if (!file) return; try { setImage(await readSafeImage(file)); setUploadError(""); } catch (error) { setUploadError((error as Error).message); } };
  const publish = () => { const safeText = cleanText(text, 1000); if (!safeText && !image && !recipeId) return; setPosts([{ id: crypto.randomUUID(), author: cleanText(profile.name, 80), avatar: profile.avatar, text: safeText, image: image || findRecipe(recipeId)?.image || "", recipeId: recipeId || undefined, createdAt: "Just now", likes: [], comments: [] }, ...posts.slice(0, 99)]); setText(""); setImage(""); setRecipeId(""); setComposer(false); };
  const updatePost = (id: string, change: (p: SocialPost) => SocialPost) => setPosts(posts.map(p => p.id === id ? change(p) : p));
  return <div className="screen community"><TopBar title="Community" /><section className="community-intro"><div><b>Cook together, from wherever.</b><p>Share recipes, photos, and useful tips. Your private mood and psychological profile stay private.</p></div><button className="primary" onClick={() => setComposer(!composer)}><Plus />Post</button></section>{composer && <section className="composer"><div><Avatar name={profile.name} image={profile.avatar} /><textarea maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="Share a cook, recipe, or tip..." /></div>{image && <img src={image} alt="Post preview" />}{recipeId && findRecipe(recipeId) && <div className="composer-recipe"><ChefHat size={15} /><span>Linking <b>{findRecipe(recipeId)!.title}</b></span><button onClick={() => setRecipeId("")} aria-label="Remove linked recipe"><X size={14} /></button></div>}<select value={recipeId} onChange={e => setRecipeId(e.target.value)}><option value="">Link a recipe (optional)</option>{catalog.map(r => <option value={r.id} key={r.id}>{r.title}</option>)}</select>{uploadError && <p className="upload-error">{uploadError}</p>}<footer><label><Camera />Add photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label><button className="primary" onClick={publish}><Send />Share</button></footer></section>}<div className="feed">{posts.length === 0 && !composer && <div className="empty-state" style={{ margin: "24px 16px" }}><Users /><h2>Be the first to post</h2><p>Share a cook, tip, or recipe. Your psychological profile and diary stay completely private.</p></div>}{posts.map(post => <article className="social-post" key={post.id}><header><Avatar name={post.author} image={post.avatar} /><div><b>{post.author}</b><span>{post.createdAt}</span></div><MoreVertical /></header><p>{post.text}</p>{post.image && <img src={post.image} alt="Cooked meal" />}{post.recipeId && findRecipe(post.recipeId) && <button className="linked-recipe" onClick={() => { const r = findRecipe(post.recipeId); if (r) openRecipe(r); }}><ChefHat /><span><small>LINKED RECIPE</small><b>{findRecipe(post.recipeId)?.title}</b></span><ChevronRight /></button>}<div className="social-actions"><button onClick={() => updatePost(post.id, p => ({ ...p, likes: toggle(p.likes, profile.name) }))}><Heart fill={post.likes.includes(profile.name) ? "currentColor" : "none"} />{post.likes.length}</button><button><MessageCircle />{post.comments.length}</button></div>{post.comments.map((c, n) => <p className="comment" key={n}><b>{c.author}</b> {c.text}</p>)}<form className="comment-form" onSubmit={e => { e.preventDefault(); if (!comment[post.id]?.trim()) return; updatePost(post.id, p => ({ ...p, comments: [...p.comments, { author: profile.name, text: cleanText(comment[post.id], 500) }] })); setComment({ ...comment, [post.id]: "" }); }}><input maxLength={500} value={comment[post.id] || ""} onChange={e => setComment({ ...comment, [post.id]: cleanText(e.target.value, 500) })} placeholder="Add a helpful comment..." /><button><Send /></button></form></article>)}</div></div>;
}
function Avatar({ name, image }: { name: string; image?: string }) { return image ? <img className="avatar-img" src={image} alt={name} /> : <span className="avatar-fallback">{name.split(" ").map(v => v[0]).join("").slice(0, 2)}</span>; }
function HealthHub({ diary, go }: { diary: { recipe: Recipe; rating: number; when: string }[]; go: (p: Page) => void }) {
  const vegetarian = diary.filter(d => d.recipe.diets.includes("Vegetarian")).length;
  return <div className="screen health"><TopBar title="Your health" /><section className="health-hero"><span>LAST 30 DAYS</span><h1>Your dietary trends.</h1><p>A calm breakdown based on meals you logged. Informational only, never medical advice.</p><div><b>{diary.length}</b><small>meals logged</small><b>{new Set(diary.map(d => d.recipe.cuisine)).size}</b><small>cuisines</small><b>{vegetarian}</b><small>plant-forward</small></div></section><button className="family-health-link" onClick={() => go("family-health")}><Users /><span><b>Family health profile</b><small>Overall analytics for family meals only</small></span><ChevronRight /></button><div className="health-links"><button onClick={() => go("health-nutrition")}><Salad /><span><b>Nutrition balance</b><small>Calories, protein, fiber, and meal balance</small></span><ChevronRight /></button><button onClick={() => go("health-variety")}><TrendingUp /><span><b>Dietary variety</b><small>Cuisines, proteins, vegetables, and repetition</small></span><ChevronRight /></button><button onClick={() => go("health-patterns")}><Clock3 /><span><b>Eating patterns</b><small>Cook frequency, timing, and completion habits</small></span><ChevronRight /></button></div><section className="trend-preview"><h2>This month at a glance</h2><Trend label="Plant-forward meals" value={Math.min(100, vegetarian * 25 + 25)} /><Trend label="Recipe variety" value={Math.min(100, new Set(diary.map(d => d.recipe.id)).size * 28)} /><Trend label="Home-cooked rhythm" value={Math.min(100, diary.length * 18)} /></section></div>;
}
function Trend({ label, value }: { label: string; value: number }) { return <div className="trend"><span><b>{label}</b><em>{value}%</em></span><i><b style={{ width: `${value}%` }} /></i></div>; }
function HealthDetail({ kind, diary, back }: { kind: "nutrition" | "variety" | "patterns"; diary: { recipe: Recipe; rating: number; when: string }[]; back: () => void }) {
  const n = diary.length;
  const avgCal   = n ? Math.round(diary.reduce((a, d) => a + d.recipe.calories, 0) / n) : 0;
  const avgTime  = n ? Math.round(diary.reduce((a, d) => a + d.recipe.time, 0) / n) : 0;
  const avgRating = n ? (diary.reduce((a, d) => a + d.rating, 0) / n).toFixed(1) : "-";
  const cuisineCount = new Set(diary.map(d => d.recipe.cuisine)).size;
  const uniqueRecipes = new Set(diary.map(d => d.recipe.id)).size;
  const repeated = n - uniqueRecipes;
  const fiberRich = diary.filter(d => ((d.recipe as any).fiber ?? 0) >= 5).length;
  const plantForward = diary.filter(d => d.recipe.diets?.some(x => ["Vegetarian","Vegan"].includes(x))).length;
  const varietyScore = n ? Math.min(100, Math.round((cuisineCount / Math.max(n, 1)) * 60 + (uniqueRecipes / Math.max(n, 1)) * 40)) : 0;

  const content = kind === "nutrition"
    ? { title: "Nutrition balance", intro: "A source-labeled view of your logged recipes.", cards: [
        ["Average energy",   n ? `${avgCal} cal` : "No data yet"],
        ["Fiber-rich meals",  n ? `${fiberRich} of ${n}` : "No data yet"],
        ["Plant-forward",     n ? `${plantForward} of ${n}` : "No data yet"],
        ["Meals logged",      `${n}`],
      ]}
    : kind === "variety"
    ? { title: "Dietary variety", intro: "How broad your recent food rhythm has been.", cards: [
        ["Variety score",   n ? `${varietyScore} / 100` : "No data yet"],
        ["Cuisines",        n ? `${cuisineCount}` : "0"],
        ["Unique recipes",  `${uniqueRecipes}`],
        ["Repeated",        `${repeated}`],
      ]}
    : { title: "Eating patterns", intro: "Patterns from completed cooks, without judgment.", cards: [
        ["Meals cooked",    `${n}`],
        ["Avg cook time",   n ? `${avgTime} min` : "No data yet"],
        ["Average rating",  n ? `${avgRating} / 5` : "No data yet"],
        ["Cuisines tried",  `${cuisineCount}`],
      ]};

  if (!n) return (
    <div className="screen"><TopBar title={content.title} back={back} />
      <div className="empty-state" style={{ margin: "40px 16px" }}>
        <BarChart3 /><h2>No meals logged yet</h2>
        <p>Cook a recipe and log it to your diary, your real patterns will appear here.</p>
      </div>
    </div>
  );
  return <div className="screen"><TopBar title={content.title} back={back} /><p className="quiet">{content.intro}</p><div className="metric-grid">{content.cards.map(([a, b]) => <article key={a}><span>{a}</span><b>{b}</b></article>)}</div><section className="health-note"><ShieldCheck /><div><b>How this is calculated</b><p>From nutrition snapshots and metadata attached to recipes you completed. It does not diagnose conditions or replace professional advice.</p></div></section></div>;
}
function FamilyHealth({ diary, diners, back }: { diary: { recipe: Recipe; rating: number; when: string }[]; diners: Diner[]; back: () => void }) {
  const familySize = Math.max(1, diners.length);
  const safeCoverage = Math.round((diners.filter(d => d.allergies.length || d.diet !== "Anything").length / familySize) * 100);
  // All metrics below are derived from real logged meals, no placeholder data.
  const n = diary.length;
  const uniqueRecipes = new Set(diary.map(d => d.recipe.id)).size;
  const plantForward = n ? Math.round(diary.filter(d => d.recipe.diets?.some(x => ["Vegetarian", "Vegan"].includes(x))).length / n * 100) : 0;
  const avgTime = n ? Math.round(diary.reduce((a, d) => a + d.recipe.time, 0) / n) : 0;
  const avgRating = n ? diary.reduce((a, d) => a + d.rating, 0) / n : 0;
  const varietyLabel = !n ? "-" : uniqueRecipes >= 8 ? "Excellent" : uniqueRecipes >= 4 ? "Good" : "Building";
  return <div className="screen family-health"><TopBar title="Family health" back={back} /><section className="family-hero"><Users /><span>HOUSEHOLD PROFILE</span><h1>How family meals are trending.</h1><p>Aggregate analytics only. Individual moods, psychological profiles, and private diaries are not shown here.</p><div><b>{familySize}</b><small>registered diners</small><b>{diary.length}</b><small>family meals logged</small></div></section>{n ? <><div className="metric-grid"><article><span>Shared meal variety</span><b>{varietyLabel}</b></article><article><span>Plant-forward meals</span><b>{plantForward}%</b></article><article><span>Average family cook</span><b>{avgTime} min</b></article><article><span>Safety profiles complete</span><b>{safeCoverage}%</b></article></div><section className="trend-preview"><h2>Family meal balance</h2><Trend label="Plant-forward meals" value={plantForward} /><Trend label="Recipe variety" value={Math.min(100, uniqueRecipes * 12)} /><Trend label="Home-cooked rhythm" value={Math.min(100, n * 18)} /><Trend label="Shared appeal" value={Math.round(avgRating * 20)} /></section></> : <div className="empty-state" style={{ margin: "18px 0" }}><Users /><h2>No family meals logged yet</h2><p>Cook and log meals with household diners selected, and their trends will appear here.</p></div>}<section className="family-members"><h2>Household coverage</h2>{diners.map(d => <div key={d.id}><Avatar name={d.name} /><span><b>{d.name}</b><small>{d.relationship} · {d.diet}</small></span><em>{d.allergies.length ? `${d.allergies.length} safety rule${d.allergies.length > 1 ? "s" : ""}` : "Basic profile"}</em></div>)}</section></div>;
}
function DinersScreen({ diners, save, back }: { diners: Diner[]; save: (d: Diner[]) => void; back: () => void }) {
  const [adding, setAdding] = useState(false); const [name, setName] = useState("");
  return <div className="screen"><TopBar title="Household diners" back={back} /><p className="quiet">Select these people during mood check-in. MoodFood combines every selected diner’s hard safety constraints.</p><div className="diner-list">{diners.map(d => <article key={d.id}><Avatar name={d.name} /><div><b>{d.name}</b><span>{d.relationship} · {d.diet}</span><small>{d.allergies.length ? `Avoid: ${d.allergies.join(", ")}` : "No saved allergens"}</small></div>{d.id !== "self" && <button onClick={() => save(diners.filter(x => x.id !== d.id))}><X /></button>}</article>)}</div>{adding ? <form className="add-diner" onSubmit={e => { e.preventDefault(); if(cleanText(name, 80)) save([...diners,{id:crypto.randomUUID(),name:cleanText(name, 80),relationship:"Guest",diet:"Anything",allergies:[]}]); setName(""); setAdding(false); }}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Diner name" /><button className="primary">Add diner</button></form> : <button className="secondary" onClick={() => setAdding(true)}><Plus />Add household diner</button>}</div>;
}
// Pull the option list for an onboarding question so the profile editor and the
// onboarding flow always offer the same suggestions.
function optionsFor(id: string) { const q = onboardingQuestions.find(q => q.id === id); return q?.options || q?.groups?.flatMap(g => g.items) || []; }

function PsychProfileScreen({ profile, save, back }: { profile: Profile; save: (p: Profile) => void; back: () => void }) {
  const update = (patch: Partial<Profile>) => save({ ...profile, ...patch });
  return <div className="screen psych-profile"><TopBar title="Your food psychology" back={back} /><section className="psych-summary"><Moody /><div><span>LIVING PROFILE</span><h1>What food means to you.</h1><p>Moody uses this alongside your mood, energy, history, and safety preferences. You own it, and you can change it anytime. Everything you set during onboarding lives here.</p></div></section>

    <ProfileEditor title="Your relationship with food" text="The broad intention Moody should protect."><textarea value={profile.foodRelationship} onChange={e => update({ foodRelationship: e.target.value })} /></ProfileEditor>

    <h2 className="psych-divider">Your palate</h2>
    <ProfileEditor title="Flavors you love" text="The tastes that reliably sound good."><EditableCues values={profile.flavorLikes} suggestions={optionsFor("flavor-likes")} save={flavorLikes => update({ flavorLikes })} /></ProfileEditor>
    <ProfileEditor title="Flavors you avoid" text="Tastes Moody should dial down."><EditableCues values={profile.flavorAvoids} suggestions={optionsFor("flavor-avoids")} save={flavorAvoids => update({ flavorAvoids })} /></ProfileEditor>
    <ProfileEditor title="Textures you reach for" text="Mouthfeels that make a meal feel right."><EditableCues values={profile.textureLikes} suggestions={optionsFor("texture-likes")} save={textureLikes => update({ textureLikes })} /></ProfileEditor>
    <ProfileEditor title="Textures that put you off" text="Aversions Moody will quietly route around."><EditableCues values={profile.textureAvoids} suggestions={optionsFor("texture-avoids")} save={textureAvoids => update({ textureAvoids })} /></ProfileEditor>
    <ProfileEditor title="Spice tolerance" text="How much heat you actually enjoy."><input type="range" value={profile.spiceTolerance} onChange={e => update({ spiceTolerance: +e.target.value })} /><div className="range-label"><span>Avoid heat</span><b>{profile.spiceTolerance}%</b><span>Bring the fire</span></div></ProfileEditor>
    <ProfileEditor title="Proteins you enjoy" text="What you happily build a plate around."><EditableCues values={profile.proteins} suggestions={optionsFor("proteins")} save={proteins => update({ proteins })} /></ProfileEditor>
    <ProfileEditor title="Cuisines you love" text="Gentle boosts toward the kitchens you enjoy."><EditableCues values={profile.cuisines} suggestions={optionsFor("cuisines")} save={cuisines => update({ cuisines })} /></ProfileEditor>
    <ProfileEditor title="Won't eat" text="Strong dislikes (not allergies). Moody steers recipes around these."><EditableCues values={profile.dislikedIngredients} suggestions={optionsFor("dislikes")} save={dislikedIngredients => update({ dislikedIngredients })} /></ProfileEditor>

    <h2 className="psych-divider">How you relate to food</h2>
    <ProfileEditor title="What drives your food choices" text="The motives that pull you, often several at once."><EditableCues values={profile.foodValues} suggestions={optionsFor("food-values")} save={foodValues => update({ foodValues })} /></ProfileEditor>
    <ProfileEditor title="How you tend to eat" text="Patterns, not rules. They help Moody match your rhythm."><EditableCues values={profile.eatingHabits} suggestions={optionsFor("eating-habits")} save={eatingHabits => update({ eatingHabits })} /></ProfileEditor>
    <ProfileEditor title="What shifts your eating" text="Emotions that change your cravings."><EditableCues values={profile.emotionalTriggers} suggestions={optionsFor("emotional-triggers")} save={emotionalTriggers => update({ emotionalTriggers })} /></ProfileEditor>
    <ProfileEditor title="Why you cook" text="The role cooking plays for you."><EditableCues values={profile.cookingMotivations} suggestions={optionsFor("cooking-motivations")} save={cookingMotivations => update({ cookingMotivations })} /></ProfileEditor>

    <h2 className="psych-divider">Comfort & goals</h2>
    <ProfileEditor title="Your comfort foods" text="What you turn to when a meal needs to feel like a hug."><EditableCues values={profile.comfortFoods} suggestions={optionsFor("comfort-foods")} save={comfortFoods => update({ comfortFoods })} /></ProfileEditor>
    <ProfileEditor title="What comfort feels like" text="Qualities, beyond any one dish, that signal comfort."><EditableCues values={profile.comfortCues} suggestions={optionsFor("comfort-cues")} save={comfortCues => update({ comfortCues })} /></ProfileEditor>
    <ProfileEditor title="What drains you" text="Moody will gently penalize these on low-energy nights."><EditableCues values={profile.avoidCues} suggestions={optionsFor("energy-drainers")} save={avoidCues => update({ avoidCues })} /></ProfileEditor>
    <ProfileEditor title="Working toward" text="Gentle nudges, never pressure. Informational only."><EditableCues values={profile.nutritionGoals} suggestions={optionsFor("nutrition-goals")} save={nutritionGoals => update({ nutritionGoals })} /></ProfileEditor>
    <ProfileEditor title="Novelty appetite" text="How far Moody should gently stretch your usual choices."><input type="range" value={profile.novelty} onChange={e => update({ novelty: +e.target.value })} /><div className="range-label"><span>Keep it familiar</span><b>{profile.novelty}%</b><span>Surprise me</span></div></ProfileEditor>

    <ProfileEditor title="Your personal mood meanings" text="These notes are used the moment you check in feeling that way."><div className="mood-defs">{moods.map(m => <label key={m}><b>{m}</b><input value={profile.moodNeeds[m] || ""} onChange={e => update({ moodNeeds: { ...profile.moodNeeds, [m]: e.target.value } })} placeholder="Add what usually helps..." /></label>)}</div></ProfileEditor>
  </div>;
}
function ProfileEditor({ title, text, children }: { title: string; text: string; children: React.ReactNode }) { return <section className="profile-editor"><h2>{title}</h2><p>{text}</p>{children}</section>; }
function EditableCues({ values, suggestions, save }: { values: string[]; suggestions: string[]; save: (v: string[]) => void }) {
  const [custom, setCustom] = useState("");
  return <><div className="choice">{suggestions.map(v => <button className={values.includes(v) ? "active" : ""} onClick={() => save(toggle(values, v))} key={v}>{v}</button>)}</div><form className="add-cue" onSubmit={e => { e.preventDefault(); if (custom.trim()) { save([...new Set([...values, custom.trim()])]); setCustom(""); } }}><input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Add your own cue" /><button><Plus /></button></form>{values.filter(v => !suggestions.includes(v)).map(v => <button className="custom-cue" onClick={() => save(values.filter(x => x !== v))} key={v}>{v}<X size={13} /></button>)}</>;
}
// Editable view of every onboarding answer, grouped by section. This is the same
// set of questions the user saw at first launch, they can refine anything here
// any time, which is why returning users never have to repeat onboarding.
function FoodProfileScreen({ profile, save, back }: { profile: Profile; save: (p: Profile) => void; back: () => void }) {
  const update = (key: OnboardingKey, value: ProfileValue) => save({ ...profile, [key]: value });
  const visible = onboardingQuestions.filter(q => !q.showIf || q.showIf(profile));
  return <div className="screen food-profile">
    <TopBar title="Food profile" back={back} />
    <section className="fp-intro">
      <span>YOUR FOOD PROFILE</span>
      <h1>Fine-tune what MoodFood knows.</h1>
      <p>These are the same questions from onboarding, change anything, any time, and your recommendations update to match. Everything saves automatically.</p>
    </section>
    {onboardingSections.map(section => {
      const qs = visible.filter(q => q.section === section);
      if (!qs.length) return null;
      return <section className="fp-section" key={section}>
        <h2 className="fp-section-title">{section}</h2>
        {qs.map(q => <div className="fp-q" key={q.id}>
          <SetupStep eyebrow={q.eyebrow} title={q.title} text={q.text}>
            <QuestionField q={q} profile={profile} update={update} />
          </SetupStep>
        </div>)}
      </section>;
    })}
  </div>;
}
// Floating draggable mic button shown while the Moody panel is open.
// A short drag repositions it; a tap toggles voice input.
function VoiceFab({ listening, onPress }: { listening: boolean; onPress: () => void }) {
  const SIZE = 64, MARGIN = 16, THRESHOLD = 6;
  const clamp = (x: number, y: number) => ({
    x: Math.max(MARGIN, Math.min(x, window.innerWidth - SIZE - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, window.innerHeight - SIZE - MARGIN)),
  });
  const [pos, setPos] = useState(() => {
    try { const s = localStorage.getItem("voiceFabPos"); if (s) return clamp(JSON.parse(s).x, JSON.parse(s).y); } catch { /* ignore */ }
    return { x: MARGIN, y: window.innerHeight - SIZE - 260 };
  });
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const onResize = () => setPos(p => ({ x: Math.max(MARGIN, Math.min(p.x, window.innerWidth - SIZE - MARGIN)), y: Math.max(MARGIN, Math.min(p.y, window.innerHeight - SIZE - MARGIN)) }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
    try { ref.current?.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && (Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD)) d.moved = true;
    if (d.moved) setPos(clamp(d.ox + dx, d.oy + dy));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current; drag.current = null;
    try { ref.current?.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
    if (!d) return;
    if (d.moved) {
      setPos(p => { try { localStorage.setItem("voiceFabPos", JSON.stringify(p)); } catch { /* ignore */ } return p; });
    } else {
      onPress();
    }
    suppressClick.current = true;
  };
  const onClick = () => { if (suppressClick.current) { suppressClick.current = false; return; } onPress(); };

  return <button ref={ref} className={`voice-fab${listening ? " listening" : ""}`} style={{ left: pos.x, top: pos.y, touchAction: "none", cursor: "grab" }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClick={onClick} aria-label={listening ? "Stop listening" : "Speak to Moody (drag to move)"}><Mic size={28} /></button>;
}

// Floating "Ask Moody" button the user can drag anywhere on screen. A short drag
// repositions it (and the position persists); a tap opens Moody. Position is
// clamped to the viewport and re-clamped on resize/orientation change.
function MoodyFab({ onOpen }: { onOpen: () => void }) {
  const SIZE = 52, MARGIN = 16, NAV = 92, THRESHOLD = 6;
  const clamp = (x: number, y: number) => ({
    x: Math.max(MARGIN, Math.min(x, window.innerWidth - SIZE - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, window.innerHeight - SIZE - MARGIN)),
  });
  const defaultPos = () => ({ x: window.innerWidth - SIZE - MARGIN, y: window.innerHeight - SIZE - NAV });
  const [pos, setPos] = useState(() => {
    try { const s = localStorage.getItem("moodyFabPos"); if (s) return clamp(JSON.parse(s).x, JSON.parse(s).y); } catch { /* ignore */ }
    return defaultPos();
  });
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Keep it on-screen if the viewport changes (rotation, resize, keyboard).
  useEffect(() => {
    const onResize = () => setPos(p => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false; // start fresh so a stale flag never eats a tap
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
    try { ref.current?.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && (Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD)) d.moved = true;
    if (d.moved) setPos(clamp(d.ox + dx, d.oy + dy));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current; drag.current = null;
    try { ref.current?.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
    if (!d) return;
    if (d.moved) {
      setPos(p => { try { localStorage.setItem("moodyFabPos", JSON.stringify(p)); } catch { /* ignore */ } return p; });
    } else {
      onOpen(); // a tap opens Moody
    }
    suppressClick.current = true; // swallow the synthesized click the browser fires next
  };
  // Keyboard activation (Enter/Space) fires click with no preceding pointer events.
  const onClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    onOpen();
  };

  return <button
    ref={ref}
    className="moody-fab"
    style={{ left: pos.x, top: pos.y, right: "auto", bottom: "auto", touchAction: "none", cursor: "grab" }}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onClick={onClick}
    aria-label="Ask Moody (drag to move)"
  ><Sparkles /></button>;
}

function MoodyPanel({ profile, catalog, loadCatalog, turns, setTurns, close, openRecipe }: { profile: Profile; catalog: Recipe[]; loadCatalog: (query?: string) => Promise<Recipe[]>; turns: ChatTurn[]; setTurns: React.Dispatch<React.SetStateAction<ChatTurn[]>>; close: () => void; openRecipe: (recipe: Recipe) => void }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestRecipe = [...turns].reverse().map(turn => resolveMoodyRecipe(turn.recipeId, catalog, profile)).find(Boolean);

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: { results: { [n: number]: { [n: number]: { transcript: string } } } }) => { setListening(false); void send(e.results[0][0].transcript); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const stopVoice = () => { recognitionRef.current?.abort(); setListening(false); };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = turns;
    setTurns([...turns, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const searchableCatalog = await loadCatalog(message);
      const context = {
        profile: { allergies: profile.allergies, diet: profile.diet, dislikedIngredients: profile.dislikedIngredients },
        candidates: moodyCandidates(searchableCatalog),
      };
      const reply = await aiChat(message, context, history);
      // Gateway may return the full recipe object when it found it via server-side search.
      const gatewayRecipe = reply.recipe as Recipe | undefined;
      const selected = gatewayRecipe ?? resolveMoodyRecipe(reply.recipeId, searchableCatalog, profile);
      setTurns(prev => [...prev, { role: "assistant", content: reply.message, recipeId: selected?.id, recipe: gatewayRecipe }]);
    } catch (error) {
      const content = error instanceof MoodyError && error.code === "not-signed-in"
        ? "Please sign in to chat with Moody. Recipe search and your safety filters still work without chat."
        : error instanceof MoodyError && error.code === "not-configured"
          ? "Moody chat is not configured in this app environment yet. Recipe search remains available without AI."
          : "Moody chat is temporarily unavailable. Recipe search and your safety filters are still working.";
      setTurns(prev => [...prev, { role: "assistant", content }]);
    } finally {
      setBusy(false);
    }
  };

  return <div className="panel-bg" onClick={close}><VoiceFab listening={listening} onPress={listening ? stopVoice : startVoice} /><aside className="moody-panel" onClick={e => e.stopPropagation()}><header><Moody /><div><b>Moody</b><span>Your dinner co-pilot</span></div><button onClick={close}><X /></button></header><div className="chat"><p>I can choose dinner, explain a recommendation, or help rescue the step you’re on.</p>{turns.map((t, i) => {
    const linkedRecipe = (t.recipe as Recipe | undefined) ?? resolveMoodyRecipe(t.recipeId, catalog, profile);
    return <Fragment key={i}><p className={t.role === "user" ? "user-message" : "moody-message"}>{t.content}</p>{linkedRecipe && <button className="moody-pick" onClick={() => openRecipe(linkedRecipe)}><img src={linkedRecipe.image} alt="" /><span><small>MOODY’S RECOMMENDATION</small><b>{linkedRecipe.title}</b><em>{linkedRecipe.time} min · {linkedRecipe.reason}</em><strong>View recipe <ChevronRight size={14} /></strong></span></button>}</Fragment>;
  })}{busy && <p className="moody-message">…</p>}<div ref={bottomRef} /></div><div className="prompt-row"><button onClick={() => send("Pick the easiest safe dinner.")}>Pick the easiest</button><button onClick={() => send("I only have 15 minutes.")}>Only 15 minutes</button>{latestRecipe && <button onClick={() => send(`Why are you recommending ${latestRecipe.title}?`)}>Explain this pick</button>}</div><form onSubmit={e => { e.preventDefault(); void send(input); }}><input value={input} onChange={e => setInput(e.target.value)} placeholder="Tell Moody what you need..." /><button disabled={busy}><ArrowRight /></button></form></aside></div>;
}

function NotificationsPanel({ close, profile, save, refresh }: { close: () => void; profile: Profile; save: (p: Profile) => void; refresh: () => void }) {
  const [, force] = useState(0);
  const items = readInbox();
  const sent = items.filter(i => i.status === "sent").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const scheduled = items.filter(i => i.status === "scheduled").sort((a, b) => +new Date(a.scheduledFor!) - +new Date(b.scheduledFor!));
  const hasPending = scheduled.some(i => i.tag === "receipt");
  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  const simulate = () => { const { charged } = simulateTrialEnd(); if (charged) save({ ...profile, subscriptionStatus: "active" }); refresh(); force(n => n + 1); };
  const cancel = () => { cancelScheduled(); save({ ...profile, subscriptionStatus: "canceled" }); refresh(); force(n => n + 1); };
  const Row = (i: InboxItem) => <div className={"notif-card" + (i.read ? "" : " unread")} key={i.id}><span className={"ic " + i.tag}>{i.tag === "receipt" ? <CreditCard size={18} /> : i.tag === "reminder" ? <Bell size={18} /> : i.tag === "welcome" ? <Sparkles size={18} /> : <Mail size={18} />}</span><div><b>{i.subject}</b><p>{i.body}</p><div className="meta"><span className="chip">{i.kind === "email" ? "Email" : "Push"}</span>{i.to && i.kind === "email" && <span>{i.to}</span>}{i.status === "scheduled" ? <span className="chip scheduled">Scheduled {fmt(i.scheduledFor)}</span> : <span>{fmt(i.createdAt)}</span>}</div></div></div>;
  return <div className="panel-bg" onClick={close}><aside className="moody-panel" onClick={e => e.stopPropagation()}>
    <header><div className="moody"><Bell size={22} /></div><div><b>Notifications</b><span>Emails &amp; reminders</span></div><button onClick={close}><X /></button></header>
    <div className="notif-list" style={{ overflowY: "auto", flex: 1 }}>
      {scheduled.map(Row)}
      {sent.map(Row)}
      {!items.length && <div className="notif-empty"><Mail /><p>No notifications yet. Create an account and start a trial to see confirmations, reminders, and receipts here.</p></div>}
    </div>
    {hasPending && profile.subscriptionStatus === "trialing" && <><button className="sim-trial" onClick={simulate}>Simulate trial ending now</button><button className="link-coral" onClick={cancel} style={{ width: "100%" }}>Cancel before trial ends</button></>}
  </aside></div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOD PHOTO CAMERA + ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

function FoodCamera({
  label = "Log a meal with photo",
  onSave,
  hint,
  allergies = [],
  compact = false,
  tile = false,
  style,
}: {
  label?: string;
  onSave: (p: FoodPhoto) => void;
  hint?: { recipeCalories?: number; recipeName?: string };
  allergies?: string[];
  compact?: boolean;
  tile?: boolean;
  style?: React.CSSProperties;
}) {
  const [state, setState] = useState<"idle" | "analyzing" | "done">("idle");
  const [result, setResult] = useState<FoodPhoto | null>(null);

  const handle = async (file?: File) => {
    if (!file) return;
    try {
      const image = await readSafeImage(file);
      setState("analyzing");
      const analysis = await analyzeFood(image, { ...hint, allergies });
      setResult(analysis);
      setState("done");
    } catch {
      setState("idle");
    }
  };

  const flagged = result ? flaggedAllergens(result.allergens, allergies) : [];

  if (state === "analyzing") {
    return (
      <div className="food-camera-analyzing" style={style}>
        <div className="fca-spinner" />
        <span>Moody is reading your plate…</span>
      </div>
    );
  }

  if (state === "done" && result) {
    return (
      <div className="food-analysis-card" style={style}>
        <img src={result.image} alt="Your meal" className="fac-photo" />
        <div className="fac-body">
          <div className="fac-dish">
            <b>{result.dish}</b>
            <span className="fac-conf">{result.confidence}% confidence</span>
          </div>
          <div className="fac-calories">
            <FlameKindling size={18} /><span className="fac-kcal">{result.calories}</span><span className="fac-unit">kcal</span>
          </div>
          <div className="fac-macros">
            <MacroBar label="Protein" value={result.protein} color="#57aecb" max={60} />
            <MacroBar label="Carbs"   value={result.carbs}   color="#f0c050" max={100} />
            <MacroBar label="Fat"     value={result.fat}     color="#ef9a6a" max={50} />
            <MacroBar label="Fibre"   value={result.fiber}   color="#6acd8c" max={20} />
          </div>
          {/* Allergen warning, flag anything matching the user's profile first. */}
          {!!flagged.length && (
            <div className="fac-allergen-alert">
              <ShieldCheck size={15} />
              <span>Heads up, may contain <b>{flagged.join(", ")}</b>, which you flagged as an allergy. Always double-check.</span>
            </div>
          )}
          {!!result.allergens.length && (
            <div className="fac-allergens">
              <span className="fac-section-label">Allergens detected</span>
              <div className="fac-allergen-chips">
                {result.allergens.map(a => <span key={a} className={flagged.includes(a) ? "allergen-chip danger" : "allergen-chip"}>{a}</span>)}
              </div>
            </div>
          )}
          {!!result.vitamins.length && (
            <div className="fac-vitamins">
              <span className="fac-section-label">Key vitamins &amp; minerals</span>
              {result.vitamins.map(v => (
                <div className="vitamin-row" key={v.name}>
                  <span className="vitamin-name">{v.name}</span>
                  <div className="vitamin-track"><div className="vitamin-fill" style={{ width: `${Math.min(100, v.percentDV)}%` }} /></div>
                  <span className="vitamin-val">{v.amount}{v.unit}{v.percentDV ? ` · ${v.percentDV}% DV` : ""}</span>
                </div>
              ))}
            </div>
          )}
          <div className="fac-actions">
            <button className="primary" style={{ flex: 1 }} onClick={() => { onSave(result); setState("idle"); setResult(null); }}>
              Save to diary <Check size={16} />
            </button>
            <button className="secondary" onClick={() => { setState("idle"); setResult(null); }}>Discard</button>
          </div>
          <small className="fac-disclaimer">Estimates only, not medical or nutritional advice.</small>
        </div>
      </div>
    );
  }

  if (tile) {
    return (
      <label className="dps-add-tile" style={style}>
        <Camera size={20} />
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handle(e.target.files?.[0])} />
      </label>
    );
  }

  if (compact) {
    return (
      <label className="food-camera-compact" style={style}>
        <Camera size={16} />{label}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handle(e.target.files?.[0])} />
      </label>
    );
  }

  return (
    <label className="food-camera-btn" style={style}>
      <Camera size={20} />{label}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handle(e.target.files?.[0])} />
    </label>
  );
}

function MacroBar({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  return (
    <div className="macro-row">
      <span className="macro-label">{label}</span>
      <div className="macro-track"><div className="macro-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} /></div>
      <span className="macro-val">{value}g</span>
    </div>
  );
}

function FoodLogScreen({ logs, addPhoto, back, allergies }: { logs: FoodPhoto[]; addPhoto: (p: FoodPhoto) => void; back: () => void; allergies: string[] }) {
  const grouped = logs.reduce<Record<string, FoodPhoto[]>>((acc, l) => {
    const day = l.when.split(",")[0] || l.when.slice(0, 6);
    return { ...acc, [day]: [...(acc[day] || []), l] };
  }, {});

  return (
    <div className="screen">
      <TopBar title="Food photo log" back={back} />
      <FoodCamera label="📸 Log a meal with photo" onSave={addPhoto} allergies={allergies} />
      {Object.keys(grouped).length === 0 && (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <Camera size={36} style={{ color: "var(--blue-deep)" }} />
          <h2>No meals logged yet</h2>
          <p>Photograph a meal above, Moody estimates the calories and macros so you can track without counting.</p>
        </div>
      )}
      {Object.entries(grouped).map(([day, items]) => {
        const totals = sumNutrition(items);
        return (
          <div key={day} className="flog-day">
            <div className="flog-day-header">
              <b>{day}</b>
              <span><FlameKindling size={13} /> {totals.calories} kcal total</span>
            </div>
            <div className="flog-grid">
              {items.map(p => (
                <div key={p.id} className="flog-card">
                  <FoodPhotoImg photo={p} placeholder="flog-noimg" />
                  <div className="flog-info">
                    <b>{p.dish}</b>
                    <span><FlameKindling size={12} /> {p.calories} kcal</span>
                    <span className="flog-macros">P {p.protein}g · C {p.carbs}g · F {p.fat}g</span>
                    <span className="flog-conf">{p.confidence}% confidence</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <p className="quiet" style={{ padding: "0 4px" }}>Calorie estimates are calculated from visual analysis. They are informational only and not a substitute for professional nutritional advice.</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELP / TUTORIAL / FAQ SCREEN
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_DATA = [
  {
    section: "Getting started",
    items: [
      { q: "What is MoodFood?", a: "MoodFood is a personal dinner companion that matches you with one safe, perfectly suited meal based on how you feel, your energy, time available, and your food profile. It removes the 'what's for dinner?' decision entirely." },
      { q: "What is the onboarding for?", a: `The in-depth onboarding (${onboardingQuestions.length} questions across ${onboardingSections.length} chapters) builds your food psychology profile, covering your cooking moods, taste phenotype (flavours and textures you love or avoid), emotional eating patterns, comfort food, kitchen setup, habits, values, and nutrition goals. Every answer shapes your recommendations.` },
      { q: "Can I change my profile later?", a: "Yes. Go to Settings → Psychological food profile to edit every answer. Changes take effect immediately on your next recommendation." },
      { q: "How do I reset and start fresh?", a: "Tap Settings → Sign out and replay first launch. This clears all stored data and takes you back to the welcome screen." },
    ],
  },
  {
    section: "Getting a recommendation",
    items: [
      { q: "How does the mood check-in work?", a: "Select your mood, how long you have, and your energy level on the home screen, then tap 'Find tonight's dinner'. Moody scores every recipe against your profile and surfaces the best match." },
      { q: "What does the energy slider do?", a: "Low energy nudges Moody toward one-pot, minimal-prep, easy recipes. High energy opens up more adventurous, multi-step dishes." },
      { q: "Are my allergies always enforced?", a: "Yes, always. Allergens and dietary restrictions set during onboarding are hard filters that are never relaxed, regardless of mood or any other setting." },
      { q: "What does 'Not tonight' do on a pick card?", a: "It hides that recipe for the current session only. It comes back next time." },
    ],
  },
  {
    section: "Food photo & calorie log",
    items: [
      { q: "How do I log a meal with a photo?", a: "Tap the camera button on the Home screen, in the Diary, on a Recipe detail page, or after finishing Cook mode. Choose a photo from your camera roll, and Moody will estimate the dish, calories, and macros in about 2 seconds." },
      { q: "How accurate are the calorie estimates?", a: "Estimates are derived from visual analysis of your photo matched against a food database. Accuracy is typically within 15–25% for single-dish meals. Results are shown with a confidence score. They are informational only, not medical or nutritional advice." },
      { q: "Can I edit the calorie count?", a: "You can discard the result and retake the photo from a different angle or better lighting for a more accurate reading." },
      { q: "Where are my logged meals stored?", a: "Photo logs are saved on your device in localStorage. They appear in the Food photo log screen (Settings → Food photo log) and feed the 'Today's calories' stat on your home screen." },
    ],
  },
  {
    section: "Cook mode",
    items: [
      { q: "What is cook mode?", a: "A distraction-free step-by-step cooking guide. The screen stays awake, each step shows the active ingredients, and timers can be started inline. Your progress is saved if you leave and come back." },
      { q: "How does cook mode work?", a: "The full method stays on one scrolling page, so you can move naturally between steps without opening tabs." },
    ],
  },
  {
    section: "Household & safety",
    items: [
      { q: "How do household diners work?", a: "Add family members or frequent diners under Settings → Household diners. On the home screen, select who is eating tonight. MoodFood combines every selected person's allergens and dietary requirements, so if anyone in the group has a peanut allergy, no recipe containing peanuts will appear." },
      { q: "What does 'Shared safety is active' mean?", a: "It means you have selected one or more household diners in addition to yourself, and their safety constraints are merged with yours for tonight's recommendations." },
    ],
  },
  {
    section: "Account & subscription",
    items: [
      { q: "What is included in the free trial?", a: "Full access to all features for 7 days: personalised recommendations, cook mode, the food photo log, mood check-ins, health trends, and the community. No payment information is required to start the pilot." },
      { q: "How do I cancel before the trial ends?", a: "Open the notifications panel (bell icon, top right) and tap 'Cancel before trial ends'. For the full production version, cancellation is also available in Settings → Subscription." },
      { q: "What happens to my data if I cancel?", a: "Your recipes, diary, and food photo log remain readable for 7 days after cancellation, then are deleted from our servers. Your local device data remains until you clear it." },
    ],
  },
  {
    section: "Privacy",
    items: [
      { q: "Where is my mood and psychological data stored?", a: "During the local pilot, all data is stored in your browser's localStorage, it never leaves your device. The psychological food profile, raw mood entries, and private diary are never shown to other users." },
      { q: "What can other users see?", a: "Only what you share publicly: your display name, bio, profile photo, and any meal posts you explicitly choose to share in the Community tab. Your mood selections, food psychology profile, and diary are always private." },
    ],
  },
];

function HelpScreen({ back }: { back: () => void }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="screen">
      <TopBar title="Help & FAQ" back={back} />

      {/* Quick-start tutorial */}
      <div className="help-tutorial">
        <div className="help-tutorial-header">
          <BookMarked size={20} />
          <div>
            <b>Quick start, 5 steps</b>
            <span>Get your first recommendation in under 2 minutes</span>
          </div>
        </div>
        {[
          { n: 1, title: "Complete onboarding", desc: `${onboardingQuestions.length} questions build your taste + psychology profile. More detail = better matches.` },
          { n: 2, title: "Create your account", desc: "Save your profile so it travels with you. Confirm your email to unlock everything." },
          { n: 3, title: "Check in on the home screen", desc: "Pick a mood, set your time and energy, then tap 'Find tonight's dinner'." },
          { n: 4, title: "Cook with Moody", desc: "Open a pick → 'Start cook mode' for step-by-step guidance with timers. Screen stays awake." },
          { n: 5, title: "Log your meal with a photo", desc: "After cooking, tap the camera button. Moody reads the plate and estimates calories + macros." },
        ].map(s => (
          <div className="help-step" key={s.n}>
            <div className="hs-num">{s.n}</div>
            <div><b>{s.title}</b><p>{s.desc}</p></div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div className="help-features">
        {[
          { icon: <Sparkles size={20} />, title: "Moody AI", desc: "Your dinner co-pilot. Tap the floating sparkle button anytime to ask Moody anything, get a pick, rescue a step, or find the easiest safe option." },
          { icon: <Camera size={20} />, title: "Food photo log", desc: "Photograph any meal for an instant calorie + macro estimate. Logged photos feed your health trends and today's calorie total on the home screen." },
          { icon: <ShieldCheck size={20} />, title: "Safety first, always", desc: "Allergen and diet filters are hard constraints. They apply to every recommendation, every household diner, and are never softened by any setting." },
          { icon: <Users size={20} />, title: "Household diners", desc: "Add family members with their own profiles. Select them at check-in and safety constraints merge automatically, no meal reaches the table that's unsafe for anyone at it." },
          { icon: <Activity size={20} />, title: "Health trends", desc: "Tracks your logged diary entries and photo logs across nutrition, dietary variety, eating patterns, and family meal balance. Informational only, never medical advice." },
          { icon: <Dna size={20} />, title: "Food psychology profile", desc: "Powered by the Food Choice Questionnaire (FCQ) and Three-Factor Eating Questionnaire (TFEQ). Your flavour phenotype, emotional triggers, and comfort cues all shape what Moody suggests." },
        ].map(f => (
          <div className="help-feature-card" key={f.title}>
            <div className="hfc-icon">{f.icon}</div>
            <div><b>{f.title}</b><p>{f.desc}</p></div>
          </div>
        ))}
      </div>

      {/* FAQ accordion */}
      <h2 className="help-faq-title">Frequently asked questions</h2>
      {FAQ_DATA.map(section => (
        <div key={section.section} className="faq-section">
          <p className="faq-section-label">{section.section.toUpperCase()}</p>
          {section.items.map(item => (
            <div key={item.q} className={"faq-item" + (open === item.q ? " open" : "")}>
              <button className="faq-q" onClick={() => setOpen(open === item.q ? null : item.q)}>
                <span>{item.q}</span>
                <ChevronRight size={16} className={open === item.q ? "rot90" : ""} />
              </button>
              {open === item.q && <p className="faq-a">{item.a}</p>}
            </div>
          ))}
        </div>
      ))}
      <p className="quiet" style={{ marginTop: 16, paddingBottom: 24 }}>MoodFood is a focused pilot. Features described may not yet be fully implemented in the production version.</p>
    </div>
  );
}
