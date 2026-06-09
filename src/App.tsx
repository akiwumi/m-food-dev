import { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChefHat, ChevronRight,
  Clock3, Heart, Home, ListChecks, Menu, MoreVertical, Play, RotateCcw, Search,
  Settings2, ShoppingCart, Sparkles, Star, Timer, X, ShieldCheck, UserRound, BarChart3,
  Upload, LogOut, Plus, ClipboardCheck, LayoutDashboard, Camera, Users, MessageCircle,
  Send, UserPlus, Lock, Globe2, Activity, Salad, Wheat, Droplets, TrendingUp, Mail, CreditCard,
  HelpCircle, FlameKindling, Dna, BookMarked, Share2, Trash2,
} from "lucide-react";
import { moods, cookingMoods, skillLevels, type Recipe } from "./data";
import { clearStored, defaultDiners, defaultProfile, readStored, useStoredState, writeStored, type Diner, type Profile, type SocialPost } from "./store";
import { profileForDiners, recommend, safeRecipes as applySafety } from "./recommendation";
import { cleanText, readSafeImage } from "./security";
import { onboardingQuestions, onboardingSections, PANTRY_GROUPS, type OnboardingKey, type OnboardingQuestion, type ProfileValue } from "./onboarding";
import { SPOON_CUISINES, MEAL_TYPES, SEARCH_DIETS, SORT_OPTIONS, type RecipeFilters } from "./searchFilters";
import { sendConfirmationEmail, sendWelcomeEmail, scheduleTrial, runDue, readInbox, unreadCount, markAllRead, cancelScheduled, simulateTrialEnd, type InboxItem } from "./notifications";
import { analyzeFood, sumNutrition, flaggedAllergens, type FoodPhoto } from "./foodAnalysis";
import { aiChat, type ChatTurn } from "./ai";
import { fetchCuratedRecipes, buildFoodHistory } from "./recipes";
import { signUp as authSignUp, signIn as authSignIn, signOut as authSignOut, isEmailConfirmed, onAuthChange, isSupabaseConfigured } from "./auth";
import { supabase } from "./supabase";
import { displayStepDetail, displayStepTitle, formatTimer, stepImageSources } from "./cooking";
import { RecipeImage } from "./RecipeImage";
import { finalizeSearchResults } from "./searchResults";

const SUPABASE_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Capture Chrome/Android's install prompt as early as possible so the welcome
// screen can offer a one-tap "Add to Home Screen". On browsers that don't fire
// this (notably iOS Safari) we fall back to short instructions instead.
let deferredInstallPrompt: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstallPrompt = e as typeof deferredInstallPrompt; });
}

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

// Every localStorage key MoodFood owns — wiped when an account is cancelled.
const MOODFOOD_KEYS = [
  "moodfood-entry", "moodfood-profile", "moodfood-saved", "moodfood-diary",
  "moodfood-groceries", "moodfood-posts", "moodfood-connections", "moodfood-diners",
  "moodfood-eater-count", "moodfood-onboarding-step", "moodfood-a2hs-dismissed",
];

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

// Lets any header (AppHeader, TopBar) open the global hamburger menu without
// every screen threading a callback through its props.
const MenuCtx = createContext<() => void>(() => {});

