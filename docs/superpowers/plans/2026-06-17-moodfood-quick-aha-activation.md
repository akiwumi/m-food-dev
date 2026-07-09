# MoodFood Quick Aha Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a new user experience MoodFood's core value in under 60 seconds: four quick inputs, one confident meal recommendation, two backups, then a trial prompt after value is demonstrated.

**Architecture:** Add a lightweight activation path beside the existing deep onboarding instead of deleting the current profile builder. Quick-start answers are saved into the existing `Profile` model, the first recommendation reuses existing deterministic ranking/safety logic, and subscription becomes a post-pick conversion step. Home is then simplified around the same dinner-decision loop.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, existing localStorage profile store, existing `recommend()` / `safeRecipes()` recipe ranking.

---

## Decisions Locked

- First aha happens before full onboarding and before subscription.
- Quick Taste Start collects only mood, energy, time, and safety diet/allergies.
- Results show one confident hero pick plus two backup picks.
- Subscription appears after first recommendation and sells the outcome: less dinner decision fatigue.
- Deep onboarding remains as progressive profile building: "Improve my MoodFood."
- Home becomes a dinner decision machine, not a dashboard.
- Moody is structured first, chat second.
- Rejection is one-tap learning that immediately improves the next pick.
- First 2-minute feeling target: relief.
- Referral-worthy moment: a personal "why this fits you" explanation.
- Scope: small UX pivot first, not a whole-app redesign.

## File Structure

- Modify `src/store.ts`
  - Add activation fields to `Profile`: `quickStartCompleted`, `firstPickViewed`, `activationPaywallSeen`, and `quickStartSafetyConfirmed`.
  - Keep defaults backward compatible for existing localStorage profiles.

- Create `src/activation.ts`
  - Own pure activation helpers: quick-start profile patching, first-pick selection, backup selection, rejection adjustment, and "why this fits" copy.
  - This keeps activation behavior testable outside `App.tsx`.

- Create `src/activation.test.ts`
  - Unit tests for quick-start profile patch, safety preservation, hero + backups, rejection reasons, and explanation copy.

- Modify `src/devTestState.ts`
  - Add dev states for quick-start, first-pick, and post-pick paywall.
  - Enables fast manual and automated UI checks.

- Modify `src/App.tsx`
  - Add new entry route: `quick-start`.
  - Add `QuickTasteStartScreen`, `FirstPickScreen`, `PostPickPaywallScreen`.
  - Route first-run users: landing -> quick-start -> first-pick -> paywall/trial -> app.
  - Keep deep onboarding accessible after account/trial as profile improvement.
  - Simplify `HomeScreen` around the dinner-decision loop.

- Modify `src/Landing.tsx`
  - Change CTA from deep profile framing to first meal framing.
  - Remove warning copy that "the next part may feel a little long" from the primary path.

- Modify `src/styles.css`
  - Add styles for quick-start, first-pick, rejection reasons, and paywall.
  - Reduce home hierarchy noise by making secondary links visually secondary.

- Optional after implementation: Create `docs/activation-pivot-summary.md`
  - Short product note for the new activation loop and rationale.

---

### Task 1: Add Activation State To Profile

**Files:**
- Modify: `src/store.ts`
- Test: `src/activation.test.ts`

- [ ] **Step 1: Write the failing test for quick-start profile patch**

Create `src/activation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultProfile } from "./store";
import { buildQuickStartProfilePatch } from "./activation";

describe("quick-start activation", () => {
  it("stores only the minimum first-run inputs needed for a safe first pick", () => {
    const patch = buildQuickStartProfilePatch({
      diet: "Vegetarian",
      allergies: ["Dairy"],
    });

    expect(patch).toEqual({
      diet: "Vegetarian",
      allergies: ["Dairy"],
      quickStartCompleted: true,
      quickStartSafetyConfirmed: true,
      path: "quick",
    });
  });

  it("does not mark the full deep profile as onboarded", () => {
    const profile = {
      ...defaultProfile,
      ...buildQuickStartProfilePatch({ diet: "Vegan", allergies: [] }),
    };

    expect(profile.onboarded).toBe(false);
    expect(profile.quickStartCompleted).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/activation.test.ts
```

