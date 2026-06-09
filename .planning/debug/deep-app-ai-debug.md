---
status: resolved
trigger: "do a deep debug of the app and make sure that it is working right through. there have been too many bugs and the ai not doing what it is supposed to"
created: 2026-06-09
updated: 2026-06-09
---

## Symptoms

- Expected behavior: Every critical app journey works end to end. AI search and recommendations respond promptly, honor the saved food profile and explicit filters, return unique safe recipes, and provide complete cooking details.
- Actual behavior: User reports too many bugs and AI behavior that is unreliable or incorrect.
- Error messages: None supplied.
- Timeline: Recurring issues across recent versions.
- Reproduction: Exercise onboarding/login, home recommendations, AI search, results navigation, recipe details, cooking, profile learning, filters, and safety rules.

## Current Focus

- hypothesis: Confirmed integration defects across safety merging, server filtering, AI ranking, pagination, network responsiveness, navigation, and auth restoration.
- test: Regression suite, production build, CSP check, and repository verify command.
- expecting: All regressions green and production verification clean.
- next_action: resolved
- reasoning_checkpoint: Root causes fixed at client/server data-flow boundaries rather than UI symptoms.
- tdd_checkpoint: Six initial regressions observed red before fixes; final suite green.

## Evidence

- timestamp: 2026-06-09T02:31:00+02:00
  observed: Baseline automated suite passes (36 tests) and production build succeeds, with a 577.51 kB JavaScript chunk warning.
  implication: Reported failures are integration and uncovered behavior gaps, not current baseline test/build failures.
- timestamp: 2026-06-09T02:35:00+02:00
  observed: AI curation pushes cloned ranked recipes, then uses reference equality to append originals, duplicating every AI-ranked recipe.
  implication: Live home recommendations can contain duplicates despite provider-level deduplication.
- timestamp: 2026-06-09T02:35:00+02:00
  observed: profileForDiners maps conflicting non-flexible diets to Everything.
  implication: Selecting diners with different diets relaxes hard diet safety.
- timestamp: 2026-06-09T02:35:00+02:00
  observed: Client safety compares allergen labels case-sensitively and does not inspect ingredients.
  implication: Local/fallback recipes can violate saved allergy rules.
- timestamp: 2026-06-09T02:35:00+02:00
  observed: Search pagination overwrites searchResults and provider normalization accepts placeholder-only cooking steps.
  implication: More alternatives loses previous results and recipes without complete methods can reach detail/cook screens.
- timestamp: 2026-06-09T02:42:00+02:00
  observed: Browser AI/recipe requests, edge identity checks, AI gateway calls, Spoonacular calls, and MealDB calls lacked bounded timeouts.
  implication: A stalled upstream can leave AI and recommendation UI waiting indefinitely.
- timestamp: 2026-06-09T02:42:00+02:00
  observed: Detail back-navigation is hard-coded to Results, and successful login forces entry into the app before remote completed-profile restoration resolves.
  implication: Recipes opened from Home/Saved/Community return to the wrong screen; incomplete accounts can bypass onboarding.
- timestamp: 2026-06-09T03:51:00+02:00
  observed: Server now combines saved and explicit diets into one hard profile, overfetches 32 provider candidates, applies hard safety/quality filters, and returns at most eight unique verified recipes.
  implication: Explicit filters cannot weaken saved diets, and eight-at-a-time pages are less likely to underfill after safety filtering.
- timestamp: 2026-06-09T03:51:00+02:00
  observed: npm run verify passed with 42 tests, zero high-severity audit findings, and a successful production build; CSP check also passed.
  implication: Fixes are covered and production build configuration is consistent.

## Eliminated

## Resolution

- root_cause: Hard constraints were inconsistently merged/enforced across client and server, AI ranking used reference equality that duplicated cloned recipes, provider quality filtering admitted incomplete methods, and unbounded network/auth/navigation state caused unreliable journeys.
- fix: Enforced case-insensitive ingredient/allergen safety and intersected household/saved/explicit diets server-side; overfetched provider candidates then returned exactly one page of up to eight verified recipes; deduplicated AI ranking; rejected incomplete instructions; added request timeouts; restored origin-aware detail navigation and incomplete-account onboarding; split production bundles.
- verification: npm run verify passed (0 audit vulnerabilities, 42/42 tests, production build); npm run csp:check passed; production app chunk reduced from 577.51 kB to 175.64 kB.
- files_changed: src/App.tsx, src/ai.ts, src/recipeProvider.test.ts, src/recipes.test.ts, src/recipes.ts, src/recommendation.test.ts, src/recommendation.ts, src/searchResults.ts, supabase/functions/ai-gateway/index.ts, supabase/functions/recipes/index.ts, supabase/functions/recipes/provider.ts, vite.config.ts