type Page = "home" | "search" | "results" | "diary" | "grocery" | "planner" | "detail" | "cook" | "insights" | "settings" | "favorites" | "import" | "admin" | "billing" | "psych-profile" | "food-profile" | "account" | "community" | "health" | "health-nutrition" | "health-variety" | "health-patterns" | "family-health" | "diners" | "food-log" | "pantry" | "help";
type SearchRequest = { query: string; filters: RecipeFilters };
type Entry = "welcome" | "login" | "onboarding" | "account" | "verify" | "verified" | "subscription" | "app";
const PLANS = [
  { id: "annual", name: "Annual", price: "$120/year", note: "Best value — about 2 months free" },
  { id: "quarterly", name: "Quarterly", price: "$36/quarter", note: "Save 20% — billed every 3 months" },
  { id: "monthly", name: "Monthly", price: "$15/month", note: "Cancel anytime" },
] as const;
const nav = [
  ["home", "Home", Home], ["search", "Search", Search], ["results", "Results", ListChecks],
  ["grocery", "Grocery", ShoppingCart], ["planner", "Planner", CalendarDays],
] as const;
export default function App() {
  const [splash, setSplash] = useState(true);
  const [entry, setEntry] = useStoredState<Entry>("moodfood-entry", "welcome");
  const [storedProfile, setProfile] = useStoredState<Profile>("moodfood-profile", defaultProfile);
  // Memoized so its reference is stable across renders. Without this, every
  // render produced a new `profile` object, which cascaded into `sharedProfile`
  // and re-fired the recipe-fetch effect on a loop — hammering the edge function
  // into 502s and silently falling back to local recipes.
  const profile = useMemo(() => ({ ...defaultProfile, ...storedProfile }), [storedProfile]);
  const [page, setPage] = useState<Page>("home");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [detailReturnPage, setDetailReturnPage] = useState<Page>("results");
  const [mood, setMood] = useState("Cozy");
  const [energy, setEnergy] = useState(45);
  const [time, setTime] = useState(30);
  const [mealCategory, setMealCategory] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [results, setResults] = useState(false);
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null);
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [moodyOpen, setMoodyOpen] = useState(false);
  const [pendingShare, setPendingShare] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useStoredState<string[]>("moodfood-saved", []);
  const [diary, setDiary] = useStoredState("moodfood-diary", [] as { recipe: Recipe; rating: number; when: string }[]);
  const [groceries, setGroceries] = useStoredState("moodfood-groceries", [] as string[]);
  const [posts, setPosts] = useStoredState<SocialPost[]>("moodfood-posts", []);
  const [connections, setConnections] = useStoredState<string[]>("moodfood-connections", []);
  const [diners, setDiners] = useStoredState<Diner[]>("moodfood-diners", defaultDiners);
  const [selectedDiners, setSelectedDiners] = useState<string[]>(["self"]);
  const [eaterCount, setEaterCount] = useStoredState<number>("moodfood-eater-count", 1);
  const sharedProfile = useMemo(() => profileForDiners(profile, diners.filter(d => selectedDiners.includes(d.id) && d.id !== "self")), [profile, diners, selectedDiners]);
  // catalog = bundled recipes plus any fetched from the AI-curated recipes API.
  // aiRanked = the API's curated order when available; null falls back to local ranking.
  const [catalog, setCatalog] = useState<Recipe[]>([]);
  const [aiRanked, setAiRanked] = useState<Recipe[] | null>(null);
  const [curating, setCurating] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [moreOffset, setMoreOffset] = useState(0);
  const [recipeNonce, setRecipeNonce] = useState(0); // bump to force a re-fetch (Retry)
  const safeRecipes = useMemo(() => applySafety(catalog, sharedProfile), [catalog, sharedProfile]);
  const localRanked = useMemo(() => recommend(catalog, sharedProfile, mood, energy, time).map(item => item.recipe), [catalog, sharedProfile, mood, energy, time]);
  const ACCESSORY_TYPES = useMemo(() => new Set(["dessert", "desserts", "snack", "snacks", "drink", "drinks", "beverage", "beverages", "sweet", "sweets"]), []);
  const ranked = useMemo(() => {
    // AI results only — no session cache fallback.
    const base = aiRanked ?? [];
    if (mealCategory) return base;
    return base.filter(r => {
      const types = (r.mealTypes ?? []).map((t: string) => t.toLowerCase());
      return !types.length || !types.every((t: string) => ACCESSORY_TYPES.has(t));
    });
  }, [aiRanked, mealCategory, ACCESSORY_TYPES]);

  // What the user has actually cooked, logged, and saved — so the AI learns from
  // behaviour, not just the stated profile. Recomputed as those change.
  const foodHistory = useMemo(
    () => buildFoodHistory(diary, profile.photoLogs, catalog.filter(r => saved.includes(r.id))),
    [diary, profile.photoLogs, saved, catalog],
  );

  const runSearch = async (request: SearchRequest, nextPage = false) => {
    const offset = nextPage ? searchOffset + 8 : 0;
    setSearchRequest(request);
    setSearchOffset(offset);
    setSearchResults([]);
    setSearchLoading(true);
    setPage("results");
    window.scrollTo(0, 0);
    try {
      const live = await fetchCuratedRecipes(sharedProfile, mood, 50, request.filters.maxReadyTime ?? 60, request.query, request.filters, foodHistory, offset);
      setSearchResults(live ?? []);
    } finally {
      setSearchLoading(false);
    }
  };

  // When the user asks for recommendations, fetch real AI-curated recipes.
  useEffect(() => {
    if (entry !== "app" || !results) return;
    let cancelled = false;
    setCurating(true);
    setAiRanked(null); // clear stale results immediately so loading state shows
    setMoreOffset(0);
    fetchCuratedRecipes(sharedProfile, mood, energy, time, "", { type: mealCategory || undefined, cuisines: cuisine ? [cuisine] : undefined }, foodHistory, 0)
      .then(list => {
        if (cancelled) return;
        if (list?.length) {
          setCatalog(prev => { const ids = new Set(list.map(r => r.id)); return [...list, ...prev.filter(r => !ids.has(r.id))]; });
          setAiRanked(list);
        } else {
          setAiRanked(null); // not signed in / not configured → local ranking
        }
      })
      .finally(() => { if (!cancelled) { setCurating(false); setHasFetched(true); } });
    return () => { cancelled = true; };
  }, [results, mood, energy, time, sharedProfile, entry, recipeNonce, mealCategory, cuisine]);

  // "Show me 5 more" — fetch a fresh page (next offset) and append. Falls back to
  // simply revealing more of the local ranking when the backend isn't available.
  const loadMore = async () => {
    setCurating(true);
    const nextOffset = moreOffset + 10;
    setMoreOffset(nextOffset);
    try {
      const list = await fetchCuratedRecipes(sharedProfile, mood, energy, time, "", { type: mealCategory || undefined, cuisines: cuisine ? [cuisine] : undefined }, foodHistory, nextOffset);
      if (list?.length) {
        setCatalog(prev => { const ids = new Set(prev.map(r => r.id)); return [...prev, ...list.filter(r => !ids.has(r.id))]; });
        setAiRanked(prev => { const seen = new Set((prev ?? []).map(r => r.id)); return [...(prev ?? []), ...list.filter(r => !seen.has(r.id))]; });
      }
    } finally {
      setCurating(false);
    }
  };

  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setNotifTick] = useState(0);
  const refreshNotifs = () => setNotifTick(t => t + 1);
  useEffect(() => { const { charged } = runDue(); if (charged) setProfile(p => ({ ...p, subscriptionStatus: "active" })); refreshNotifs(); }, []);
  // Real auth: keep the entry flow in sync with the session.
  //  • Sign out anywhere → back to welcome.
  //  • On sign-in, Supabase is the source of truth — restore preferences_json
  //    if it has a completed profile, otherwise push local data up.
  //  • Only route to onboarding for accounts created in the last 10 minutes
  //    (genuine new signups). Returning users whose data is missing (cleared
  //    browser, new device) go straight to the app — never re-onboard.
  useEffect(() => onAuthChange(async (event, session) => {
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
        // Supabase has a completed profile — restore it (handles new-device login).
        const restored = { ...defaultProfile, ...prefs, email: session.user.email ?? "" } as Profile;
        setProfile(restored);
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
        return;
      }

      // Supabase profile is empty/incomplete. Check local storage first.
      if (storedProfile.onboarded) {
        // Local profile is complete — push it to Supabase now we have a session.
        supabase.from("profiles").upsert({
          id: session.user.id,
          display_name: storedProfile.name,
          onboarded: true,
          preferences_json: storedProfile,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
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

    // Supabase not configured (pilot/local mode) — use localStorage signal.
    if (storedProfile.onboarded && storedProfile.accountCreated) {
      setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
    }
  }), [storedProfile.onboarded, storedProfile.accountCreated, storedProfile]);

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
        preferences_json: profile,
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
      syncSubscriptionFromDB().then(sub => {
        if (sub) {
          setProfile(p => ({ ...p, subscriptionStatus: sub.status as any, plan: sub.plan, trialEndsAt: sub.currentPeriodEnd }));
          setEntry("app");
        } else {
          // Webhook hasn't fired yet — optimistically mark as trialing and enter.
          setProfile(p => ({ ...p, subscriptionStatus: "trialing" }));
          setEntry("app");
        }
      });
    }
    // canceled: do nothing, stay on subscription screen
  }, []);

  const go = (next: Page) => { setPage(next); window.scrollTo(0, 0); };
  const open = (recipe: Recipe) => { setSelected(recipe); setDetailReturnPage(page); go("detail"); };
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

  if (splash && entry !== "app") return <Splash proceed={() => setSplash(false)} signin={() => { setSplash(false); setEntry("login"); }} />;
  if (entry === "welcome") return <Welcome start={() => setEntry("onboarding")} signin={() => setEntry("login")} />;
  if (entry === "login") return <LoginScreen back={() => setEntry("welcome")} onSignedIn={() => {}} />;
  if (entry === "onboarding") return <Onboarding profile={profile} save={setProfile} finish={(next) => { setProfile({ ...next, onboarded: true }); clearStored("moodfood-onboarding-step"); setEntry("account"); }} />;
  if (entry === "account") return <AccountSetupScreen profile={profile} back={() => setEntry("onboarding")} submit={(patch, opts) => {
    const confirmed = !!opts?.hasSession; // session present = email confirmation is OFF, so they're in
    const next = { ...profile, ...patch, accountCreated: true, emailVerified: confirmed };
    setProfile(next);
    if (!isSupabaseConfigured) { sendConfirmationEmail(next.email, next.name); refreshNotifs(); setEntry("verify"); return; }
    if (confirmed) { sendWelcomeEmail(next.email, next.name); refreshNotifs(); setEntry("verified"); }
    else { setEntry("verify"); } // Supabase sent a real confirmation email
  }} />;
  if (entry === "verify") return <VerifyEmailScreen email={profile.email} realAuth={isSupabaseConfigured} resend={() => { sendConfirmationEmail(profile.email, profile.name); refreshNotifs(); }} back={() => setEntry("account")} onVerified={() => { setProfile({ ...profile, emailVerified: true }); sendWelcomeEmail(profile.email, profile.name); refreshNotifs(); setEntry("verified"); }} />;
  if (entry === "verified") return <VerifiedScreen name={profile.name} proceed={() => setEntry("subscription")} />;
  if (entry === "subscription") return <SubscriptionScreen profile={profile} save={setProfile} onStarted={refreshNotifs} proceed={() => setEntry("app")} />;
  return <MenuCtx.Provider value={() => setMenuOpen(true)}><div className={page === "cook" ? "app cooking" : "app"}>
    {page !== "cook" && <DesktopNav page={page} go={go} />}
    <main>
      {page === "home" && <HomeScreen profile={profile} mood={mood} setMood={setMood} energy={energy} setEnergy={setEnergy} time={time} setTime={setTime} mealCategory={mealCategory} setMealCategory={setMealCategory} cuisine={cuisine} setCuisine={setCuisine} results={false} setResults={setResults} beginResults={() => { setSearchRequest(null); setCurating(true); setAiRanked(null); setHasFetched(false); setResults(true); go("results"); }} ranked={ranked} curating={curating} loadMore={loadMore} live={aiRanked !== null} retry={() => setRecipeNonce(n => n + 1)} open={open} go={go} diners={diners} selectedDiners={selectedDiners} setSelectedDiners={setSelectedDiners} eaterCount={eaterCount} setEaterCount={setEaterCount} openNotifs={openNotifs} unread={unreadCount()} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} />}
      {page === "search" && <SearchScreen profile={sharedProfile} onSearch={request => runSearch(request)} />}
      {page === "results" && (searchRequest
        ? <SearchResultsScreen results={searchResults} loading={searchLoading} request={searchRequest} more={() => runSearch(searchRequest, true)} home={() => go("home")} search={() => go("search")} open={open} saved={saved} setSaved={setSaved} />
        : results
          ? <HomeScreen profile={profile} mood={mood} setMood={setMood} energy={energy} setEnergy={setEnergy} time={time} setTime={setTime} mealCategory={mealCategory} setMealCategory={setMealCategory} cuisine={cuisine} setCuisine={setCuisine} results setResults={v => { setResults(v); if (!v) go("home"); }} beginResults={() => {}} ranked={ranked} curating={curating} hasFetched={hasFetched} loadMore={loadMore} live={aiRanked !== null} retry={() => setRecipeNonce(n => n + 1)} open={open} go={go} diners={diners} selectedDiners={selectedDiners} setSelectedDiners={setSelectedDiners} eaterCount={eaterCount} setEaterCount={setEaterCount} openNotifs={openNotifs} unread={unreadCount()} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} />
          : <EmptyResultsScreen home={() => go("home")} search={() => go("search")} />)}
      {page === "detail" && selected && <DetailScreen recipe={selected} servings={eaterCount} back={() => go(detailReturnPage)} cook={() => go("cook")} saved={saved.includes(selected.id)} toggleSave={() => setSaved(toggle(saved, selected.id))} addGroceries={() => setGroceries(v => [...new Set([...v, ...selected.ingredients])])} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} shareToCommunity={() => shareRecipe(selected)} allergies={profile.allergies} />}
      {page === "cook" && selected && <CookScreen recipe={selected} exit={() => go("detail")} allergies={profile.allergies} finish={(rating, photo) => { setDiary(v => [{ recipe: selected, rating, when: "Today" }, ...v]); if (photo) setProfile(p => ({ ...p, photoLogs: [photo, ...p.photoLogs] })); go("diary"); }} />}
      {page === "diary" && <DiaryScreen diary={diary} open={open} photoLogs={profile.photoLogs} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} goFoodLog={() => go("food-log")} allergies={profile.allergies} />}
      {page === "grocery" && <GroceryScreen items={groceries} setItems={setGroceries} />}
      {page === "pantry" && <PantryScreen items={profile.pantryStaples} setItems={items => setProfile(p => ({ ...p, pantryStaples: items }))} addToGrocery={item => setGroceries(v => v.includes(item) ? v : [...v, item])} />}
      {page === "planner" && <PlannerScreen open={open} />}
      {page === "insights" && <InsightsScreen diary={diary} />}
      {page === "settings" && <SettingsScreen profile={profile} save={setProfile} go={go} logout={() => { authSignOut(); setEntry("welcome"); }} />}
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
      {page === "food-log" && <FoodLogScreen logs={profile.photoLogs} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} back={() => go("diary")} allergies={profile.allergies} />}
      {page === "help" && <HelpScreen back={() => go("settings")} />}
    </main>
    {page !== "cook" && <BottomNav page={page} go={go} />}
    {page !== "cook" && <button className="moody-fab" onClick={() => setMoodyOpen(true)} aria-label="Ask Moody"><Sparkles /></button>}
    {moodyOpen && <MoodyPanel recipe={ranked[0]} profile={profile} picks={ranked.slice(0, 3)} close={() => setMoodyOpen(false)} open={() => { setMoodyOpen(false); if (ranked[0]) open(ranked[0]); }} />}
    {notifOpen && <NotificationsPanel close={() => setNotifOpen(false)} profile={profile} save={setProfile} refresh={refreshNotifs} />}
    {menuOpen && <MainMenu profile={profile} page={page} go={go} close={() => setMenuOpen(false)} openNotifs={openNotifs} unread={unreadCount()} logout={() => { authSignOut(); setEntry("welcome"); }} />}
  </div></MenuCtx.Provider>;
}

