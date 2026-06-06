# MoodFood Focused Pilot Implementation Plan

## Summary

Build an invite-only mobile PWA for 100–250 broad English-speaking users, centered on exhausted solo cooks.

The first release proves this loop:

`magic-link signup → sub-3-minute onboarding → mood check-in → lead recommendation → preflight → cook mode → reflection → weekly insight`

Use a dual-track delivery model:

1. Build the mobile core loop.
2. Build the recipe editorial console and grow a 500+ licensed/owned verified corpus.

## Core Experience

- Use six shared moods with personalized meanings.
- Present five daily signals through a smart-default summary: mood, energy, craving, time, and meal type.
- Return one prominent lead recommendation and up to five collapsed backups.
- Explain recommendations using human-readable reasons without match percentages.
- Rerank backups using quick rejection-reason chips.
- Keep personalized, safety-filtered recipe search always visible.
- Start cook mode through a short ingredient, equipment, and servings preflight.
- Show one instruction at a time with timers, ingredient access, offline recovery, and contextual rescue.
- Auto-log completed meals and request one-tap outcome feedback.
- Surface nutrition and variety through quiet weekly reflections.

## Technical Architecture

- Build a Vite React/TypeScript/Tailwind PWA deployed through Vercel.
- Use React Query for server state, Zustand for transient UI/cook state, and IndexedDB only for active cook-session recovery.
- Use Supabase magic-link Auth, invite allow-listing, Postgres/RLS, Storage, Edge Functions, and separate local/staging/production environments.
- Implement AI/tool actions through one JWT-authenticated Supabase Edge gateway.
- Use RLS-scoped operations by default and an explicit service-role allow-list for privileged internal actions.
- Put Claude behind a thin provider adapter.
- Degrade to deterministic recommendations and templated explanations during provider outages.

## Recommendation System

- Rank only published, editorially verified recipes.
- Enforce allergens, diets, equipment, and other safety constraints before scoring.
- Never relax safety constraints.
- Store ranking weights and mood mappings as versioned database configuration.
- Record the ranking-config version used for every recommendation.
- Return fewer backups when insufficient verified safe recipes exist.
- For zero results, explain the limiting soft constraint and offer one safe relaxation.

## Data Interfaces

Create pilot-focused models for:

- Profiles, preferences, assessment answers, and personalized mood definitions.
- Recipes, ingredients, steps, images, rights metadata, editorial status, and review records.
- Mood entries, recommendation runs, ranked candidates, rejection reasons, and outcomes.
- Cooking sessions, diary entries, and source-labeled nutrition JSON snapshots.
- Ranking-config versions, invites, and pseudonymous analytics events.

Free-text mood notes and AI content are not retained unless explicitly saved.

Use metric quantities as canonical structured values, support US-unit display conversion, and preserve original recipe text for editorial review.

## Editorial Console

Build a desktop founder/editor console supporting:

- Licensed or owned recipe import.
- Structural validation and inconsistency flags.
- Ingredient, step, timing, equipment, and unit editing.
- Mood, energy, cuisine, difficulty, dietary, and safety tagging.
- Rights verification, preview, publish, retire, and revision history.

“Editorially verified” requires structured review of rights, recipe consistency, timing, safety metadata, and recommendation tags. Physically cook-test representative and flagged recipes.

## Delivery Sequence

1. Establish app foundation, Supabase environments, schema, RLS, CI, design tokens, and observability.
2. Build recipe ingestion, review, publishing, and deterministic ranking foundations.
3. Build invite auth and the sub-3-minute onboarding flow.
4. Deliver the complete mobile mood-to-recommendation vertical slice.
5. Add preflight, cook mode, active-session offline recovery, and contextual rescue.
6. Add completion reflection, diary logging, and weekly insights.
7. Add personalized safe search and backup reranking.
8. Grow and validate the corpus toward 500+ verified recipes.
9. Run accessibility, security, safety, reliability, and pilot-readiness reviews.

## Quality Gates

Block deployment on:

- Core onboarding-to-cook E2E tests.
- Exhaustive allergen and dietary exclusion tests.
- Ranking and versioned-config unit tests.
- RLS ownership and privileged-operation tests.
- Cook-session offline recovery tests.
- WCAG 2.2 AA smoke tests for core flows.
- Provider-outage fallback tests.
- Recipe publication validation tests.

Monitor errors, funnel progression, completed cooks, zero-result events, safety-filter activity, provider latency, and AI/API costs.

## Expansion

After the focused pilot:

1. Add grocery lists, dinner-week autoplan, and household profiles.
2. Enforce safety across every selected diner and optimize shared appeal.
3. Expand Moody into a broader control layer.
4. Add adaptive opt-in notifications with visible frequency controls.
5. Add billing and public launch.
6. Add imports, voice, pantry, and deeper insights incrementally.

Future billing uses a 7-day trial followed by subscription-required access. Expired users receive seven days of read-only access. After notice, inactive account data is automatically deleted at 90 days.

## Assumptions

- Quality and safety take priority over a fixed pilot date.
- The solo founder uses AI agents and managed services.
- External operating costs remain lean with explicit caps.
- Clinical mental-health and “food psychologist” claims are excluded from product copy.
- Repeated completed cooks is the primary health metric, but expansion is not contingent on a formal pilot threshold.
