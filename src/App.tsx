import { useEffect, useMemo, useState, useCallback, lazy } from "react";
import { type Recipe } from "./data";
import { bundledRecipes } from "./bundledRecipes";
import { clearStored, defaultDiners, defaultProfile, useStoredState, type Diner, type Profile, type SocialPost } from "./store";
import { profileForDiners, safeRecipes as applySafety } from "./recommendation";
import { recordRating } from "./behavioral";
import { compactPhotoLogs } from "./security";
import { sendConfirmationEmail, sendWelcomeEmail, unreadCount } from "./notifications";
import { type FoodPhoto } from "./foodAnalysis";
import { persistFoodPhoto } from "./photoStorage";
import { buildFoodHistory } from "./recipes";
import {
  signOut as authSignOut,
  onAuthChange,
  isSupabaseConfigured,
} from "./auth";
import { supabase } from "./supabase";
import { nextSavedRecipeIds } from "./savedRecipes";
// Entry-flow + onboarding screens are needed once per user lifetime — lazy-load
// them (with gsap, which only they use) out of the returning-user's main chunk.
const Landing = lazy(() => import("./Landing").then(m => ({ default: m.Landing })));
import { readDevTestState } from "./devTestState";
import { buildQuickStartProfilePatch } from "./activation";
import { syncSubscriptionFromDB } from "./api/backend";
import { type Entry, type Page } from "./appTypes";
import { MenuCtx } from "./components/MenuCtx";
import { usePullToRefresh } from "./hooks/usePullToRefresh";
import { useNotifications } from "./hooks/useNotifications";
import { useMoodyChat } from "./hooks/useMoodyChat";
import { useRecipeSearch } from "./hooks/useRecipeSearch";
import { useHomeFeed } from "./hooks/useHomeFeed";
import { useLearningSignals } from "./hooks/useLearningSignals";
import { useProfileSync, prefsForUpsert } from "./hooks/useProfileSync";
import { PullRefreshIndicator } from "./components/PullRefreshIndicator";
import { BottomNav, DesktopNav } from "./components/AppChrome";
import { MainMenu } from "./components/MainMenu";
import { NotificationsPanel } from "./components/NotificationsPanel";
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
const QuickTasteStartScreen = lazy(() => import("./screens/entry/QuickTasteStartScreen").then(m => ({ default: m.QuickTasteStartScreen })));
const FirstPickScreen = lazy(() => import("./screens/entry/FirstPickScreen").then(m => ({ default: m.FirstPickScreen })));
const AccountSetupScreen = lazy(() => import("./screens/entry/AccountSetupScreen").then(m => ({ default: m.AccountSetupScreen })));
const VerifyEmailScreen = lazy(() => import("./screens/entry/VerifyEmailScreen").then(m => ({ default: m.VerifyEmailScreen })));
const LoginScreen = lazy(() => import("./screens/entry/LoginScreen").then(m => ({ default: m.LoginScreen })));
const VerifiedScreen = lazy(() => import("./screens/entry/VerifiedScreen").then(m => ({ default: m.VerifiedScreen })));
const SubscriptionScreen = lazy(() => import("./screens/entry/SubscriptionScreen").then(m => ({ default: m.SubscriptionScreen })));
const Onboarding = lazy(() => import("./screens/onboarding/Onboarding").then(m => ({ default: m.Onboarding })));
import { HomeScreen } from "./screens/HomeScreen";
import { SearchScreen } from "./screens/SearchScreen";

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
  const [quickMood, setQuickMood] = useState("Tired");
  const [quickEnergy, setQuickEnergy] = useState(25);
  const [quickTime, setQuickTime] = useState(30);
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
  const safeRecipes = useMemo(() => applySafety(catalog, sharedProfile), [catalog, sharedProfile]);

  // What the user has actually cooked, logged, and saved, so the AI learns from
  // behaviour, not just the stated profile. Recomputed as those change.
  const foodHistory = useMemo(
    () => buildFoodHistory(diary, profile.photoLogs, catalog.filter(r => saved.includes(r.id))),
    [diary, profile.photoLogs, saved, catalog],
  );
  const {
    mood, setMood, energy, setEnergy, time, setTime,
    mealCategory, setMealCategory, cuisine, setCuisine, homeDiet, setHomeDiet,
    results, setResults, ranked, curating, hasFetched, loadMore,
    live, curated, beginResults: beginCheckin, retry,
  } = useHomeFeed(entry, sharedProfile, foodHistory, appliedSignals, aiCuration, behavioralConsent, setCatalog);
  const { moodyTurns, setMoodyTurns, loadMoodyCatalog } = useMoodyChat(catalog, setCatalog, foodHistory, mood, sharedProfile);
  const { searchRequest, setSearchRequest, searchResults, searchLoading, searchRelaxed, runSearch, cancelSearch } = useRecipeSearch(sharedProfile, mood, foodHistory, setPage);

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
      {page === "home" && <HomeScreen profile={profile} diary={diary} saved={saved} catalog={catalog} mood={mood} setMood={setMood} energy={energy} setEnergy={setEnergy} time={time} setTime={setTime} mealCategory={mealCategory} setMealCategory={setMealCategory} cuisine={cuisine} setCuisine={setCuisine} diet={homeDiet} setDiet={setHomeDiet} results={false} setResults={setResults} beginResults={() => { setSearchRequest(null); beginCheckin(); go("results"); }} ranked={ranked} curating={curating} loadMore={loadMore} live={live} curated={curated} retry={retry} open={open} go={go} diners={diners} selectedDiners={selectedDiners} setSelectedDiners={setSelectedDiners} eaterCount={eaterCount} setEaterCount={setEaterCount} openNotifs={openNotifs} unread={unreadCount()} addPhoto={addPhoto} onPickSuggestion={r => runSearch({ query: r.title, filters: { query: r.title } })} toggleSave={toggleSavedRecipe} />}
      {page === "search" && <SearchScreen profile={sharedProfile} diary={diary} saved={saved} catalog={catalog} onSearch={request => runSearch(request)} />}
      {page === "results" && (searchRequest
        ? <SearchResultsScreen results={searchResults} loading={searchLoading} request={searchRequest} relaxed={searchRelaxed} more={() => runSearch(searchRequest, true)} home={() => go("home")} search={() => go("search")} open={open} saved={saved} toggleSave={toggleSavedRecipe} />
        : results
          ? <HomeScreen profile={profile} diary={diary} saved={saved} catalog={catalog} mood={mood} setMood={setMood} energy={energy} setEnergy={setEnergy} time={time} setTime={setTime} mealCategory={mealCategory} setMealCategory={setMealCategory} cuisine={cuisine} setCuisine={setCuisine} diet={homeDiet} setDiet={setHomeDiet} results setResults={v => { setResults(v); if (!v) go("home"); }} beginResults={() => {}} ranked={ranked} curating={curating} hasFetched={hasFetched} loadMore={loadMore} live={live} curated={curated} retry={retry} open={open} go={go} diners={diners} selectedDiners={selectedDiners} setSelectedDiners={setSelectedDiners} eaterCount={eaterCount} setEaterCount={setEaterCount} openNotifs={openNotifs} unread={unreadCount()} addPhoto={addPhoto} onPickSuggestion={r => runSearch({ query: r.title, filters: { query: r.title } })} toggleSave={toggleSavedRecipe} />
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



