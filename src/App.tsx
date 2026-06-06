import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, ChefHat, ChevronRight,
  Clock3, Heart, Home, ListChecks, MoreVertical, Pause, Play, RotateCcw, Search,
  Settings2, ShoppingCart, Sparkles, Star, Timer, X, ShieldCheck, UserRound, BarChart3,
  Upload, LogOut, Plus, ClipboardCheck, LayoutDashboard, Camera, Users, MessageCircle,
  Send, UserPlus, Lock, Globe2, Activity, Salad, Wheat, Droplets, TrendingUp, Mail, CreditCard,
  HelpCircle, FlameKindling, Dna, BookMarked,
} from "lucide-react";
import { moods, recipes, type Recipe } from "./data";
import { clearStored, defaultDiners, defaultProfile, readStored, useStoredState, writeStored, type Diner, type Profile, type SocialPost } from "./store";
import { profileForDiners, recommend, safeRecipes as applySafety } from "./recommendation";
import { cleanText, readSafeImage } from "./security";
import { onboardingQuestions, onboardingSections, type OnboardingKey, type OnboardingQuestion, type ProfileValue } from "./onboarding";
import { sendConfirmationEmail, sendWelcomeEmail, scheduleTrial, runDue, readInbox, unreadCount, markAllRead, cancelScheduled, simulateTrialEnd, type InboxItem } from "./notifications";
import { analyzeFood, sumNutrition, type FoodPhoto } from "./foodAnalysis";

type Page = "home" | "search" | "diary" | "grocery" | "planner" | "detail" | "cook" | "insights" | "settings" | "favorites" | "import" | "admin" | "billing" | "psych-profile" | "account" | "community" | "health" | "health-nutrition" | "health-variety" | "health-patterns" | "family-health" | "diners" | "food-log" | "help";
type Entry = "welcome" | "onboarding" | "account" | "verify" | "verified" | "subscription" | "app";
const PLANS = [
  { id: "annual", name: "Annual", price: "$120/year", note: "Best value — about 2 months free" },
  { id: "quarterly", name: "Quarterly", price: "$36/quarter", note: "Save 20% — billed every 3 months" },
  { id: "monthly", name: "Monthly", price: "$15/month", note: "Cancel anytime" },
] as const;
const nav = [
  ["home", "Home", Home], ["search", "Search", Search], ["diary", "Diary", BookOpen],
  ["grocery", "Grocery", ShoppingCart], ["planner", "Planner", CalendarDays],
] as const;
const seedPosts: SocialPost[] = [
  { id: "p1", author: "Maya Chen", avatar: "", text: "Added lemon zest at the end and it made the whole bowl sing. My tip: toast the quinoa for a minute first.", image: recipes[1].image, recipeId: "chicken-bowl", createdAt: "18 min ago", likes: ["Alex", "Jon"], comments: [{ author: "Jon Bell", text: "Trying the toasted quinoa tip tonight." }] },
  { id: "p2", author: "Jon Bell", avatar: "", text: "A very tired-night tomato soup. Used oat yogurt and it worked beautifully.", image: recipes[2].image, recipeId: "tomato-soup", createdAt: "Yesterday", likes: ["Maya"], comments: [] },
];