function toggle(values: string[], value: string) { return values.includes(value) ? values.filter(v => v !== value) : [...values, value]; }

const SPLASH_PHOTO   = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1100&q=85";
const WELCOME_PHOTO  = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1100&q=85";
const FALLBACK_FOOD  = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80";

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

function Splash({ proceed, signin }: { proceed: () => void; signin: () => void }) {
  return (
    <div className="splash">
      <img className="splash-photo" src={SPLASH_PHOTO} alt="Delicious food" />
      <div className="splash-veil" />
      <div className="splash-logo-center">
        <img src="/images/logo-1.png" alt="MoodFood" />
        <span>MoodFood</span>
      </div>
      <div className="splash-copy">
        <span className="splash-eyebrow">YOUR PERSONAL FOOD COMPANION</span>
        <strong>Eat for the way<br />you feel.</strong>
        <p>One safe, perfectly matched meal — chosen for your mood, energy, and taste.</p>
        <div className="splash-actions">
          <button className="splash-cta" onClick={proceed}>Get started <ArrowRight size={16} /></button>
          <button className="splash-signin" onClick={signin}>I already have an account</button>
        </div>
      </div>
    </div>
  );
}

// Gentle nudge on the welcome screen: this is a PWA, so invite the user to add
// it to their home screen. Uses Chrome's install prompt when available, and
// shows iOS Safari instructions otherwise. Dismissible and remembered.
function AddToHomeScreenHint() {
  const standalone = typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [dismissed, setDismissed] = useStoredState("moodfood-a2hs-dismissed", false);
  const [show, setShow] = useState(false);
  const [canPrompt, setCanPrompt] = useState(!!deferredInstallPrompt);

  useEffect(() => {
    if (standalone || dismissed) return;
    const onPrompt = () => setCanPrompt(true);
    const onInstalled = () => setDismissed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setShow(true), 700); // let the welcome screen settle first
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, [standalone, dismissed]);

  if (standalone || dismissed || !show) return null;

  const install = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    try { await deferredInstallPrompt.userChoice; } catch { /* user dismissed */ }
    deferredInstallPrompt = null;
    setDismissed(true);
  };

  return (
    <div className="a2hs" role="status">
      <div className="a2hs-icon"><img src="/images/logo-1.png" alt="" /></div>
      <div className="a2hs-body">
        <b>Add MoodFood to your home screen</b>
        {isIOS
          ? <p>Tap <Share2 size={13} /> Share, then <b>Add to Home Screen</b> for one-tap access.</p>
          : <p>Install it for a faster, full-screen experience — no app store needed.</p>}
      </div>
      {canPrompt && !isIOS && <button className="a2hs-cta" onClick={install}>Add</button>}
      <button className="a2hs-x" onClick={() => setDismissed(true)} aria-label="Dismiss"><X size={16} /></button>
    </div>
  );
}
function Welcome({ start, signin }: { start: () => void; signin: () => void }) {
  return (
    <div className="welcome-modern">
      <AddToHomeScreenHint />
      <div className="wm-logo"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
      <div className="hero">
        <img src={WELCOME_PHOTO} alt="A fresh, colourful meal" />
        <div className="wm-badge"><ShieldCheck size={14} /> Safety always first</div>
      </div>
      <div className="copy">
        <span className="wm-eye">WELCOME TO MOODFOOD</span>
        <h1>Hello, and welcome.</h1>
        <p>MoodFood is your personal food companion. Tell us how you feel and what you love, and we'll match you to one safe, doable meal — so dinner feels like care, not another decision.</p>
      </div>

      <div className="wm-explain">
        <h2><Sparkles size={18} /> A few quick questions first</h2>
        <p>The next part may feel a little long — and that's on purpose. Every answer helps us truly understand your tastes, your needs, and the way you eat.</p>
        <ul>
          <li><span className="wm-dot"><Heart size={14} /></span><div><b>It learns what matters to you</b><p>Allergies, cravings, comfort foods, the time you have — nothing one-size-fits-all.</p></div></li>
          <li><span className="wm-dot"><ChefHat size={14} /></span><div><b>It trains your MoodFood</b><p>The more it knows, the smarter and more personal every suggestion becomes.</p></div></li>
          <li><span className="wm-dot"><Check size={14} /></span><div><b>You start in a great place</b><p>From day one you get picks that genuinely fit you — not generic guesses.</p></div></li>
        </ul>
        <p className="wm-note">Short on time? Answer what you can — the more you share, the better MoodFood gets, but nothing is set in stone. You can revisit and refine everything any time from your Food Profile.</p>
      </div>

      <div className="actions">
        <button className="primary" style={{ width: "100%", minHeight: 54 }} onClick={start}>
          Let's build my food profile <ArrowRight size={18} />
        </button>
        <button className="ghost" onClick={signin}>I already have an account</button>
      </div>
    </div>
  );
}

