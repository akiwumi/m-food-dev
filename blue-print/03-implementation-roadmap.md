# MoodFood — Phased Implementation Roadmap & Build Plan

**Document role:** This is the *engineering build sequence* for MoodFood. It complements (does not duplicate) the existing documents:

- `orig Docs/moodfood_full_build_spec.md` — the **authoritative source** for the route map, page wireframes, the full Supabase SQL schema, Edge Function contracts, and the Moody AI tool/prompt definitions. This roadmap references it; it does not restate the SQL.
- `orig Docs/MoodFood_App_Flow_and_Features_v2 copy.md` — screen flow, MVP vs later scope (§9), acceptance criteria (§10), suggested UI skeleton (§11).
- `Docs/MOODFOOD_MASTER_PLAN.md` — single source of truth for **product** scope. Its §14 is a *product* roadmap (feature buckets MVP / v1.1 / v1.2), §15 has acceptance criteria, §16 a risk register, Appendix A the file/folder structure. This roadmap turns that product scope into an *executable engineering sequence* — phases, dependencies, exit criteria, effort. Where the two diverge, the Master Plan wins on scope; this doc wins on build order.

The MVP target here matches Master Plan §14 Phase 1 and App-Flow §9.1. Social/video import is in MVP per the Master Plan but is sequenced into Phase 8 of this build plan (it is import-engine work, layered after the core loop is stable).

---

## 1. Current State Assessment

### What exists today (`preview site/`)
A **static marketing/launch site only** — not the app. Plain HTML/CSS/JS (no React, no build step).

| Asset | State | Reusable for the app? |
|---|---|---|
| `index.html` | Landing page: hero, "trace the flow" steps, feature tiles, founder pricing, signup form | Content/copy + visual language reusable; markup must be rebuilt in React |
| `styles.css` (22 KB) | Hand-written CSS, calm palette, fonts (Fraunces/Nunito/Archivo Black), floating-food motifs | **Design reference** — fold into the Tailwind design tokens; not used as-is |
| `app.js` | Vanilla JS: signup form → Supabase `launch_signups` insert, Stripe checkout redirect, loader, scroll-spy nav | Logic is throwaway; only the Supabase + Stripe wiring *pattern* is informative |
| `config.js` / `config.sample.js` | Browser-safe config: `supabaseUrl`, `supabaseAnonKey`, `checkoutFunctionUrl`, `stripePaymentLink` | Pattern carries into the React env config |
| `supabase/sql/launch_signups.sql` | One table: launch email capture with RLS (public insert only) | Marketing only — **not** part of the app schema |
| `supabase/functions/create-checkout-session/` | Deno Edge Fn: founder $30 one-time Stripe checkout, 250-cap | Proves the Stripe + Edge Function deploy path works; app billing is subscription-based and will be a new function |
| `supabase/functions/stripe-webhook/` | Deno Edge Fn: marks `launch_signups` paid on `checkout.session.completed` | Same — pattern proven, app webhook rewritten for `subscriptions`/`entitlements` |
| `public/assets/*` | Logo, hero bowls, app-screen mockups, SVG motifs | Logo + marketing imagery reusable; app screens are mockups, not real |
| `SUPABASE_VERCEL_SETUP.md` | Novice-grade deploy guide: Supabase project, CLI link, secrets, function deploy, Vercel static deploy | **Deployment baseline** — Phase 0 extends this for a Vite/React build instead of static files |

### What is stubbed / not started
**Effectively the entire application.** There is no React app, no router, no auth UI, no app schema (only `launch_signups`), no app Edge Functions, no Moody AI gateway, no MCP server, no recipe data, no design system implementation (only `DESIGN_SYSTEM.md` referenced in specs).

### Gap to MVP (high level)
- **Foundation:** React+Vite+Tailwind+TS app scaffold; React Router; React Query; Supabase client; the full schema from the build spec (§2) applied as migrations; design tokens from `DESIGN_SYSTEM.md`.
- **Auth & shell:** signup/login/reset, profile bootstrap, route guards, top bar + bottom nav + Moody FAB.
- **Core vertical loop:** onboarding → mood check-in → recommendation v1 → search/results → recipe detail → cook mode → diary.
- **Supporting:** grocery + planner, insights, web/social import, billing + gating, realtime sync, push.
- **AI:** `/ai/chat` gateway, `AIController`, MCP gateway, agents, all tool implementations.

**Bottom line:** the preview site is a launch-list landing page. The build starts from a green field for the application, but with a proven Supabase/Stripe/Vercel deploy path and a settled design language, schema, and feature spec — so it starts from *reality with a head start*, not zero.

---

## 2. Guiding Sequencing Principles

1. **Schema-first.** Apply the full SQL schema (build spec §2) as versioned migrations in Phase 0, before any feature code. Tables, RLS, indexes, and `updated_at` triggers exist before the UI that uses them. Generate TypeScript types from the DB so the client is type-safe from day one.
2. **Vertical slices, not horizontal layers.** Build one complete user-facing path at a time (auth → onboarding → mood → suggestions → cook → diary). Each slice is demoable and shippable behind a flag. Avoid building "all the backend" then "all the frontend."
3. **Deterministic CRUD before AI.** Every feature works with plain forms, buttons, and a **deterministic** ranking/search engine *first*. Moody is layered on top as a controller that calls the *same* tools the UI already uses. This means the AI never needs a bespoke backend — it drives the working app. (Master Plan + build spec §7 AIController pattern.)
4. **Tool parity.** Each app action that Moody must perform (build spec §5.3 tool list) is implemented as a real function/Edge call the UI also uses. "AI can do X" is true because "the app can do X" is already true and exposed as a tool.
5. **Hard constraints are never soft.** Allergy/diet filters are enforced in the data layer (search query + recommendation engine), not in prompt text. This is wired in Phase 3 and asserted in tests from then on.
6. **Gate premium last.** Build features ungated; introduce entitlement checks in Phase 8 once the feature set and free/paid line are stable. Avoid gate logic churning through every phase.
7. **Persistence and recovery early where it matters.** Cooking sessions and onboarding autosave persist to Postgres as they are built (not retrofitted), because "never lose your place" is a core acceptance criterion.
8. **Realtime and voice are enhancements, not foundations.** Build with normal fetch/mutate + React Query; add Supabase Realtime subscriptions (Phase 8) and voice (Phase 9) as overlays on already-working state.

