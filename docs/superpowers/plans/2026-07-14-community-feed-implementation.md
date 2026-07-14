# Community Feed And Post Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair iPhone community publishing and deliver a compact personalized feed, full-screen composer, post detail, and dismissible trending-recipe rail.

**Architecture:** `CommunityScreen` remains the route-level coordinator and switches between feed, composer, and post detail without changing the app's global page enum. Supabase mutations return typed results instead of booleans; pure ranking code produces safe profile-relevant trending recipes; focused components own feed rows, carousel, composer, and detail behavior.

**Tech Stack:** React 19, TypeScript 6, Vite, Vitest, Playwright WebKit, Supabase Postgres/RLS/Storage, Capacitor iOS, Lucide icons, existing MoodFood CSS tokens.

---

## File Map

**Create**

- `src/communityMutation.ts`: typed community mutation outcomes and Supabase error classification.
- `src/communityMutation.test.ts`: deterministic mutation-error classification tests.
- `src/communityRanking.ts`: pure popularity, safety, relevance, and dismissal ranking.
- `src/communityRanking.test.ts`: ranking and filtering tests.
- `src/screens/community/CommunityFeed.tsx`: feed chrome, trending rail, rows, empty/loading states, and post FAB.
- `src/screens/community/TrendingRecipes.tsx`: personalized horizontal carousel and dismissal confirmation.
- `src/screens/community/PostRow.tsx`: compact feed/local-feed post presentation.
- `src/screens/community/PostComposer.tsx`: keyboard-safe full-screen post editor.
- `src/screens/community/PostDetail.tsx`: immersive post detail, reactions, comments, and reply editor.
- `supabase/migrations/024_community_publish_contract.sql`: idempotent post columns, table grants, bucket, and storage policies required by the client contract.

**Modify**

- `src/community.ts`: return typed mutation results and retain raw Supabase errors at the data boundary.
- `src/hooks/useCommunity.ts`: optimistic mutation rollback, mutation errors, and refresh behavior.
- `src/screens/CommunityScreen.tsx`: reduce to route coordination and local/remote adapters.
- `src/App.tsx`: pass safe catalog/profile identity and suppress global bottom navigation during community composer/detail.
- `src/screens/SettingsScreen.tsx`: reset hidden community dishes.
- `src/devTestState.ts`: deterministic community feed, publish-success, and publish-failure states.
- `src/styles.css`: compact feed, carousel, full-screen composer/detail, keyboard and safe-area rules.
- `e2e/smoke.e2e.ts`: iPhone keyboard, publishing, retry, carousel, detail, and scroll-restoration coverage.
- `src/security.test.ts`: assert the migration preserves RLS and owner-scoped storage writes.

---

### Task 1: Expose And Repair Community Publishing Failures

**Files:**
- Create: `src/communityMutation.ts`
- Create: `src/communityMutation.test.ts`
- Create: `supabase/migrations/024_community_publish_contract.sql`
- Modify: `src/community.ts`
- Modify: `src/hooks/useCommunity.ts`
- Modify: `src/security.test.ts`

- [ ] **Step 1: Write failing mutation-classification tests**

```ts
import { describe, expect, test } from "vitest";
import { classifyCommunityError } from "./communityMutation";

describe("classifyCommunityError", () => {
  test("identifies an expired session", () => {
    expect(classifyCommunityError({ message: "JWT expired", code: "PGRST301" })).toEqual({
      ok: false,
      code: "auth",
      message: "Your session expired. Sign in again, then retry.",
    });
  });

  test("identifies a missing community migration", () => {
    expect(classifyCommunityError({ message: "column community_posts.recipe_ref does not exist", code: "42703" })).toEqual({
      ok: false,
      code: "schema",
      message: "Community needs a database update before this can be posted.",
    });
  });

  test("identifies row-level security rejection", () => {
    expect(classifyCommunityError({ message: "new row violates row-level security policy", code: "42501" })).toEqual({
      ok: false,
      code: "permission",
      message: "This account cannot publish that post. Refresh your session and retry.",
    });
  });

  test("identifies offline failures", () => {
    expect(classifyCommunityError(new TypeError("Load failed"))).toEqual({
      ok: false,
      code: "offline",
      message: "No connection. Your draft is safe; retry when you're online.",
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/communityMutation.test.ts`