function AccountSetupScreen({ profile, back, submit }: { profile: Profile; back: () => void; submit: (patch: Partial<Profile>, opts?: { hasSession: boolean }) => void }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(profile.avatar);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => { if (!file) return; try { setAvatar(await readSafeImage(file)); setError(""); } catch (err) { setError((err as Error).message); } };
  const valid = cleanText(name, 80) && /.+@.+\..+/.test(email) && password.length >= 6;
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setError("Add your name, a valid email, and a password of at least 6 characters."); return; }
    const patch = { name: cleanText(name, 80), email: email.trim(), avatar };
    if (!isSupabaseConfigured) { submit(patch); return; } // pilot mode — simulated
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
    <p className="lede">Your food profile is ready. Create an account so it's yours on every device — we'll send a confirmation email to finish.</p>
    <div className="avatar-pick"><label>{avatar ? <span className="ring"><img src={avatar} alt="" /></span> : <span className="ring"><span>{(name || "You").slice(0, 1).toUpperCase()}</span></span>}<span className="cam"><Camera size={16} /></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label><em>Add a profile photo</em></div>
    <form onSubmit={onSubmit}>
      <label>Name<input value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="Jessica" /></label>
      <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
      {error && <span className="err">{error}</span>}
      <button className="primary" type="submit" disabled={busy}>{busy ? "Creating account…" : <>Create account <ArrowRight size={18} /></>}</button>
    </form>
    <small><Lock size={11} /> We never share your mood data.{isSupabaseConfigured ? "" : " For this local pilot, your password isn't stored."}</small>
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
    if (!realAuth) { onVerified(); return; } // pilot — simulate confirmation
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
    {notYet && <span className="err">We can't see a confirmation yet — open the link in the email, then tap again.</span>}
    <small>{realAuth ? "Tap the link in the email we just sent, then come back here." : "In a production build this button is the link inside the email. Here, tapping it simulates the confirmation."}</small>
  </div>;
}

