# Augmented Onboarding — Unified Profiling Spec

**Purpose:** Unify the app's current onboarding (`src/onboarding.ts`, 28 questions / 6 sections)
with the deep profiler in `recipe-profile-deep.jsx` (30 steps). The result is one ordered list,
written in the app's existing `OnboardingQuestion` schema, ready to become part of the app.

Each item is tagged:

- **`[KEEP]`** — already in `onboarding.ts`, unchanged.
- **`[DEEPEN]`** — already exists, but options/copy expanded with content from the deep profiler.
- **`[NEW]`** — a dimension only the deep profiler had; needs a new `Profile` key.

Two-path principle is preserved (`profile.path: "quick" | "standard"`). Items marked
**`(quick)`** form the short path; everything runs on the standard path. The mood step is the
emotional hook and runs on both.

---

## New `Profile` keys required

The deep profiler adds dimensions the current `Profile` type doesn't store. Add these to
`Profile` in `src/store.ts` and to `OnboardingKey` in `src/onboarding.ts`:

```ts
// --- Mood & emotional context (from deep profiler) ---
cookingMoods: string[];          // the 14 cooking moods that resonate (multi)
moodContext: Record<string, string>;  // answers to the 6 mood-psychology questions
dietReligious: string[];         // religious / ethical practice (multi)
spiceTypes: string[];            // which kinds of heat (fresh chilli, szechuan, etc.)
ingredientPhilosophy: string[];  // quality-vs-pantry, fresh-always, fermentation...
pantryStaples: string[];         // what's reliably in the cupboard
confidenceBlockers: string[];    // what makes cooking feel hard
cookingMethods: string[];        // stovetop, air fryer, ferment... (distinct from equipment)
typicalTime: string[];           // habitual time bands (multi, vs weeknightTime single)
eatingPattern: string;           // three-meals, IF, grazing... (single)
eatingSpeed: string;             // fast / mindful (single)
mealTypes: string[];             // breakfast, brunch, dessert, meal-prep...
occasions: string[];             // everyday, dinner-party, BBQ, holiday...
diningStyle: string[];           // solo-quiet, family-table, desk, sofa...
leftoverHabits: string[];        // love-leftovers, reinvent, freeze...
wasteApproach: string[];         // root-to-tip, stock-scraps, compost...
budget: string;                  // per-meal budget band (single)
inspirationSources: string[];    // social, cookbooks, travel, heritage...
sustainability: string[];        // local, seasonal, reducing-meat...
presentation: string;            // rustic, restaurant-quality... (single)
```

Note: `weeknightTime` (single, "realistic default") and `typicalTime` (multi, "bands you cook in")
are kept distinct — one is the weeknight cap, the other is the habitual range.

---

## Unified section order

The deep profiler's 30 steps collapse into the app's 6 sections plus one new opener
("Your moods") that becomes the emotional centrepiece:

| # | Section | Source |
|---|---------|--------|
| 0 | **Your moods** | NEW — deep profiler `mood` + `mood-context` |
| 1 | **Food & safety** | DEEPENED — adds religious/ethical, broader allergens |
| 2 | **Your palate** | DEEPENED — adds spice *types*, broader cuisines, ingredient philosophy |
| 3 | **Ingredients** | KEEP + NEW pantry staples |
| 4 | **Food psychology** | KEEP — already strong (FCQ + TFEQ grounded) |
| 5 | **Comfort & mood** | KEEP |
| 6 | **Kitchen, time & table** | DEEPENED — adds methods, confidence blockers, eating pattern, meal types, occasions, dining style |
| 7 | **Habits & values** | NEW — leftovers/waste, budget, inspiration, sustainability, presentation |

---

## Section 0 — Your moods *(both paths)*

The emotional front door. The deep profiler's 14 cooking moods, selected during onboarding so
Moody understands *how* the user relates to cooking before it asks *what* they eat.