export default function App() {
  const [splash, setSplash] = useState(true);
  const [entry, setEntry] = useStoredState<Entry>("moodfood-entry", "welcome");
  const [storedProfile, setProfile] = useStoredState<Profile>("moodfood-profile", defaultProfile);
  const profile = { ...defaultProfile, ...storedProfile };
  const [page, setPage] = useState<Page>("home");
  const [selected, setSelected] = useState(recipes[0]);
  const [mood, setMood] = useState("Cozy");
  const [energy, setEnergy] = useState(45);
  const [time, setTime] = useState(30);
  const [results, setResults] = useState(false);
  const [moodyOpen, setMoodyOpen] = useState(false);
  const [saved, setSaved] = useStoredState<string[]>("moodfood-saved", ["green-pasta"]);
  const [diary, setDiary] = useStoredState("moodfood-diary", [{ recipe: recipes[1], rating: 5, when: "Yesterday" }]);
  const [groceries, setGroceries] = useStoredState("moodfood-groceries", ["Baby spinach", "Lemon", "Garlic", "Greek yogurt"]);
  const [posts, setPosts] = useStoredState<SocialPost[]>("moodfood-posts", seedPosts);
  const [connections, setConnections] = useStoredState<string[]>("moodfood-connections", ["Maya Chen"]);
  const [diners, setDiners] = useStoredState<Diner[]>("moodfood-diners", defaultDiners);
  const [selectedDiners, setSelectedDiners] = useState<string[]>(["self"]);
  const [eaterCount, setEaterCount] = useStoredState<number>("moodfood-eater-count", 1);
  const sharedProfile = useMemo(() => profileForDiners(profile, diners.filter(d => selectedDiners.includes(d.id) && d.id !== "self")), [profile, diners, selectedDiners]);
  const safeRecipes = useMemo(() => applySafety(recipes, sharedProfile), [sharedProfile]);
  const ranked = useMemo(() => recommend(recipes, sharedProfile, mood, energy, time).map(item => item.recipe), [sharedProfile, mood, energy, time]);

  const [notifOpen, setNotifOpen] = useState(false);
  const [, setNotifTick] = useState(0);
  const refreshNotifs = () => setNotifTick(t => t + 1);
  useEffect(() => { const { charged } = runDue(); if (charged) setProfile(p => ({ ...p, subscriptionStatus: "active" })); refreshNotifs(); }, []);

  const go = (next: Page) => { setPage(next); window.scrollTo(0, 0); };
  const open = (recipe: Recipe) => { setSelected(recipe); go("detail"); };
  const openNotifs = () => { markAllRead(); setNotifOpen(true); refreshNotifs(); };

  if (splash) return <Splash proceed={() => setSplash(false)} />;
  if (entry === "welcome") return <Welcome start={() => setEntry("onboarding")} preview={() => { setProfile({ ...defaultProfile, onboarded: true, accountCreated: true, emailVerified: true, subscriptionStatus: "trialing" }); setEntry("app"); }} />;
  if (entry === "onboarding") return <Onboarding profile={profile} save={setProfile} finish={(next) => { setProfile({ ...next, onboarded: true }); clearStored("moodfood-onboarding-step"); setEntry("account"); }} />;
  if (entry === "account") return <AccountSetupScreen profile={profile} back={() => setEntry("onboarding")} submit={(patch) => { const next = { ...profile, ...patch, accountCreated: true, emailVerified: false }; setProfile(next); sendConfirmationEmail(next.email, next.name); refreshNotifs(); setEntry("verify"); }} />;
  if (entry === "verify") return <VerifyEmailScreen email={profile.email} resend={() => { sendConfirmationEmail(profile.email, profile.name); refreshNotifs(); }} back={() => setEntry("account")} onVerified={() => { setProfile({ ...profile, emailVerified: true }); sendWelcomeEmail(profile.email, profile.name); refreshNotifs(); setEntry("verified"); }} />;
  if (entry === "verified") return <VerifiedScreen name={profile.name} proceed={() => setEntry("subscription")} />;
  if (entry === "subscription") return <SubscriptionScreen profile={profile} save={setProfile} onStarted={refreshNotifs} proceed={() => setEntry("app")} />;
  return <div className={page === "cook" ? "app cooking" : "app"}>
    {page !== "cook" && <DesktopNav page={page} go={go} />}
    <main>
      {page === "home" && <HomeScreen profile={profile} mood={mood} setMood={setMood} energy={energy} setEnergy={setEnergy} time={time} setTime={setTime} results={results} setResults={setResults} ranked={ranked} open={open} go={go} diners={diners} selectedDiners={selectedDiners} setSelectedDiners={setSelectedDiners} eaterCount={eaterCount} setEaterCount={setEaterCount} openNotifs={openNotifs} unread={unreadCount()} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} />}
      {page === "search" && <SearchScreen source={safeRecipes} open={open} saved={saved} setSaved={setSaved} />}
      {page === "detail" && <DetailScreen recipe={selected} servings={eaterCount} back={() => go("home")} cook={() => go("cook")} saved={saved.includes(selected.id)} toggleSave={() => setSaved(toggle(saved, selected.id))} addGroceries={() => setGroceries(v => [...new Set([...v, ...selected.ingredients])])} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} />}
      {page === "cook" && <CookScreen recipe={selected} exit={() => go("detail")} finish={(rating, photo) => { setDiary(v => [{ recipe: selected, rating, when: "Today" }, ...v]); if (photo) setProfile(p => ({ ...p, photoLogs: [photo, ...p.photoLogs] })); go("diary"); }} />}
      {page === "diary" && <DiaryScreen diary={diary} open={open} photoLogs={profile.photoLogs} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} goFoodLog={() => go("food-log")} />}
      {page === "grocery" && <GroceryScreen items={groceries} setItems={setGroceries} />}
      {page === "planner" && <PlannerScreen open={open} />}
      {page === "insights" && <InsightsScreen diary={diary} />}
      {page === "settings" && <SettingsScreen profile={profile} save={setProfile} go={go} logout={() => setEntry("welcome")} />}
      {page === "favorites" && <LibraryScreen title="Saved recipes" source={safeRecipes.filter(r => saved.includes(r.id))} open={open} />}
      {page === "import" && <ImportScreen />}
      {page === "admin" && <AdminScreen />}
      {page === "billing" && <BillingScreen profile={profile} save={setProfile} />}
      {page === "psych-profile" && <PsychProfileScreen profile={profile} save={setProfile} back={() => go("settings")} />}
      {page === "account" && <AccountScreen profile={profile} save={setProfile} posts={posts.filter(p => p.author === profile.name)} back={() => go("settings")} />}
      {page === "community" && <CommunityScreen profile={profile} posts={posts} setPosts={setPosts} connections={connections} setConnections={setConnections} openRecipe={open} />}
      {page === "health" && <HealthHub diary={diary} go={go} />}
      {page === "health-nutrition" && <HealthDetail kind="nutrition" diary={diary} back={() => go("health")} />}
      {page === "health-variety" && <HealthDetail kind="variety" diary={diary} back={() => go("health")} />}
      {page === "health-patterns" && <HealthDetail kind="patterns" diary={diary} back={() => go("health")} />}
      {page === "family-health" && <FamilyHealth diary={diary} diners={diners} back={() => go("health")} />}
      {page === "diners" && <DinersScreen diners={diners} save={setDiners} back={() => go("settings")} />}
      {page === "food-log" && <FoodLogScreen logs={profile.photoLogs} addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))} back={() => go("diary")} />}
      {page === "help" && <HelpScreen back={() => go("settings")} />}
    </main>
    {page !== "cook" && <BottomNav page={page} go={go} />}
    {page !== "cook" && <button className="moody-fab" onClick={() => setMoodyOpen(true)} aria-label="Ask Moody"><Sparkles /></button>}
    {moodyOpen && <MoodyPanel recipe={ranked[0]} close={() => setMoodyOpen(false)} open={() => { setMoodyOpen(false); if (ranked[0]) open(ranked[0]); }} />}
    {notifOpen && <NotificationsPanel close={() => setNotifOpen(false)} profile={profile} save={setProfile} refresh={refreshNotifs} />}
  </div>;
}

function toggle(values: string[], value: string) { return values.includes(value) ? values.filter(v => v !== value) : [...values, value]; }

const SPLASH_PHOTO   = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1100&q=85";
const WELCOME_PHOTO  = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1100&q=85";
const FALLBACK_FOOD  = "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80";

// One curated food photo per onboarding section.
const SECTION_PHOTOS: Record<string, string> = {
  "Food & safety":    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
  "Your palate":      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=80",
  "Ingredients":      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80",
  "Food psychology":  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
  "Comfort & mood":   "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
  "Kitchen & goals":  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80",
};

function Splash({ proceed }: { proceed: () => void }) {
  return (
    <button className="splash" onClick={proceed} aria-label="Open MoodFood">
      <img className="splash-photo" src={SPLASH_PHOTO} alt="Delicious food" />
      <div className="splash-veil" />
      {/* Logo centred in the upper third — always visible above the dark veil */}
      <div className="splash-logo-center">
        <img src="/images/logo-1.png" alt="MoodFood" />
        <span>MoodFood</span>
      </div>
      <div className="splash-copy">
        <span className="splash-eyebrow">YOUR PERSONAL FOOD COMPANION</span>
        <strong>Eat for the way<br />you feel.</strong>
        <p>One safe, perfectly matched meal — chosen for your mood, energy, and taste.</p>
        <span className="splash-cta">Get started <ArrowRight size={16} /></span>
      </div>
    </button>
  );
}

