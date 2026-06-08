# Full-Screen Cooking Instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reliable, detailed, full-screen cooking-step experience using the approved pale blue-white reference style.

**Architecture:** Extend the shared recipe-step contract, normalize structured provider steps in the recipes Edge Function, and optionally enrich terse instructions with guarded Moody output that falls back to provider facts. Extract reusable cook-step presentation helpers and a resilient image component from `App.tsx`, then render the full-screen instruction-led UI with existing cook progress, timer, resume, and finish behavior.

**Tech Stack:** React 19, TypeScript, Vitest, Supabase Edge Functions/Deno, CSS, Vercel CSP

---

## File Structure

- Create `src/cooking.ts`: pure step-title, display-detail, image-priority, and timer-format helpers.
- Create `src/cooking.test.ts`: unit coverage for cook-step fallbacks and formatting.
- Create `src/RecipeImage.tsx`: reusable resilient image component.
- Create `src/RecipeImage.test.tsx`: source-priority tests using server rendering.
- Modify `src/data.ts`: define and use the expanded `RecipeStep` contract.
- Modify `src/App.tsx`: replace the current cook-mode markup with the full-screen instruction-led layout.
- Modify `src/styles.css`: implement the approved reference-led cooking-page theme.
- Modify `supabase/functions/recipes/provider.ts`: map TheMealDB steps into the expanded contract.
- Modify `supabase/functions/recipes/index.ts`: map Spoonacular step metadata and add guarded Moody enrichment.
- Modify `src/recipeProvider.test.ts`: verify provider normalization and factual fallback.
- Modify `vercel.json`: allow TheMealDB recipe images.

### Task 1: Shared Cooking-Step Contract and Helpers

**Files:**
- Create: `src/cooking.ts`
- Create: `src/cooking.test.ts`
- Modify: `src/data.ts:1-16`

- [ ] **Step 1: Write failing helper tests**

```ts
import { describe, expect, it } from "vitest";
import { displayStepDetail, displayStepTitle, formatTimer, stepImageSources } from "./cooking";

describe("cooking step display helpers", () => {
  it("prefers structured step content and preserves legacy text", () => {
    expect(displayStepTitle({ text: "Add peas.", title: "Build the sauce" })).toBe("Build the sauce");
    expect(displayStepTitle({ text: "Add peas and simmer until glossy." })).toBe("Add peas and simmer until glossy.");
    expect(displayStepDetail({ text: "Add peas.", detail: "Add peas and simmer gently." })).toBe("Add peas and simmer gently.");
    expect(displayStepDetail({ text: "Add peas." })).toBe("Add peas.");
  });

  it("orders verified step image before the main recipe image", () => {
    expect(stepImageSources("step.jpg", "recipe.jpg")).toEqual(["step.jpg", "recipe.jpg"]);
    expect(stepImageSources("", "recipe.jpg")).toEqual(["recipe.jpg"]);
    expect(stepImageSources("same.jpg", "same.jpg")).toEqual(["same.jpg"]);
  });

  it("formats verified timers", () => {
    expect(formatTimer(185)).toBe("3:05");
    expect(formatTimer(0)).toBe("0:00");
  });
});
```

- [ ] **Step 2: Run the helper test and verify RED**

Run: `npm test -- src/cooking.test.ts`

Expected: FAIL because `src/cooking.ts` and the expanded `RecipeStep` type do not exist.

- [ ] **Step 3: Expand the recipe-step type**

In `src/data.ts`, add and use:

```ts
export type RecipeStep = {
  text: string;
  title?: string;
  detail?: string;
  cue?: string;
  image?: string;
  timer?: number;
  active?: string[];
  equipment?: string[];
};

export type Recipe = {
  // existing fields unchanged
  steps: RecipeStep[];
};
```

- [ ] **Step 4: Implement minimal pure helpers**

Create `src/cooking.ts`:

```ts
import type { RecipeStep } from "./data";

export function displayStepTitle(step: RecipeStep): string {
  return step.title?.trim() || step.text.trim();
}

export function displayStepDetail(step: RecipeStep): string {
  return step.detail?.trim() || step.text.trim();
}

export function stepImageSources(stepImage?: string, recipeImage?: string): string[] {
  return [...new Set([stepImage, recipeImage].map(value => value?.trim()).filter((value): value is string => !!value))];
}

export function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
```

