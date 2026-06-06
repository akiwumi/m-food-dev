# MoodFood — Master Build Blueprint

**The food app that takes the drudgery out of dinner time.**

This is the entry-point document. It synthesizes the source material in `orig Docs/` and the
strategic superset (`Docs/MOODFOOD_MASTER_PLAN.md`) into a single, actionable build plan. The
**design contract** lives alongside this file in `blueprint/`: [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)
(visual tokens + components), [`WIREFRAMES.md`](WIREFRAMES.md) (every screen × breakpoint), and
[`ICON_AUDIT.md`](ICON_AUDIT.md) (icon/emoji inventory). Those three are harmonised to this
blueprint's scope: MVP surfaces are untagged, post-MVP surfaces are marked **`[ROADMAP]`**. Read
this file first, then drill into the three companion build docs (01–03) and the design contract.

> **Canonical copies.** The harmonised design docs are the ones in this `blueprint/` folder. Older
> divergent copies under `Docs/` (`DESIGN_SYSTEM.md`, `WIREFRAMES.md`, `ICON_AUDIT.md`) are
> superseded — prefer the `blueprint/` versions and sync or remove the `Docs/` duplicates.

| # | Document | What it covers |
|---|----------|----------------|
| 00 | **This file** | Executive summary, scope decisions, conflict resolutions, how to start |
| 01 | [`01-product-vision.md`](01-product-vision.md) | Vision, positioning, psychological model, brand, net-new ideas from the pitch decks |
| 02 | [`02-architecture-and-data.md`](02-architecture-and-data.md) | System architecture, full 22-table SQL schema + RLS, Edge Functions, AI/MCP orchestration, recommendation engine |
| 03 | [`03-implementation-roadmap.md`](03-implementation-roadmap.md) | 10-phase build plan with per-phase task checklists, effort/dependency table, launch checklist |

---

## 1. What MoodFood Is (in one paragraph)

MoodFood solves **dinner decision fatigue**, not recipe scarcity. The user reports how they
feel (mood + energy/tiredness) plus light context (time available, diet, what's on hand), and
**Moody** — the built-in AI cooking assistant — returns ~3–7 curated, chef-quality options
matched to their **personal** definitions of mood-to-food, skill level, dietary hard
constraints, food history (variety), and nutrition patterns. It then coaches them through
hands-busy/hands-free **cook mode**, logs the meal to a diary, and feeds gentle, non-judgmental
nutrition and variety nudges back into future suggestions. The app must **always feel calming**.

Differentiation (from `01`): the only app that fuses **Psychology + practical culinary utility
+ (roadmap) real-time local cost awareness** — positioned as a "personal food psychologist /
emotional kitchen," not a calorie tracker or a generic recipe search.

> **The AI is the product's core — it makes the decisions.** MoodFood is **not** a restaurant-ordering
> app and not a passive recipe library. The user supplies inputs — mood, energy/tiredness, time
> available, diet/allergies, what's on hand, skill — and **Moody (the integrated AI) decides**: it
> interprets those inputs against the user's *personal* mood definitions and history, chooses what
> to do, and returns a small set of curated, cookable recipes (and then coaches the cook). Every
> screen is reachable by stating how you feel and letting the AI act. The deterministic
> recommendation engine (`02 §7`) is the **trusted substrate the AI drives** — it enforces safety
> (allergens) and supplies scored candidates; it does not replace the AI's judgement. "AI decides
> from user input" is the non-negotiable core, not a feature. (To control cost and avoid
> hallucination, the AI **orchestrates real tools and never invents recipes or nutrition facts** —
> a discipline about *data integrity*, not a limit on its decision-making.)

## 2. Tech Stack (settled)

- **Frontend:** React + TypeScript + Tailwind; Zustand (UI/cook-session/voice state) + React Query (server cache); IndexedDB offline cache. Web-first PWA, Capacitor wrapper later for native TTS/STT/wake-lock/push.
- **Backend:** Supabase — Postgres (+ RLS on all user tables), Auth (JWT), Storage (`recipe-images` private, `avatars`), Realtime, Edge Functions (Deno).
- **AI:** **Moody** = primary assistant + specialized sub-agents (Planner, Cook Coach, Nutrition, Grocery), backed by the **Claude API**. All AI-initiated DB writes flow through a single **MCP gateway** — never directly from the client.
- **Billing:** Stripe Checkout + signed webhook → `subscriptions` / `entitlements` (service-role writes only).
- **Deploy:** Vercel (frontend) + Supabase (backend), per `preview site/SUPABASE_VERCEL_SETUP.md`.