---

## 3. Phased Roadmap (Overview)

| Phase | Goal | Effort | Depends on |
|---|---|---|---|
| **0 — Foundation** | Repo, env, Supabase project, full schema migration, design tokens, CI/deploy | **M** | — |
| **1 — Auth + Shell** | Auth flows, profile bootstrap, routing, global layout (top bar, bottom nav, Moody FAB stub) | **M** | 0 |
| **2 — Onboarding** | Setup wizard (assessment, preferences, mood definitions, review) + Quick Start + autosave | **M** | 1 |
| **3 — Mood → Recommend → Search → Detail** | Mood check-in, deterministic recommendation engine v1, search/results, recipe detail | **L** | 2 (+ recipe seed data) |
| **4 — Cook Mode** | Steps, timers, ingredient checklist, Wake Lock, session persistence + recovery, finish→diary | **M** | 3 |
| **5 — Diary + Insights** | Diary timeline, auto/manual entries, variety/repetition + nutrition-lite summary, gentle nudges | **M** | 4 |
| **6 — Grocery + Planner** | Grocery lists (aisle grouping + merge), shopping bag, weekly planner, plan→grocery generation | **M** | 3 (recipes), 5 (diary nudges optional) |
| **7 — Moody AI** | `/ai/chat` gateway, AIController, MCP gateway, agents, tool execution against existing features | **L** | 1–6 (tools must exist) |
| **8 — Import + Billing + Realtime** | Web + social/video recipe import; Stripe subscriptions + entitlement gating; realtime sync; push | **L** | 0 (billing tables), 3, 6 |
| **9 — Voice + Polish + Later** | Voice cook mode; a11y/perf/empty-state polish; launch checklist; later/optional (pantry, sharing, OCR, localization) | **M** | 4 (cook), 7 (Moody) |

Total core-MVP critical path: Phases 0–8. Phase 9 splits into "MVP polish/launch" (required) and "post-launch optional" (deferred, maps to Master Plan §14 Phase 2/3).

### Reordering justification vs the suggested shape
The suggested 0–9 shape is kept almost verbatim. Two deliberate choices:

- **Social/video import is in MVP per the Master Plan** but is placed in **Phase 8** here, alongside web import and billing. Rationale: import is an isolated engine with external-API risk (YouTube/TikTok/IG quotas, oEmbed policy). It does not block the core mood→cook→diary loop, so it should not sit on the critical path of proving the product. Building it next to web import shares the parser/preview-editor code.
- **Realtime is folded into Phase 8** rather than its own phase. It is a thin subscription layer over grocery + cooking-session state that already works via React Query; isolating it as a phase would overstate its size.

---

## 4. Phased Roadmap (Detail + Task Checklists)

> Effort key: **S** ≈ ≤3 days, **M** ≈ 1–2 weeks, **L** ≈ 2–4 weeks (one engineer, indicative).
> Tables/functions named below are defined in `moodfood_full_build_spec.md` §2 (schema) and §4 (endpoints).

---

### Phase 0 — Foundation  ·  Effort: M  ·  Depends on: none

**Goal:** A running, deployable, type-safe React app wired to a Supabase project whose schema already matches the full build spec. Nothing user-facing yet beyond a hello-world authenticated ping.

**Scope:** repo + tooling; Supabase project; **all** schema migrations (build spec §2); storage buckets; design tokens from `DESIGN_SYSTEM.md`; CI + Vercel/Supabase deploy.

**Exit / acceptance criteria**
- `npm run dev` boots a Vite + React + TS + Tailwind app; `npm run build` produces a clean prod bundle deployed to Vercel.
- All tables from build spec §2 exist with RLS enabled and policies applied; `supabase db diff` is clean against the migration files.
- `generate_typescript_types` output is committed and imported as the DB types.
- A trivial authenticated query (e.g. `select` own `profiles` row) succeeds from the deployed app for a test user; an unauthenticated/other-user query is correctly blocked by RLS.
- CI runs typecheck + lint + unit test on every PR.

**Tasks**
- Frontend / tooling
  - [ ] Scaffold Vite + React + TypeScript; add Tailwind, ESLint, Prettier, Vitest, React Testing Library.
  - [ ] Add React Router and React Query providers; create app entry, error boundary, and a `<Protected>` placeholder.
  - [ ] Establish folder structure per Master Plan Appendix A (`/pages`, `/components`, `/lib`, `/hooks`, `/types`, `/styles`).
  - [ ] Implement design tokens from `DESIGN_SYSTEM.md` as Tailwind theme extension (calm, mood-aware palette, typography scale, spacing, radii); add CSS variables for the dynamic per-mood palette.
  - [ ] `lib/supabaseClient.ts` reading env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); env example file committed, real values via Vercel env + `.env.local`.
