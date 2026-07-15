# MoodFood — Concept Recovery Roadmap

> **Status:** Proposal / direction reset — 2026-07-15.
> **Goal:** Return the app to its founding thesis — *"You say how you feel, MoodFood hands you the answer"* (the Architect, not the Tool Shed) — by resurfacing concept-critical work that already exists but is buried or orphaned, streamlining onboarding, and bringing **Moody** (the AI co-pilot) back as a felt experience. Community is **kept and elevated**, not removed.
> **Source of thesis:** `blue-print/01-product-vision.md`.

---

## 1. Diagnosis — the concept isn't missing, it's buried

The drift is **not** that the wrong things were built. The concept-defining layer was built and then buried under a conventional recipe-app UI, and the emotional/AI layer was built on the backend and never wired to the frontend. This is a **recovery and re-sequencing** job, not a rebuild.

Evidence found in the codebase:

| Concept pillar | State today | File |
|---|---|---|
| **Moody, the AI co-pilot** | **Fully built server-side, orphaned.** System prompt opens *"You are Moody, a warm and concise dinner co-pilot"*; enforces allergy/diet hard-safety; refuses to play doctor; searches the live catalog; returns `{message, recipeId, recipe}` for tappable in-chat cards; does **food-photo vision**. The frontend never calls it. UI copy (Help, Landing) already advertises it. | `supabase/functions/ai-gateway/index.ts` |
| **AI curation ("Moody picked this")** | Built, opt-in behind a `curate` flag; not the default felt experience. | `supabase/functions/recipes/index.ts:201`, `src/hooks/useHomeFeed.ts:86` |
| **Psychological Food Profile (the IP)** | Collected (FCQ/TFEQ, 14 cooking moods whose `aiSignal` already feeds curation, learned cuisine signals, taste memory) — but not visibly *driving* anything the user can feel. | `src/data.ts`, `src/recommendation.ts` |
| **Energy / tiredness setting** | **Shipped and working** — the strongest differentiator actually live. | `src/screens/HomeScreen.tsx` |
| **Community viral loop** | Friends feed + reactions + member profiles exist. `member_profile` RPC already returns each member's `food_profile`; friend suggestions rank by shared cuisines. The vision's distinctive object — *share the food profile, not just recipes* — is ~60% wired. | `src/community.ts` |
| **Onboarding** | **52 questions across 8 sections.** Blueprint designed a two-path (`quick`/`standard`) flow with the mood step as the hook; in practice the long path became the wall. Schema already supports `optional`. | `src/onboarding.ts`, `blue-print/04-augmented-onboarding.md` |

**Implication:** Phases 0–2 below are mostly *wiring and re-sequencing existing code*. The difference in feel should be perceptible within the first phase.

---

## 2. North Star & metrics

**The test every change serves:** *Can an exhausted person get a great, safe, emotionally-attuned answer in one tap — and feel understood?*

Instrument (telemetry already exists in `src/telemetry.ts`):

- **Time-to-first-answer** — app open → a recipe on screen. Target: seconds.
- **Answered-from-mood-alone rate** — % of sessions reaching a chosen recipe without touching a filter. This is the Architect-vs-Tool-Shed KPI.
- **Onboarding completion & drop-off per step** — and time-to-first-pick.
- **Moody engagement** — % of sessions that open Moody; recipe-card tap-through from chat.
- **Return rate / mood-habit formation** — days-with-a-check-in per week.

---

## 3. The one strategic call

Of the three vision pillars:

- **Energy-aware simplicity** — already shipped. ✅
- **Emotional intelligence (Moody)** — one wiring job away. → the focus of this recovery.
- **Financial context / real-time local grocery pricing** — genuinely unbuilt and heavy.

**Decision: defer the financial pillar entirely for this recovery.** Let energy + emotion be the proof. Building local-pricing now would repeat the original mistake — breadth over core magic.

---

## 4. Roadmap

Phases are sequenced by concept-impact per unit of effort and are individually shippable. **Recommended parallel workstreams:** Onboarding (Phase 1) and Moody (Phase 2) can run concurrently — different files, no shared blast radius.

### Phase 0 — Restore the "one question → one answer" front door
*Why: this is the thesis. Today the home screen asks a tired user to fill a 6-control form before anything appears.*

- Make the home hero answerable from **mood alone** — tapping a mood pill immediately produces tonight's pick; energy/time/cuisine/diet default silently from the profile.
- Demote time + energy + meal-type + cuisine + diet into a collapsed **"Refine"** disclosure *below* the answer, not above it. Keep the energy slider one tap away (best differentiator) but off the critical path.
- Default the **Search** tab to a single natural-language box that routes through Moody; keep the 12-filter power search behind "Advanced" (`src/screens/SearchScreen.tsx`).
- Add the two north-star events (time-to-first-answer, answered-from-mood-alone).

### Phase 1 — Streamline onboarding (52 → ~7, rest progressive)
*Why: the 52-question wall is the biggest conversion killer and the sharpest contradiction of the concept. The blueprint already designed the fix; it just isn't enforced.*

**Reinstate the two-path model as designed** (`blue-print/04-augmented-onboarding.md`, `profile.path: "quick" | "standard"`). The **quick path is the only gate before the first pick.**

- **Quick path (~7 items, the only pre-value gate):**
  1. Cooking moods — *the emotional hook; keep it, it's the magic.*
  2. Diet (single)
  3. Allergies — *hard safety filter, never relaxed.*
  4. Hard no's / dislikes (fast, optional)
  5. Cooking confidence / skill (single)
  6. Weeknight time (single)
  7. Cuisines *or* one palate question (single)

  → Safety + minimum-viable personalization + the mood hook. Nothing else blocks value.