function LoginScreen({ back, onSignedIn }: { back: () => void; onSignedIn: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email) || !password) { setError("Enter your email and password."); return; }
    if (!isSupabaseConfigured) { setError("Sign-in needs the backend configured (see BACKEND_SETUP.md)."); return; }
    setBusy(true);
    const res = await authSignIn(email.trim(), password);
    setBusy(false);
    if (!res.ok) { setError(res.error || "Could not sign in. Check your details."); return; }
    onSignedIn(email.trim());
  };
  return <div className="auth-modern center">
    <button className="back" onClick={back} aria-label="Back"><ArrowLeft /></button>
    <div className="auth-logo"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
    <span className="eyebrow">WELCOME BACK</span>
    <h1>Sign in.</h1>
    <p className="lede">Pick up where you left off — your food profile and recommendations are waiting.</p>
    <form onSubmit={onSubmit} style={{ width: "100%" }}>
      <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" /></label>
      {error && <span className="err">{error}</span>}
      <button className="primary" type="submit" disabled={busy}>{busy ? "Signing in…" : <>Sign in <ArrowRight size={18} /></>}</button>
    </form>
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
function Onboarding({ profile, save, finish }: { profile: Profile; save: (p: Profile) => void; finish: (p: Profile) => void }) {
  // Questions whose showIf condition currently passes (e.g. spice types only
  // appear once the user has any heat tolerance). Navigation runs over this list.
  const visible = onboardingQuestions.filter(q => !q.showIf || q.showIf(profile));
  const total = visible.length;
  const [step, setStep] = useStoredState<number>("moodfood-onboarding-step", 0);
  const index = Math.min(Math.max(0, step), total);          // index === total -> review
  const onReview = index === total;
  const update = (key: OnboardingKey, value: ProfileValue) => save({ ...profile, [key]: value });
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };

  if (onReview) {
    const summary: [string, string][] = [
      ["Cooking moods", profile.cookingMoods.slice(0, 5).join(", ") || "—"],
      ["Diet", [profile.diet, ...profile.dietReligious].join(", ")],
      ["Hard exclusions", profile.allergies.join(", ") || "None"],
      ["Won't eat", profile.dislikedIngredients.join(", ") || "Open to most things"],
      ["Loves", [...profile.flavorLikes, ...profile.textureLikes].slice(0, 5).join(", ") || "Still learning"],
      ["Cuisines", profile.cuisines.slice(0, 6).join(", ") || "Open to anything"],
      ["Drawn to food for", profile.foodValues.slice(0, 4).join(", ") || "—"],
      ["Comfort means", profile.comfortFoods.slice(0, 4).join(", ") || "—"],
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
      {/* Photo hero — like the person/hero photo in the reference */}
      <div className="onboarding-photo">
        <img src={sectionPhoto} alt={q.section} />
        <div className="op-veil" />
        {/* Logo + step chip overlaid on photo — faithful to reference Image 1 */}
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

      {/* White bottom sheet — slides up over the photo */}
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
    <p className="multi-hint">{values.length ? `${values.length} selected — pick as many as you like` : "Select all that apply"}</p>
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
    <p className="multi-hint">{values.length ? `${values.length} selected — pick as many as you like` : "Pick at least one"}</p>
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
    <p className="multi-hint">{values.length ? `${values.length} selected — pick as many as you like` : "Select all that apply"}</p>
  </>;
}
function SetupStep({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: React.ReactNode }) { return <section className="setup-step"><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p>{children}</section>; }
function Choice({ values, active, pick, multi }: { values: string[]; active: string | string[]; pick: (v: string) => void; multi?: boolean }) { return <div className="choice">{values.map(v => <button className={(multi ? (active as string[]).includes(v) : active === v) ? "active" : ""} onClick={() => pick(v)} key={v}>{v}</button>)}</div>; }

function DesktopNav({ page, go }: { page: Page; go: (p: Page) => void }) {
  return <aside className="desktop-nav"><img src="/images/logo-1.png" alt="" /><nav>{nav.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={19} />{label}</button>)}<button className={page === "community" ? "active" : ""} onClick={() => go("community")}><Users size={19} />Community</button><button onClick={() => go("insights")}><BarChart3 size={19} />Insights</button><button onClick={() => go("favorites")}><Heart size={19} />Favorites</button><button onClick={() => go("import")}><Upload size={19} />Import</button><button onClick={() => go("settings")}><UserRound size={19} />Profile</button></nav><button className="moody-side"><Sparkles size={18} />Ask Moody</button></aside>;
}
function BottomNav({ page, go }: { page: Page; go: (p: Page) => void }) {
  return <nav className="bottom-nav">{nav.map(([id, label, Icon]) => <button className={page === id ? "active" : ""} onClick={() => go(id)} key={id}><Icon size={19} /><span>{label}</span></button>)}</nav>;
}
// Full-height slide-in drawer surfacing every part of the app — the single
// place to reach settings, food profile, camera log, health, billing, and more.
function MainMenu({ profile, page, go, close, openNotifs, unread, logout }: { profile: Profile; page: Page; go: (p: Page) => void; close: () => void; openNotifs: () => void; unread: number; logout: () => void }) {
  const nav = (p: Page) => { go(p); close(); };
  const groups: { title: string; items: [Page, string, typeof Home][] }[] = [
    { title: "COOK & PLAN", items: [["home", "Home", Home], ["search", "Ask Moody", Sparkles], ["diary", "Diary", BookOpen], ["pantry", "My pantry", Salad], ["grocery", "Grocery", ShoppingCart], ["planner", "Planner", CalendarDays]] },
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

function HomeScreen({ profile, mood, setMood, energy, setEnergy, time, setTime, mealCategory, setMealCategory, cuisine, setCuisine, results, setResults, beginResults, ranked, curating, hasFetched, loadMore, live, retry, open, go, diners, selectedDiners, setSelectedDiners, eaterCount, setEaterCount, openNotifs, unread, addPhoto }: {
  profile: Profile; mood: string; setMood: (v: string) => void; energy: number; setEnergy: (v: number) => void; time: number; setTime: (v: number) => void;
  mealCategory: string; setMealCategory: (v: string) => void;
  cuisine: string; setCuisine: (v: string) => void;
  results: boolean; setResults: (v: boolean) => void; beginResults: () => void; ranked: Recipe[]; curating?: boolean; hasFetched?: boolean; loadMore?: () => void; live?: boolean; retry?: () => void; open: (r: Recipe) => void; go: (p: Page) => void;
  diners: Diner[]; selectedDiners: string[]; setSelectedDiners: (v: string[]) => void;
  eaterCount: number; setEaterCount: (v: number) => void; openNotifs?: () => void; unread?: number;
  addPhoto: (p: FoodPhoto) => void;
}) {
  const [rejected, setRejected] = useState<string[]>([]);
  const visible = ranked.filter(r => !rejected.includes(r.id));
  const hero = ranked[0];
  // Reset rejections whenever a fresh set of picks arrives.
  useEffect(() => { setRejected([]); }, [results]);

  // Results view — same layout container, different content
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
        {live && <p className="source-note live"><Check size={13} /> Live picks, freshly curated for you.</p>}
      </div>
      {visible.length ? (
        <div style={{ padding: "0 16px", display: "grid", gap: 14 }}>
          {visible.map(r => <PickCard key={r.id} recipe={r} servings={eaterCount} open={() => open(r)} reject={() => setRejected([...rejected, r.id])} />)}
          {/* Once they've rejected at least one, offer a fresh batch. */}
          {!!rejected.length && loadMore && (
            <button className="secondary" style={{ width: "100%" }} disabled={curating} onClick={loadMore}>
              {curating ? "Finding more…" : <>Show me 5 more <RotateCcw size={16} /></>}
            </button>
          )}
        </div>
      ) : (
        <div style={{ margin: "0 16px" }} className="empty-state">
          <ChefHat />
          <h2>{rejected.length ? "Want a fresh set?" : "No results from Moody"}</h2>
          <p>{rejected.length
            ? "None of those landed — Moody can pull a completely new batch that still respects your profile and safety rules."
            : "Moody couldn't find matching recipes right now. Try adjusting your mood, time, or cuisine and search again."}</p>
          {rejected.length && loadMore
            ? <button className="primary" disabled={curating} onClick={loadMore}>{curating ? "Finding more…" : <>Show me 5 more <RotateCcw size={16} /></>}</button>
            : <>{retry && <button className="primary" onClick={retry} style={{ marginBottom: 8 }}><RotateCcw size={16} /> Retry</button>}<button className="secondary" onClick={() => setResults(false)}>Adjust check-in</button></>}
        </div>
      )}
      <div style={{ padding: "14px 16px 0" }}>
        <button className="secondary" style={{ width: "100%" }} onClick={() => setResults(false)}>← Change tonight’s context</button>
      </div>
      </>}
    </div>
  );

  return (
    <div className="home-screen">
      {/* Header: avatar/logo + greeting + bell — cloned from reference */}
      <AppHeader profile={profile} openNotifs={openNotifs} unread={unread} />

      <div className="home-greeting">
        <h1>What’s for dinner?</h1>
        <p>Tell Moody how you feel — get one perfect match.</p>
      </div>

      {/* ── Hero recipe photo (45vh, rounded, like the fitness hero image) ── */}
      <div className="home-hero" onClick={hero ? () => open(hero) : undefined}>
        <img src={hero?.image || FALLBACK_FOOD} alt={hero?.title || "Tonight’s dinner"} />
        <div className="hveil" />
        {/* Frosted glass chips top-left — copied from reference overlay chips */}
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
            {/* Blue circular arrow — "Start" button from reference */}
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

      {/* ── Check-in card — bottom-sheet style glass card ── */}
      <div className="home-checkin">
        <span className="section-label">How are you feeling?</span>
        {/* Mood pill row — all 9 moods */}
        <div className="mood-pills">
          {moods.map(v => (
            <button key={v} className={mood === v ? "active" : ""} onClick={() => setMood(v)}>{v}</button>
          ))}
        </div>

        <span className="section-label">Time available</span>
        {/* Number-pill selector — faithful to 10·20·30·40·50 in reference */}
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

        <span className="section-label">Energy level — {energy}%</span>
        <input type="range" value={energy} onChange={e => setEnergy(+e.target.value)} style={{ width: "100%" }} />
        <div className="range-label"><span>Low — easy recipes</span><span>High — adventurous</span></div>

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

        <button
          className="primary"
          style={{ width: "100%", marginTop: 14, minHeight: 54 }}
          disabled={!mealCategory}
          onClick={beginResults}
        >
          Search <ArrowRight size={18} />
        </button>
      </div>

      {/* ── Stat cards — today’s logged nutrition + Moody’s pick ── */}
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
      <FoodCamera label="Log a meal with photo" onSave={addPhoto} allergies={profile.allergies} style={{ margin: "10px 16px 0" }} />

      {/* ── Quick-link cards — styled like the bottom rows in reference ── */}
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
    </div>
  );
}
function Moody() { return <div className="moody"><Sparkles size={25} /></div>; }
function TopBar({ title, back }: { title: string; back?: () => void }) {
  const openMenu = useContext(MenuCtx);
  return <header className="top-bar"><button onClick={back} disabled={!back}><ArrowLeft /></button><h1>{title}</h1><button onClick={openMenu} aria-label="Open menu"><Menu /></button></header>;
}
function PickCard({ recipe, servings, open, reject }: { recipe: Recipe; servings: number; open: () => void; reject: () => void }) {
  return <article className="pick-card"><RecipeImage sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} /><div><h2>{recipe.title}</h2><span><Clock3 size={13} />{recipe.time} min</span><span><Users size={13} />Scaled for {servings}</span><span><Check size={13} />safe for everyone</span><button onClick={open}>View recipe</button><button className="reject" onClick={reject}>Not tonight</button></div><button className="save-mini"><Heart size={17} /></button></article>;
}

function TokenInput({ tokens, setTokens, placeholder }: { tokens: string[]; setTokens: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const add = (e: React.FormEvent) => { e.preventDefault(); const c = cleanText(text, 30); if (c) { setTokens([...new Set([...tokens, c])]); setText(""); } };
  return <>
    <form className="add-cue" onSubmit={add}><input value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} /><button><Plus /></button></form>
    {!!tokens.length && <div className="choice" style={{ marginTop: 8 }}>{tokens.map(t => <button className="custom-cue" onClick={() => setTokens(tokens.filter(x => x !== t))} key={t}>{t}<X size={13} /></button>)}</div>}
  </>;
}