Expected: FAIL because `communityMutation.ts` does not exist.

- [ ] **Step 3: Implement the typed result contract**

```ts
export type CommunityErrorCode = "auth" | "schema" | "permission" | "upload" | "offline" | "unknown";
export type CommunityMutationResult =
  | { ok: true }
  | { ok: false; code: CommunityErrorCode; message: string };

type ErrorLike = { message?: unknown; code?: unknown };

export function classifyCommunityError(error: unknown): CommunityMutationResult {
  const value = (error && typeof error === "object" ? error : {}) as ErrorLike;
  const message = String(value.message ?? error ?? "").toLowerCase();
  const code = String(value.code ?? "");
  if (code === "PGRST301" || message.includes("jwt") || message.includes("session"))
    return { ok: false, code: "auth", message: "Your session expired. Sign in again, then retry." };
  if (code === "42703" || code === "42P01" || message.includes("does not exist"))
    return { ok: false, code: "schema", message: "Community needs a database update before this can be posted." };
  if (code === "42501" || message.includes("row-level security") || message.includes("permission"))
    return { ok: false, code: "permission", message: "This account cannot publish that post. Refresh your session and retry." };
  if (error instanceof TypeError || message.includes("load failed") || message.includes("network"))
    return { ok: false, code: "offline", message: "No connection. Your draft is safe; retry when you're online." };
  return { ok: false, code: "unknown", message: "The post was not shared. Your draft is safe; try again." };
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- src/communityMutation.test.ts`

Expected: 4 tests pass.

- [ ] **Step 5: Capture the live failure before changing Supabase**

Run the app with the configured `pjfoiamcflimdreoxvpg` project, sign into the demo account, submit a text-only post, and inspect the returned `PostgrestError` in the browser network response. Record its `code` and `message` in the commit body; do not log tokens, passwords, or request headers.

Expected current result: publish returns a non-success Supabase response and the draft remains visible.

- [ ] **Step 6: Change mutations from booleans to typed results**

Update `createPost`, `addComment`, and `setPostReaction` to return `Promise<CommunityMutationResult>`. Preserve the original error object only inside the data module and return `classifyCommunityError(error)` to callers. Treat an image request as `upload` when an image was supplied but `uploadPostImage` did not return a path.

```ts
const { error } = await supabase.from("community_posts").insert(payload);
return error ? classifyCommunityError(error) : { ok: true };
```

In `useCommunity`, snapshot the previous feed before optimistic reaction/comment changes and restore it when the mutation result is not successful.

- [ ] **Step 7: Add the idempotent database contract migration**

```sql
alter table public.community_posts
  add column if not exists recipe_ref text,
  add column if not exists recipe_title text;

grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert, update, delete on public.post_likes to authenticated;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "post images public read" on storage.objects;
create policy "post images public read" on storage.objects
for select using (bucket_id = 'post-images');

drop policy if exists "post images owner write" on storage.objects;
create policy "post images owner write" on storage.objects
for insert to authenticated
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
```

Keep the existing table RLS policies enabled; grants permit operations while RLS continues to restrict rows.

- [ ] **Step 8: Extend security assertions and run tests**

Add assertions that migration 024 grants only `authenticated`, retains owner-folder storage checks, and does not disable RLS.

Run: `npm test -- src/communityMutation.test.ts src/security.test.ts`

Expected: all mutation and security tests pass.

- [ ] **Step 9: Apply the migration and rerun the live probe**

Apply `024_community_publish_contract.sql` to project `pjfoiamcflimdreoxvpg`, then submit the same text-only post.

Expected: insert succeeds, feed refresh includes the new post, and no generic retry message appears.

- [ ] **Step 10: Commit**

```bash
git add src/communityMutation.ts src/communityMutation.test.ts src/community.ts src/hooks/useCommunity.ts src/security.test.ts supabase/migrations/024_community_publish_contract.sql
git commit -m "fix(community): expose and repair publish failures"
```

---

### Task 2: Build Personalized Trending Ranking