- **Everything else (~45 questions) → progressive profiling.** Moody drips 1–2 at natural moments ("You've cooked three meals — mind if I sharpen your taste profile? Which textures do you reach for?"), plus a "Complete your food profile — 20%" prompt on the profile screen. The schema's existing `optional` flag + `path` tagging supports this with no structural change.
  - **Bonus:** this converts a one-time wall into a lifelong personalization loop — which *is* the vision's "personalization lock-in" retention thesis (§8). The long questionnaire becomes an asset instead of a barrier.

- **Value before signup.** Reorder the entry flow so the user reaches their **first pick before** the account/verify/subscription gate. `QuickTasteStartScreen` and `FirstPickScreen` already exist — sequence them *ahead* of `AccountSetupScreen`/`VerifyEmailScreen` (currently onboarding → account → verify → subscription → app). Let them feel the magic once, then ask them to sign up.

### Phase 2 — Resurrect Moody (the headline) 🌟
*Why: the entire differentiator, ~80% built server-side, currently orphaned and even advertised in Help copy that points at a button that does nothing.*

- Build the missing frontend chat surface: floating sparkle FAB → chat sheet that POSTs to `ai-gateway` via the existing `callFn` pattern (`src/api/backend.ts`), renders `message` as Moody's reply, and renders a tappable recipe card when `recipeId`/`recipe` returns.
- Wire the **vision path**: route the food-photo camera through the same gateway for "Moody reads your plate" (already claimed at `src/screens/HelpScreen.tsx:28`).
- **Proactive open:** seed Moody with profile + tonight's computed picks so the first message is empathetic, not a blank box — *"You picked Tired. I've a 15-minute one-pot ready — want it, or shall we find something else?"*
- **Model upgrade:** the gateway is hardcoded to `gpt-4o-mini`. This is the empathy layer and the whole brand voice — move it to Claude (Haiku 4.5 for cost/latency, Sonnet for warmth). One-line model swap + prompt tuning.

### Phase 3 — Make Moody's *voice* pervasive
*Why: the signature moments ("something simple that won't make you want to cry") should land even for users who never open chat.*

- Add a thin **deterministic empathetic copy layer** keyed to `mood × energy` on the home answer and results header — a mapping table like `src/moodRules.ts` already is. Zero latency, zero cost.
- Flip **AI curation on by default** for the home feed and label it honestly: "Moody chose this for you" (`curated` flag already returns from the edge function).

### Phase 4 — Make the Psychological Food Profile visible & dynamic
*Why: vision §5 — the profile is the IP and the retention lock-in, but users can't currently feel it working.*

- Add the **mood-calibration** step: "What does *comfort* mean to you?" (soup vs. baking vs. toast). Store per-user mood definitions, feed them into the curation prompt alongside the existing `aiSignal`. This is what makes suggestions feel "almost telepathic."
- Surface learned signals as a **"Why this pick?"** line ("Because you rate Thai highly when you're Tired"), using `moodBoost`/`learnedBoost` already computed in `src/recommendation.ts`.
- Wire the **variety / deficit nudge** (vision §4.4) into `src/screens/InsightsScreen.tsx` — the Variety Score scaffold is already there.

### Phase 5 — Reframe Community around the food profile (keep, elevate)
*Why: Community stays. The distinctive loop is sharing **emotional food profiles**, not just recipes (vision §9.5). The bones already exist.*

- Elevate the **Psychological Food Profile as a shareable object** — a "food personality card" (flavour phenotype, comfort cues, signature moods) friends can view and compare ("you're both stress-bakers"), built on the existing `member_profile` RPC. Share a *consented, curated* version; the raw profile stays private (the privacy promise at `src/screens/CommunityScreen.tsx:96` already commits to this).
- Lean friend suggestions toward **mood/profile compatibility**, not just shared cuisine.
- Keep the recipe/cook feed exactly as-is — it's the activity layer. The profile card is the hook that makes Community feel native to MoodFood.

### Phase 6 — Demote (don't delete) the tool-shed surface
*Why: 21 menu destinations (`src/components/MainMenu.tsx:13`) is a suite, not a pilot front door. Fix hierarchy, not inventory.*

- Protect the concept-core bottom nav: **Home · Search(→Moody) · Community · Saved · Grocery.**
- Push Planner, Pantry, Import, Health, Insights, Diners, Admin into a secondary **"More / maturity"** tier — rewards for engaged users, not things a first-timer must parse.
- Nothing is deleted; the front door just stops competing with itself.

---

## 5. Suggested sequence

```
Phase 0  Front door (one-tap answer)         ─┐ fast, high impact
Phase 1  Onboarding streamline    ──parallel──┤ (they gate the first impression)
Phase 2  Resurrect Moody          ──parallel──┘ headline
Phase 3  Moody voice pervasive        depends on 0/2
Phase 4  Profile visible & dynamic     depends on 2
Phase 5  Community reframe             independent, anytime after 4
Phase 6  Demote tool-shed              independent, low risk
```

**Deferred, intentionally:** financial context / real-time local grocery pricing (§3).

---

## 6. The through-line

Everything above serves one test: *one tap, a great and safe answer, and the feeling that something understood you.* Phases 0–2 make that true and are mostly wiring existing code. Phases 3–6 deepen the moat and clean the house — without losing Community, and without building breadth before the core magic is proven.