Expected: FAIL because `src/activation.ts` and activation profile fields do not exist.

- [ ] **Step 3: Add activation fields to `Profile`**

In `src/store.ts`, add these fields to `Profile` near the account/subscription lifecycle fields:

```ts
  // --- Quick aha activation lifecycle ---
  quickStartCompleted: boolean;
  firstPickViewed: boolean;
  activationPaywallSeen: boolean;
  quickStartSafetyConfirmed: boolean;
```

Add defaults in `defaultProfile`:

```ts
  quickStartCompleted: false,
  firstPickViewed: false,
  activationPaywallSeen: false,
  quickStartSafetyConfirmed: false,
```

- [ ] **Step 4: Create activation helper**

Create `src/activation.ts`:

```ts
import type { Profile } from "./store";

export type QuickStartInput = {
  diet: string;
  allergies: string[];
};

export function buildQuickStartProfilePatch(input: QuickStartInput): Partial<Profile> {
  return {
    diet: input.diet,
    allergies: input.allergies,
    quickStartCompleted: true,
    quickStartSafetyConfirmed: true,
    path: "quick",
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npm test -- src/activation.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store.ts src/activation.ts src/activation.test.ts
git commit -m "feat: add quick-start activation state"
```

---

### Task 2: Select One Hero Pick Plus Two Backups

**Files:**
- Modify: `src/activation.ts`
- Modify: `src/activation.test.ts`

- [ ] **Step 1: Add failing tests for hero and backups**

Append to `src/activation.test.ts`:

```ts
import type { Recipe } from "./data";
import { selectActivationPicks } from "./activation";

const activationRecipes: Recipe[] = [
  {
    id: "comfort-orzo",
    title: "One-Pot Tomato Orzo",
    image: "",
    time: 22,
    difficulty: "Easy",
    calories: 520,
    moods: ["Tired", "Stressed"],
    reason: "Warm, simple, and low effort.",
    cuisine: "Italian",
    mealTypes: ["dinner"],
    diets: ["Vegetarian"],
    allergens: [],
    equipment: ["Stovetop"],
    status: "published",
    ingredients: ["orzo", "tomatoes", "stock"],
    steps: [],
    tags: { effort: ["low_effort", "one_pot", "quick"], sensory: ["warm"], mood: ["comforting"] },
  },
  {
    id: "quick-salad",
    title: "Chickpea Crunch Salad",
    image: "",
    time: 15,
    difficulty: "Easy",
    calories: 430,
    moods: ["Healthy"],
    reason: "Fresh and fast.",
    cuisine: "Mediterranean",
    mealTypes: ["dinner"],
    diets: ["Vegetarian", "Gluten-free"],
    allergens: [],
    equipment: ["Stovetop"],
    status: "published",
    ingredients: ["chickpeas", "cucumber"],
    steps: [],
  },
  {
    id: "rice-bowl",
    title: "Egg Rice Bowl",
    image: "",
    time: 18,
    difficulty: "Easy",
    calories: 480,
    moods: ["Tired"],
    reason: "Fast pantry dinner.",
    cuisine: "Japanese",
    mealTypes: ["dinner"],
    diets: ["Vegetarian"],
    allergens: ["Eggs"],
    equipment: ["Stovetop"],
    status: "published",
    ingredients: ["rice", "egg"],
    steps: [],
  },
  {
    id: "long-roast",
    title: "Slow Roast Vegetables",
    image: "",
    time: 90,
    difficulty: "Medium",
    calories: 650,
    moods: ["Adventurous"],
    reason: "Lovely, but slow.",
    cuisine: "Mediterranean",
    mealTypes: ["dinner"],
    diets: ["Vegetarian"],
    allergens: [],
    equipment: ["Oven"],
    status: "published",
    ingredients: ["vegetables"],
    steps: [],
  },
];

describe("activation picks", () => {
  it("returns one hero pick and two backups from safe ranked recipes", () => {
    const picks = selectActivationPicks({
      recipes: activationRecipes,
      profile: { ...defaultProfile, diet: "Vegetarian", allergies: [], equipment: ["Stovetop", "Oven"] },
      mood: "Tired",
      energy: 20,
      time: 30,
    });

    expect(picks.hero?.id).toBe("comfort-orzo");
    expect(picks.backups.map(recipe => recipe.id)).toEqual(["rice-bowl", "quick-salad"]);
  });

  it("never includes recipes blocked by allergies or time limit", () => {
    const picks = selectActivationPicks({
      recipes: activationRecipes,
      profile: { ...defaultProfile, diet: "Vegetarian", allergies: ["Eggs"], equipment: ["Stovetop", "Oven"] },
      mood: "Tired",
      energy: 20,
      time: 30,
    });

    expect([picks.hero, ...picks.backups].filter(Boolean).map(recipe => recipe!.id)).not.toContain("rice-bowl");
    expect([picks.hero, ...picks.backups].filter(Boolean).map(recipe => recipe!.id)).not.toContain("long-roast");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/activation.test.ts
```