**Files:**
- Create: `src/communityRanking.ts`
- Create: `src/communityRanking.test.ts`

- [ ] **Step 1: Write failing ranking tests**

Cover five isolated behaviors:

```ts
import { defaultProfile, type Profile } from "./store";
import type { FeedPost } from "./community";
import type { Recipe } from "./data";

const NOW = Date.parse("2026-07-14T12:00:00Z");
const profile = (patch: Partial<Profile> = {}): Profile => ({ ...defaultProfile, ...patch });
const makeRecipe = (id: string, patch: Partial<Recipe> = {}): Recipe => ({
  id, title: id, image: `/images/${id}.jpg`, time: 30, difficulty: "Easy", calories: 500,
  moods: ["Comfort"], reason: "Community favorite", ingredients: ["tomatoes", "pasta"],
  steps: [{ text: "Cook" }], cuisine: "Italian", diets: ["Vegetarian"], allergens: [],
  equipment: ["Stovetop"], status: "published", ...patch,
});
const pasta = makeRecipe("pasta");
const soup = makeRecipe("soup", { cuisine: "British", moods: ["Tired"] });
const peanutRecipe = makeRecipe("peanut-noodles", { allergens: ["peanuts"] });
const medComfort = makeRecipe("med-comfort", { cuisine: "Mediterranean", moods: ["Comfort"] });
const unrelated = makeRecipe("unrelated", { cuisine: "Japanese", moods: ["Creative"] });
const popularPastaPost: FeedPost = {
  id: "post-1", authorId: "member-1", authorName: "Sam", authorAvatar: "", body: "Loved this",
  image: pasta.image, recipeRef: pasta.id, recipeTitle: pasta.title, visibility: "public",
  createdAt: "2026-07-14T10:00:00Z", likeCount: 8, likedByMe: false, commentCount: 3,
  reactionCounts: { like: 4, love: 3, applaud: 1 },
};
const catalog = [pasta, soup, medComfort, unrelated, ...Array.from({ length: 8 }, (_, index) => makeRecipe(`extra-${index}`))];
const feed = [popularPastaPost];

test("excludes recipes that contain a profile allergen", () => {
  expect(rankCommunityRecipes([peanutRecipe], [], profile({ allergies: ["peanuts"] }), [], NOW)).toEqual([]);
});

test("ranks recent engaged community recipes above catalogue fallback", () => {
  const result = rankCommunityRecipes([pasta, soup], [popularPastaPost], profile({ cuisines: ["Italian"] }), [], NOW);
  expect(result[0].recipe.id).toBe(pasta.id);
  expect(result[0].source).toBe("community");
});

test("uses food-profile cuisines and cooking moods as relevance signals", () => {
  const result = rankCommunityRecipes([medComfort, unrelated], [], profile({ cuisines: ["Mediterranean"], cookingMoods: ["Comfort"] }), [], NOW);
  expect(result[0].recipe.id).toBe(medComfort.id);
});

test("removes dismissed recipe ids", () => {
  expect(rankCommunityRecipes([pasta], [], profile(), [pasta.id], NOW)).toEqual([]);
});

test("returns at most ten recipes in deterministic order", () => {
  const first = rankCommunityRecipes(catalog, feed, profile(), [], NOW).map(item => item.recipe.id);
  const second = rankCommunityRecipes(catalog, feed, profile(), [], NOW).map(item => item.recipe.id);
  expect(first).toEqual(second);
  expect(first).toHaveLength(10);
});
```

- [ ] **Step 2: Run the ranking test and verify RED**

Run: `npm test -- src/communityRanking.test.ts`

Expected: FAIL because the ranking module does not exist.

- [ ] **Step 3: Implement deterministic safety and scoring**

Export:

```ts
export type TrendingRecipe = { recipe: Recipe; score: number; source: "community" | "catalog"; postCount: number };

export function rankCommunityRecipes(
  catalog: Recipe[],
  posts: FeedPost[],
  profile: Profile,
  dismissedIds: string[],
  now: number,
): TrendingRecipe[];
```

Use these fixed weights:

- Community post occurrence: `+24` each, capped at three posts.
- Like: `+2`, Love: `+3`, Applaud: `+3`, comment: `+4`.
- Recency: `+24 * max(0, 1 - ageDays / 14)`.
- Cuisine match: `+18`.
- Diet match: `+14`.
- Cooking mood/tag match: `+8` each, capped at three.
- Preferred protein/vegetable/comfort-food ingredient match: `+5` each, capped at four.
- Time within the user's weeknight band: `+8`.
- Community source baseline: `+10`; catalogue fallback baseline: `0`.

Reject dismissed IDs, unpublished recipes, explicit allergen intersections, diet incompatibilities, religious exclusions, and disliked ingredient matches. Sort by score descending then recipe ID ascending; return ten.

- [ ] **Step 4: Run ranking tests and verify GREEN**

Run: `npm test -- src/communityRanking.test.ts`

Expected: all ranking tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/communityRanking.ts src/communityRanking.test.ts
git commit -m "feat(community): rank trending dishes for each profile"
```

---

### Task 3: Build The Compact Feed And Trending Rail

**Files:**
- Create: `src/screens/community/CommunityFeed.tsx`
- Create: `src/screens/community/TrendingRecipes.tsx`
- Create: `src/screens/community/PostRow.tsx`
- Modify: `src/screens/CommunityScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/devTestState.ts`
- Modify: `e2e/smoke.e2e.ts`

- [ ] **Step 1: Add a failing feed E2E test**

Add `community-feed` to `DevTestState`. In the App test-state effect, set `entry` to `app`, select the Community page, apply a Mediterranean/Comfort profile, and seed three local `SocialPost` records whose recipe IDs exist in the bundled catalogue. The WebKit test must assert:

```ts
await page.goto("/?testState=community-feed");
await expect(page.getByRole("heading", { name: "Community" })).toBeVisible();
await expect(page.getByRole("heading", { name: "Trending for you" })).toBeVisible();
await expect(page.locator(".community-feed-row")).toHaveCount(3);
await expect(page.getByRole("button", { name: /Create post/i })).toBeInViewport();
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "compact community feed"`

Expected: FAIL because the test state and compact feed do not exist.

- [ ] **Step 3: Implement the feed components**

`CommunityFeed` receives already-normalized posts and callbacks. `PostRow` renders a 104px square image when present, avatar/name/time, two-line body truncation, linked-recipe title, and direct reaction/comment totals. All row content except direct action controls opens detail.

`TrendingRecipes` renders horizontal snap scrolling with stable `144px` item widths, recipe image/title, an open action, and a 44px dismiss button labeled `Not interested in {title}`. Confirmation is an inline action sheet, not `window.confirm`.

- [ ] **Step 4: Add compact mobile CSS**

Use unframed white bands and `1px` line dividers. Keep buttons at 44px minimum, the FAB above the bottom safe area, horizontal rail overscroll contained, and long recipe/post titles clamped without changing row height.

- [ ] **Step 5: Run feed E2E and unit tests**

Run: `npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "compact community feed" && npm test -- src/communityRanking.test.ts`

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/screens/community/CommunityFeed.tsx src/screens/community/TrendingRecipes.tsx src/screens/community/PostRow.tsx src/screens/CommunityScreen.tsx src/App.tsx src/styles.css src/devTestState.ts e2e/smoke.e2e.ts
git commit -m "feat(community): add compact personalized feed"
```

---

### Task 4: Replace The Inline Composer With A Keyboard-Safe Screen

**Files:**
- Create: `src/screens/community/PostComposer.tsx`
- Modify: `src/screens/CommunityScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/devTestState.ts`
- Modify: `e2e/smoke.e2e.ts`

- [ ] **Step 1: Replace the existing shallow focus test with failing user-flow tests**

Success test:

```ts
await page.goto("/?testState=community-publish");
await page.getByRole("button", { name: /Create post/i }).tap();
const body = page.getByRole("textbox", { name: "Post text" });
await body.tap();
await expect(body).toBeFocused();
await body.pressSequentially("Dinner turned out beautifully");
await page.getByRole("button", { name: "Publish" }).tap();
await expect(page.getByText("Dinner turned out beautifully")).toBeVisible();
```

