# Community Feed And Post Detail Design

Date: 2026-07-14
Status: Approved for implementation planning
Primary target: Sideloaded MoodFood Capacitor app on iPhone

## Goal

Repair community posting and keyboard behavior, then reshape Community into a compact food news feed with a dedicated post-detail experience. Add a personalized popular-dishes carousel that opens recipes in MoodFood and records persistent per-account "Not interested" feedback.

## Reference Direction

- `screen-3.png` supplies the compact, divider-led feed rhythm: thumbnail, concise metadata, content, and engagement counts.
- `screen-2.png` supplies the immersive detail hierarchy: large image, author strip, full description, linked action, and persistent response controls.
- MoodFood keeps its own branding and food-focused content. It does not copy Karrot's orange palette or marketplace language.

## Visual System

- Ink: `#171A1C`
- White: `#FFFFFF`
- Mist: `#E7F1F0`
- Deep blue: `#57AECB`
- Coral: `#EF6A4F`
- Muted grey: `#8B9694`
- Plus Jakarta Sans remains the working typeface.
- Playfair Display is reserved for selected food and detail titles.
- Feed content uses quiet dividers and an unframed layout rather than stacked cards.
- The personalized popular-dishes rail is the community screen's visual signature.

## Feed

The community feed is optimized for repeated scanning on iPhone.

- A compact top bar provides Community title, Friends, and Notifications actions.
- `Trending for you` appears immediately below the top bar as a horizontally swipeable recipe rail.
- Each feed row contains the author's avatar and name, timestamp, optional food thumbnail, short post body, linked-recipe label, reaction totals, and comment total.
- Tapping post text or imagery opens Post Detail.
- Tapping an author opens that member's profile.
- Reactions and linked recipes remain direct actions and do not open Post Detail.
- A floating `Post` action opens the full-screen composer.
- Feed scroll position is restored when returning from Post Detail.
- The existing bottom navigation remains on the feed.

## Popular Dishes Carousel

Candidates begin with recipes linked from recent visible community posts. A pure ranking function calculates:

1. Popularity from reaction totals, comment count, unique recent posts, and recency decay.
2. Safety eligibility from diet, allergens, religious restrictions, and disliked ingredients.
3. Relevance from cuisines, proteins, vegetables, comfort foods, cooking moods, meal types, time budget, and cooking skill in the food profile.
4. A catalogue fallback when the community has too few linked recipes.

The carousel never opens an external page. Tapping a dish opens its existing recipe detail inside MoodFood.

Each dish has a small dismiss control. Activating it asks for confirmation with the explicit action `Not interested`, removes the dish immediately, and stores the recipe ID persistently for that account. Settings includes `Reset hidden community dishes` so this feedback can be reversed.

Dismissed IDs are namespaced by the authenticated Supabase user ID. Pilot mode uses the local profile identity, preventing one signed-in account's feedback from hiding dishes for another account on the same device.

## Post Composer

The composer is a dedicated full-screen iPhone route, not an expanding card inside the scrolling feed.

- Native-style top bar with Cancel and Publish.
- Large text area focused through a direct user gesture.
- Optional photo picker.
- Optional link to one of the user's saved recipes.
- Friends/Public visibility control when a real community session is active.
- Safe-area-aware layout that uses normal document flow while the keyboard is open.
- The draft persists while navigating within the composer and remains intact after any failed publish.
- Publish is disabled only when the post has no text, photo, or linked recipe, or while a request is in flight.
- Successful publishing returns to the feed, inserts/refetches the post, and shows a concise confirmation.

## Post Detail

Post Detail removes the bottom navigation and uses an in-context Back control.

- Large, inspectable food image when present.
- Author avatar, name, timestamp, and visibility.
- Full post body.
- Linked saved-recipe panel that opens the recipe inside MoodFood.
- Like, Love, and Applaud reactions with totals and selected state.
- Complete comments list with avatars.
- Keyboard-safe reply composer at the bottom.
- Failed comments retain their draft and provide Retry.

## Data And Error Handling

The current community data layer hides Supabase failures behind booleans. It will return structured results for publish, comment, reaction, and image upload operations.

Expected error categories:

- Session expired or user not authenticated.
- Community database migration or column unavailable.
- Row-level security rejected the operation.
- Image upload failed.
- Device is offline or request timed out.
- Unknown server failure.

The UI presents a specific recovery action. It never discards a draft or claims that a post was shared when only a local copy exists. Optimistic reactions and comments roll back when persistence fails.

Before changing backend behavior, implementation creates a red-capable reproduction for the current `Couldn't post right now. Try again.` failure and captures the actual Supabase error. Any migration repair must be idempotent and covered by the existing migration/security test pattern.

## Component Boundaries

- `CommunityScreen`: route-level state and feed/detail/composer transitions.
- `CommunityFeed`: top bar, trending rail, post list, and empty/loading states.
- `TrendingRecipes`: personalized ranking output and dismiss interaction.
- `PostRow`: compact feed representation with direct reactions.
- `PostComposer`: draft, media, saved-recipe link, visibility, and publishing state.
- `PostDetail`: full content, reactions, comments, and reply state.
- `useCommunity`: remote feed state and structured mutations.
- Community data module: Supabase requests and typed errors only.
- Pure ranking module: deterministic trending eligibility and scoring.

These units receive data and callbacks through typed props so keyboard, ranking, mutation, and navigation behavior can be tested independently.

## Accessibility And iPhone Requirements

- All icon-only controls have accessible names.
- Reaction and dismissal controls expose selected/pressed state.
- Text inputs retain a 16px minimum font size to prevent iOS zoom.
- Interactive targets are at least 44 by 44 points.
- Composer and reply controls respect top and bottom safe-area insets.
- Opening the keyboard must not cover Publish, Reply, or the active field.
- Portrait, short-height keyboard viewport, and landscape layouts remain usable.
- Pulling or scrolling the feed must never reload the app or return to Splash.

## Verification

1. A WebKit E2E test reproduces the current post failure before the fix and proves successful publish after it.
2. WebKit touch tests open the composer, focus the text area, type text, select an optional saved recipe, publish, and see the new post.
3. Failure tests preserve the composer draft and expose Retry.
4. Feed tests cover post-detail navigation and scroll restoration.
5. Post-detail tests cover reply keyboard focus, comment publishing, and reaction states.
6. Ranking unit tests cover safety exclusion, popularity, profile relevance, sparse fallback, deterministic ordering, and dismissed IDs.
7. Carousel E2E tests open a recipe and persist `Not interested` across reloads.
8. Desktop smoke coverage ensures the responsive community layout remains usable.
9. The production web build and Capacitor iOS sync succeed.
10. The signed build is installed on the connected iPhone and manually checked for native keyboard and pull/overscroll behavior.

## Scope Boundaries

- No direct messaging or chat system is added.
- No external recipe links are introduced by the carousel.
- No new public exposure of psychological, mood, diary, or health data occurs.
- No changes are made to friend-request or member-profile behavior except where navigation must integrate with the new feed.