- Backend / data
  - [ ] Create Supabase project (or reuse existing); enable `pgcrypto`, `citext`.
  - [ ] Convert build spec §2 SQL into ordered migration files (`supabase/migrations/`); apply via `apply_migration`. Include all enums, tables, indexes, `set_updated_at` trigger + per-table triggers, and **all** RLS policies.
  - [ ] Create storage buckets `recipe-images` (private), `avatars`; add bucket policies (owner read/write; provider images public-read).
  - [ ] Add a DB trigger / Edge handler to auto-insert a `profiles` row on `auth.users` signup (`onboarded=false`, `subscription_tier='free'`).
  - [ ] Commit generated TypeScript DB types to `/types`.
- AI
  - [ ] Stub `/supabase/functions/ai-chat/` and `/supabase/functions/mcp/` with a 501 handler + auth check (contracts only; bodies land in Phase 7).
- Test / ops
  - [ ] CI workflow: typecheck, lint, unit tests, build.
  - [ ] Extend `SUPABASE_VERCEL_SETUP.md` for the Vite build (Framework: Vite, build `npm run build`, output `dist`) and document `supabase functions deploy`.
  - [ ] Add `get_advisors` (security + performance) to a pre-merge checklist; resolve any RLS/index advisories from the migration.

---

### Phase 1 — Auth + Profiles + Routing Shell + Global Layout  ·  Effort: M  ·  Depends on: 0

**Goal:** A user can sign up, verify, log in, reset password, and land inside an authenticated app shell with the global chrome in place. Routing reflects onboarding state.

**Scope** — Screens: Landing (`/`), Pricing (`/pricing`), `/auth/signup|login|forgot|reset`. Shell: `AppTopBar`, `BottomNav`, `MoodyFAB` (opens an empty panel for now). Tables: `profiles`. Functions: none new.

**Exit / acceptance criteria**
- Signup → email verify (if enabled) → on first login routes to `/setup/start` (because `profiles.onboarded=false`); subsequent logins with `onboarded=true` route to `/app/home`.
- Forgot/reset password round-trips via Supabase.
- Unauthenticated access to any `/app/*` or `/setup/*` route redirects to login; authenticated access to auth pages redirects inward.
- Global layout renders on all `/app/*` routes: top bar (logo, context title, avatar/settings), bottom nav (Home, Search, Diary, Grocery, Planner), Moody FAB bottom-right. Responsive: bottom nav on mobile, sidebar/pinned drawer slot on desktop.
- Toast system mounted globally.

**Tasks**
- Frontend
  - [ ] Port Landing + Pricing from the preview site into React using the design tokens (logged-out CTA → signup; logged-in CTA → `/app/home`).
  - [ ] Build auth pages with validation, Supabase auth error banners, loading/disabled states.
  - [ ] `useUserProfile` hook: fetch/cache profile via React Query; expose `onboarded`, `subscription_tier`, `preferences_json`.
  - [ ] Route guards: `<Protected>` (requires session) and onboarding-aware redirect logic.
  - [ ] `AppTopBar`, `BottomNav`, `SidebarNav`, `MoodyFAB` (FAB opens an empty `MoodyPanel` shell), `ToastProvider`.
- Backend / data
  - [ ] Verify the Phase-0 profile-bootstrap trigger; backfill any missing profile rows.
  - [ ] Confirm Supabase Auth settings: email confirmations, redirect URLs (local + Vercel), password reset template.
- Test
  - [ ] Unit: route-guard redirect matrix (no session / onboarded / not onboarded).
  - [ ] Integration (or E2E): signup → land on `/setup/start`; logout/login round-trip.
  - [ ] RLS test: a user cannot read another user's `profiles` row.

---

### Phase 2 — Onboarding Wizard + Autosave  ·  Effort: M  ·  Depends on: 1

**Goal:** A new user completes profile setup — via either MVP path (Quick Setup, or the 6-step standard wizard) — with every answer autosaved, and finishes with `onboarded=true`.

**Two MVP onboarding paths** (path selector = `WIREFRAMES.md` Screen 9, `DESIGN_SYSTEM.md §7.21`):
1. **Quick Setup** — 5 condensed screens (~5 min), routes `/setup/quick/{safety,cooking,taste,moods,finish}`.
2. **"Tell Me Everything" — 6-step standard wizard:** `/setup/lifestyle` (diet) → `/setup/allergies` → `/setup/assessment` (cooking skill/time/people/cuisines) → `/setup/preferences` (kitchen & taste) → `/setup/moods` (the 6 mood definitions) → `/setup/location` (+ review). Progress reads **"Step X of 6"**.

> **Roadmap (out of MVP Phase 2):** the full **15-module Deep Dive** (adds modules for food identity, sensory profile, Emotional Food Map, cooking psychology, social dynamics, discovery, routine, health/Safe-Mode, life-stage — `WIREFRAMES` Screens 10c–10g, 13c–13f) and the **Moody-chat onboarding path** are post-MVP. The standard wizard and Deep Dive share the same segmented progress-bar component (§7.22), 6 vs 15 segments.

**Scope** — Screens per the two paths above, plus `/setup/start` (path select). Tables: `assessment_answers`, `mood_definitions`, `profiles` (preferences_json, onboarded). Functions: none new (direct CRUD).

