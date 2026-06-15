# Moody Recipe Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Moody attach one safe searchable-catalog recipe to a chat response and open it directly while preserving the session conversation.

**Architecture:** The client supplies safety-filtered catalog candidates to the AI gateway. The gateway returns structured chat output with an optional validated recipe ID; the client independently resolves that ID against its safe catalog, renders one card on the associated assistant turn, and preserves chat/navigation state in `App`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Supabase Edge Functions

---

### Task 1: Safe Recipe-Link Contract

**Files:**
- Create: `src/moodyRecipes.ts`
- Create: `src/moodyRecipes.test.ts`
- Modify: `src/ai.ts`

- [ ] Write failing tests for valid, invalid, and unsafe recipe-ID resolution.
- [ ] Run `npm test -- src/moodyRecipes.test.ts` and confirm failure because the helper is missing.
- [ ] Implement candidate serialization and safe recipe-ID resolution.
- [ ] Change `aiChat` to return `{ message, recipeId? }` and accept catalog candidates.
- [ ] Run the focused tests.

### Task 2: Structured Gateway Selection

**Files:**
- Modify: `supabase/functions/ai-gateway/index.ts`
- Modify: `src/security.test.ts`

- [ ] Write a failing source-contract test proving chat uses JSON output and validates recipe IDs against supplied candidates.
- [ ] Run `npm test -- src/security.test.ts` and confirm the new assertion fails.
- [ ] Update the chat prompt and response parsing to return one optional catalog recipe ID.
- [ ] Run the focused security test.

### Task 3: Preserved Chat Card And Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Lift Moody turns into `App` so closing the panel or opening detail does not clear the session conversation.
- [ ] Supply the full current safe catalog to Moody and resolve returned IDs independently.
- [ ] Render a single **View recipe** card beneath the assistant response that selected it.
- [ ] Open the existing recipe detail directly and make Back restore the Moody conversation.
- [ ] Remove the unrelated always-visible top-pick card from the chat.

### Task 4: Verification

**Files:**
- No production files

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Review the final diff against the approved design.