Failure test:

```ts
await page.goto("/?testState=community-publish-error");
await page.getByRole("button", { name: /Create post/i }).tap();
await page.getByRole("textbox", { name: "Post text" }).fill("Keep this draft");
await page.getByRole("button", { name: "Publish" }).tap();
await expect(page.getByText(/draft is safe/i)).toBeVisible();
await expect(page.getByRole("textbox", { name: "Post text" })).toHaveValue("Keep this draft");
await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
```

- [ ] **Step 2: Run both tests and verify RED**

Run: `npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "community publish"`

Expected: FAIL because no full-screen composer or typed failure state exists.

- [ ] **Step 3: Implement `PostComposer`**

Use state for body, image, recipe ID, visibility, mutation error, and posting. The root is normal-flow `min-height:100dvh`; the top action bar is sticky, and the scrollable form has bottom padding `calc(24px + env(safe-area-inset-bottom))`. Keep input font size 16px. Do not use a fixed overlay around the textarea.

Expose `onPublish(draft): Promise<CommunityMutationResult>`, `onCancel`, and saved recipes. On failure, retain every draft field and show the typed message plus Retry. On success, clear state and return to feed.

- [ ] **Step 4: Run success and failure tests and verify GREEN**

Run: `npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "community publish"`

Expected: both WebKit tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/community/PostComposer.tsx src/screens/CommunityScreen.tsx src/App.tsx src/styles.css src/devTestState.ts e2e/smoke.e2e.ts
git commit -m "fix(community): make iPhone post composer reliable"
```

---

### Task 5: Add Immersive Post Detail And Reply Flow

**Files:**
- Create: `src/screens/community/PostDetail.tsx`
- Modify: `src/screens/CommunityScreen.tsx`
- Modify: `src/styles.css`
- Modify: `e2e/smoke.e2e.ts`

- [ ] **Step 1: Write a failing post-detail WebKit test**

```ts
await page.goto("/?testState=community-feed");
await page.locator(".community-feed-row").first().getByRole("button", { name: /Open post/i }).tap();
await expect(page.locator(".community-post-detail")).toBeVisible();
await expect(page.getByRole("button", { name: /Open recipe/i })).toBeVisible();
const reply = page.getByRole("textbox", { name: "Reply" });
await reply.tap();
await expect(reply).toBeFocused();
await reply.fill("This looks wonderful");
await page.getByRole("button", { name: "Send reply" }).tap();
await expect(page.getByText("This looks wonderful")).toBeVisible();
await page.getByRole("button", { name: "Back to community" }).tap();
await expect(page.locator(".community-feed-row").first()).toBeInViewport();
```

- [ ] **Step 2: Run the detail test and verify RED**

Run: `npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "community post detail"`

Expected: FAIL because Post Detail does not exist.

- [ ] **Step 3: Implement `PostDetail`**

Render a full-width inspectable image, author strip, full body, linked-recipe action, reaction bar, fetched/local comments, and reply form. Use a normal-flow reply section with safe-area padding instead of a keyboard-obscuring fixed bar. Retain failed reply drafts and render Retry. Back restores the feed's saved `scrollTop`.

- [ ] **Step 4: Run detail and reaction tests**

Run: `npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "community post detail|community reaction"`

Expected: detail navigation, reply focus, reply publish, reaction state, and scroll restoration pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/community/PostDetail.tsx src/screens/CommunityScreen.tsx src/styles.css e2e/smoke.e2e.ts
git commit -m "feat(community): add post detail and replies"
```

---

### Task 6: Persist Dismissals And Integrate App Chrome

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/screens/CommunityScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/styles.css`
- Modify: `e2e/smoke.e2e.ts`

- [ ] **Step 1: Write failing dismissal persistence and chrome tests**

```ts
await page.goto("/?testState=community-feed");
const dish = page.locator(".trending-recipe").first();
const title = await dish.getByRole("button", { name: /Open recipe/i }).getAttribute("aria-label");
await dish.getByRole("button", { name: /Not interested/i }).tap();
await page.getByRole("button", { name: "Not interested", exact: true }).tap();
await page.reload();
await expect(page.getByLabel(title!)).toHaveCount(0);
```

Also assert the global `.bottom-nav` is absent in composer/detail and visible again on feed.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "trending dismissal|community chrome"`