**Exit / acceptance criteria**
- Each step autosaves on change/blur to `assessment_answers` (unique per `user_id, question_key`) or `mood_definitions` (unique per `user_id, mood_key`); refresh resumes mid-wizard with no data loss.
- Hard constraints (allergies, diet) are written to `profiles.preferences_json` so the recommendation engine can read them.
- Quick Setup completes a minimal valid profile fast and marks `onboarded=true`.
- Review (end of either path) summarizes time prefs, diet/allergies, top cuisines, mood definitions; "Confirm & continue" sets `onboarded=true` and routes to `/subscribe` (Phase 8) — until billing exists, route straight to `/app/home`.
- Required-field validation blocks Next; "Use defaults" populates mood definitions from templates.

**Tasks**
- Frontend
  - [ ] Wizard container: segmented progress indicator ("Step X of 6"), Back/Next, per-step route, resume-from-server on mount.
  - [ ] Lifestyle + Allergies steps: diet (chips) and allergies (strict multi-select with 🔴/🟡/🟠 severity per `DESIGN_SYSTEM §7.19`) → written to `profiles.preferences_json`.
  - [ ] Assessment step: skill (radio), duration (chips), people (stepper 1–10), top-3 cuisines (multi-select search).
  - [ ] Preferences (kitchen & taste) step: equipment checklist, weekday/weekend time sliders, spice + comfort↔adventurous sliders, optional health goals.
  - [ ] Mood definitions step: per-mood cards for the **6 moods** (tired/stressed/cozy/celebratory/focused/adventurous) labelled with **words, not emoji** (per `DESIGN_SYSTEM §6`), "wants" chips, optional "avoid" chips, defaults/customize toggle.
  - [ ] Location + Review step: optional location grant, then summary cards + Confirm.
  - [ ] Quick Setup path (5 condensed screens) writing the same tables.
  - [ ] Debounced autosave hook with optimistic UI + "saving…/saved" indicator and error retry.
- Backend / data
  - [ ] Upsert helpers for `assessment_answers` and `mood_definitions` (rely on the unique indexes for idempotency).
  - [ ] Mood-definition default templates (constant in `/lib`, written on "Use defaults").
- Test
  - [ ] Unit: autosave debounce + upsert idempotency; validation gating.
  - [ ] Integration: complete full wizard → `onboarded=true`, all rows present; refresh mid-wizard resumes correctly.
  - [ ] Integration: Quick Start produces a valid minimal profile.

---

### Phase 3 — Mood Check-in → Recommendation v1 → Search → Recipe Detail  ·  Effort: L  ·  Depends on: 2 (+ seed recipe data)

**Goal:** The core value loop. From Home, a user logs a mood and receives a ranked, explained recipe list (deterministic), can refine via search/filters, and open a full recipe detail — all respecting hard constraints. This phase satisfies the "<3 min to first suggestion" criterion.

**Scope** — Screens: `/app/home`, `/app/search`, `/app/recipes/:id`, `/app/favorites`. Tables: `mood_entries`, `recipes`, `recipe_ingredients`, `recipe_steps`, `recipe_images`, `favorites`, reads `mood_definitions`/`profiles`. Functions: `recipes-search` (`searchRecipes`); recommendation ranking (client `lib/recommendation.ts` per spec §7, with the hard filters enforced in the DB query).

**Exit / acceptance criteria**
- Home shows mood chips (emoji+label), tiredness slider, "I want…" chips, optional weather/time-of-day; "Recommend meals" logs a `mood_entries` row and produces 6–12 ranked results with "why it fits" reason tags.
- Ranking applies: diet/allergy **hard filters** (never violated), time-available vs total-time, cuisine soft boost, variety penalty (repeats from recent diary — degrade gracefully when diary empty), skill match. Implemented deterministically; documented in `recommendation.ts`.
- Search: keyword + filter sheet (mood preselected from Home, time, cuisine, difficulty, pantry-only toggle, variety slider); results cards with Save / Add-to-plan / Add-to-grocery quick actions.
- Recipe detail: hero image(s), meta row, "why this fits" callout, tabs (Ingredients checklist preview, Steps preview, Notes, Nutrition), action row (Start cooking, Save, Add to grocery, Add to plan), "similar alternatives".
- Empty state: "No matches — relax constraints" + a "Fix this for me" affordance (wires to Moody in Phase 7). Loading skeletons; provider/error fallback to cached/saved recipes.
- Favorites: list, search-within, filter, empty state.

**Tasks**
- Data / seed (prerequisite — see Risks)
  - [ ] Decide recipe source: seed a curated internal recipe set (≥150 recipes spanning cuisines/diets/times) into `recipes` + children with `source_type='provider'`, **or** wire a provider (Spoonacular/Edamam) ingest job that normalizes into the same tables. Tag each recipe with mood-relevant `tags_json` and `aisle_category` on ingredients.
  - [ ] Populate `nutrition_json` per serving (provider data or USDA/Edamam estimate; label the source).
- Backend / edge
  - [ ] `recipes-search` Edge Function: applies filters, enforces allergy/diet exclusions at the query level, returns ranked results with reason metadata. (Also callable as the `searchRecipes` tool.)
  - [ ] `getRecipe` read path (detail with ingredients/steps/images).
- Frontend
  - [ ] Home: `MoodChipGrid`, `TirednessSlider`, want-chips, optional weather/time; `useMoodSession` hook (logs mood, holds current context for Search/Moody).
  - [ ] `lib/recommendation.ts`: ranking weights + variety/skill logic + reason-tag generation.
  - [ ] Search: `FilterSheet`, results grid with `RecipeCard` + `ReasonTag`, quick actions, skeletons, empty/error states.
  - [ ] Recipe detail page: carousel, tabs, `MoodFitCallout`, `NutritionBadge`, similar-alternatives, action buttons (Start cooking creates a session — Phase 4).
  - [ ] Favorites page + `toggleFavorite` mutation.