## 3. Current State (reality check)

The `preview site/` is a **static marketing/launch-list page only** (vanilla HTML/CSS/JS) that
captures email signups into a `launch_signups` table and runs a founder one-time Stripe
checkout via two Deno Edge Functions. **The application itself is greenfield.** But the project
is far from zero: it has a settled **design system**, full **wireframes**, a complete
copy-paste **SQL schema + Edge Function contracts + AI tool spec**, and a proven
**Supabase/Stripe/Vercel deploy path**. The existing Stripe webhook demonstrates the correct
service-role pattern and will be superseded by the production billing webhook in `02 §5`.

---

## 4. MVP Scope (the line we ship)

**In (must ship):**

1. Auth (email/password) + profiles + onboarded-flag routing.
2. Onboarding — two paths: **Quick Setup** (5 screens) or the **6-step standard wizard** (lifestyle → allergies → cooking assessment → kitchen/taste → **mood definitions** → location/review), all autosaved. (The 15-module Deep Dive and Moody-chat onboarding are roadmap — see `03` Phase 2.)
3. Mood check-in → **deterministic recommendation engine v1** → search/results → recipe detail.
4. **Cook mode**: steps, auto-detected timers, ingredient checklist, Wake Lock, session persistence/recovery.
5. Food diary + basic nutrition/variety insights (repetition detection, gentle nudges).
6. Grocery lists (aisle grouping + ingredient merge) + weekly meal planner + plan→grocery generation.
7. **Moody** AI assistant: `ai/chat` gateway + tool execution (the ~17 core tools) via MCP; "every reply is an action or one clarifying question."
8. Subscriptions/Stripe + entitlement gating; Realtime sync (grocery lists, cook session).
9. Cloud sync across phone/tablet/desktop.

**Deferred (post-MVP, in priority order):** recipe web/social import → **voice cook mode** (TTS/STT) →
pantry / "use what I have" → advanced nutrition coaching → social sharing of the Psychological
Food Profile → localization + **real-time local grocery pricing/budget caps** → medical/clinical
diet integration.

**Acceptance criteria (definition of done for MVP):**
- New user goes signup → first mood-based suggestion in **< 3 minutes**.
- Moody can: configure profile from conversation, find recipes from mood+constraints, guide
  cooking step-by-step without losing place, auto-log meals to the diary, explain nutrition
  patterns gently.
- Sync works seamlessly across devices for recipes, lists, and plans.
- **Allergies/diet are never violated** (hard constraints enforced server-side, not just by the LLM).
- Tone is supportive, non-judgmental; nutrition is labeled **informational, not medical advice**.

---

## 5. Phase Map (see `03` for full task checklists)

| Phase | Goal | Effort | Key dependency |
|------:|------|:------:|----------------|
| 0 | Project setup: repo, env, Supabase project, **schema migration**, CI, design-system wiring | M | — |
| 1 | Auth + profiles + routing shell + global layout (top bar, bottom nav, AI FAB) | M | 0 |
| 2 | Onboarding wizard (assessment, preferences, mood definitions, review) + autosave | M | 1 |
| 3 | Mood check-in → recommendation engine v1 → search/results → recipe detail | L | 2 + **recipe data** |
| 4 | Cook mode (steps, timers, checklist, wake lock, session recovery) | L | 3 |
| 5 | Diary + nutrition/variety insights | M | 4 |
| 6 | Grocery lists (aisle + merge) + meal planner + plan→grocery | L | 3 |
| 7 | **Moody**: ai/chat gateway, tool execution, AIController, MCP gateway, sub-agents | L | 3–6 |
| 8 | Recipe import; Stripe + entitlement gating; Realtime sync | M | 1, 6 |
| 9 | Voice cook mode; polish; optional backlog (pantry, social, localization) | varies | 4, 7 |

**Sequencing principles:** schema-first → vertical slices (auth→onboarding→mood→suggestions→cook→diary)
→ AI layered **on top of working CRUD** (so Moody orchestrates real, tested tools) → gate premium last.

---

## 6. Conflicts & Decisions Resolved (read before building)

The source documents disagree in a few places. These are the rulings this blueprint adopts;
flag to the product owner if any should change.

1. **Pricing — lifetime removed (product decision).** Canonical pricing is **7-day trial → $10/mo → $100/yr (USD)**, **subscription only**. The lifetime one-time plan is dropped (it conflicts with the recurring LLM + provider-API cost base, and the decks were inconsistent on it anyway — lifetime showed as $180/$250/$280, some in €). Create only Monthly and Annual Stripe products in Phase 8.