Expected: FAIL because dismissal state and chrome suppression are not wired.

- [ ] **Step 3: Add account-scoped dismissal state**

Add `authUserId` state in `App`. Update it from every auth callback that carries a session and clear it on `SIGNED_OUT`. Use `useStoredState<Record<string, string[]>>("moodfood-community-hidden-recipes", {})`; key it by `authUserId`, then normalized profile email, then `pilot`. Pass the current key's IDs and updater into `CommunityScreen`.

`SettingsScreen` receives `hiddenCommunityRecipeCount` and `resetHiddenCommunityRecipes`. Render a button only when count is nonzero:

```tsx
<button type="button" onClick={resetHiddenCommunityRecipes}>
  <RotateCcw />Reset hidden community dishes<span>{hiddenCommunityRecipeCount}</span>
</button>
```

- [ ] **Step 4: Suppress global navigation for focused community views**

Lift `communityFocused` through an `onModeChange` callback from `CommunityScreen`; hide `BottomNav` when mode is `composer` or `detail`, and restore it for `feed`.

- [ ] **Step 5: Run persistence and integration tests**

Run: `npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "trending dismissal|community chrome"`

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/screens/CommunityScreen.tsx src/screens/SettingsScreen.tsx src/styles.css e2e/smoke.e2e.ts
git commit -m "feat(community): persist recipe feedback and focused chrome"
```

---

### Task 7: Final Review, Native Build, And Physical iPhone Verification

**Files:**
- Modify only files required by review findings.

- [ ] **Step 1: Run focused automated verification**

```bash
npm test -- src/communityMutation.test.ts src/communityRanking.test.ts src/security.test.ts
npx playwright test e2e/smoke.e2e.ts --project=mobile-webkit --grep "community"
```

Expected: all community unit and WebKit tests pass.

- [ ] **Step 2: Run full verification**

```bash
git diff --check
npm test -- --run
npm run build
npm run lint
npx playwright test
```

Expected: unit/E2E/build pass, lint has no errors, and only previously documented warnings remain.

- [ ] **Step 3: Review the complete diff**

Use the review workflow with two read-only reviewers: one for Supabase mutation/RLS correctness, one for iPhone keyboard/layout/accessibility. Address every P1/P2 finding and rerun the affected tests.

- [ ] **Step 4: Sync and build iOS**

```bash
npm run ios:sync
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination 'id=00008101-001A5CD60112001E' \
  -derivedDataPath /tmp/MoodFoodDerivedData -allowProvisioningUpdates build
xcrun devicectl device install app --device 00008101-001A5CD60112001E \
  /tmp/MoodFoodDerivedData/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device process launch --device 00008101-001A5CD60112001E com.akiwumi.moodfood
```

Expected: build and install succeed; launch succeeds while the phone is unlocked.

- [ ] **Step 5: Complete the physical-device checklist**

- Open composer, tap text area, type multiple lines, dismiss/reopen keyboard.
- Publish text-only and image posts from the demo account.
- Verify a failed/offline attempt retains its draft and Retry works after reconnecting.
- Swipe trending dishes, open a recipe, dismiss a dish, relaunch, and verify it stays hidden.
- Open a post detail, react, reply, return, and verify feed scroll position.
- Pull down/overscroll the feed and confirm the app does not return to Splash.
- Rotate to landscape and verify composer/detail remain operable.

- [ ] **Step 6: Commit review fixes**

```bash
git add src/App.tsx src/community.ts src/communityMutation.ts src/communityRanking.ts src/hooks/useCommunity.ts src/screens/CommunityScreen.tsx src/screens/SettingsScreen.tsx src/screens/community src/styles.css e2e/smoke.e2e.ts src/security.test.ts supabase/migrations/024_community_publish_contract.sql
git commit -m "fix(community): address final iPhone review"
```

Do not stage `.claude/launch.json` or generated Swift package-resolution changes unless they are intentionally required by this feature.
