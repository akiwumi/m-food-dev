# Mood Categories and Recipe Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the check-in taxonomy with 12 canonical moods and rank recipes deterministically using structured recipe tags.

**Architecture:** A new `moodRules` module owns canonical mood definitions, aliases, tag inference, and weighted scoring. Existing recommendation and provider paths consume that module while retaining current safety, profile, and learned-signal behavior.

**Tech Stack:** TypeScript, React, Vitest, Supabase Edge Functions

---

### Task 1: Canonical Mood Rules And Tag Inference

**Files:**
- Create: `src/moodRules.ts`
- Create: `src/moodRules.test.ts`
- Modify: `src/data.ts`

- [x] Write failing tests for the 12 canonical moods, legacy aliases, tag flattening, conservative inference, and positive/negative weighted scoring.
- [x] Run `npm test -- src/moodRules.test.ts` and confirm failures because `moodRules.ts` does not exist.
- [x] Add `RecipeTags` and optional `Recipe.tags` to `src/data.ts`; replace the exported check-in `moods` list with the 12 canonical labels.
- [x] Implement `moodRules`, `normalizeMood`, `flattenRecipeTags`, `inferRecipeTags`, `recipeTags`, and `scoreByMood` in `src/moodRules.ts`.
- [x] Run `npm test -- src/moodRules.test.ts` and confirm all taxonomy tests pass.

### Task 2: Recommendation Ranking Integration

**Files:**
- Modify: `src/recommendation.ts`
- Modify: `src/recommendation.test.ts`
- Modify: `src/behavioral.ts`
- Modify: `src/behavioral.test.ts`

- [x] Add failing recommendation tests proving positive tags outrank negative tags and aliases still use canonical rules.
- [x] Add failing behavioral tests proving old mood/cuisine signals contribute when the corresponding canonical mood is selected.
- [x] Run `npm test -- src/recommendation.test.ts src/behavioral.test.ts` and confirm the new assertions fail.
- [x] Add `scoreByMood(recipe, mood)` to `recipeScore()` while preserving existing profile and learned-signal scoring.
- [x] Normalize mood keys when deriving and consuming mood-specific cuisine signals.
- [x] Run `npm test -- src/recommendation.test.ts src/behavioral.test.ts` and confirm all tests pass.

### Task 3: Live Provider Structured Tags

**Files:**
- Modify: `supabase/functions/recipes/provider.ts`
- Modify: `src/recipeProvider.test.ts`

- [x] Add failing provider tests proving normalized Spoonacular and TheMealDB recipes include structured tags.
- [x] Run `npm test -- src/recipeProvider.test.ts` and confirm the new assertions fail.
- [x] Add a provider-compatible deterministic tag inference helper and include tags from both normalization paths.
- [x] Run `npm test -- src/recipeProvider.test.ts` and confirm provider tests pass.

### Task 4: Full Verification

**Files:**
- Verify all modified source and test files.

- [x] Run `npm test` and fix any taxonomy compatibility regressions.
- [x] Run `npm run build` and fix all TypeScript or production-build failures.
- [x] Run `git diff --check` and fix whitespace errors.
- [x] Review the final diff to confirm deep onboarding cooking moods and unrelated user changes remain untouched.