- Test
  - [ ] **Hard-constraint test (critical):** for a profile with a peanut allergy, no search/recommendation result ever contains peanut ingredients — assert across many queries.
  - [ ] Unit: ranking determinism + reason tags; variety penalty with/without diary history.
  - [ ] Integration: mood check-in → results render; refine filter → results update; open detail; favorite/unfavorite.
  - [ ] Timing check: signup→first suggestion path completes well under 3 minutes (manual + E2E).

---

### Phase 4 — Cook Mode  ·  Effort: M  ·  Depends on: 3

**Goal:** Hands-busy step-by-step cooking that never loses its place, with timers, an ingredient checklist, wake lock, and a finish flow that auto-creates a diary entry.

**Scope** — Screen: `/app/cook/:sessionId`. Tables: `cooking_sessions` (current_step, ingredient_state_json, step_state_json, status), writes `diary_entries` on finish. Functions: tool-level (`startCookingSession`, `setCurrentStep`, `checkOffIngredient`, `startTimer`, `finishCookingSession`).

**Exit / acceptance criteria**
- "Start cooking" creates a `cooking_sessions` row (`status='active'`) and routes to the session.
- Step progress (Step n/total), large current-step text, Back/Next; ingredient drawer checklist; timers auto-detected from `recipe_steps.timer_seconds` (and parsed from step text), tap to start, running/paused banner.
- **Session persistence + recovery:** all state (current step, checked ingredients, timer state) persists to `cooking_sessions`; closing/refreshing/reopening on any device resumes exactly where left off.
- Wake Lock acquired while active on supported browsers; graceful "Tap to keep screen on" fallback where unsupported (iOS Safari).
- "Finish cooking" → `finishCookingSession`: sets `status='completed'`, creates a `diary_entries` row (meal_type, optional rating/notes, carries `mood_key`).

**Tasks**
- Frontend
  - [ ] `useCookingSession` hook: load by id, optimistic local state, debounced persistence of step/ingredient/timer state.
  - [ ] `StepCard` (large text, highlight), Back/Next, `IngredientChecklist`, `TimerChip` (countdown, multiple concurrent), running banner.
  - [ ] Timer auto-detect: use `recipe_steps.timer_seconds`; fallback regex parse of step text ("bake 20 minutes").
  - [ ] Wake Lock acquire/release lifecycle tied to active status + visibility; capability detection + fallback UI.
  - [ ] Finish flow modal (meal_type, rating, notes) → diary entry; route to diary/home.
  - [ ] Session recovery banner on Home ("Continue cooking") when an active session exists.
- Backend / edge
  - [ ] Implement the cook-mode tools as the canonical write paths (also reused by Moody in Phase 7): `startCookingSession`, `setCurrentStep`, `checkOffIngredient`, `startTimer`, `finishCookingSession`.
- Test
  - [ ] **Recovery test (critical):** mutate session state, reload → exact resume (step, checked items, timer).
  - [ ] Unit: timer parse/auto-detect; wake-lock capability fallback.
  - [ ] Integration: full cook → finish → diary entry created with correct fields.

---

### Phase 5 — Diary + Nutrition Insights  ·  Effort: M  ·  Depends on: 4

**Goal:** A food journal that auto-logs from cooking and supports manual entry, plus a non-judgmental insights view (variety/repetition + nutrition-lite) that feeds the variety penalty in recommendations.

**Scope** — Screens: `/app/diary`, `/app/insights`. Tables: `diary_entries`. Functions: `insights/summary` (`getInsightsSummary`).

**Exit / acceptance criteria**
- Diary: Week/Month toggle, date-grouped timeline of meal cards (recipe, meal type, rating, notes, mood), filters (meal type, cuisine, mood), manual "Add entry", insights summary card at top; empty state when no entries.
- Insights: 7/30/90-day range; variety score; repeat detection ("you cooked X similar meals"); macro-frequency trend (protein/fiber etc.); 2–3 suggestions linking to recipes; gentle-reminders toggle.
- All copy is supportive, non-shaming, non-medical; every insight shows its rationale ("based on your diary").
- Variety/repetition output is consumable by `recommendation.ts` (closes the loop from Phase 3).

**Tasks**
- Backend / edge
  - [ ] `insights/summary` Edge Function: computes variety score, top repeats (by tag/cuisine/ingredient over window), macro-frequency, and recipe suggestions for deficits.
- Frontend
  - [ ] Diary timeline + filters + manual entry form; insights summary card.
  - [ ] Insights dashboard cards + range selector + reminders toggle; suggestion cards deep-link to recipes.
  - [ ] Tone pass: route all insight/nudge copy through the language policy (Master Plan §15.11).
- Data
  - [ ] Wire variety/repeat signal into the Phase-3 ranking (replace the empty-diary degrade path with real data).
- Test
  - [ ] Unit: variety score + repeat detection on fixture diaries.
  - [ ] Tone test/lint: assert no shaming-language tokens in insight copy.
  - [ ] Integration: cook→auto-diary→insights reflect the new entry; manual entry appears.

---

### Phase 6 — Grocery Lists + Meal Planner  ·  Effort: M  ·  Depends on: 3 (recipes); 5 optional

**Goal:** Aisle-grouped grocery lists with ingredient merge, a recipe-scoped shopping bag, and a weekly planner that can generate a combined grocery list in one tap.