2. **MVP ambition: build spec (~22 tables, ~17 AI tools) vs master plan (~50 tools, extra subsystems: skill/learning signals, notifications, substitutions, video, shopping bag).** **Decision:** the **build spec is the canonical MVP core**; master-plan additions are roadmap (flagged in `02 §2.9` / `03 Phase 9`).

3. **Recipe data source (left open in build spec).** **Decision (from master plan):** **provider-backed with an internal cache** — Spoonacular primary, Edamam/USDA for nutrition, normalized into the spec's `recipes/recipe_ingredients/recipe_steps` tables so the app is source-agnostic. *This is the #1 unblocker for Phase 3 — decide early; cost/quota/licensing economics are an open risk.*

4. **LLM provider:** **Claude API** (Anthropic). State management: **Zustand + React Query**. Mobile/voice: **web-first PWA, Capacitor later**.

5. **Schema gaps flagged by the architecture pass (apply during Phase 0 migration):**
   - **Missing `profiles` row creation on signup** (app-breaking) — add an `on auth.users` insert trigger or post-signup upsert.
   - No nutrition detail tables — use a diary `nutrition_json` snapshot for MVP.
   - No keyword-search index — add `pg_trgm` for recipe search.
   - Storage bucket RLS not codified as SQL — write explicit bucket policies.
   - Provider/global recipes must be writable only via service role.

6. **Design docs reconciled to this blueprint's scope (harmonisation pass).** `DESIGN_SYSTEM.md`, `WIREFRAMES.md`, and `ICON_AUDIT.md` were aligned to the MVP-vs-roadmap line drawn here:
   - **Not a food-ordering app.** Removed the leftover restaurant-delivery component template from the design system (cart, quantity selector, promo/rewards card, checkout footer, "Orders/Rewards/Explore" nav, "$price·CALS" cards). Menu Card → **Recipe Card**. `WIREFRAMES` Screens 1–3 are kept only as `[LEGACY]` layout references.
   - **Bottom nav is exactly 5:** Home · Search · Diary · Grocery · Planner. Videos (via Search toggle/sidebar) and Settings (via profile) are not tab items.
   - **Mood model is three tiers:** 6 personalised **definitions** (MVP) · 9 **check-in** moods (MVP) · 15-state **Emotional Food Map** (roadmap). Fixed the 😰 Stressed/Anxious emoji collision.
   - **Onboarding:** MVP = Quick Setup + the 6-step standard wizard; the 15-module Deep Dive, Moody-chat path, and "Safe Mode" are roadmap.
   - **Roadmap surfaces tagged `[ROADMAP]`** across all three design docs: pantry, allergen substitution, notifications, admin CMS, profile sharing, collections, skill-upgrade. Design-token gaps closed (allergen/border/error/muted tokens, `--elevation-*` aliases) and delivery pricing tokens removed.

## 7. Top Risks

1. **Recipe data source** — Phase 3 onward is dead without a real corpus. Resolve in Phase 0/3.
2. **LLM cost at scale** — mitigate by keeping ranking **deterministic** (Moody orchestrates tools, doesn't invent recipes/nutrition), plus caching/batching and per-tier usage caps.
3. **Voice + Wake Lock on web (esp. iOS Safari)** — uneven support; treat as capability-detected enhancements with graceful fallback; full support via the native shell later.
4. **MCP hosting & trust boundary** — Edge Function vs standalone server, and the JWT-vs-service-role allow-list inside `/mcp` (open decision in `02 §9`).
5. **Privacy** — mood data is sensitive: default private, sharing opt-in and **abstracted** (no raw diary). Build data export/delete from the start (compliance).

---

## 8. How to Start (Monday morning)

1. Confirm the **pricing** ruling (§6.1) and the **recipe data source** (§6.3) with the product owner — these gate later phases.
2. Stand up the Supabase project and run the **Phase 0 migration** = the build-spec SQL (`02 §2`) **plus** the five schema-gap fixes (§6.5).
3. Scaffold the React/TS/Tailwind app, wire `DESIGN_SYSTEM.md` tokens, and build the global layout shell (Phase 1).
4. Then proceed phase-by-phase per `03-implementation-roadmap.md`, keeping each phase to its exit criteria.

> **Note on existing planning docs:** `Docs/MOODFOOD_MASTER_PLAN.md` is a much larger strategic
> superset. This blueprint deliberately does **not** duplicate it — it distills the build-ready
> core, reconciles it with the source decks, and resolves the open decisions so engineering can
> start. Where the master plan goes deeper (e.g., the ~50-tool AI surface, skill/learning loops),
> treat it as the Phase 2/3 reference.