**`[NEW]` 0.1 — Which cooking moods feel like you? `(quick)`**
- type: `multi` · key: `cookingMoods` · min 1
- text: "These are the headspaces you cook from. Pick the ones you recognise — you'll check in with one each time you open Moody."
- options: `Nourish`, `Comfort`, `Tired`, `Stressed`, `Low / Sad`, `Quick Fix`, `Creative`,
  `Social / Hosting`, `Indulge`, `Mindful`, `Nostalgic`, `Under the Weather`, `Bored`,
  `Performance / Focused`
- UI note: render as the rich expandable cards from the JSX (tagline + "what this means" +
  descriptors + vibe pills + time hint). The `aiSignal` string per mood feeds the recipe prompt.

**`[NEW]` 0.2 — When you're stressed, what does food do for you?**
- type: `single` · key: `moodContext.stress_response`
- options: `Cooking is therapy — it helps me decompress`, `I just need to eat fast and get back to it`,
  `I reach for comfort food without thinking`, `I often forget to eat or lose my appetite`,
  `I usually just order something`

**`[NEW]` 0.3 — On your most exhausted days, what's most likely?**
- type: `single` · key: `moodContext.tired_response`
- options: `I cobble together whatever is easiest`, `Toast, cereal, or barely-cooking`,
  `I order in — no shame`, `I eat something I made earlier in the week`,
  `I sometimes just don't eat properly`

**`[NEW]` 0.4 — When you're in a great mood, cooking feels like…**
- type: `single` · key: `moodContext.happy_response`
- options: `A celebration — I make something special`, `Creative time — I experiment`,
  `The same as usual`, `A reason to cook for someone else`, `Still quick`

**`[NEW]` 0.5 — Which best describes your relationship with food?** `(quick)`
- type: `single` · key: `foodRelationship` *(existing key — reuse)*
- options: `Food is fuel — functional more than emotional`, `One of life's great pleasures`,
  `Deeply tied to my culture and identity`, `About sharing and being with people`,
  `My primary tool for managing my health`, `A creative outlet — I love the craft`

**`[NEW]` 0.6 — How do you feel about variety?**
- type: `single` · key: `moodContext.variety_vs_routine`
- options: `I crave variety — repetition bores me`, `A balance of reliables and new things`,
  `I like my rotation — fewer decisions`, `Routine weekdays, exploratory weekends`

> The deep profiler gates advancement on **≥3** mood-context answers. Mirror that: require 0.1
> plus any 3 of 0.2–0.6 on the standard path; quick path needs only 0.1 + 0.5.

---

## Section 1 — Food & safety *(both paths)*

**`[KEEP]` 1.1 — How do you usually eat? `(quick)`**
- type: `single` · key: `diet`
- `[DEEPEN]` expand options with descriptions from `DIET_PRIMARY`:
  `Omnivore`, `Flexitarian`, `Vegetarian`, `Vegan`, `Pescatarian`, `Keto / Low Carb`, `Paleo`, `Raw Food`

**`[NEW]` 1.2 — Any religious or ethical food practice?**
- type: `multi` · key: `dietReligious` · optional · allowCustom
- text: "These become firm rules Moody never breaks."
- options (from `DIET_RELIGIOUS`): `Halal`, `Kosher`, `Kosher — strict meat/dairy separation`,
  `Hindu Vegetarian`, `Hindu — no beef`, `Jain`, `Jain — strict`, `Seventh-Day Adventist`,
  `Buddhist Vegetarian`, `Rastafarian / Ital`, `Eastern Orthodox Fasting`, `No pork (general)`,
  `No alcohol in cooking`, `No beef (general)`, `Traditional / Indigenous diet`

**`[KEEP/DEEPEN]` 1.3 — Allergies and intolerances `(quick)`**
- type: `multi` · key: `allergies` · optional · allowCustom
- `[DEEPEN]` render grouped (from `ALLERGY_GROUPS`) with a "select all in group" affordance.
  Add the intolerances group (FODMAP, histamine, nightshade, fructose, caffeine, alcohol) which
  the current flat list omits. Keep the hard-filter copy: "never relaxed."

