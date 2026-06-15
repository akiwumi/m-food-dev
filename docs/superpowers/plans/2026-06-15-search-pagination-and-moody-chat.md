# Search Pagination and Moody Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver AI-free explicit search with five-result appendable batches and reliable Moody chat entry points.

**Architecture:** Add focused pure helpers for selecting and appending unique
recipe batches. Keep provider offset state in `App`, combine live and bundled
candidates deterministically, and update UI language/navigation without changing
the optional AI-curated home feed.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Supabase Edge Functions

---

### Task 1: Recipe Batch Helpers

**Files:**
- Create: `src/resultBatches.ts`
- Create: `src/resultBatches.test.ts`

- [ ] Write failing tests proving batches contain at most five unique recipes and
  appended batches preserve existing results.
- [ ] Run `npm test -- src/resultBatches.test.ts` and confirm the missing helper
  failure.
- [ ] Implement `takeUniqueBatch` and `appendUniqueRecipes`.
- [ ] Run `npm test -- src/resultBatches.test.ts` and confirm it passes.

### Task 2: Explicit Search Pagination

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/searchResults.ts`
- Modify: `src/recipes.test.ts`

- [ ] Write failing tests proving offline finalization can expose a candidate pool
  larger than one display batch.
- [ ] Change explicit search to retain prior results on load-more, append five
  unique recipes, and fall back to unseen bundled matches.
- [ ] Make provider offsets advance by the provider page size while display
  batches remain five.
- [ ] Report explicit search telemetry with `aiAttempted: false`.
- [ ] Run focused recipe and batch tests.

### Task 3: Search and Moody Product Surface

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/ai.ts`

- [ ] Rename explicit-search navigation and headings to "Search recipes".
- [ ] Wire the desktop Ask Moody button to open the existing Moody panel.
- [ ] Improve Moody chat error classification for signed-out and unavailable
  states.
- [ ] Keep optional home-feed AI curation unchanged.

### Task 4: Verification

**Files:**
- No production files

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start the app and verify search renders five results, "Show 5 more options"
  appends results, and desktop Ask Moody opens chat.
- [ ] Confirm no relevant browser console errors.