function Welcome({ start, preview }: { start: () => void; preview: () => void }) {
  return (
    <div className="welcome-modern">
      <div className="wm-logo"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
      <div className="hero">
        <img src={WELCOME_PHOTO} alt="A fresh, colourful meal" />
        <div className="wm-badge"><ShieldCheck size={14} /> Safety always first</div>
      </div>
      <div className="copy">
        <span className="wm-eye">WELCOME TO MOODFOOD</span>
        <h1>Food that meets your mood.</h1>
        <p>Tell us how you feel and what you love. We match you to one safe, doable meal — so dinner feels like care, not another decision.</p>
      </div>
      <div className="actions">
        <button className="primary" style={{ width: "100%", minHeight: 54 }} onClick={start}>
          Build my food profile <ArrowRight size={18} />
        </button>
        <button className="ghost" onClick={preview}>Take a quick look around</button>
      </div>
    </div>
  );
}

function AccountSetupScreen({ profile, back, submit }: { profile: Profile; back: () => void; submit: (patch: Partial<Profile>) => void }) {
  const [name, setName] = useState(profile.name === "Alex" ? "" : profile.name);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(profile.avatar);
  const [error, setError] = useState("");
  const upload = async (file?: File) => { if (!file) return; try { setAvatar(await readSafeImage(file)); setError(""); } catch (err) { setError((err as Error).message); } };
  const valid = cleanText(name, 80) && /.+@.+\..+/.test(email) && password.length >= 6;
  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!valid) { setError("Add your name, a valid email, and a password of at least 6 characters."); return; } submit({ name: cleanText(name, 80), email: email.trim(), avatar }); };
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
      <button className="primary" type="submit">Create account <ArrowRight size={18} /></button>
    </form>
    <small><Lock size={11} /> We never share your mood data. For this local pilot, your password isn't stored.</small>
  </div>;
}

function VerifyEmailScreen({ email, onVerified, resend, back }: { email: string; onVerified: () => void; resend: () => void; back: () => void }) {
  const [sent, setSent] = useState(false);
  return <div className="auth-modern center">
    <button className="back" onClick={back} aria-label="Back"><ArrowLeft /></button>
    <div className="verify-icon"><Mail size={34} /></div>
    <span className="eyebrow">CHECK YOUR INBOX</span>
    <h1>Confirm your email.</h1>
    <p className="lede">We sent a confirmation link to <span className="maskmail">{email}</span>. Open it to verify your account and continue.</p>
    <button className="primary" onClick={onVerified}>I've opened the link <ArrowRight size={18} /></button>
    <button className="ghost" onClick={() => { resend(); setSent(true); }}>{sent ? "Sent again ✓" : "Resend confirmation email"}</button>
    <small>In a production build this button is the link inside the email. Here, tapping it simulates the confirmation.</small>
  </div>;
}

function VerifiedScreen({ name, proceed }: { name: string; proceed: () => void }) {
  return <div className="auth-modern center">
    <div className="verify-icon verified-icon"><Check size={36} /></div>
    <span className="eyebrow">YOU'RE ALL SET</span>
    <h1>Welcome aboard{name && name !== "Alex" ? `, ${name}` : ""}.</h1>
    <p className="lede">Your email is confirmed and your food profile is saved. One last step before we start cooking.</p>
    <button className="primary" onClick={proceed}>Continue <ArrowRight size={18} /></button>
  </div>;
}
function Onboarding({ profile, save, finish }: { profile: Profile; save: (p: Profile) => void; finish: (p: Profile) => void }) {
  const total = onboardingQuestions.length;
  const [step, setStep] = useStoredState<number>("moodfood-onboarding-step", 0);
  const index = Math.min(Math.max(0, step), total);          // index === total -> review
  const onReview = index === total;
  const update = (key: OnboardingKey, value: ProfileValue) => save({ ...profile, [key]: value });
  const go = (n: number) => { setStep(n); window.scrollTo(0, 0); };

  if (onReview) {
    const summary: [string, string][] = [
      ["Diet", profile.diet],
      ["Hard exclusions", profile.allergies.join(", ") || "None"],
      ["Won't eat", profile.dislikedIngredients.join(", ") || "Open to most things"],
      ["Loves", [...profile.flavorLikes, ...profile.textureLikes].slice(0, 5).join(", ") || "Still learning"],
      ["Cuisines", profile.cuisines.join(", ") || "Open to anything"],
      ["Drawn to food for", profile.foodValues.slice(0, 4).join(", ") || "—"],
      ["Comfort means", profile.comfortFoods.slice(0, 4).join(", ") || "—"],
      ["Cooking", `${profile.skill} · serves ${profile.servings} · ${profile.weeknightTime}`],
      ["Working toward", profile.nutritionGoals.join(", ") || "No specific goal"],
    ];
    // ── Review screen ──────────────────────────────────────────────
    const reviewPhoto = SECTION_PHOTOS["Kitchen & goals"];
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
  const q = onboardingQuestions[index];
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
    return <div className="mood-defs">{q.rows!.map(row => <label key={row}><b>{row}</b><input value={rec[row] || ""} onChange={e => update(q.key, { ...rec, [row]: e.target.value })} placeholder={q.placeholder} /></label>)}</div>;
  }
  return null;
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
function AppHeader({ openNotifs, unread, profile }: { openNotifs?: () => void; unread?: number; profile?: Profile }) {
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
    </header>
  );
}

