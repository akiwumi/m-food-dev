# MoodFood — Native Release, AI, Backend & Subscription Strategy

_Prepared 2026-07-13. iOS-first. Grounded in the current codebase._

## TL;DR (read this first)

1. **The app does NOT need AI to function.** Your mood→recipe engine and your
   "learning" are already **deterministic** (plain rules + the user's own
   ratings). AI is a bonus layer on top, and every AI feature already has a
   non-AI fallback baked in. You can ship a fully working app with AI turned off.
2. **You need a backend for *some* things, but Supabase is optional** and none of
   the reasons are the ones you'd expect. The real backend jobs are (a) serving a
   large recipe catalog, (b) accounts/sync, and (c) subscription entitlement. Two
   of those three can be handled without your own server.
3. **The subscription is the one thing that will actually block your iOS launch.**
   Your current flow uses **Stripe web checkout** (`create-checkout` →
   `checkout.stripe.com`). Apple will **reject** that. On iOS a digital
   subscription **must** go through Apple In-App Purchase (StoreKit). Same story
   on Google Play. The fix is **RevenueCat**, and RevenueCat can verify a
   subscription **with or without** Supabase.
4. **To be a real native app (not a web app), wrap the existing React app in
   Capacitor.** You keep 100% of the code you've already built. A React Native
   rewrite is unnecessary and wasteful here.

---

## 1. How the app is actually built today (the important part)

MoodFood is a **Vite + React 19 PWA**. Crucially, it was engineered as a
**deterministic core with AI as an optional enhancement layer**. This is not an
accident — the code says so explicitly:

- `src/tasteSummary.ts`: _"The canonical taste profile stays the DETERMINISTIC
  signal (cuisine + mood patterns). AI only rephrases the facts already derived;
  it never invents preferences… There is always a deterministic fallback string,
  so AI failure degrades to plain copy, never to nothing."_
- `src/recipes.ts`: _"AI curation (OpenAI ranking) is OPT-IN via `curate` — off by
  default for normal search, which is ranked deterministically… Returns null on
  any failure… so callers fall back to local deterministic ranking over the
  bundled recipes and the pilot keeps working."_
- `src/ai.ts`: _"Every function throws on failure so callers can fall back
  gracefully (e.g. to the local simulation)."_

So the app already runs today in a **"pilot mode"** with no backend at all
(`supabase = null`), using bundled recipes + localStorage. Everything you're
worried about "needing AI for" is already solved without it.

### What is deterministic (no AI, no server needed)
| Capability | Where | Notes |
|---|---|---|
| **Mood assessment → recipe match** | `src/moodRules.ts`, `src/recommendation.ts` | 6 canonical moods (Tired, Stressed, Happy, Romantic, Healthy, Focused) with tag weights. The user picks a mood; `scoreByMood` ranks recipes. **Pure rules. No AI.** |
| **Safety filtering (allergy/diet)** | `src/recommendation.ts` (`safeRecipes`) | Hard filter. Must stay deterministic — you never want an LLM deciding whether a nut-allergic user sees peanuts. |
| **"Learning" the user** | `src/behavioral.ts`, `recommendation.ts` (`CuisineSignal`, `MoodCuisineSignal`) | Derived from the user's **own validated ratings**. Names the cuisines they rate highly, and which cuisines they like *per mood*. Soft, capped ranking nudges. **No AI.** |
| **Taste summary (fallback)** | `src/tasteSummary.ts` (`deterministicTasteSummary`) | Human-readable summary generated from the signal, no model. |

### What actually uses AI (the `ai-gateway` edge function → OpenAI)
| Feature | Where | Can it work without AI? |
|---|---|---|
| **Moody chat assistant** | `src/components/moody/MoodyPanel.tsx` → `aiChat` | This is the only conversational feature. Drop it, make it premium, or replace with a scripted assistant. Not core. |
| **Food-photo calorie/macro analysis** | `src/foodAnalysis.ts` → `aiAnalyzeFood` (vision) | **This is the one feature with no good offline substitute.** Real vision estimation needs a model. Options below. |
| **AI recipe curation (re-ranking)** | `src/recipes.ts` (`curate: true`) | Opt-in only, already off by default. Deterministic ranking is the default path. |
| **AI taste summary (prose)** | `src/tasteSummary.ts` (`fetchTasteSummary`) | Pure polish. Deterministic fallback already ships. |