**`[KEEP/DEEPEN]` 1.4 — Anything you just won't eat?**
- type: `multi` · key: `dislikedIngredients` · optional · allowCustom
- `[DEEPEN]` merge current dislikes with `AVERSIONS`: add `Offal / organ meats`, `Bitter flavours`,
  `Fermented foods`, `Game meat`, `Fennel / anise`, `Okra / slimy textures`, `Very sour food`,
  `Lamb / mutton`.

---

## Section 2 — Your palate *(standard)*

**`[KEEP]` 2.1 — Which flavors pull you in?** — `multi` · `flavorLikes` *(unchanged)*

**`[KEEP]` 2.2 — Any flavors that put you off?** — `multi` · `flavorAvoids` · optional *(unchanged)*

**`[KEEP]` 2.3 — Textures you reach for** — `multi` · `textureLikes` *(unchanged)*

**`[KEEP]` 2.4 — Textures that put you off** — `multi` · `textureAvoids` · optional *(unchanged)*

**`[KEEP]` 2.5 — How much heat do you like?** — `scale` · `spiceTolerance` *(unchanged)*

**`[NEW]` 2.6 — What *kind* of heat?** *(shown only if `spiceTolerance > 0`)*
- type: `multi` · key: `spiceTypes` · optional
- options (from `SPICE_TYPES`): `Fresh chillies`, `Dried chilli / flakes`, `Black pepper heat`,
  `Ginger heat`, `Horseradish / wasabi`, `Szechuan numbing spice`, `Mustard heat`

**`[KEEP/DEEPEN]` 2.7 — Which cuisines sound good?**
- type: `multi` · key: `cuisines`
- `[DEEPEN]` replace the 14-item flat list with the full regional set from `CUISINES`
  (African, Caribbean & Americas, European, Middle East & South Asia, East & SE Asia),
  rendered grouped by region. This is the single biggest coverage gap in the current flow.

**`[NEW]` 2.8 — Your ingredient philosophy**
- type: `multi` · key: `ingredientPhilosophy` · optional
- options (from `INGREDIENT_PHILOSOPHY`): `Quality over quantity`, `Pantry creativity`,
  `Fresh above all`, `Convenience accepted`, `Seasonal led`, `Heritage & ancient grains`,
  `Fermented & live foods`, `Charred & smoked`

---

## Section 3 — Ingredients *(standard)*

**`[KEEP]` 3.1 — Proteins you enjoy** — `multi` · `proteins`
**`[KEEP]` 3.2 — Vegetables you actually like** — `multi` · `vegetables`
**`[KEEP]` 3.3 — Your favorite bases** — `multi` · `carbs`

**`[NEW]` 3.4 — What's reliably in your cupboard?**
- type: `multi` · key: `pantryStaples` · optional · allowCustom
- text: "So Moody can suggest meals from what you already have."
- options: rendered grouped from `PANTRY_STAPLES` (Grains & Carbs, Shelf-stable proteins,
  Sauces & Condiments, Oils & Fats, Acids & Ferments, Aromatics, Spices & Dried Herbs).

---

## Section 4 — Food psychology *(standard)* — **`[KEEP]` all**

Already grounded in FCQ + TFEQ. No change.

- 4.1 — When you choose food, what drives it? — `multi` · `foodValues`
- 4.2 — What does cooking do for you? — `multi` · `cookingMotivations`
- 4.3 — How do you tend to eat? — `multi` · `eatingHabits`
- 4.4 — What changes how you eat? — `multi` · `emotionalTriggers` · optional

---

## Section 5 — Comfort & mood *(standard)* — **`[KEEP]` all**