function SearchScreen({ profile, onSearch }: { profile: Profile; onSearch: (request: SearchRequest) => void }) {
  const [query, setQuery] = useState("");
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

  const activeFilterCount =
    cuisines.length + include.length + exclude.length +
    (type ? 1 : 0) + (diet !== "Any" ? 1 : 0) + (maxTime !== 60 ? 1 : 0) +
    (sort !== (profile.rankingPreference || "Most popular") ? 1 : 0) +
    (maxCalories ? 1 : 0) + (minProtein ? 1 : 0);

  const run = () => {
    const filters: RecipeFilters = {
      query, cuisines,
      type: type || undefined,
      diet: diet === "Any" ? undefined : diet,
      maxReadyTime: maxTime, sort,
      includeIngredients: include, excludeIngredients: exclude,
      maxCalories: maxCalories || undefined,
      minProtein: minProtein || undefined,
    };
    onSearch({ query, filters });
  };

  return <div className="screen">
    <TopBar title="Ask Moody" />
    <div className="ai-search-intro"><Sparkles size={15} /><p>Describe what you want in your own words. Moody reads your food psychology profile and history on every search.</p></div>
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
        <span className="filter-label">Course — results never mix courses</span>
        <div className="choice">{MEAL_TYPES.map(t => <button key={t} className={type === t ? "active" : ""} onClick={() => setType(type === t ? "" : t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
      </div>
      <div className="filter-block">
        <span className="filter-label">Cuisine</span>
        <div className="choice">{SPOON_CUISINES.map(c => <button key={c} className={cuisines.includes(c) ? "active" : ""} onClick={() => setCuisines(toggle(cuisines, c))}>{c}</button>)}</div>
      </div>
      <div className="filter-block">
        <span className="filter-label">Additional diet filter</span>
        <div className="choice">{SEARCH_DIETS.map(d => <button key={d} className={diet === d ? "active" : ""} onClick={() => setDiet(d)}>{d}</button>)}</div>
      </div>
      <div className="filter-block">
        <span className="filter-label">Max cook time — {maxTime} min</span>
        <input type="range" min={10} max={120} step={5} value={maxTime} onChange={e => setMaxTime(+e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="filter-block">
        <span className="filter-label">Max calories {maxCalories ? `— ${maxCalories} kcal` : "— off"}</span>
        <input type="range" min={0} max={1200} step={50} value={maxCalories} onChange={e => setMaxCalories(+e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="filter-block">
        <span className="filter-label">Min protein {minProtein ? `— ${minProtein} g` : "— off"}</span>
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
      {!!activeFilterCount && <button className="secondary" style={{ width: "100%" }} onClick={() => { setCuisines([]); setType(""); setDiet("Any"); setMaxTime(60); setSort(profile.rankingPreference || "Most popular"); setInclude([]); setExclude([]); setMaxCalories(0); setMinProtein(0); }}>Clear filters</button>}
    </div>}

    <p className="quiet">Your saved allergies and diet always remain hard rules. Search filters can only narrow them further.</p>
  </div>;
}

function SearchResultsScreen({ results, loading, request, more, home, search, open, saved, setSaved }: { results: Recipe[]; loading: boolean; request: SearchRequest; more: () => void; home: () => void; search: () => void; open: (recipe: Recipe) => void; saved: string[]; setSaved: (values: string[]) => void }) {
  return <div className="screen">
    <TopBar title="Results" />
    <div className="results-summary"><span>{request.filters.type ? `${request.filters.type.toUpperCase()} ONLY` : "PERSONALISED SEARCH"}</span><h1>{request.query || "Recipes matching your filters"}</h1><p>{results.length} unique matches · up to {request.filters.maxReadyTime ?? 60} min</p></div>
    {loading && !results.length
      ? <div className="thinking-state"><div className="thinking-orbit"><Sparkles /><i /><i /><i /></div><span>SEARCHING</span><h1>Checking every hard rule.</h1><p>Diet, course, time, ingredients, and duplicates are being verified.</p></div>
      : results.length
        ? <div className="search-grid">{results.map(r => <article key={r.id}><RecipeImage sources={stepImageSources(undefined, r.image)} alt={r.title} /><button onClick={() => setSaved(toggle(saved, r.id))}><Heart fill={saved.includes(r.id) ? "currentColor" : "none"} /></button><div><h2>{r.title}</h2><p>{r.reason}</p><span><Clock3 size={13} /> {r.time} min · {r.difficulty}</span><button className="primary" onClick={() => open(r)}>View recipe</button></div></article>)}</div>
        : <div className="empty-state"><Search /><h2>No exact matches</h2><p>Adjust one filter and search again. Your saved diet and allergies remain protected.</p></div>}
    <div className="results-actions"><button className="primary" onClick={more} disabled={loading}>{loading ? "Finding alternatives…" : "More alternatives"}</button><button className="secondary" onClick={search}>Change search</button><button className="secondary" onClick={home}><Home size={17} />Return home</button></div>
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
  // Native share when the browser supports it (mobile), else share into the
  // in-app community feed.
  const share = async () => {
    const url = recipe.sourceUrl || (typeof location !== "undefined" ? location.href : "");
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: recipe.title, text: recipe.reason, url: url || undefined }); return; } catch { /* cancelled → fall through */ }
    }
    shareToCommunity();
  };
  return <div className="detail"><div className="detail-image">{showVideo && recipe.video ? <div className="detail-video-hero"><iframe src={`${recipe.video}?autoplay=1`} title={`${recipe.title} video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <RecipeImage sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} />}<button onClick={back}><ArrowLeft /></button><div><button onClick={share} aria-label="Share recipe"><Share2 /></button><button onClick={toggleSave} aria-label={saved ? "Saved" : "Save recipe"}><Heart fill={saved ? "currentColor" : "none"} /></button></div>{recipe.video && !showVideo && <button className="detail-video-bar" onClick={() => setShowVideo(true)}><Play size={15} fill="currentColor" />Watch video</button>}{recipe.video && showVideo && <button className="detail-video-bar" onClick={() => setShowVideo(false)}><X size={15} />Close video</button>}</div><section className="detail-sheet"><h1>{recipe.title}</h1><div className="facts"><span><Clock3 />{recipe.time} min</span><span><Users />Serves {servings}</span><span><Star />{recipe.calories} cal each</span></div><div className="moody-note"><Moody /><p>{recipe.reason}</p></div><div className="section-line"><h2>Ingredients</h2><span>{recipe.ingredients.length} items</span></div><div className="ingredients">{recipe.ingredients.map(i => <button className={checked.includes(i) ? "checked" : ""} onClick={() => setChecked(toggle(checked, i))} key={i}><span><Check size={14} /></span><p>{i}</p><em>{checked.includes(i) ? "Ready" : "I have it"}</em></button>)}</div><div className="section-line"><h2>Full cooking method</h2><span>{recipe.steps.length} steps</span></div><div className="recipe-method">{recipe.steps.map((step, index) => <article key={`${index}-${step.text}`}><b>{index + 1}</b><div><p>{displayStepDetail(step)}</p>{step.cue && <small><strong>Look for:</strong> {step.cue}</small>}</div></article>)}</div><div className="detail-actions"><button className="secondary" onClick={addGroceries}><ShoppingCart size={18} />Add to grocery</button><button className="secondary" onClick={share}><Share2 size={18} />Share recipe</button></div>{recipe.sourceUrl && <a className="source-link" href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">View original recipe ↗</a>}<FoodCamera label="📸 Log your version with a photo" onSave={p => addPhoto({ ...p, recipeId: recipe.id })} hint={{ recipeCalories: recipe.calories, recipeName: recipe.title }} allergies={allergies} style={{ marginTop: 10 }} /><button className="primary sticky-cta" onClick={cook}><ChefHat size={18} />Open guided cooking</button></section></div>;
}

function CookScreen({ recipe, exit, finish, allergies }: { recipe: Recipe; exit: () => void; finish: (rating: number, photo?: FoodPhoto) => void; allergies: string[] }) {
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(5);
  const [mealPhoto, setMealPhoto] = useState<FoodPhoto | null>(null);
  if (!recipe.steps.length) return <div className="cook cook-unavailable"><section className="cook-instruction-card"><h1>Instructions unavailable.</h1><p>This recipe did not include cooking steps.</p>{recipe.sourceUrl && <a className="source-link" href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">View original recipe ↗</a>}<button className="cook-next" onClick={exit}>Back to recipe</button></section></div>;
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
                <img src={p.image} alt={p.dish} />
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
// Pantry — a maintainable inventory of what the user has at home. Backed by the
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
  return <div className="screen"><TopBar title="Weekly reflection" /><section className="insight-lead"><span>VARIETY SCORE</span><b>{varietyScore}</b><em>Looking balanced</em><p>You cooked {diary.length} meal{diary.length !== 1 ? "s" : ""} across {cuisines} cuisine{cuisines !== 1 ? "s" : ""}. {avgTime ? `Average cook time: ${avgTime} min.` : ""}</p></section><div className="insight-cards"><article><Sparkles /><b>Your profile</b><h2>Personalised picks</h2><p>Every recommendation is ranked against your food-psychology profile. The more you cook, the sharper it gets.</p></article><article><Clock3 /><b>Your rhythm</b><h2>{avgTime ? `~${avgTime} min average` : "Build your rhythm"}</h2><p>{avgTime < 30 ? "Quick meals are your sweet spot. Moody will protect that on low-energy nights." : avgTime < 45 ? "You strike a good balance between speed and depth." : "You invest real time in cooking — Moody will keep surfacing recipes worth it."}</p></article><article><ShieldCheck /><b>Informational only</b><h2>Nutrition, without judgment</h2><p>These reflections use recipe snapshots and are not medical advice.</p></article></div></div>;
}
function LibraryScreen({ title, source, open, remove }: { title: string; source: Recipe[]; open: (r: Recipe) => void; remove?: (r: Recipe) => void }) {
  return <div className="screen"><TopBar title={title} /><div className="search-grid">{source.length ? source.map(r => <article key={r.id}>{remove && <button className="remove-saved" aria-label={`Remove ${r.title} from saved`} onClick={() => remove(r)}><Trash2 size={17} /></button>}<img src={r.image} alt="" /><div><h2>{r.title}</h2><p>{r.reason}</p><button className="primary" onClick={() => open(r)}>View recipe</button></div></article>) : <div className="empty-state"><Heart /><h2>No saved recipes yet</h2><p>Save recipes that feel like good future answers.</p></div>}</div></div>;
}
function SettingsScreen({ profile, save, go, logout }: { profile: Profile; save: (p: Profile) => void; go: (p: Page) => void; logout: () => void }) {
  return <div className="screen"><TopBar title="Profile & settings" /><section className="profile-card">{profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <div>{profile.name.slice(0, 2).toUpperCase()}</div>}<h2>{profile.name}</h2><p>{profile.email || "Pilot preview profile"}</p><span>{profile.diet} · {profile.skill}</span></section><SettingsGroup title="ACCOUNT & COMMUNITY"><button onClick={() => go("account")}><UserRound />Account and public profile<ChevronRight /></button><button onClick={() => go("community")}><Users />Community and connections<ChevronRight /></button><button onClick={() => go("diners")}><UserPlus />Household diners<ChevronRight /></button></SettingsGroup><SettingsGroup title="HEALTH & FOOD PROFILE"><button onClick={() => go("food-profile")}><ClipboardCheck />Food profile &amp; preferences<ChevronRight /></button><button onClick={() => go("health")}><Activity />Health trends<ChevronRight /></button><button onClick={() => go("food-log")}><Camera />Food photo log<ChevronRight /></button><button onClick={() => go("psych-profile")}><Sparkles />Psychological food profile<ChevronRight /></button><button onClick={() => go("favorites")}><Heart />Saved recipes<ChevronRight /></button><button onClick={() => go("insights")}><BarChart3 />Weekly reflections<ChevronRight /></button><button><ShieldCheck />Safety filters<span>{profile.allergies.join(", ") || "None"}</span></button></SettingsGroup><SettingsGroup title="PREFERENCES"><label>Usual servings<input type="number" min="1" max="10" value={profile.servings} onChange={e => save({ ...profile, servings: +e.target.value })} /></label><button onClick={() => go("billing")}><Star />Subscription &amp; billing<ChevronRight /></button><button onClick={() => go("import")}><Upload />Import a recipe<ChevronRight /></button><button onClick={() => go("admin")}><LayoutDashboard />Editorial console<ChevronRight /></button><button onClick={() => go("help")}><HelpCircle />Help, tutorial &amp; FAQ<ChevronRight /></button></SettingsGroup><button className="danger" onClick={logout}><LogOut />Sign out and replay first launch</button></div>;
}
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="settings-group"><small>{title}</small>{children}</section>; }
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
      // Real Stripe Checkout — redirects user to Stripe's hosted page.
      const result = await startCheckout(plan);
      if (result.url) {
        window.location.href = result.url;
        return; // page will navigate away
      }
      setCheckoutError(result.error ?? "Could not start checkout. Please try again.");
      setCheckoutLoading(false);
    } else {
      // No backend — local pilot simulation.
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
        <span>YOUR FOOD PROFILE IS READY</span>
        <h1>{mode === "invite" ? "Redeem your invite." : "Start your 7-day free trial."}</h1>
        <div className="sub-mode-toggle">
          <button className={mode === "trial" ? "active" : ""} onClick={() => setMode("trial")}>Free trial</button>
          <button className={mode === "invite" ? "active" : ""} onClick={() => setMode("invite")}>Invite code</button>
        </div>
        {mode === "trial" ? (
          <>
            <p>Personalized, safe recommendations tuned to the profile you just built, plus cook mode, mood check-ins, and weekly reflections.</p>
            <PlanPicker plan={plan} setPlan={setPlan} />
            {checkoutError && <p className="invite-error">{checkoutError}</p>}
            <button className="primary" onClick={start} disabled={checkoutLoading}>
              {checkoutLoading ? "Opening checkout…" : <>Start free trial <ArrowRight /></>}
            </button>
            <small>7 days free, then {chosen?.price}. Card required — cancel anytime before trial ends.</small>
          </>
        ) : (
          <>
            <p>If you received an invite code, enter it below to unlock a full year of MoodFood — no payment required.</p>
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
        <button className="skip" onClick={proceed}>Maybe later</button>
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
        <span>{profile.inviteCode ? "INVITE — 1 YEAR ACCESS" : "7-DAY FULL ACCESS"}</span>
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
                    : `Start free trial — ${chosen?.name}`}
                </button>
                <small>Managed securely by Stripe. Cancel anytime.</small>
              </>
            ) : inviteSuccess ? (
              <p className="invite-success"><Check size={18} /> Code redeemed — you now have 1 year of full access.</p>
            ) : (
              <>
                <p>Enter an invite code to unlock a full year of MoodFood — no payment required.</p>
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
      setText(t => t || (r ? `Just found ${r.title} on MoodFood — looks perfect. ` : ""));
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
  const avgRating = n ? (diary.reduce((a, d) => a + d.rating, 0) / n).toFixed(1) : "—";
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
        <p>Cook a recipe and log it to your diary — your real patterns will appear here.</p>
      </div>
    </div>
  );
  return <div className="screen"><TopBar title={content.title} back={back} /><p className="quiet">{content.intro}</p><div className="metric-grid">{content.cards.map(([a, b]) => <article key={a}><span>{a}</span><b>{b}</b></article>)}</div><section className="health-note"><ShieldCheck /><div><b>How this is calculated</b><p>From nutrition snapshots and metadata attached to recipes you completed. It does not diagnose conditions or replace professional advice.</p></div></section></div>;
}
function FamilyHealth({ diary, diners, back }: { diary: { recipe: Recipe; rating: number; when: string }[]; diners: Diner[]; back: () => void }) {
  const familySize = Math.max(1, diners.length);
  const safeCoverage = Math.round((diners.filter(d => d.allergies.length || d.diet !== "Anything").length / familySize) * 100);
  // All metrics below are derived from real logged meals — no placeholder data.
  const n = diary.length;
  const uniqueRecipes = new Set(diary.map(d => d.recipe.id)).size;
  const plantForward = n ? Math.round(diary.filter(d => d.recipe.diets?.some(x => ["Vegetarian", "Vegan"].includes(x))).length / n * 100) : 0;
  const avgTime = n ? Math.round(diary.reduce((a, d) => a + d.recipe.time, 0) / n) : 0;
  const avgRating = n ? diary.reduce((a, d) => a + d.rating, 0) / n : 0;
  const varietyLabel = !n ? "—" : uniqueRecipes >= 8 ? "Excellent" : uniqueRecipes >= 4 ? "Good" : "Building";
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
// set of questions the user saw at first launch — they can refine anything here
// any time, which is why returning users never have to repeat onboarding.
function FoodProfileScreen({ profile, save, back }: { profile: Profile; save: (p: Profile) => void; back: () => void }) {
  const update = (key: OnboardingKey, value: ProfileValue) => save({ ...profile, [key]: value });
  const visible = onboardingQuestions.filter(q => !q.showIf || q.showIf(profile));
  return <div className="screen food-profile">
    <TopBar title="Food profile" back={back} />
    <section className="fp-intro">
      <span>YOUR FOOD PROFILE</span>
      <h1>Fine-tune what MoodFood knows.</h1>
      <p>These are the same questions from onboarding — change anything, any time, and your recommendations update to match. Everything saves automatically.</p>
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
function MoodyPanel({ recipe, profile, picks, close, open }: { recipe?: Recipe; profile?: Profile; picks?: Recipe[]; close: () => void; open: () => void }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      const context = profile
        ? { profile: { allergies: profile.allergies, diet: profile.diet, dislikedIngredients: profile.dislikedIngredients }, picks: (picks ?? []).map(r => ({ title: r.title, time: r.time, reason: r.reason })) }
        : undefined;
      const reply = await aiChat(message, context, history);
      setTurns(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setTurns(prev => [...prev, { role: "assistant", content: "I can’t reach my brain right now — sign in (or once AI is connected) and I’ll be back. Meanwhile, your safe pick below is a solid bet." }]);
    } finally {
      setBusy(false);
    }
  };

  return <div className="panel-bg" onClick={close}><aside className="moody-panel" onClick={e => e.stopPropagation()}><header><Moody /><div><b>Moody</b><span>Your dinner co-pilot</span></div><button onClick={close}><X /></button></header><div className="chat"><p>I can choose dinner, explain a recommendation, or help rescue the step you’re on.</p>{turns.map((t, i) => <p key={i} className={t.role === "user" ? "user-message" : "moody-message"}>{t.content}</p>)}{busy && <p className="moody-message">…</p>}{recipe && <button className="moody-pick" onClick={open}><img src={recipe.image} alt="" /><span><small>MY SAFE PICK RIGHT NOW</small><b>{recipe.title}</b><em>{recipe.time} min · {recipe.reason}</em></span></button>}<div ref={bottomRef} /></div><div className="prompt-row"><button onClick={() => send("Pick the easiest safe dinner.")}>Pick the easiest</button><button onClick={() => send("I only have 15 minutes.")}>Only 15 minutes</button>{recipe && <button onClick={() => send(`Why are you recommending ${recipe.title}?`)}>Explain this pick</button>}</div><form onSubmit={e => { e.preventDefault(); send(input); }}><input value={input} onChange={e => setInput(e.target.value)} placeholder="Tell Moody what you need..." /><button disabled={busy}><ArrowRight /></button></form></aside></div>;
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
          {/* Allergen warning — flag anything matching the user's profile first. */}
          {!!flagged.length && (
            <div className="fac-allergen-alert">
              <ShieldCheck size={15} />
              <span>Heads up — may contain <b>{flagged.join(", ")}</b>, which you flagged as an allergy. Always double-check.</span>
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
          <small className="fac-disclaimer">Estimates only — not medical or nutritional advice.</small>
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
          <p>Photograph a meal above — Moody estimates the calories and macros so you can track without counting.</p>
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
                  <img src={p.image} alt={p.dish} />
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
      { q: "What is the onboarding for?", a: `The in-depth onboarding (${onboardingQuestions.length} questions across ${onboardingSections.length} chapters) builds your food psychology profile — covering your cooking moods, taste phenotype (flavours and textures you love or avoid), emotional eating patterns, comfort food, kitchen setup, habits, values, and nutrition goals. Every answer shapes your recommendations.` },
      { q: "Can I change my profile later?", a: "Yes. Go to Settings → Psychological food profile to edit every answer. Changes take effect immediately on your next recommendation." },
      { q: "How do I reset and start fresh?", a: "Tap Settings → Sign out and replay first launch. This clears all stored data and takes you back to the welcome screen." },
    ],
  },
  {
    section: "Getting a recommendation",
    items: [
      { q: "How does the mood check-in work?", a: "Select your mood, how long you have, and your energy level on the home screen, then tap 'Find tonight's dinner'. Moody scores every recipe against your profile and surfaces the best match." },
      { q: "What does the energy slider do?", a: "Low energy nudges Moody toward one-pot, minimal-prep, easy recipes. High energy opens up more adventurous, multi-step dishes." },
      { q: "Are my allergies always enforced?", a: "Yes — always. Allergens and dietary restrictions set during onboarding are hard filters that are never relaxed, regardless of mood or any other setting." },
      { q: "What does 'Not tonight' do on a pick card?", a: "It hides that recipe for the current session only. It comes back next time." },
    ],
  },
  {
    section: "Food photo & calorie log",
    items: [
      { q: "How do I log a meal with a photo?", a: "Tap the camera button on the Home screen, in the Diary, on a Recipe detail page, or after finishing Cook mode. Choose a photo from your camera roll, and Moody will estimate the dish, calories, and macros in about 2 seconds." },
      { q: "How accurate are the calorie estimates?", a: "Estimates are derived from visual analysis of your photo matched against a food database. Accuracy is typically within 15–25% for single-dish meals. Results are shown with a confidence score. They are informational only — not medical or nutritional advice." },
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
      { q: "How do household diners work?", a: "Add family members or frequent diners under Settings → Household diners. On the home screen, select who is eating tonight. MoodFood combines every selected person's allergens and dietary requirements — so if anyone in the group has a peanut allergy, no recipe containing peanuts will appear." },
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
      { q: "Where is my mood and psychological data stored?", a: "During the local pilot, all data is stored in your browser's localStorage — it never leaves your device. The psychological food profile, raw mood entries, and private diary are never shown to other users." },
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
            <b>Quick start — 5 steps</b>
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
          { icon: <Sparkles size={20} />, title: "Moody AI", desc: "Your dinner co-pilot. Tap the floating sparkle button anytime to ask Moody anything — get a pick, rescue a step, or find the easiest safe option." },
          { icon: <Camera size={20} />, title: "Food photo log", desc: "Photograph any meal for an instant calorie + macro estimate. Logged photos feed your health trends and today's calorie total on the home screen." },
          { icon: <ShieldCheck size={20} />, title: "Safety first — always", desc: "Allergen and diet filters are hard constraints. They apply to every recommendation, every household diner, and are never softened by any setting." },
          { icon: <Users size={20} />, title: "Household diners", desc: "Add family members with their own profiles. Select them at check-in and safety constraints merge automatically — no meal reaches the table that's unsafe for anyone at it." },
          { icon: <Activity size={20} />, title: "Health trends", desc: "Tracks your logged diary entries and photo logs across nutrition, dietary variety, eating patterns, and family meal balance. Informational only — never medical advice." },
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