**Bottom line on AI:** the two things you specifically named — _"assess the
user's mood"_ and _"track and learn the user"_ — are **already done without AI**.
The AI you're paying for is really: a chat assistant, photo calorie analysis, and
some prose/ranking polish.

---

## 2. Do you need AI? (direct answer)

**No — not for the app to function.** Here's the decision, feature by feature:

- **Mood matching:** keep deterministic. It already is. Shipping this with no AI
  changes nothing for the user's core experience.
- **Learning/tracking:** keep deterministic. It already is. The "AI learns you"
  marketing claim is honestly satisfied by the rating-derived signals — they *do*
  learn the user, just transparently and cheaply.
- **Moody chat:** **optional.** Recommended: keep it, but gate it behind the
  subscription (a conversational "food therapist" is a great premium hook) and let
  it degrade to a friendly scripted fallback when the user is free/offline.
- **Food-photo analysis:** **the only real AI dependency.** Three options:
  1. **Keep it** as a premium feature (calls OpenAI vision via your gateway). Best
     UX, small per-call cost, only runs on explicit user action.
  2. **Replace** with a cheaper/edge nutrition API or an on-device Core ML food
     classifier (worse accuracy, no per-call cost, works offline).
  3. **Cut it** for v1 and let users log meals by picking the recipe / typing.
     Zero AI, zero cost. Add photo analysis back as a "Pro" upsell later.

**Recommendation:** Launch the core (mood + learning) fully deterministic — it's
free, fast, private, and works offline. Keep **Moody chat** and **photo analysis**
as **AI-powered premium features** behind the paywall. That way AI cost scales
with paying users, not with installs, and a backend/AI outage never breaks the
core loop.

---

## 3. Do you need Supabase? (direct answer)

**Not strictly — but you probably want *a* backend for three specific jobs.**
Separate them, because each has a different answer:

| Job | Do you need a server? | Cheapest path |
|---|---|---|
| **Recipe catalog** | Only if you want more than the bundled set | Today the `recipes` edge fn proxies Spoonacular/TheMealDB with a cache (`cached_recipes`). Without it you're limited to `bundledRecipes`. You can ship v1 on the bundle, or keep the edge fn. |
| **Accounts + cross-device sync + community** | Yes, if you want these | This is Supabase's real value: auth, the profile/diary/community tables, private image storage. If v1 is single-device, you can skip it and stay on localStorage. |
| **Subscription entitlement** | You need *something* to verify purchases | **RevenueCat** does this without your own backend. Supabase is not required for subscriptions. |

**Three viable architectures, in order of increasing backend:**

- **A. Local-only + RevenueCat (leanest).** No Supabase. Bundled recipes,
  localStorage, deterministic mood/learning, RevenueCat for IAP. No accounts, no
  sync, no community, no photo AI (or photo AI via a keyless nutrition API).
  Fastest to ship, cheapest to run, App-Store-compliant. Good for a focused v1.
- **B. RevenueCat + Supabase (recommended).** Keep Supabase for accounts, sync,
  community, the recipe cache, and the AI gateway. Use **RevenueCat for the
  purchase**, and let RevenueCat's webhook write the entitlement into your
  `subscriptions` table so the rest of your app reads it exactly like it does now
  (`syncSubscriptionFromDB` in `src/api/backend.ts`). Best product, keeps all your
  built work, still compliant.
- **C. Full backend, Stripe only (current).** **Not shippable on iOS as-is** —
  Stripe web checkout for a digital subscription violates App Store guideline
  3.1.1. Fine for a web version, not for the app.

---

## 3a. Database architecture — the v1 decision (Supabase + on-device cache)

> **Decision history:** an earlier draft of this section chose Architecture A
> (remove Supabase, on-device only). **That was reversed.** v1 **keeps Supabase**
> and ships **real multi-user community/social** as a headline feature. The
> reasoning below reflects the current, shipped direction; the on-device
> durability guidance is retained because it still matters for the *local* cache.