**Scope** — Screens: `/app/grocery`, `/app/grocery/:listId`, `/app/planner`. Tables: `grocery_lists`, `grocery_items`, `meal_plans`, `meal_plan_items`. Functions: `grocery/categorize` (`categorizeAndCombineGroceryList`), `createGroceryListFromRecipes`, `planner/generate` (deterministic), `createMealPlan`/`setMealPlanItem`.

**Exit / acceptance criteria**
- Grocery: lists view (This Week + create), list detail with aisle-grouped sections, item rows (checkbox/name/qty/notes), "Auto-sort by aisle", "Combine duplicates" (1 egg + 2 eggs = 3 eggs), add-item input.
- Add-to-grocery from recipe/search appends items with `aisle_category`.
- Planner: week view (month toggle later) with breakfast/lunch/dinner slots, add recipe from sidebar search; "Create grocery list from plan" produces one combined, aisle-sorted, de-duplicated list.
- Deterministic `planner/generate` builds a constrained week (max_time/diet/variety) — AI generation is layered in Phase 7 using this same engine.

**Tasks**
- Backend / edge
  - [ ] `lib/ingredientMerge.ts` + `grocery/categorize` Edge Function (aisle mapping + unit-aware merge).
  - [ ] `createGroceryListFromRecipes`: expand recipe ingredients → items with aisle categories.
  - [ ] `planner/generate` deterministic generator honoring constraints + variety.
- Frontend
  - [ ] Grocery list + detail (`GroceryListCard`, `AisleGroup`, `GroceryItem`); shopping bag (recipe-scoped, temporary per Master Plan §2.10).
  - [ ] Planner calendar (`PlannerCalendar`, `DaySlot`), drag/add from search, "Create grocery list from plan".
- Test
  - [ ] Unit: ingredient merge (quantity/unit edge cases); aisle categorization.
  - [ ] Integration: plan a week → generate grocery list → correct merged/aisle-sorted output.

---

### Phase 7 — Moody AI Assistant  ·  Effort: L  ·  Depends on: 1–6 (the tools must already exist)

**Goal:** Moody becomes the primary control layer. The `/ai/chat` gateway + MCP tool router let Moody configure the profile, find recipes, guide cooking, log meals, and explain nutrition — by calling the *same* tools the UI uses. Implements the AIController pattern (build spec §7) and the agent model (App-Flow §5.3.1).

**Scope** — Component: `MoodyPanel` (global, context pills, undo, explain). Functions: `ai/chat` (gateway), `mcp` (tool router). Tables: `ai_threads`, `ai_messages`, `ai_actions`, `ai_profile_summaries`. Uses every tool from build spec §5.3.

**Exit / acceptance criteria**
- `/ai/chat` returns the spec'd JSON shape: `assistant_message` + `actions[]` (label/tool/args) **or** one `follow_up_question` + `quick_replies`. Every response is one of those two — never a dead-end. System prompt = build spec §5.1; tool schema = §5.3.
- `AIController` (frontend) sends `/ai/chat`, renders the message, maps `actions[]` to buttons, executes the tool, writes results into app state. `thread_id` persisted per user.
- MCP gateway is the single tool-execution path; tools enforce auth + RLS (no client DB writes from the model). Specialized agents (planner, cook coach, nutrition, grocery) route through it.
- Hard constraints honored: allergy/diet never violated in any AI-surfaced recipe (re-asserted via the Phase-3 data-layer enforcement).
- Observability: every turn logs `ai_messages`; every tool call logs `ai_actions` with success/failure.
- Context pills (mood, time limit, diet/allergies) and "Undo last action" + "Explain why" work.

**Tasks**
- Backend / edge / AI
  - [ ] `ai/chat` Edge Function: system+developer prompts (§5.1/5.2), tool schema (§5.3), function-calling loop, JSON-shape validation, thread/message persistence.
  - [ ] `mcp` gateway: register each app tool (search, profile, mood, cook, grocery, planner, insights, import) → existing Edge/DB functions; auth + RLS enforcement; `ai_actions` logging.
  - [ ] Agent routing layer (planner / cook coach / nutrition / grocery) calling tools via MCP.
- Frontend
  - [ ] `AIController` + `MoodyPanel` (transcript, suggested quick-action chips, context pills, undo, explain); mobile bottom sheet / desktop pinned drawer.
  - [ ] Wire the Phase-3 "Fix this for me" empty-state and Home's proactive nudge into Moody.
- Test
  - [ ] **AI tool-call tests (critical):** golden prompts assert correct tool + args (e.g. "tired, 20 min, no dairy" → `searchRecipes` with `max_time_minutes:20`, `diet`/`exclude_allergens` set).
  - [ ] Response-shape test: every `/ai/chat` reply validates as (actions) OR (clarifying question).
  - [ ] Constraint test: AI never surfaces an allergen-violating recipe.
  - [ ] Undo test: an AI action can be reverted.

---

### Phase 8 — Import + Billing/Gating + Realtime + Push  ·  Effort: L  ·  Depends on: 0 (billing tables), 3, 6

**Goal:** Recipe import (web + social/video), subscription billing with entitlement gating, cross-device realtime sync, and push notifications — the commercial + multi-device layer.

**Scope** — Screens: `/app/import`, `/app/videos`, `/app/video/:id`, `/subscribe`, billing in `/app/settings`. Tables: `subscriptions`, `entitlements`, `recipes`+children (import targets), video library tables (per Master Plan). Functions: `recipes/import`, `billing/stripe-webhook`, a create-subscription-checkout function, realtime channels, push.