function HomeScreen({ profile, mood, setMood, energy, setEnergy, time, setTime, results, setResults, ranked, open, go, diners, selectedDiners, setSelectedDiners, eaterCount, setEaterCount, openNotifs, unread, addPhoto }: {
  profile: Profile; mood: string; setMood: (v: string) => void; energy: number; setEnergy: (v: number) => void; time: number; setTime: (v: number) => void;
  results: boolean; setResults: (v: boolean) => void; ranked: Recipe[]; open: (r: Recipe) => void; go: (p: Page) => void;
  diners: Diner[]; selectedDiners: string[]; setSelectedDiners: (v: string[]) => void;
  eaterCount: number; setEaterCount: (v: number) => void; openNotifs?: () => void; unread?: number;
  addPhoto: (p: FoodPhoto) => void;
}) {
  const [rejected, setRejected] = useState<string[]>([]);
  const visible = ranked.filter(r => !rejected.includes(r.id));
  const hero = ranked[0];

  // Results view — same layout container, different content
  if (results) return (
    <div className="home-screen">
      <AppHeader profile={profile} openNotifs={openNotifs} unread={unread} />
      <div className="home-greeting">
        <h1>Tonight’s picks.</h1>
        <p>{energy < 50 ? "Low-effort" : "Interesting"}, {mood.toLowerCase()}, within {time} min · {eaterCount} {eaterCount === 1 ? "person" : "people"}</p>
      </div>
      {visible.length ? (
        <div style={{ padding: "0 16px", display: "grid", gap: 14 }}>
          {visible.map(r => <PickCard key={r.id} recipe={r} servings={eaterCount} open={() => open(r)} reject={() => setRejected([...rejected, r.id])} />)}
        </div>
      ) : (
        <div style={{ margin: "0 16px" }} className="empty-state">
          <ShieldCheck /><h2>No safe matches right now</h2>
          <p>Your hard safety filters stayed in place. Try adjusting time or mood — never your exclusions.</p>
          <button className="secondary" onClick={() => setResults(false)}>Adjust check-in</button>
        </div>
      )}
      <div style={{ padding: "14px 16px 0" }}>
        <button className="secondary" style={{ width: "100%" }} onClick={() => setResults(false)}>← Change tonight’s context</button>
      </div>
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

        <button
          className="primary"
          style={{ width: "100%", marginTop: 18, minHeight: 54 }}
          onClick={() => setResults(true)}
        >
          Find tonight’s dinner <ArrowRight size={18} />
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
      <FoodCamera label="Log a meal with photo" onSave={addPhoto} style={{ margin: "10px 16px 0" }} />

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
function TopBar({ title, back, action }: { title: string; back?: () => void; action?: React.ReactNode }) {
  return <header className="top-bar"><button onClick={back} disabled={!back}><ArrowLeft /></button><h1>{title}</h1><button>{action || <MoreVertical />}</button></header>;
}
function PickCard({ recipe, servings, open, reject }: { recipe: Recipe; servings: number; open: () => void; reject: () => void }) {
  return <article className="pick-card"><img src={recipe.image} alt="" /><div><h2>{recipe.title}</h2><span><Clock3 size={13} />{recipe.time} min</span><span><Users size={13} />Scaled for {servings}</span><span><Check size={13} />safe for everyone</span><button onClick={open}>View recipe</button><button className="reject" onClick={reject}>Not tonight</button></div><button className="save-mini"><Heart size={17} /></button></article>;
}

function SearchScreen({ source, open, saved, setSaved }: { source: Recipe[]; open: (r: Recipe) => void; saved: string[]; setSaved: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const shown = source.filter(r => `${r.title} ${r.cuisine} ${r.moods.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="screen"><TopBar title="Find a recipe" action={<Settings2 />} /><div className="search-box"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Something cozy in 25 minutes" /></div><p className="quiet">All results are filtered for your saved diet and safety preferences.</p><div className="search-grid">{shown.map(r => <article key={r.id}><img src={r.image} alt="" /><button onClick={() => setSaved(toggle(saved, r.id))}><Heart fill={saved.includes(r.id) ? "currentColor" : "none"} /></button><div><h2>{r.title}</h2><p>{r.reason}</p><span><Clock3 size={13} /> {r.time} min · {r.difficulty}</span><button className="primary" onClick={() => open(r)}>View recipe</button></div></article>)}</div></div>;
}

function DetailScreen({ recipe, servings, back, cook, saved, toggleSave, addGroceries, addPhoto }: { recipe: Recipe; servings: number; back: () => void; cook: () => void; saved: boolean; toggleSave: () => void; addGroceries: () => void; addPhoto: (p: FoodPhoto) => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  return <div className="detail"><div className="detail-image"><img src={recipe.image} alt="" /><button onClick={back}><ArrowLeft /></button><div><button><MoreVertical /></button><button onClick={toggleSave}><Heart fill={saved ? "currentColor" : "none"} /></button></div></div><section className="detail-sheet"><h1>{recipe.title}</h1><div className="facts"><span><Clock3 />{recipe.time} min</span><span><Users />Serves {servings}</span><span><Star />{recipe.calories} cal each</span></div><div className="moody-note"><Moody /><p>{recipe.reason}</p></div><div className="section-line"><h2>Ingredients</h2><span>{recipe.ingredients.length} items</span></div><div className="ingredients">{recipe.ingredients.map(i => <button className={checked.includes(i) ? "checked" : ""} onClick={() => setChecked(toggle(checked, i))} key={i}><span><Check size={14} /></span><p>{i}</p><em>{checked.includes(i) ? "Ready" : "I have it"}</em></button>)}</div><button className="secondary" onClick={addGroceries}><ShoppingCart size={18} />Add ingredients to grocery</button><FoodCamera label="📸 Log your version with a photo" onSave={p => addPhoto({ ...p, recipeId: recipe.id })} hint={{ recipeCalories: recipe.calories, recipeName: recipe.title }} style={{ marginTop: 10 }} /><button className="primary sticky-cta" onClick={cook}><ChefHat size={18} />Start cook mode</button></section></div>;
}

function CookScreen({ recipe, exit, finish }: { recipe: Recipe; exit: () => void; finish: (rating: number, photo?: FoodPhoto) => void }) {
  const saved = readStored<{ step?: unknown }>(`moodfood-cook-${recipe.id}`, {});
  const resumedStep = typeof saved.step === "number" && Number.isInteger(saved.step) ? Math.min(saved.step, recipe.steps.length - 1) : 0;
  const [step, setStep] = useState(Math.max(0, resumedStep));
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(5);
  const [mealPhoto, setMealPhoto] = useState<FoodPhoto | null>(null);
  const current = recipe.steps[step];
  useEffect(() => writeStored(`moodfood-cook-${recipe.id}`, { step }), [step, recipe.id]);
  useEffect(() => { if (!running || seconds <= 0) return; const id = setInterval(() => setSeconds((v: number) => v - 1), 1000); return () => clearInterval(id); }, [running, seconds]);
  const next = () => step === recipe.steps.length - 1 ? setDone(true) : setStep(step + 1);
  return <div className="cook"><header><button onClick={exit}><X /></button><b>Step {step + 1} of {recipe.steps.length}</b><button><MoreVertical /></button></header><div className="cook-progress"><span style={{ width: `${((step + 1) / recipe.steps.length) * 100}%` }} /></div><h1>{current.text}</h1><img src={recipe.image} alt="" />{current.active && <div className="active-items"><small>Active ingredients</small><div>{current.active.map(i => <span key={i}>{i}</span>)}</div></div>}{current.timer && <button className="timer" onClick={() => { setSeconds(current.timer!); setRunning(!running); }}><Timer />{seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : `${Math.round(current.timer / 60)}:00`}</button>}<div className="cook-controls"><button onClick={() => setStep(Math.max(0, step - 1))}><RotateCcw /><span>Previous</span></button><button className="pause" onClick={() => setRunning(!running)}>{running ? <Pause /> : <Play />}<span>{running ? "Pause" : "Start"}</span></button><button onClick={next}><Play /><span>{step === recipe.steps.length - 1 ? "Finish" : "Next"}</span></button></div><div className="awake"><Check />Screen stays awake</div>{done && <div className="finish-overlay"><section><div className="done-mark"><Check /></div><h2>Dinner is ready.</h2><p>How did it land tonight?</p><div className="stars">{[1,2,3,4,5].map(n => <button onClick={() => setRating(n)} key={n}><Star fill={n <= rating ? "currentColor" : "none"} /></button>)}</div>{mealPhoto ? <div className="photo-preview-mini"><img src={mealPhoto.image} alt="Your meal" /><span><b>{mealPhoto.calories} kcal</b> estimated · {mealPhoto.dish}</span></div> : <FoodCamera label="📸 Add a photo of your cook" onSave={p => setMealPhoto({ ...p, recipeId: recipe.id })} compact />}<button className="primary" onClick={() => finish(rating, mealPhoto ?? undefined)}>Log meal &amp; finish</button><button className="text" onClick={() => setDone(false)}>Back to cooking</button></section></div>}</div>;
}

function DiaryScreen({ diary, open, photoLogs, addPhoto, goFoodLog }: {
  diary: { recipe: Recipe; rating: number; when: string }[];
  open: (r: Recipe) => void;
  photoLogs: FoodPhoto[];
  addPhoto: (p: FoodPhoto) => void;
  goFoodLog: () => void;
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
            <FoodCamera label="+" onSave={addPhoto} compact tile />
          </div>
        ) : (
          <FoodCamera label="📸 Photograph your next meal" onSave={addPhoto} />
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
  return <div className="screen"><TopBar title="Grocery" /><div className="grocery-hero"><ShoppingCart /><div><b>{items.length - checked.length} items left</b><p>One calm lap around the store.</p></div></div><div className="grocery-list"><small>PRODUCE & FRIDGE</small>{items.map(i => <button className={checked.includes(i) ? "checked" : ""} onClick={() => setChecked(toggle(checked, i))} key={i}><span><Check /></span><p>{i}</p></button>)}</div><button className="secondary" onClick={() => setItems([...items, "Fresh basil"])}>+ Add an item</button></div>;
}
function PlannerScreen({ open }: { open: (r: Recipe) => void }) {
  return <div className="screen"><TopBar title="This week" /><p className="quiet">Enough structure to help, enough room to change your mind.</p><div className="planner">{["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, n) => <article key={day}><b>{day}<span>{n + 1}</span></b>{n % 2 ? <button onClick={() => open(recipes[n % recipes.length])}><img src={recipes[n % recipes.length].image} alt="" /><div><small>DINNER</small><h2>{recipes[n % recipes.length].title}</h2><p>{recipes[n % recipes.length].time} min</p></div></button> : <button className="empty">+ Add dinner</button>}</article>)}</div></div>;
}

function InsightsScreen({ diary }: { diary: { recipe: Recipe; rating: number; when: string }[] }) {
  const cuisines = new Set(diary.map(d => d.recipe.cuisine)).size;
  return <div className="screen"><TopBar title="Weekly reflection" /><section className="insight-lead"><span>VARIETY SCORE</span><b>{Math.min(96, 62 + diary.length * 8)}</b><em>Looking balanced</em><p>You cooked {diary.length} meals across {cuisines || 1} cuisines. Short, nourishing meals are your strongest rhythm.</p></section><div className="insight-cards"><article><Sparkles /><b>A quiet win</b><h2>More plants, naturally</h2><p>Your recent meals included a broader mix of vegetables, without adding much cooking time.</p></article><article><Clock3 /><b>Your sweet spot</b><h2>Under 30 minutes</h2><p>You finish quick recipes most often. Moody will protect that on low-energy nights.</p></article><article><ShieldCheck /><b>Informational only</b><h2>Nutrition, without judgment</h2><p>These reflections use recipe snapshots and are not medical advice.</p></article></div></div>;
}
function LibraryScreen({ title, source, open }: { title: string; source: Recipe[]; open: (r: Recipe) => void }) {
  return <div className="screen"><TopBar title={title} /><div className="search-grid">{source.length ? source.map(r => <article key={r.id}><img src={r.image} alt="" /><div><h2>{r.title}</h2><p>{r.reason}</p><button className="primary" onClick={() => open(r)}>View recipe</button></div></article>) : <div className="empty-state"><Heart /><h2>No saved recipes yet</h2><p>Save recipes that feel like good future answers.</p></div>}</div></div>;
}
function SettingsScreen({ profile, save, go, logout }: { profile: Profile; save: (p: Profile) => void; go: (p: Page) => void; logout: () => void }) {
  return <div className="screen"><TopBar title="Profile & settings" /><section className="profile-card">{profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <div>{profile.name.slice(0, 2).toUpperCase()}</div>}<h2>{profile.name}</h2><p>{profile.email || "Pilot preview profile"}</p><span>{profile.diet} · {profile.skill}</span></section><SettingsGroup title="ACCOUNT & COMMUNITY"><button onClick={() => go("account")}><UserRound />Account and public profile<ChevronRight /></button><button onClick={() => go("community")}><Users />Community and connections<ChevronRight /></button><button onClick={() => go("diners")}><UserPlus />Household diners<ChevronRight /></button></SettingsGroup><SettingsGroup title="HEALTH & FOOD PROFILE"><button onClick={() => go("health")}><Activity />Health trends<ChevronRight /></button><button onClick={() => go("food-log")}><Camera />Food photo log<ChevronRight /></button><button onClick={() => go("psych-profile")}><Sparkles />Psychological food profile<ChevronRight /></button><button onClick={() => go("favorites")}><Heart />Saved recipes<ChevronRight /></button><button onClick={() => go("insights")}><BarChart3 />Weekly reflections<ChevronRight /></button><button><ShieldCheck />Safety filters<span>{profile.allergies.join(", ") || "None"}</span></button></SettingsGroup><SettingsGroup title="PREFERENCES"><label>Usual servings<input type="number" min="1" max="10" value={profile.servings} onChange={e => save({ ...profile, servings: +e.target.value })} /></label><button onClick={() => go("billing")}><Star />Subscription &amp; billing<ChevronRight /></button><button onClick={() => go("import")}><Upload />Import a recipe<ChevronRight /></button><button onClick={() => go("admin")}><LayoutDashboard />Editorial console<ChevronRight /></button><button onClick={() => go("help")}><HelpCircle />Help, tutorial &amp; FAQ<ChevronRight /></button></SettingsGroup><button className="danger" onClick={logout}><LogOut />Sign out and replay first launch</button></div>;
}
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="settings-group"><small>{title}</small>{children}</section>; }
function ImportScreen() {
  const [url, setUrl] = useState(""); const [done, setDone] = useState(false);
  return <div className="screen"><TopBar title="Import recipe" /><section className="import-card"><Upload /><span>WEB RECIPE IMPORT</span><h1>Bring a trusted recipe into your library.</h1><p>We’ll preserve the source, extract ingredients and steps, then ask you to review it before use.</p><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/recipe" /><button className="primary" onClick={() => setDone(Boolean(url))}>Import & review</button>{done && <div className="import-success"><Check /><b>Draft created</b><span>Structure checked · source retained · waiting for review</span></div>}</section></div>;
}
function AdminScreen() {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  return <div className="admin"><header><img src="/images/logo-1.png" alt="" /><div><span>EDITORIAL CONSOLE</span><h1>Recipe quality desk</h1></div></header><div className="admin-stats"><article><b>{recipes.length}</b><span>Total recipes</span></article><article><b>{recipes.filter(r => r.status === "published").length}</b><span>Published & verified</span></article><article><b>0</b><span>Safety flags</span></article></div><section><h2>Review queue</h2>{recipes.map(r => <article className="review-row" key={r.id}><img src={r.image} alt="" /><div><h3>{r.title}</h3><p>{r.cuisine} · {r.ingredients.length} ingredients · {r.steps.length} steps</p><span>Rights checked · Timing checked · Safety tags present</span></div><select value={statuses[r.id] || r.status} onChange={e => setStatuses({ ...statuses, [r.id]: e.target.value })}><option>draft</option><option>review</option><option>published</option><option>retired</option></select></article>)}</section></div>;
}
function PlanPicker({ plan, setPlan }: { plan: string; setPlan: (p: string) => void }) {
  return <>{PLANS.map(p => <button key={p.id} className={plan === p.id ? "active" : ""} onClick={() => setPlan(p.id)}><div><b>{p.name}</b><span>{p.note}</span></div><strong>{p.price}</strong></button>)}</>;
}
function SubscriptionScreen({ profile, save, proceed, onStarted }: { profile: Profile; save: (p: Profile) => void; proceed: () => void; onStarted?: () => void }) {
  const [plan, setPlan] = useState(profile.plan || "annual");
  const chosen = PLANS.find(p => p.id === plan);
  const start = () => {
    const now = new Date();
    const endsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    save({ ...profile, plan, trialStartedAt: now.toISOString(), trialEndsAt: endsAt, subscriptionStatus: "trialing" });
    scheduleTrial(profile.email, chosen?.name || plan, chosen?.price || "", endsAt);
    onStarted?.();
    proceed();
  };
  return <div className="subscription"><div className="sub-logo"><img src="/images/logo-1.png" alt="MoodFood" /><span>MoodFood</span></div><section className="billing"><span>YOUR FOOD PROFILE IS READY</span><h1>Start your 7-day free trial.</h1><p>Personalized, safe recommendations tuned to the profile you just built, plus cook mode, mood check-ins, and weekly reflections.</p><PlanPicker plan={plan} setPlan={setPlan} /><button className="primary" onClick={start}>Start free trial <ArrowRight /></button><small>7 days free, then {chosen?.price}. We'll remind you the day before. Cancel anytime — for this local pilot, no card is charged.</small><button className="skip" onClick={proceed}>Maybe later</button></section></div>;
}
function BillingScreen({ profile, save }: { profile: Profile; save: (p: Profile) => void }) {
  const [plan, setPlan] = useState(profile.plan || "annual");
  const chosen = PLANS.find(p => p.id === plan);
  return <div className="screen"><TopBar title="Subscription" /><section className="billing"><span>7-DAY FULL ACCESS</span><h1>Keep dinner feeling lighter.</h1><p>Personalized decisions, safe recommendations, cook mode, and weekly reflections.</p><PlanPicker plan={plan} setPlan={setPlan} /><button className="primary" onClick={() => save({ ...profile, plan })}>{profile.plan === plan ? "Current plan" : `Switch to ${chosen?.name}`}</button><small>After cancellation, your recipes and diary remain readable for 7 days.</small></section></div>;
}
function AccountScreen({ profile, save, posts, back }: { profile: Profile; save: (p: Profile) => void; posts: SocialPost[]; back: () => void }) {
  const update = (patch: Partial<Profile>) => save({ ...profile, ...patch });
  const [uploadError, setUploadError] = useState("");
  const upload = async (file?: File) => { if (!file) return; try { update({ avatar: await readSafeImage(file) }); setUploadError(""); } catch (error) { setUploadError((error as Error).message); } };
  return <div className="screen account"><TopBar title="Your account" back={back} /><section className="account-hero"><label>{profile.avatar ? <img src={profile.avatar} alt={profile.name} /> : <span>{profile.name.slice(0, 2).toUpperCase()}</span>}<i><Camera size={16} /></i><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label>{uploadError && <em>{uploadError}</em>}<h1>{profile.name}</h1><p>{profile.bio}</p><small>{posts.length} posts · Profile linked to your shared cooks</small></section><ProfileEditor title="Public profile" text="This is what people you connect with can see."><label className="account-field">Display name<input maxLength={80} value={profile.name} onChange={e => update({ name: cleanText(e.target.value, 80) })} /></label><label className="account-field">Bio<textarea maxLength={300} value={profile.bio} onChange={e => update({ bio: cleanText(e.target.value, 300) })} /></label><label className="account-field">Location<input maxLength={100} value={profile.location} onChange={e => update({ location: cleanText(e.target.value, 100) })} placeholder="Optional" /></label></ProfileEditor><ProfileEditor title="Privacy and sharing" text="Your psychological profile, raw mood entries, and private diary are never shown here."><Choice values={["connections", "public", "private"]} active={profile.profileVisibility} pick={v => update({ profileVisibility: v as Profile["profileVisibility"] })} /><label className="toggle-row"><span><b>Offer to share completed cooks</b><small>You always confirm before anything is posted.</small></span><input type="checkbox" checked={profile.shareCookedMeals} onChange={e => update({ shareCookedMeals: e.target.checked })} /></label></ProfileEditor>{posts.length > 0 && <ProfileEditor title="Posts linked to your profile" text="Images and tips you chose to share."><div className="profile-gallery">{posts.map(p => <img src={p.image} alt="" key={p.id} />)}</div></ProfileEditor>}</div>;
}
function CommunityScreen({ profile, posts, setPosts, connections, setConnections, openRecipe }: { profile: Profile; posts: SocialPost[]; setPosts: (p: SocialPost[]) => void; connections: string[]; setConnections: (p: string[]) => void; openRecipe: (r: Recipe) => void }) {
  const [composer, setComposer] = useState(false); const [text, setText] = useState(""); const [image, setImage] = useState(""); const [recipeId, setRecipeId] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState("");
  const upload = async (file?: File) => { if (!file) return; try { setImage(await readSafeImage(file)); setUploadError(""); } catch (error) { setUploadError((error as Error).message); } };
  const publish = () => { const safeText = cleanText(text, 1000); if (!safeText && !image) return; setPosts([{ id: crypto.randomUUID(), author: cleanText(profile.name, 80), avatar: profile.avatar, text: safeText, image: image || recipes.find(r => r.id === recipeId)?.image || "", recipeId: recipeId || undefined, createdAt: "Just now", likes: [], comments: [] }, ...posts.slice(0, 99)]); setText(""); setImage(""); setRecipeId(""); setComposer(false); };
  const updatePost = (id: string, change: (p: SocialPost) => SocialPost) => setPosts(posts.map(p => p.id === id ? change(p) : p));
  return <div className="screen community"><TopBar title="Community" action={<Users />} /><section className="community-intro"><div><b>Cook together, from wherever.</b><p>Share recipes, photos, and useful tips. Your private mood and psychological profile stay private.</p></div><button className="primary" onClick={() => setComposer(!composer)}><Plus />Post</button></section><div className="people-row">{["Maya Chen", "Jon Bell", "Sam Rivera"].map(name => <button onClick={() => setConnections(toggle(connections, name))} key={name}><Avatar name={name} /><b>{name.split(" ")[0]}</b><span>{connections.includes(name) ? "Connected" : "Connect"}</span></button>)}</div>{composer && <section className="composer"><div><Avatar name={profile.name} image={profile.avatar} /><textarea maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="Share a cook, recipe, or tip..." /></div>{image && <img src={image} alt="Post preview" />}<select value={recipeId} onChange={e => setRecipeId(e.target.value)}><option value="">Link a recipe (optional)</option>{recipes.map(r => <option value={r.id} key={r.id}>{r.title}</option>)}</select>{uploadError && <p className="upload-error">{uploadError}</p>}<footer><label><Camera />Add photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label><button className="primary" onClick={publish}><Send />Share</button></footer></section>}<div className="feed">{posts.map(post => <article className="social-post" key={post.id}><header><Avatar name={post.author} image={post.avatar} /><div><b>{post.author}</b><span>{post.createdAt}</span></div><MoreVertical /></header><p>{post.text}</p>{post.image && <img src={post.image} alt="Cooked meal" />}{post.recipeId && <button className="linked-recipe" onClick={() => { const r = recipes.find(x => x.id === post.recipeId); if (r) openRecipe(r); }}><ChefHat /><span><small>LINKED RECIPE</small><b>{recipes.find(r => r.id === post.recipeId)?.title}</b></span><ChevronRight /></button>}<div className="social-actions"><button onClick={() => updatePost(post.id, p => ({ ...p, likes: toggle(p.likes, profile.name) }))}><Heart fill={post.likes.includes(profile.name) ? "currentColor" : "none"} />{post.likes.length}</button><button><MessageCircle />{post.comments.length}</button></div>{post.comments.map((c, n) => <p className="comment" key={n}><b>{c.author}</b> {c.text}</p>)}<form className="comment-form" onSubmit={e => { e.preventDefault(); if (!comment[post.id]?.trim()) return; updatePost(post.id, p => ({ ...p, comments: [...p.comments, { author: profile.name, text: cleanText(comment[post.id], 500) }] })); setComment({ ...comment, [post.id]: "" }); }}><input maxLength={500} value={comment[post.id] || ""} onChange={e => setComment({ ...comment, [post.id]: cleanText(e.target.value, 500) })} placeholder="Add a helpful comment..." /><button><Send /></button></form></article>)}</div></div>;
}
function Avatar({ name, image }: { name: string; image?: string }) { return image ? <img className="avatar-img" src={image} alt={name} /> : <span className="avatar-fallback">{name.split(" ").map(v => v[0]).join("").slice(0, 2)}</span>; }
function HealthHub({ diary, go }: { diary: { recipe: Recipe; rating: number; when: string }[]; go: (p: Page) => void }) {
  const vegetarian = diary.filter(d => d.recipe.diets.includes("Vegetarian")).length;
  return <div className="screen health"><TopBar title="Your health" action={<Activity />} /><section className="health-hero"><span>LAST 30 DAYS</span><h1>Your dietary trends.</h1><p>A calm breakdown based on meals you logged. Informational only, never medical advice.</p><div><b>{diary.length}</b><small>meals logged</small><b>{new Set(diary.map(d => d.recipe.cuisine)).size}</b><small>cuisines</small><b>{vegetarian}</b><small>plant-forward</small></div></section><button className="family-health-link" onClick={() => go("family-health")}><Users /><span><b>Family health profile</b><small>Overall analytics for family meals only</small></span><ChevronRight /></button><div className="health-links"><button onClick={() => go("health-nutrition")}><Salad /><span><b>Nutrition balance</b><small>Calories, protein, fiber, and meal balance</small></span><ChevronRight /></button><button onClick={() => go("health-variety")}><TrendingUp /><span><b>Dietary variety</b><small>Cuisines, proteins, vegetables, and repetition</small></span><ChevronRight /></button><button onClick={() => go("health-patterns")}><Clock3 /><span><b>Eating patterns</b><small>Cook frequency, timing, and completion habits</small></span><ChevronRight /></button></div><section className="trend-preview"><h2>This month at a glance</h2><Trend label="Plant-forward meals" value={Math.min(100, vegetarian * 25 + 25)} /><Trend label="Recipe variety" value={Math.min(100, new Set(diary.map(d => d.recipe.id)).size * 28)} /><Trend label="Home-cooked rhythm" value={Math.min(100, diary.length * 18)} /></section></div>;
}
function Trend({ label, value }: { label: string; value: number }) { return <div className="trend"><span><b>{label}</b><em>{value}%</em></span><i><b style={{ width: `${value}%` }} /></i></div>; }
function HealthDetail({ kind, diary, back }: { kind: "nutrition" | "variety" | "patterns"; diary: { recipe: Recipe; rating: number; when: string }[]; back: () => void }) {
  const content = kind === "nutrition" ? { title: "Nutrition balance", intro: "A source-labeled view of your logged recipes.", cards: [["Average energy", `${Math.round(diary.reduce((a,d)=>a+d.recipe.calories,0)/Math.max(1,diary.length))} cal`],["Protein pattern","Steady"],["Fiber-rich meals","3 this week"],["Plant ingredients","Trending up"]] } : kind === "variety" ? { title: "Dietary variety", intro: "How broad your recent food rhythm has been.", cards: [["Variety score","82 / 100"],["Cuisines",`${new Set(diary.map(d=>d.recipe.cuisine)).size}`],["Repeated recipe","1"],["New flavors","2 this month"]] } : { title: "Eating patterns", intro: "Patterns from completed cooks, without judgment.", cards: [["Meals cooked",`${diary.length}`],["Typical cook time","Under 30 min"],["Best completion day","Tuesday"],["Average rating","4.8 / 5"]] };
  return <div className="screen"><TopBar title={content.title} back={back} /><p className="quiet">{content.intro}</p><div className="metric-grid">{content.cards.map(([a,b]) => <article key={a}><span>{a}</span><b>{b}</b></article>)}</div><section className="health-note"><ShieldCheck /><div><b>How this is calculated</b><p>From nutrition snapshots and metadata attached to recipes you completed. It does not diagnose conditions or replace professional advice.</p></div></section></div>;
}
function FamilyHealth({ diary, diners, back }: { diary: { recipe: Recipe; rating: number; when: string }[]; diners: Diner[]; back: () => void }) {
  const familySize = Math.max(1, diners.length);
  const safeCoverage = Math.round((diners.filter(d => d.allergies.length || d.diet !== "Anything").length / familySize) * 100);
  return <div className="screen family-health"><TopBar title="Family health" back={back} /><section className="family-hero"><Users /><span>HOUSEHOLD PROFILE</span><h1>How family meals are trending.</h1><p>Aggregate analytics only. Individual moods, psychological profiles, and private diaries are not shown here.</p><div><b>{familySize}</b><small>registered diners</small><b>{diary.length}</b><small>family meals logged</small></div></section><div className="metric-grid"><article><span>Shared meal variety</span><b>Good</b></article><article><span>Plant-forward meals</span><b>58%</b></article><article><span>Average family cook</span><b>28 min</b></article><article><span>Safety profiles complete</span><b>{safeCoverage}%</b></article></div><section className="trend-preview"><h2>Family meal balance</h2><Trend label="Vegetable variety" value={74} /><Trend label="Protein variety" value={68} /><Trend label="Home-cooked rhythm" value={Math.min(100, diary.length * 18)} /><Trend label="Shared appeal" value={82} /></section><section className="family-members"><h2>Household coverage</h2>{diners.map(d => <div key={d.id}><Avatar name={d.name} /><span><b>{d.name}</b><small>{d.relationship} · {d.diet}</small></span><em>{d.allergies.length ? `${d.allergies.length} safety rule${d.allergies.length > 1 ? "s" : ""}` : "Basic profile"}</em></div>)}</section></div>;
}
function DinersScreen({ diners, save, back }: { diners: Diner[]; save: (d: Diner[]) => void; back: () => void }) {
  const [adding, setAdding] = useState(false); const [name, setName] = useState("");
  return <div className="screen"><TopBar title="Household diners" back={back} /><p className="quiet">Select these people during mood check-in. MoodFood combines every selected diner’s hard safety constraints.</p><div className="diner-list">{diners.map(d => <article key={d.id}><Avatar name={d.name} /><div><b>{d.name}</b><span>{d.relationship} · {d.diet}</span><small>{d.allergies.length ? `Avoid: ${d.allergies.join(", ")}` : "No saved allergens"}</small></div>{d.id !== "self" && <button onClick={() => save(diners.filter(x => x.id !== d.id))}><X /></button>}</article>)}</div>{adding ? <form className="add-diner" onSubmit={e => { e.preventDefault(); if(cleanText(name, 80)) save([...diners,{id:crypto.randomUUID(),name:cleanText(name, 80),relationship:"Guest",diet:"Anything",allergies:[]}]); setName(""); setAdding(false); }}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Diner name" /><button className="primary">Add diner</button></form> : <button className="secondary" onClick={() => setAdding(true)}><Plus />Add household diner</button>}</div>;
}
// Pull the option list for an onboarding question so the profile editor and the
// onboarding flow always offer the same suggestions.
function optionsFor(id: string) { return onboardingQuestions.find(q => q.id === id)?.options || []; }

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
function MoodyPanel({ recipe, close, open }: { recipe?: Recipe; close: () => void; open: () => void }) {
  const [message, setMessage] = useState("");
  return <div className="panel-bg" onClick={close}><aside className="moody-panel" onClick={e => e.stopPropagation()}><header><Moody /><div><b>Moody</b><span>Your dinner co-pilot</span></div><button onClick={close}><X /></button></header><div className="chat"><p>I can choose dinner, explain a recommendation, or help rescue the step you’re on.</p>{message && <p className="user-message">{message}</p>}{recipe && <button className="moody-pick" onClick={open}><img src={recipe.image} alt="" /><span><small>MY SAFE PICK RIGHT NOW</small><b>{recipe.title}</b><em>{recipe.time} min · {recipe.reason}</em></span></button>}</div><div className="prompt-row"><button onClick={() => setMessage("Pick the easiest safe dinner.")}>Pick the easiest</button><button onClick={() => setMessage("I only have 15 minutes.")}>Only 15 minutes</button></div><form onSubmit={e => { e.preventDefault(); setMessage(""); }}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell Moody what you need..." /><button><ArrowRight /></button></form></aside></div>;
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
  compact = false,
  tile = false,
  style,
}: {
  label?: string;
  onSave: (p: FoodPhoto) => void;
  hint?: { recipeCalories?: number; recipeName?: string };
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
      const analysis = await analyzeFood(image, hint);
      setResult(analysis);
      setState("done");
    } catch {
      setState("idle");
    }
  };

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

function FoodLogScreen({ logs, addPhoto, back }: { logs: FoodPhoto[]; addPhoto: (p: FoodPhoto) => void; back: () => void }) {
  const grouped = logs.reduce<Record<string, FoodPhoto[]>>((acc, l) => {
    const day = l.when.split(",")[0] || l.when.slice(0, 6);
    return { ...acc, [day]: [...(acc[day] || []), l] };
  }, {});

  return (
    <div className="screen">
      <TopBar title="Food photo log" back={back} />
      <FoodCamera label="📸 Log a meal with photo" onSave={addPhoto} />
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
      { q: "What is the onboarding for?", a: "The 28-question onboarding builds your food psychology profile — covering taste phenotype (flavours and textures you love or avoid), emotional eating patterns, comfort food preferences, kitchen setup, and nutrition goals. Every answer shapes your recommendations." },
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
      { q: "Can I pause cook mode?", a: "Yes — tap the Pause button or navigate away. When you return to the recipe, cook mode resumes from where you left off." },
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
          { n: 1, title: "Complete onboarding", desc: "28 questions build your taste + psychology profile. More detail = better matches." },
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