**Decision (v1): Supabase is the store of record for anything multi-user or
cross-device; a local on-device store is the offline cache + personal data.**
Concretely:

- **Supabase (source of truth)** — accounts/auth, the social graph (friends,
  posts, likes, comments, shared recipes), profile sync, and the friend-visible
  activity (a member's food profile, cooked/reviewed meals, favourites). This is
  live on project `pjfoiamcflimdreoxvpg` (migrations 018–020, deployed
  2026-07-14). Community is inherently multi-user, so it *requires* a server —
  that's exactly what Supabase is for.
- **On-device (cache + personal)** — the app still reads/writes localStorage for
  fast, offline-first personal state (current mood, drafts, diary, saved), and
  falls back to a purely local experience when signed out or offline (the pilot
  path). Supabase is synced up in the background; the app never breaks when the
  backend is briefly unreachable.

### On-device done right: SQLite/Preferences, not raw localStorage
The local cache must **not** stay on raw `localStorage` once native. Inside a
Capacitor/WKWebView app, **localStorage and IndexedDB are not guaranteed durable**
— iOS can evict WebView storage under disk pressure when the app isn't running.
Fine for a web pilot, unacceptable for someone's food diary. Move the local cache
to:

- **`@capacitor-community/sqlite`** — the durable local store for personal data
  (profile, diary, saved, groceries, diners, photo logs). Lives in the app
  container and is covered by iCloud backup, so the personal data survives a
  reinstall even before a device is signed in and synced.
- **Capacitor Preferences** (native `UserDefaults`) — small key-value settings.
- **RevenueCat's entitlement cache** — the subscription source of truth, on-device.

### Pre-launch task: localStorage → SQLite migration (local cache only)
Still a real pre-launch task — it hardens the *local cache*, independent of the
Supabase sync:

1. Add `@capacitor-community/sqlite`; define a schema for the current stores
   (`moodfood-profile`, `-saved`, `-diary`, `-groceries`, `-diners`,
   `-eater-count`, photo logs) plus a `schema_version` row.
2. Introduce a small storage adapter behind the existing `useStoredState` API so
   call sites don't change: SQLite/Preferences on native, `localStorage` on web.
3. **One-time migration on first native launch:** if SQLite is empty but
   `localStorage` has data, copy it across, then mark migrated.
4. Route photo-log images to the app's file container (not the DB / localStorage);
   store only the file path in SQLite.
5. Verify durability: background the app, simulate storage pressure, confirm data
   survives; confirm it rides an iCloud backup/restore.

Until this lands the app keeps running on `localStorage` (functionally fine, just
not eviction-proof), so the migration doesn't block anything.

---

## 4. Subscriptions — the part that will make or break your App Store review

### The hard rule
On iOS, **any digital subscription unlocked inside the app must use Apple In-App
Purchase (StoreKit).** You cannot send users to Stripe, a web page, or any
external payment sheet to subscribe. Apple rejects this under **guideline 3.1.1**,
and takes 15–30% of the price. Google Play enforces the same with Play Billing.

Your current implementation (`create-checkout` → `checkout.stripe.com`,
`stripe-webhook`) is a **web** flow. Keep it for a future web version if you like,
but it **cannot be the iOS purchase path.**

### The fix: RevenueCat
[RevenueCat](https://www.revenuecat.com) is the standard solution and it fits your
stack cleanly:

- Wraps **StoreKit (iOS)** and **Play Billing (Android)** behind one SDK, with a
  Capacitor plugin (`@revenuecat/purchases-capacitor`).
- Handles receipt validation, the 7-day free trial you already offer, renewals,
  restores, refunds, and grace periods — the stuff that's painful to build.
- Exposes a simple **entitlement check** (`customerInfo.entitlements.active`) that
  the SDK **caches on-device**, so it works offline after the first check. This is
  how you gate Pro features **without your own server.**
- Free up to a meaningful monthly revenue threshold; cheap after.

### How to wire it into what you already have
Your app already models subscription state cleanly — reuse it:
- `Profile.subscriptionStatus` (`"none" | "trialing" | "active" | "canceled"`) and
  `parseSubscriptionStatus` in `src/App.tsx` are exactly the gate you need.
- **Minimal change:** replace the source of that status. Instead of
  `syncSubscriptionFromDB()` polling Stripe's result, read RevenueCat's entitlement
  on launch and after purchase, and map it to `subscriptionStatus`.
- **Architecture B bonus:** point RevenueCat's webhook at a small edge function
  that upserts the `subscriptions` row. Then `syncSubscriptionFromDB` keeps working
  untouched and you get server-side entitlement for cross-device unlock.

### Concrete subscription checklist (iOS first)
1. Create the subscription products + 7-day trial in **App Store Connect**.
2. Create a RevenueCat project, add the iOS app, map products to an **entitlement**
   (e.g. `pro`).
3. Add Capacitor (see §5) and install `@revenuecat/purchases-capacitor`.
4. On app launch: `Purchases.configure({ apiKey })`, then read `customerInfo`.
5. Replace the Stripe redirect on `SubscriptionScreen` with
   `Purchases.purchasePackage(...)`; on success set `subscriptionStatus`.
6. Add a **"Restore Purchases"** button (Apple requires it).
7. Gate premium features (Moody chat, photo AI, unlimited search) on the `pro`
   entitlement.
8. Later: replicate for Android with the same RevenueCat entitlement.

---

## 5. Making it a real native app (not a web app)

You have a complete, working React web app. **Do not rewrite it.** Wrap it:

### Recommended: Capacitor
- **Capacitor** runs your existing built web bundle inside a native shell
  (WKWebView on iOS, native WebView on Android) and gives you real native APIs and
  App Store / Play Store distribution.
- You keep **all** of your current code: the React screens, the deterministic
  engine, the Supabase JS SDK (it's just `fetch`/websockets — works fine in
  Capacitor), the service worker, everything.
- Native bits you'll add as plugins: **RevenueCat** (IAP), Camera (for the food
  photo — swap the web file input for `@capacitor/camera`), Push notifications,
  Haptics, Status bar / safe-area.
- Effort: days-to-weeks, not months.

### Why not the alternatives
- **PWA / "Add to Home Screen":** you already support it, but iOS PWAs **cannot
  use IAP**, so you can't sell a subscription — and you said it shouldn't be a web
  app. Off the table for the paid product.
- **React Native rewrite:** throws away everything you've built for no benefit
  here. Only worth it if you hit serious WebView performance limits, which a
  recipe/mood app will not.

### Things to fix when you go native
- **Camera:** `src/foodAnalysis.ts` / photo flows use web file input — switch to
  the Capacitor Camera plugin for a native capture experience.
- **CSP / external hosts:** your `csp.config.js` currently allows Supabase,
  Unsplash, Spoonacular, YouTube, fonts. In a WebView you'll load from
  `capacitor://` or `https://localhost` — verify the CSP and Supabase auth
  redirect URLs still work from the native origin.
- **Auth deep-linking:** Supabase email confirmation / OAuth needs a custom URL
  scheme or Universal Link so the redirect lands back in the app.
- **Safe areas / notch:** you already set `viewport-fit=cover`; test on device.

---

## 6. Recommended plan (iOS v1)

**Architecture B, AI as premium:**

1. **Wrap in Capacitor.** Ship the app you already have as a native iOS build.
2. **Keep the deterministic core exactly as-is** — mood matching + learning need
   no changes and no AI. This is your always-works foundation.
3. **Adopt RevenueCat for the subscription.** Remove the Stripe redirect from the
   iOS purchase path; gate Pro on the RevenueCat entitlement. (Keep the Stripe
   edge functions around only if/when you do a web version.)
4. **Keep Supabase** for accounts, sync, community, recipe cache, and the AI
   gateway — but treat all of it as **degradable**: the app must fully work with it
   down (it already does).
5. **Make AI a Pro perk:** Moody chat + food-photo analysis behind the paywall,
   each with a graceful non-AI fallback for free users.
6. **Android later** reuses the same RevenueCat entitlement and the same Capacitor
   project — near-free once iOS is done.

### What this gets you
- App-Store-compliant subscriptions from day one.
- AI cost that scales with **paying** users, not installs.
- A core experience that never breaks on an AI/Supabase outage.
- 100% reuse of the code you've already written and Lighthouse-optimized.

---

## Appendix — the "do I need it?" cheat sheet

| Question | Answer |
|---|---|
| Need AI to assess mood? | **No.** Deterministic rules (`moodRules.ts`) already do it. |
| Need AI to track/learn the user? | **No.** Rating-derived signals (`behavioral.ts`) already do it; AI only rephrases. |
| Any feature that *genuinely* needs AI? | Only **food-photo calorie analysis** (vision). Everything else has a non-AI path. |
| Need Supabase to function? | The **deterministic core** runs without it (pilot/offline). But v1 **keeps Supabase** as the store of record for accounts + the real community/social features (§3a); it's live (migrations 018–020). |
| Remote DB or on-device for iOS? | **Both, by role.** Supabase for multi-user/cross-device (social, accounts); an on-device store (`@capacitor-community/sqlite` + Preferences, **not** raw localStorage) as the durable offline cache for personal data. |
| Need a backend for subscriptions? | **No** — RevenueCat verifies entitlements on-device. Optionally sync to Supabase. |
| Can I use Stripe for the iOS subscription? | **No.** Apple requires StoreKit IAP. Use RevenueCat. Keep Stripe only for web. |
| Rewrite in React Native? | **No.** Wrap the existing React app in **Capacitor**. |

---

## Implementation status (§6) — implemented 2026-07-13

Two of §1's premises had already been superseded by the time of implementation:
**Moody chat and AI food-photo analysis were removed** in `1f35bfc` (photo
logging is now honest/no-AI, `src/foodAnalysis.ts`). The remaining AI surfaces
are opt-in **AI curation** (`recipes.ts` `curate`) and the **AI taste summary**
(`tasteSummary.ts`) — those are now the Pro perks.

What's in the codebase now:

1. **Capacitor** — scaffold was already present (`ios/`, `capacitor.config.ts`,
   Capacitor 8). Added `npm run ios:sync` (build + sync) and `npm run ios:open`;
   display name is now "MoodFood".
2. **Deterministic core** — untouched, as planned.
3. **RevenueCat** — `@revenuecat/purchases-capacitor` installed.
   - `src/subscription.ts`: pure entitlement helpers (`isPro`, CustomerInfo →
     `subscriptionStatus` mapping, plan/package matching) + unit tests.
   - `src/purchases.ts`: native-only SDK glue (dynamic import, so the web
     bundle never ships it). Configure-on-demand, launch entitlement sync,
     purchase, restore, manage-subscription URL, Supabase-user linking
     (`Purchases.logIn`) on sign-in/out.
   - `SubscriptionScreen` / `BillingScreen`: on a native build with
     `VITE_REVENUECAT_IOS_KEY` set, the purchase goes through StoreKit and a
     **Restore purchases** button is shown; the Stripe redirect remains
     web-only. Native builds *without* the key keep the pilot simulation.
   - `supabase/functions/revenuecat-webhook`: mirrors RevenueCat events into
     the `subscriptions` table (Architecture B), so `syncSubscriptionFromDB`
     works unchanged for native purchases. **Written, not yet deployed.**
4. **Supabase** — unchanged, still fully degradable.
5. **AI as a Pro perk** — AI curation (Settings toggle + home-feed re-ranking)
   and the AI taste-summary rephrase are gated on `isPro(profile)`
   (trialing/active). Deterministic ranking and the deterministic summary
   remain for free users.

Manual steps still required before App Store submission:
- Create the subscription products (annual/quarterly/monthly, 7-day trial) in
  **App Store Connect**; create the RevenueCat project, attach the products to
  a **`pro` entitlement**, and add package types ANNUAL / THREE_MONTH / MONTHLY
  to the current offering.
- Set `VITE_REVENUECAT_IOS_KEY` (RevenueCat public Apple key) in the build env.
- Deploy `revenuecat-webhook` and set the `REVENUECAT_WEBHOOK_AUTH` secret;
  configure the same value in RevenueCat → Integrations → Webhooks.
- Open the Xcode project (`npm run ios:open`), add the In-App Purchase
  capability, and archive/upload.