Expected: FAIL because `selectActivationPicks` does not exist.

- [ ] **Step 3: Implement pick selector**

Update `src/activation.ts`:

```ts
import type { Recipe } from "./data";
import type { Profile } from "./store";
import { recommend, safeRecipes } from "./recommendation";

export type QuickStartInput = {
  diet: string;
  allergies: string[];
};

export type ActivationPickInput = {
  recipes: Recipe[];
  profile: Profile;
  mood: string;
  energy: number;
  time: number;
};

export type ActivationPicks = {
  hero: Recipe | null;
  backups: Recipe[];
};

export function buildQuickStartProfilePatch(input: QuickStartInput): Partial<Profile> {
  return {
    diet: input.diet,
    allergies: input.allergies,
    quickStartCompleted: true,
    quickStartSafetyConfirmed: true,
    path: "quick",
  };
}

export function selectActivationPicks(input: ActivationPickInput): ActivationPicks {
  const safe = safeRecipes(input.recipes, input.profile);
  const ranked = recommend(safe, input.profile, input.mood, input.energy, input.time)
    .map(item => item.recipe);
  const unique = ranked.filter((recipe, index, list) => list.findIndex(item => item.id === recipe.id) === index);

  return {
    hero: unique[0] ?? null,
    backups: unique.slice(1, 3),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/activation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/activation.ts src/activation.test.ts
git commit -m "feat: select activation meal picks"
```

---

### Task 3: Generate The Personal Why-This-Fits Explanation

**Files:**
- Modify: `src/activation.ts`
- Modify: `src/activation.test.ts`

- [ ] **Step 1: Add failing explanation test**

Append to `src/activation.test.ts`:

```ts
import { activationFitReason } from "./activation";

describe("activation fit explanation", () => {
  it("explains the recommendation using mood, energy, time, safety, and recipe facts", () => {
    const recipe = activationRecipes[0];
    const text = activationFitReason({
      recipe,
      mood: "Tired",
      energy: 20,
      time: 30,
      profile: { ...defaultProfile, diet: "Vegetarian", allergies: ["Dairy"] },
    });

    expect(text).toContain("tired");
    expect(text).toContain("low effort");
    expect(text).toContain("22 minutes");
    expect(text).toContain("Vegetarian");
    expect(text).toContain("avoids Dairy");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/activation.test.ts
```

Expected: FAIL because `activationFitReason` does not exist.

- [ ] **Step 3: Implement explanation helper**

Append to `src/activation.ts`:

```ts
export type ActivationFitReasonInput = {
  recipe: Recipe;
  mood: string;
  energy: number;
  time: number;
  profile: Profile;
};

export function activationFitReason(input: ActivationFitReasonInput): string {
  const mood = input.mood.toLowerCase();
  const effort = input.energy < 35 ? "low effort" : input.energy > 70 ? "interesting enough for higher energy" : "balanced effort";
  const time = `${input.recipe.time} minutes`;
  const diet = input.profile.diet && input.profile.diet !== "Everything" ? ` It fits your ${input.profile.diet} preference.` : "";
  const allergies = input.profile.allergies.length
    ? ` It avoids ${input.profile.allergies.join(", ")}.`
    : " No saved allergens are in the way.";

  return `Because you're feeling ${mood}, I picked ${input.recipe.title}: ${effort}, ready in ${time}, and matched to tonight's ${input.time}-minute limit.${diet}${allergies}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/activation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/activation.ts src/activation.test.ts
git commit -m "feat: explain activation meal fit"
```

---

### Task 4: Add Quick Taste Start Route

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/Landing.tsx`
- Modify: `src/devTestState.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Add dev test states**

Update `src/devTestState.ts`:

```ts
export type DevTestState = "home" | "account" | "quick-start" | "first-pick" | "activation-paywall";

export function readDevTestState(search: string, isDevelopment: boolean): DevTestState | null {
  if (!isDevelopment) return null;
  const state = new URLSearchParams(search).get("testState");
  return state === "home" ||
    state === "account" ||
    state === "quick-start" ||
    state === "first-pick" ||
    state === "activation-paywall"
    ? state
    : null;
}
```

- [ ] **Step 2: Update entry type and test-state routing**

In `src/App.tsx`, change:

```ts
type Entry = "welcome" | "login" | "onboarding" | "account" | "verify" | "verified" | "subscription" | "app";
```

to:

```ts
type Entry = "welcome" | "login" | "quick-start" | "first-pick" | "onboarding" | "account" | "verify" | "verified" | "subscription" | "app";
```

Update the `testState` effect so it can open new activation states:

```ts
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
```

- [ ] **Step 3: Import activation helpers**

In `src/App.tsx`, add:

```ts
import { activationFitReason, buildQuickStartProfilePatch, selectActivationPicks } from "./activation";
```

- [ ] **Step 4: Add quick-start local state**

Near the existing home check-in state in `App()` add:

```ts
  const [quickMood, setQuickMood] = useState("Tired");
  const [quickEnergy, setQuickEnergy] = useState(25);
  const [quickTime, setQuickTime] = useState(30);