- [ ] **Step 5: Run tests and build**

Run: `npm test -- src/cooking.test.ts && npm run build`

Expected: helper tests PASS and production build PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data.ts src/cooking.ts src/cooking.test.ts
git commit -m "Add structured cooking step contract"
```

### Task 2: Resilient Recipe Images

**Files:**
- Create: `src/RecipeImage.tsx`
- Create: `src/RecipeImage.test.tsx`
- Modify: `vercel.json:6`

- [ ] **Step 1: Write failing resilient-image tests**

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecipeImage } from "./RecipeImage";

describe("RecipeImage", () => {
  it("renders the first available source", () => {
    const html = renderToStaticMarkup(<RecipeImage sources={["step.jpg", "recipe.jpg"]} alt="Sauce" />);
    expect(html).toContain('src="step.jpg"');
  });

  it("renders a polished empty state when no source exists", () => {
    const html = renderToStaticMarkup(<RecipeImage sources={[]} alt="Sauce" />);
    expect(html).toContain("Image unavailable");
  });
});
```

- [ ] **Step 2: Run the image test and verify RED**

Run: `npm test -- src/RecipeImage.test.tsx`

Expected: FAIL because `RecipeImage` does not exist.

- [ ] **Step 3: Implement the resilient image component**

Create `src/RecipeImage.tsx`:

```tsx
import { useState } from "react";

export function RecipeImage({ sources, alt, className = "" }: { sources: string[]; alt: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const source = sources[index];
  if (!source) return <div className={`${className} recipe-image-empty`} role="img" aria-label={`${alt}. Image unavailable`}>Image unavailable</div>;
  return <img className={className} src={source} alt={alt} onError={() => setIndex(value => value + 1)} />;
}
```

- [ ] **Step 4: Allow TheMealDB image host**

In `vercel.json`, add `https://www.themealdb.com` to the `img-src` directive. Keep all other CSP directives unchanged.

- [ ] **Step 5: Run tests and build**

Run: `npm test -- src/RecipeImage.test.tsx && npm run build`

Expected: image tests PASS and production build PASS.

- [ ] **Step 6: Commit**

```bash
git add src/RecipeImage.tsx src/RecipeImage.test.tsx vercel.json
git commit -m "Add resilient recipe image fallback"
```

### Task 3: Structured Provider Steps

**Files:**
- Modify: `src/recipeProvider.test.ts`
- Modify: `supabase/functions/recipes/provider.ts`
- Modify: `supabase/functions/recipes/index.ts:170-196`

- [ ] **Step 1: Update provider tests to require structured fallback steps**

Add assertions to `src/recipeProvider.test.ts`:

```ts
expect(recipes[0].steps[0]).toEqual({
  text: "Heat the oven.",
  title: "Heat the oven.",
  detail: "Heat the oven.",
  image: "https://example.com/meal.jpg",
});
```

Add a Spoonacular-normalization test by exporting `normalizeSpoonacularRecipe` from `supabase/functions/recipes/index.ts` or, preferably, extracting it into `supabase/functions/recipes/provider.ts`:

```ts
expect(recipe.steps[0]).toMatchObject({
  text: "Fry the garlic.",
  title: "Fry the garlic.",
  detail: "Fry the garlic.",
  image: "https://img.spoonacular.com/step.jpg",
  active: ["garlic"],
  equipment: ["frying pan"],
});
```

- [ ] **Step 2: Run provider tests and verify RED**

Run: `npm test -- src/recipeProvider.test.ts`

Expected: FAIL because normalized steps only contain `text`.

- [ ] **Step 3: Normalize TheMealDB steps**

In `supabase/functions/recipes/provider.ts`, map each split instruction into:

```ts
{
  text,
  title: text,
  detail: text,
  image: String(meal.strMealThumb ?? ""),
}
```

- [ ] **Step 4: Normalize Spoonacular step metadata**

Move Spoonacular normalization into `supabase/functions/recipes/provider.ts` as an exported pure function. For each analyzed step, map:

```ts
{
  text: step.step,
  title: step.step,
  detail: step.step,
  image: step.image ? `https://img.spoonacular.com/recipes/${step.image}` : "",
  active: (step.ingredients ?? []).map((item: { name?: string }) => item.name).filter(Boolean),
  equipment: (step.equipment ?? []).map((item: { name?: string }) => item.name).filter(Boolean),
}
```

Keep the existing recipe-level image and source URL mapping unchanged.

- [ ] **Step 5: Run provider tests**

Run: `npm test -- src/recipeProvider.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/recipeProvider.test.ts supabase/functions/recipes/provider.ts supabase/functions/recipes/index.ts
git commit -m "Normalize structured recipe steps"
```

### Task 4: Guarded Moody Instruction Enrichment

**Files:**
- Create: `supabase/functions/recipes/enrich.ts`
- Create: `src/recipeEnrichment.test.ts`
- Modify: `supabase/functions/recipes/index.ts`

- [ ] **Step 1: Write failing validation tests**

Create `src/recipeEnrichment.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { acceptEnrichedSteps } from "../supabase/functions/recipes/enrich";

const original = [{ text: "Cook for 5 minutes.", title: "Cook for 5 minutes.", detail: "Cook for 5 minutes.", active: ["peas"] }];

describe("acceptEnrichedSteps", () => {
  it("accepts clearer wording that preserves verified facts", () => {
    expect(acceptEnrichedSteps(original, [{ title: "Cook the peas", detail: "Cook the peas for 5 minutes.", cue: "They should look glossy." }])?.[0].detail)
      .toBe("Cook the peas for 5 minutes.");
  });

  it("rejects invented numeric facts and falls back to originals", () => {
    expect(acceptEnrichedSteps(original, [{ title: "Cook the peas", detail: "Cook at 200°C for 10 minutes." }])).toBeNull();
  });
});
```

- [ ] **Step 2: Run enrichment tests and verify RED**

Run: `npm test -- src/recipeEnrichment.test.ts`

Expected: FAIL because `acceptEnrichedSteps` does not exist.

- [ ] **Step 3: Implement strict enrichment validation**

Create `supabase/functions/recipes/enrich.ts` with:

```ts
const numbers = (text: string) => [...text.matchAll(/\d+(?:\.\d+)?/g)].map(match => match[0]);

export function acceptEnrichedSteps(original: any[], enriched: any[]) {
  if (!Array.isArray(enriched) || enriched.length !== original.length) return null;
  const accepted = enriched.map((candidate, index) => {
    if (!candidate || typeof candidate.title !== "string" || typeof candidate.detail !== "string") return null;
    const verified = numbers(`${original[index].text} ${original[index].detail ?? ""}`);
    const proposed = numbers(`${candidate.title} ${candidate.detail} ${candidate.cue ?? ""}`);
    if (proposed.some(value => !verified.includes(value))) return null;
    return { ...original[index], title: candidate.title.trim(), detail: candidate.detail.trim(), cue: typeof candidate.cue === "string" ? candidate.cue.trim() : undefined };
  });
  return accepted.every(Boolean) ? accepted : null;
}
```

- [ ] **Step 4: Add optional OpenAI enrichment**

In `enrich.ts`, add `enrichSteps(steps, recipeTitle, fetcher = fetch)`. It must:

- Return original steps immediately when `OPENAI_API_KEY` is absent.
- Ask for JSON containing only `title`, `detail`, and optional `cue`.
- Explicitly forbid new numbers, ingredients, quantities, temperatures, timings, and safety claims.
- Pass model output through `acceptEnrichedSteps`.
- Return originals on non-200 responses, invalid JSON, validation failure, or exceptions.

Call `enrichSteps` after provider normalization and safety filtering, before returning recipes from both Spoonacular and TheMealDB paths.

- [ ] **Step 5: Run enrichment and full tests**

Run: `npm test -- src/recipeEnrichment.test.ts && npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/recipes/enrich.ts supabase/functions/recipes/index.ts src/recipeEnrichment.test.ts
git commit -m "Add guarded cooking instruction enrichment"
```

### Task 5: Full-Screen Reference-Led Cook Screen

**Files:**
- Modify: `src/App.tsx:1102-1116`
- Modify: `src/styles.css:23`

- [ ] **Step 1: Add helper-level UI-state tests**

Extend `src/cooking.test.ts`:

```ts
it("keeps optional sections absent when provider data is missing", () => {
  const step = { text: "Serve." };
  expect(step.active).toBeUndefined();
  expect(step.equipment).toBeUndefined();
  expect(step.timer).toBeUndefined();
  expect(step.cue).toBeUndefined();
});
```

- [ ] **Step 2: Run the focused test**

Run: `npm test -- src/cooking.test.ts`

Expected: PASS, documenting compatibility before the UI rewrite.

- [ ] **Step 3: Replace CookScreen markup**

In `src/App.tsx`:

- Import `RecipeImage`.
- Import `displayStepDetail`, `displayStepTitle`, `formatTimer`, and `stepImageSources`.
- Preserve saved step, timer countdown, finish overlay, and logging behavior.
- Add an explicit zero-step state with original-recipe link.
- Replace the current dark layout with:

```tsx
<div className="cook">
  <header className="cook-header">
    <button className="cook-circle" onClick={exit} aria-label="Close cook mode"><ArrowLeft /></button>
    <b>Step {step + 1} of {recipe.steps.length}</b>
    <button className="cook-circle" aria-label="More cooking options"><MoreVertical /></button>
  </header>
  <div className="cook-progress"><span style={{ width: `${((step + 1) / recipe.steps.length) * 100}%` }} /></div>
  <RecipeImage className="cook-image" sources={stepImageSources(current.image, recipe.image)} alt={`${recipe.title}, step ${step + 1}`} />
  <section className="cook-instruction-card">
    <small>STEP {step + 1}</small>
    <h1>{displayStepTitle(current)}</h1>
    <p>{displayStepDetail(current)}</p>
    {current.cue && <div className="cook-cue"><b>Look for:</b> {current.cue}</div>}
    {/* active ingredients, equipment, timer, and navigation */}
  </section>