- 5.1 — What does comfort food look like? — `multi` · `comfortFoods`
- 5.2 — What makes a meal feel comforting? — `multi` · `comfortCues`
- 5.3 — What makes cooking feel like too much? — `multi` · `avoidCues`
- 5.4 — What helps in each mood? — `textgrid` · `moodNeeds` · optional
  *(`[DEEPEN]` use the 14 `cookingMoods` the user selected in 0.1 as the grid rows, instead of the
  fixed 9-mood list — ties the textgrid to their own selections.)*

---

## Section 6 — Kitchen, time & table *(standard, with quick subset)*

**`[KEEP/DEEPEN]` 6.1 — How confident are you cooking? `(quick)`**
- type: `single` · key: `skill`
- `[DEEPEN]` use the 5 `SKILL_LEVELS` with descriptions (richer than the current 4):
  `Just Starting Out`, `Competent Home Cook`, `Adventurous Cook`, `Experienced / Skilled`,
  `Professional / Trained`

**`[NEW]` 6.2 — What holds you back in the kitchen?**
- type: `multi` · key: `confidenceBlockers` · optional
- options (from `CONFIDENCE_BLOCKERS`): `Techniques I don't know`, `Getting timing right`,
  `Fear of wasting food`, `Unfamiliar ingredients`, `Lack of equipment`, `The mess`,
  `Cooking for others`, `Food safety anxiety`, `Cost of ingredients`, `No real blockers`

**`[KEEP/DEEPEN]` 6.3 — What can you cook with?**
- type: `multi` · key: `equipment`
- `[DEEPEN]` expand to the 16-item `KITCHEN_EQUIPMENT` list (adds stand mixer, mandoline,
  thermometer, pasta machine, sous vide, cast iron, wok, etc.)

**`[NEW]` 6.4 — Which cooking methods do you actually use?**
- type: `multi` · key: `cookingMethods`
- text: "How you like to cook, separate from the gear you own."
- options (from `COOKING_METHODS`): `Stovetop`, `Oven baking`, `Grilling / BBQ`, `Air fryer`,
  `Slow cooker`, `Pressure cooker`, `Steaming`, `Deep frying`, `No-cook / raw`, `Wok / stir-fry`,
  `Fermentation / pickling`, `Bread & pastry baking`, `Smoking / low-and-slow`

**`[KEEP]` 6.5 — How long for a weeknight dinner? `(quick)`** — `single` · `weeknightTime`

**`[NEW]` 6.6 — What time bands do you cook in?**
- type: `multi` · key: `typicalTime` · optional
- options (from `TIME_TYPICAL`): `Under 15 min`, `15–30 min`, `30–60 min`, `1–2 hours`,
  `Half day cook`, `All day / multi-day`

**`[NEW]` 6.7 — How do you eat across a day?**
- type: `single` · key: `eatingPattern`
- options (from `EATING_PATTERNS`): `Three meals a day`, `Two main meals`,
  `Intermittent fasting`, `Grazing throughout the day`, `One main meal`, `Irregular / no pattern`

**`[NEW]` 6.8 — Which meals do you want help with?**
- type: `multi` · key: `mealTypes`
- options (from `MEAL_TIMES`): `Breakfast`, `Brunch`, `Lunch`, `Snacks`, `Dinner`,
  `Late Night`, `Meal Prep`, `Dessert`

**`[KEEP]` 6.9 — Who are you usually cooking for? `(quick)`** — `multi` · `cookingFor`

**`[KEEP]` 6.10 — How many plates, usually?** — `stepper` · `servings`

**`[NEW]` 6.11 — How do you usually eat your meals?**
- type: `multi` · key: `diningStyle` · optional
- options (from `DINING_STYLE`): `Solo & quiet`, `Family table`, `At my desk`,
  `Food is a social event`, `Outdoors when possible`, `TV / sofa`, `Restaurant mindset at home`,
  `Standing in the kitchen`