```

- [ ] **Step 5: Change landing begin target**

In `src/App.tsx`, change the `Landing` begin callback:

```tsx
begin={() => { setSplash(false); if (entry === "welcome") setEntry("onboarding"); }}
```

to:

```tsx
begin={() => { setSplash(false); if (entry === "welcome") setEntry("quick-start"); }}
```

- [ ] **Step 6: Add quick-start route**

Before the existing onboarding route in `src/App.tsx`, add:

```tsx
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
```

- [ ] **Step 7: Implement `QuickTasteStartScreen`**

Add this component near the other entry screens in `src/App.tsx`:

```tsx
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
        <p>Four quick answers. Then I’ll pick one safe meal and explain why it fits.</p>

        <label className="quick-field">
          <b>Mood</b>
          <div className="mood-pills">
            {["Tired", "Stressed", "Cozy", "Adventurous"].map(value => (
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
          Pick dinner <ArrowRight size={18} />
        </button>
      </main>
    </div>
  );
}
```

- [ ] **Step 8: Update landing copy**

In `src/Landing.tsx`, change the hero CTA text from:

```tsx
Get started <ArrowRight size={17} />
```

to:

```tsx
Pick tonight's dinner <ArrowRight size={17} />
```

Change the `why` page heading and lede so it no longer warns of a long onboarding:

```tsx
<h1 data-reveal>Start small. Improve as you cook.</h1>
<p className="ip-lede" data-reveal>We'll ask only what we need for a safe first pick. After that, you can build a richer food profile whenever you want sharper recommendations.</p>
```

- [ ] **Step 9: Add quick-start styles**

Append to `src/styles.css`:

```css
.quick-start {
  min-height: 100vh;
  background: #f8f4ec;
  color: #1f2823;
  padding: 18px 16px 32px;
}

.quick-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.ih-signin.dark {
  color: #1f2823;
  border-color: rgba(31, 40, 35, 0.18);
}

.quick-card {
  display: grid;
  gap: 16px;
  max-width: 560px;
  margin: 0 auto;
}

.quick-card > span {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  color: var(--coral);
}

.quick-card h1 {
  font-size: clamp(36px, 11vw, 58px);
  line-height: .96;
  margin: 0;
}

.quick-card p {
  margin: 0;
  color: var(--muted);
  line-height: 1.45;
}

.quick-field {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(31, 40, 35, 0.12);
  background: rgba(255, 255, 255, 0.72);
  border-radius: 8px;
}

.quick-field > b {
  font-size: 13px;
}

.quick-field input:not([type="range"]) {
  min-height: 46px;
  border-radius: 8px;
  border: 1px solid rgba(31, 40, 35, 0.16);
  padding: 0 12px;
  font: inherit;
}

.quick-submit {
  min-height: 56px;
  width: 100%;
}
```

- [ ] **Step 10: Run checks**

Run:

```bash
npm test -- src/activation.test.ts
npm run build
```

Expected: both PASS.

- [ ] **Step 11: Commit**

```bash
git add src/App.tsx src/Landing.tsx src/devTestState.ts src/styles.css
git commit -m "feat: add quick taste start"
```

---

### Task 5: Add First Pick Screen With Backups And Rejection Reasons

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/activation.ts`
- Modify: `src/activation.test.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Add rejection adjustment tests**

Append to `src/activation.test.ts`:

```ts
import { adjustQuickStartAfterRejection } from "./activation";

describe("activation rejection learning", () => {
  it("turns too much effort into lower energy and lower time", () => {
    expect(adjustQuickStartAfterRejection({ mood: "Tired", energy: 50, time: 45 }, "too-much-effort")).toEqual({
      mood: "Tired",
      energy: 20,
      time: 30,
    });
  });

  it("turns not in the mood into a comfort-seeking tired pick", () => {
    expect(adjustQuickStartAfterRejection({ mood: "Adventurous", energy: 60, time: 45 }, "not-in-the-mood")).toEqual({
      mood: "Tired",
      energy: 35,
      time: 45,
    });
  });
});
```

- [ ] **Step 2: Implement rejection helper**

Append to `src/activation.ts`:

```ts
export type RejectionReason =
  | "too-much-effort"
  | "not-in-the-mood"
  | "too-expensive"
  | "missing-ingredients"
  | "too-heavy"
  | "repeated-recently";

export type QuickStartContext = {
  mood: string;
  energy: number;
  time: number;
};

export function adjustQuickStartAfterRejection(context: QuickStartContext, reason: RejectionReason): QuickStartContext {
  if (reason === "too-much-effort") {
    return { ...context, energy: Math.min(context.energy, 20), time: Math.min(context.time, 30) };
  }
  if (reason === "not-in-the-mood") {
    return { ...context, mood: "Tired", energy: Math.min(context.energy, 35) };
  }
  if (reason === "too-expensive" || reason === "missing-ingredients") {
    return { ...context, mood: "Tired", energy: Math.min(context.energy, 35), time: Math.min(context.time, 30) };
  }
  if (reason === "too-heavy") {
    return { ...context, mood: "Healthy", energy: Math.max(context.energy, 45) };
  }
  return { ...context, mood: "Adventurous" };
}
```

- [ ] **Step 3: Run test**

Run:

```bash
npm test -- src/activation.test.ts
```

Expected: PASS.

- [ ] **Step 4: Import rejection helper**

In `src/App.tsx`, update the activation import:

```ts
import {
  activationFitReason,
  adjustQuickStartAfterRejection,
  buildQuickStartProfilePatch,
  selectActivationPicks,
  type RejectionReason,
} from "./activation";
```

- [ ] **Step 5: Add first-pick route**

Before the onboarding route in `src/App.tsx`, add:

```tsx
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
```

- [ ] **Step 6: Implement `FirstPickScreen`**

Add near entry screens in `src/App.tsx`:

```tsx
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
```

- [ ] **Step 7: Add styles**

Append to `src/styles.css`:

```css
.first-pick {
  min-height: 100vh;
  background: #f8f4ec;
  color: #1f2823;
  padding: 18px 16px 34px;
}

.first-pick-main {
  display: grid;
  gap: 14px;
  max-width: 620px;
  margin: 0 auto;
}

.first-pick-main > span {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  color: var(--coral);
}

.first-pick-main h1 {
  margin: 0;
  font-size: clamp(34px, 10vw, 56px);
  line-height: 1;
}

.first-pick-image {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  object-fit: cover;
}

.first-pick-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.first-pick-facts span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  border-radius: 999px;
  padding: 0 11px;
  background: #fff;
  border: 1px solid rgba(31, 40, 35, 0.1);
  font-size: 13px;
  font-weight: 700;
}