**Exit / acceptance criteria**
- Web import: paste URL → JSON-LD → OpenGraph → AI fallback parse → editable preview → save. Failure shows "try another URL"/manual entry.
- Social/video import: YouTube/TikTok/Instagram URL → draft recipe (with missing-field flags) within the acceptance time bounds (Master Plan §15.4–5); video library lists saved videos with thumbnails + embedded playback (no external redirect).
- Billing: `/subscribe` creates a Stripe Checkout session; `billing/stripe-webhook` (service-role, signature-verified, idempotent) updates `subscriptions` + `entitlements`; client never writes those tables.
- Gating: `lib/entitlements.ts` gates premium features (planner/AI generation, web/social import, advanced insights, unlimited saves) per current entitlements; clean upgrade prompts.
- Realtime: grocery list change on one device reflects on another in <2s; active cooking-session state syncs across devices.
- Push: meal reminders + variety nudges (`usePushNotifications`).

**Tasks**
- Backend / edge
  - [ ] `recipes/import`: fetch HTML → JSON-LD extract → fallback → optional AI structuring (return `null` for missing, never invent).
  - [ ] Social/video import: `urlClassifier` + per-platform handlers (YouTube Data API, oEmbed for TikTok/IG) + `videoEmbed` URL builders; cache metadata on first fetch.
  - [ ] Subscription checkout function (trial→monthly, annual — no lifetime) + `billing/stripe-webhook` (idempotent, service role).
  - [ ] Realtime channels for `grocery_items` and `cooking_sessions`.
- Frontend
  - [ ] `Import` (URL + preview editor `RecipePreviewEditor`), `Videos`/`VideoDetail` library.
  - [ ] `Subscribe` page + Settings billing (current plan + manage-billing portal); `entitlements.ts` gates across the app; `useRealtimeSync`.
  - [ ] Push permission + registration + handlers.
- Test
  - [ ] Import: JSON-LD page → complete recipe; broken page → graceful failure.
  - [ ] Webhook idempotency: replayed Stripe event does not double-apply.
  - [ ] Gating matrix: free vs each paid tier sees correct features.
  - [ ] Realtime: two-client grocery check propagates <2s.

---

### Phase 9 — Voice Cook Mode + Polish + Launch + Later  ·  Effort: M (MVP polish) + deferred (optional)  ·  Depends on: 4, 7

**Goal:** Ship-ready polish + voice cook mode, then the post-launch optional backlog.

**MVP-blocking polish (required before launch)**
- [ ] Accessibility pass (keyboard nav, focus management, ARIA, contrast against the calm palette, reduced-motion).
- [ ] Error/empty/loading states audited on every screen.
- [ ] Performance: bundle/route splitting, image optimization, Core Web Vitals; run `/benchmark` baselines.
- [ ] Cross-device responsive QA matrix (8 sizes per Master Plan §16).
- [ ] Security/RLS advisor pass clean (`get_advisors`); penetration of the "no client writes" billing/entitlement policies.
- [ ] Run the MVP launch checklist (§6) end-to-end.

**Voice cook mode (in MVP per build spec/App-Flow; can ship just after core launch)**
- [ ] `VoiceModeController` + `lib/voiceStateMachine.ts` (`idle→speaking→listening→action→…`) using Web Speech API (TTS/STT) with capability detection.
- [ ] Commands: start/next/repeat/pause/resume/previous/skip; "how much longer?"; "next ingredient?".
- [ ] Persist `voice_mode_enabled`, `last_spoken_step_index`, `is_listening`, `is_speaking` in the cooking session for resume + cross-device sync.
- [ ] Listening/speaking visual indicator; highlight current spoken step.

**Later / optional (deferred — Master Plan §14 Phase 2/3)**
- [ ] Pantry tracker + "use what you have" (`/app/pantry`, `pantry_items`).
- [ ] Psychological Food Profile public sharing (`/app/share`, `ai_profile_summaries`).
- [ ] Camera OCR scanner, Cook-Along video overlay, Collections/Boards, "Decide for Me".
- [ ] Budget/localization, grocery store integration, social/community, Electron desktop.

---

## 5. Cross-Cutting Workstreams

These run *across* phases, not as separate phases.

- **Design system application.** Fold `DESIGN_SYSTEM.md` + the preview-site visual language into Tailwind tokens in Phase 0; every component built thereafter consumes tokens (no ad-hoc colors). Maintain the dynamic per-mood palette as CSS variables set on mood selection. The shared component library (`/components/shared`) is built as needed and reused.
- **Testing strategy.**
  - *Unit (Vitest):* ranking, ingredient merge, variety scoring, timer parsing, autosave, entitlements — from the phase they ship.
  - *Integration (RTL):* each vertical slice's happy path + key error states.
  - *E2E (Playwright, mobile + desktop viewports):* signup→first-suggestion, cook→diary, plan→grocery, billing.
  - *RLS tests:* every user-owned table — owner can read/write, others cannot — added with each table's first use.
  - *AI tool-call tests (Phase 7+):* golden-prompt → expected tool+args; response-shape validity; allergy-constraint never violated.