**`[NEW]` 6.12 — What do you cook for?**
- type: `multi` · key: `occasions` · optional
- options (from `OCCASION_COOKING`): `Everyday weeknight`, `Weekend projects`, `Date night`,
  `Dinner parties`, `Family gatherings`, `Celebrations`, `Holidays & festivals`,
  `Sunday meal prep`, `BBQ / outdoor`, `Brunch hosting`

---

## Section 7 — Habits & values *(standard)* — all **`[NEW]`**

**`[NEW]` 7.1 — How do you feel about leftovers?**
- type: `multi` · key: `leftoverHabits` · optional
- options (from `LEFTOVER_HABITS`): `I love leftovers`, `I batch cook intentionally`,
  `I reinvent leftovers`, `I eat the same thing again`, `I dislike leftovers`,
  `I forget I have them`, `I freeze everything`

**`[NEW]` 7.2 — Your approach to food waste**
- type: `multi` · key: `wasteApproach` · optional
- options (from `WASTE_APPROACH`): `Root-to-tip`, `Stock from scraps`, `Nose-to-tail`,
  `I compost`, `Shop to use`, `No real system`

**`[KEEP]` 7.3 — How do you plan and shop?** — `multi` · `planningStyle`
  *(absorbs the deep profiler's `SHOPPING_HABITS` — they overlap; keep `planningStyle`.)*

**`[NEW]` 7.4 — Budget per meal**
- type: `single` · key: `budget` · optional
- options (from `BUDGET_OPTIONS`): `Budget conscious`, `Moderate`, `Comfortable`, `Premium`,
  `It varies a lot`

**`[NEW]` 7.5 — Where do you get cooking inspiration?**
- type: `multi` · key: `inspirationSources` · optional
- options (from `INSPIRATION_SOURCES`): `Social media`, `Cookbooks`, `Restaurants & eating out`,
  `Family recipes`, `Travel & culture`, `Ingredients first`, `Friends & community`,
  `Recipe apps & sites`, `Specific chefs`, `Cultural heritage`, `Nutritional science`, `The seasons`

**`[KEEP]` 7.6 — Anything you're working toward?** — `multi` · `nutritionGoals` · optional

**`[NEW]` 7.7 — What matters in how you source food?**
- type: `multi` · key: `sustainability` · optional
- options (from `SUSTAINABILITY`): `Locally sourced`, `Seasonal eating`, `Organic when possible`,
  `Reducing meat`, `Minimal food waste`, `Ethical sourcing`, `Not a priority for me`

**`[NEW]` 7.8 — How should food look?**
- type: `single` · key: `presentation` · optional
- options (from `PRESENTATION`): `Rustic & unpretentious`, `Homely & generous`, `Neat & considered`,
  `Restaurant quality`, `Photogenic`

**`[KEEP]` 7.9 — How far should Moody stretch you?** — `scale` · `novelty`

---

## Path lengths

- **Quick path** (~8 prompts): 0.1, 0.5, 1.1, 1.3, 6.1, 6.5, 6.9, 6.10 — enough to recommend safely.
- **Standard path** (~40 prompts): everything. Mostly multi-select chips and single cards, so it
  moves fast despite the count. All non-safety, non-core items are `optional` so users can skip.

## Implementation notes

1. Add the new keys to `Profile` (`src/store.ts`) and `OnboardingKey` (`src/onboarding.ts`),
   with sensible empty defaults in the store's initial profile.
2. The grouped renderers (allergies, cuisines, pantry) need a `groups` field on
   `OnboardingQuestion` (`{ group: string; note?: string; items: {...}[] }[]`) and a
   `grouped-multi` question `type`. Everything else fits the existing types.
3. The mood cards (0.1) and skill cards (6.1) carry descriptions/`aiSignal` — store that static
   copy in `src/data.ts` (port `MOODS` and `SKILL_LEVELS` from the JSX), keyed by id, so the
   onboarding config stays a flat list and App.tsx looks up the rich content.
4. `aiSignal` per selected mood + the new palate/method/values fields should be threaded into the
   recipe-generation prompt — that's where this richer profile pays off.