.first-pick-note {
  margin: 0;
}

.first-pick-actions {
  display: grid;
  gap: 10px;
}

.first-pick-actions button {
  min-height: 52px;
}

.reject-box {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid rgba(31, 40, 35, 0.1);
}

.reject-box > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reject-box button {
  border: 1px solid rgba(31, 40, 35, 0.14);
  background: #f8f4ec;
  border-radius: 999px;
  min-height: 36px;
  padding: 0 12px;
  font-weight: 700;
}

.backup-picks {
  display: grid;
  gap: 10px;
}

.backup-picks h2 {
  margin: 4px 0 0;
}

.backup-picks button {
  display: grid;
  grid-template-columns: 76px 1fr auto;
  gap: 12px;
  align-items: center;
  text-align: left;
  border: 1px solid rgba(31, 40, 35, 0.1);
  background: #fff;
  border-radius: 8px;
  padding: 8px;
}

.backup-picks img {
  width: 76px;
  height: 64px;
  object-fit: cover;
  border-radius: 6px;
}

.backup-picks span {
  display: grid;
  gap: 4px;
}

.backup-picks small {
  color: var(--muted);
}
```

- [ ] **Step 8: Run checks**

Run:

```bash
npm test -- src/activation.test.ts
npm run build
```

Expected: both PASS.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/activation.ts src/activation.test.ts src/styles.css
git commit -m "feat: show first activation pick"
```

---

### Task 6: Reframe Subscription As Post-Value Trial Prompt

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Change subscription copy**

In `SubscriptionScreen`, change:

```tsx
<span>YOUR FOOD PROFILE IS READY</span>
<h1>{mode === "invite" ? "Redeem your invite." : "Start your 7-day free trial."}</h1>
```

to:

```tsx
<span>DINNER DECISIONS, LIGHTER</span>
<h1>{mode === "invite" ? "Redeem your invite." : "Keep MoodFood deciding with you."}</h1>
```

Change the trial paragraph:

```tsx
<p>Personalized, safe recommendations tuned to the profile you just built, plus cook mode, mood check-ins, and weekly reflections.</p>
```

to:

```tsx
<p>Save your quick profile, unlock guided cooking, and let Moody get sharper every time you cook, reject, or rate a meal.</p>
```

Change the primary button text:

```tsx
{checkoutLoading ? "Opening checkout…" : <>Start free trial <ArrowRight /></>}
```

to:

```tsx
{checkoutLoading ? "Opening checkout…" : <>Start 7-day free trial <ArrowRight /></>}
```

Change the small print:

```tsx
<small>7 days free, then {chosen?.price}. Card required, cancel anytime before trial ends.</small>
```

to:

```tsx
<small>7 days free, then {chosen?.price}. Cancel before the trial ends if MoodFood does not make dinner feel easier.</small>
```

- [ ] **Step 2: Change skip copy**

Change:

```tsx
<button className="skip" onClick={proceed}>Maybe later</button>
```

to:

```tsx
<button className="skip" onClick={proceed}>Continue without saving trial</button>
```

- [ ] **Step 3: Mark paywall as seen when proceeding**

In the `SubscriptionScreen` call at entry route, change:

```tsx
proceed={() => setEntry("app")}
```

to:

```tsx
proceed={() => { setProfile({ ...profile, activationPaywallSeen: true }); setEntry("app"); }}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: reframe trial after first value"
```

---

### Task 7: Simplify Home Around Dinner Decision Speed

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Change home greeting and CTA**

In `HomeScreen`, replace:

```tsx
<h1>Feeling {mood.toLowerCase()}?<br /><span>Eat something warm.</span></h1>
<p>Tell Moody how you feel, get one safe meal chosen for your mood, energy, and table.</p>
```

with:

```tsx
<h1>How does dinner feel tonight?</h1>
<p>Pick a mood, time, and energy level. Moody will choose one safe answer and keep backups ready.</p>
```

Change search button copy:

```tsx
Search <ArrowRight size={18} />
```

to:

```tsx
Pick dinner <ArrowRight size={18} />
```

- [ ] **Step 2: Hide secondary dashboard blocks behind a single "More" section**

Wrap the existing stats/photo/links section in a details element:

```tsx
      <details className="home-more">
        <summary>More tools</summary>
        {/* existing home-stats, home-photo-shortcut, and home-links blocks move here unchanged */}
      </details>
```

Do not remove the features. Make them secondary so the first viewport stays focused on dinner.

- [ ] **Step 3: Add home-more styles**

Append to `src/styles.css`:

```css
.home-more {
  margin: 18px 16px 0;
}

.home-more summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(31, 40, 35, 0.12);
  background: rgba(255, 255, 255, 0.7);
  font-weight: 800;
  cursor: pointer;
}

.home-more[open] summary {
  margin-bottom: 14px;
}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/styles.css
git commit -m "feat: simplify home around dinner decisions"
```

---

### Task 8: Manual UX Verification

**Files:**
- No code changes unless defects are found.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Vite serves at `http://localhost:5173/`.

- [ ] **Step 2: Verify first-run flow**

Open:

```text
http://localhost:5173/
```

Expected:
- Landing CTA says "Pick tonight's dinner."
- CTA enters Quick Taste Start, not 52-question onboarding.
- Quick Taste Start asks only mood, energy, time, diet, allergies.
- "Pick dinner" shows one hero meal and two backups.
- Hero explanation mentions mood, effort, time, and safety.
- Rejecting with "Too much effort" swaps to a simpler context.
- Viewing recipe or saving profile shows the trial prompt.

- [ ] **Step 3: Verify dev states**

Open each:

```text
http://localhost:5173/?testState=quick-start
http://localhost:5173/?testState=first-pick
http://localhost:5173/?testState=activation-paywall
http://localhost:5173/?testState=home
```

Expected:
- Each state loads without console errors.
- Home first viewport focuses on mood/time/energy and dinner picking.
- Secondary tools are still reachable.

- [ ] **Step 4: Stop dev server**

Press `Ctrl+C` in the terminal running Vite.

---

### Task 9: Final Verification

**Files:**
- No code changes unless defects are found.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/activation.test.ts src/recommendation.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Check diff**

Run:

```bash
git diff --check
git status --short
```

Expected:
- `git diff --check` reports no whitespace errors.
- Status shows only intentional files.

- [ ] **Step 5: Commit final fixes if any**

If manual verification required fixes:

```bash
git add src/App.tsx src/Landing.tsx src/styles.css src/activation.ts src/activation.test.ts src/store.ts src/devTestState.ts
git commit -m "fix: polish quick aha activation"
```

---

## Self-Review

**Spec coverage:** The plan covers the locked activation decisions: value before onboarding/subscription, 4-input quick start, one hero plus two backups, outcome-led paywall, progressive deep profile, simplified home, structured Moody explanation, rejection learning, and relief-first copy.

**Placeholder scan:** No TBD/TODO/later placeholders remain. Optional documentation is explicitly marked optional and not required for the working software.

**Type consistency:** New `Profile` fields match the names used in `App.tsx`. `QuickStartInput`, `ActivationPickInput`, `ActivationPicks`, `RejectionReason`, and `QuickStartContext` are defined before use.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-17-moodfood-quick-aha-activation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