</div>
```

Use blue for progress, timer play, and Next. Use white circular controls, black Plus Jakarta Sans typography, pale blue-white background, and translucent white instruction panels.

- [ ] **Step 4: Replace cook-mode CSS**

Replace the current `.cook`, `.cook-progress`, `.cook h1`, `.cook>img`, `.active-items`, `.timer`, `.cook-controls`, and `.awake` rules with reference-led styles:

- `background: linear-gradient(160deg, var(--bg1), var(--bg2))`
- mobile-first `min-height: 100dvh`
- image stage with `border-radius: 30px`
- translucent `.cook-instruction-card` with `backdrop-filter: blur(18px)`
- geometric sans-serif headings using `"Plus Jakarta Sans"`
- circular `.cook-circle` controls
- blue `.cook-timer` and `.cook-next`
- sticky/reachable navigation inside the card

Keep finish-overlay behavior visually compatible with the new screen.

- [ ] **Step 5: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests PASS and production build PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/styles.css src/cooking.test.ts
git commit -m "Build full-screen cooking instruction page"
```

### Task 6: Browser Verification and Live Deployment

**Files:**
- Modify only files required by findings from verification.

- [ ] **Step 1: Start the local app**

Run: `npm run dev`

Expected: Vite reports a local URL without errors.

- [ ] **Step 2: Verify mobile cook mode in Browser**

Open the local app at a mobile viewport. Verify:

- The page matches the approved pale blue-white reference direction.
- Step title, detailed method, cue, image, chips, and timer fit without overlapping.
- Previous and Next remain reachable.
- Broken step image falls back to main image.
- Broken main image shows the styled empty state.
- Final step opens the existing finish overlay.

- [ ] **Step 3: Verify desktop cook mode in Browser**

At desktop width, verify the cooking screen remains centered, readable, and does not inherit desktop navigation.

- [ ] **Step 4: Deploy recipes Edge Function**

Run:

```bash
supabase functions deploy recipes --project-ref pjfoiamcflimdreoxvpg --workdir "/Users/eugene/WebDev Archive/MoodFood (dev)"
```

Expected: deployment succeeds and the `recipes` function becomes ACTIVE at a new version.

- [ ] **Step 5: Verify live function and production build**

Run: `npm test && npm run build`

Then inspect Supabase Edge Function logs after one authenticated recipe request. Expected: `POST /functions/v1/recipes` returns `200`, with usable structured steps from Spoonacular or TheMealDB fallback.

- [ ] **Step 6: Commit verification fixes**

```bash
git add src supabase/functions/recipes vercel.json
git commit -m "Verify cooking instructions end to end"
```