- **Accessibility.** Built in per component (semantic markup, focus, ARIA, contrast, reduced motion), audited in Phase 9. Voice mode is itself an accessibility win.
- **Analytics.** Instrument the core funnel from Phase 1 (signup→onboarding→first suggestion→first cook→first diary) and key AI events (`ai_actions` already log tool usage). Add a usage dashboard to watch LLM cost (Risk register).
- **Error / empty / loading states.** A standard `EmptyState` + `SkeletonCard` from Phase 1; every list/fetch uses them. Provider/import/AI failures degrade gracefully with retry + fallback.
- **Deployment.** Per `SUPABASE_VERCEL_SETUP.md`, extended in Phase 0 for the Vite build: Vercel (Framework: Vite, build `npm run build`, output `dist`), Supabase migrations via CLI/`apply_migration`, Edge Functions via `supabase functions deploy`, secrets via `supabase secrets set` (service role, Stripe keys, AI keys — **never** in client config). Browser-safe values only in env (`VITE_*`). Use Supabase branches for preview environments where possible.

---

## 6. MVP Definition & Launch Checklist

**MVP scope (restated, = Master Plan §14 Phase 1 / App-Flow §9.1):**
Auth + subscription gating · Setup wizard + Quick Start + assessment + mood definitions · Mood check-in → ranked, explained suggestions · Search + recipe detail · Cook mode (timers, checklist, persistence, wake lock) · Food diary + basic nutrition/variety summary · Smart grocery (aisle + merge) + weekly planner + plan→grocery · Web + social/video import + video library · Moody AI panel (all tool calls) · Responsive phone/tablet/desktop · Cloud sync (grocery + cooking sessions via Realtime) · Push (reminders + nudges) · Settings + recalibration.

**Launch checklist (maps to App-Flow §10 / Master Plan §15 acceptance criteria):**
- [ ] Signup → first mood-based suggestion in **< 3 minutes** (E2E timed).
- [ ] Moody configures a complete profile from one natural-language message.
- [ ] "I'm stressed, 20 minutes, no dairy" → ranked, plain-English-explained list, **no manual form input**.
- [ ] Allergy filters applied **100% consistently** — never violated by any surfaced recipe (UI or Moody).
- [ ] Cook mode **never loses its place** across close/reopen and across devices.
- [ ] Finishing cook mode **auto-creates** a diary entry; insights update.
- [ ] Grocery item checked on phone reflects on iPad in **< 2s**.
- [ ] Weekly planner auto-generates from NL constraints → one-tap combined aisle-sorted grocery list.
- [ ] Web import → editable recipe; YouTube < 10s, TikTok/IG < 15s with missing-field flags; video library plays embedded (no external redirect).
- [ ] No shaming language anywhere (tone review passes).
- [ ] Sync works across phone/tablet/desktop for recipes, lists, plans.
- [ ] RLS/security advisors clean; billing/entitlement tables not client-writable.

---

## 7. Risks & Sequencing Dependencies

| Risk / dependency | Impact | When it bites | Mitigation / sequencing note |
|---|---|---|---|
| **Recipe data source** (the #1 unblocker) | Phase 3 cannot deliver value without a real recipe corpus; everything downstream (cook, grocery, planner, insights, AI) depends on it | Start of Phase 3 | Decide in Phase 0/early-3: curated internal seed (≥150, full control, no quota) vs provider ingest (Spoonacular/Edamam — quality varies for niche cuisines, has quotas/cost). Normalize either into the spec's `recipes` tables so the rest of the app is source-agnostic. Recommend seeding a curated set for MVP launch reliability, provider as enrichment. |
| **Nutrition data** | Insights (Phase 5) + nutrition badges credibility | Phase 3/5 | Use Edamam/USDA estimates; **always label the source** ("Edamam estimate" vs "USDA verified"); never medical. Store in `nutrition_json` per serving at ingest. |
| **LLM cost at scale** | Margins; runaway spend (Phase 7+) | Phase 7+ | Deterministic engine does the heavy lifting; Moody orchestrates, doesn't generate recipes. Aggressive prompt caching, batched MCP tool calls, prompt compression, per-user usage dashboard + caps. |
| **Voice on web vs native** | Voice cook mode reliability | Phase 9 | Web Speech API (TTS/STT) is uneven across browsers (esp. iOS Safari). Treat as enhancement with tap-to-talk fallback; defer wake-word + background audio to a future native (Capacitor/RN) shell. |
| **Wake Lock on iOS Safari** | Cook-mode "keep screen on" | Phase 4 | Capability-detect; "Tap to keep screen on" fallback; full support in a later native shell. |
| **Stripe webhook reliability** | Users not marked paid / wrong entitlements | Phase 8 | Idempotent, signature-verified webhook (service role only); retry handling; manual subscription-sync admin tool. The preview-site webhook proves the deploy path. |
| **Social/IG/TikTok embed + API policy** | Social import (in MVP) breaking | Phase 8 | Platform-agnostic fallback (thumbnail + external link); cache metadata on first fetch; monitor policy/quotas. This is *why* import sits off the core critical path. |
| **AI structuring hallucination** | Bad imported/structured data | Phase 7/8 | Instruct return `null` for missing fields, never invent; mandatory user-review gate before any save. |
| **Data privacy (mood + diary sensitive)** | Trust / compliance | Throughout | RLS on every user-owned table from Phase 0; mood/diary private by default; sharing opt-in only; export + delete account. |

**Critical-path dependency summary:** Phase 0 (schema) blocks everything → Phase 1 (auth/shell) blocks all app screens → Phase 2 (profile incl. allergies) blocks Phase 3 (recommendation needs constraints) → **recipe seed data** blocks Phase 3 → Phase 3 blocks Phases 4/6 → Phases 1–6 (working tools) block Phase 7 (Moody drives existing tools) → billing tables (Phase 0) + Phases 3/6 feed Phase 8. Voice (9) depends only on Phase 4 + 7 and can ship just after core launch.
