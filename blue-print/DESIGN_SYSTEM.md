# MoodFood Design System

## Overview

The MoodFood design language is calm, fresh, and health-forward. It draws on natural greens, generous white space, and organic shapes to communicate nourishment and well-being. Every component is designed mobile-first with fluid scaling to tablet and desktop.

> **Scope & source of truth.** Product/build scope is governed by the blueprint set (`00-MASTER-BLUEPRINT.md` → `03-implementation-roadmap.md`); that is the authority on what ships in MVP vs. what is roadmap. This design system is the **visual contract** for those screens. Components that back **roadmap** features (pantry, allergen substitution, notifications, admin CMS, video library, the 15-module Deep Dive onboarding, "Safe Mode", profile sharing) are marked **`[ROADMAP]`** in their section heading so engineering builds the MVP set first. Anything not so marked is MVP.
>
> **MoodFood is a cooking assistant, not a food-ordering app.** There are no carts, checkouts, prices-per-item, promo codes, or "Orders/Rewards/Explore" surfaces. (Real-time local grocery *pricing* is a separate, far-future roadmap item — not the e-commerce cart pattern.) Earlier drafts of this file carried a restaurant-delivery component template; those have been removed (see §7).

---

## 1. Color Palette

### Brand Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#3D5A1E` | Primary buttons, active nav, active tabs |
| `--color-primary-light` | `#4E7228` | Hover states, icon fills |
| `--color-primary-muted` | `#6B8F4A` | Secondary icon buttons, inactive states |
| `--color-surface-bg` | `#E9F0E1` | App background, screen base |
| `--color-surface-card` | `#FFFFFF` | Cards, modals, bottom sheets |
| `--color-surface-pill` | `#D9E6CF` | Inactive filter tabs, muted controls |

### Text Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-text-primary` | `#1A1A1A` | Headlines, card titles |
| `--color-text-secondary` | `#6B7280` | Descriptions, metadata, labels |
| `--color-text-muted` | `#9CA3AF` | De-emphasised hints, "optional" labels, section eyebrows, timestamps |
| `--color-text-on-primary` | `#FFFFFF` | Text on dark green backgrounds |

### Accent Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-accent-badge` | `#D4287A` | Category / "Featured" recipe badge (e.g. high-protein, featured) |

### Functional Status Colors

Used for pantry cross-reference icons, skill labels, and cook mode highlights.

| Token | Hex | Usage |
|---|---|---|
| `--color-status-have` | `#16A34A` | Pantry "in stock" indicator (✅) |
| `--color-status-partial` | `#F59E0B` | Pantry "low stock" indicator (⚠️) |
| `--color-status-need` | `#D97706` | Pantry "need to buy" indicator (🛒) |
| `--color-skill-push` | `#7C3AED` | Skill Push recipe badge (↑ A little stretch) — violet, distinct from primary green |
| `--color-ingredient-active` | `#FEF3C7` | Active step ingredient highlight bg in Cook Mode |
| `--color-moody-bubble` | `#D9E6CF` | Moody callout bubble background (same as `--color-surface-pill`) |
| `--color-surface-wake` | `rgba(61,90,30,0.06)` | Wake lock banner background — very light green tint |

### Allergen Severity Colors

Severity scale for allergens/intolerances (used in onboarding allergen module, recipe cards, substitution cards). Severity must **never** rely on colour alone — always pair with a shape/icon and a text label (see §10 Accessibility).

| Token | Hex | Severity | Behaviour |
|---|---|---|---|
| `--color-allergen-critical` | `#DC2626` | 🔴 Life-threatening | Absolute hard filter; trace-amount warnings |
| `--color-allergen-intolerant` | `#D97706` | 🟡 Intolerant | Strong exclusion; no override |
| `--color-allergen-soft` | `#EA580C` | 🟠 Prefer to avoid | Soft exclusion; user can override in-session |

### Utility Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-overlay-nav` | `rgba(61,90,30,0.55)` | Nav button overlay on hero images |
| `--color-shadow` | `rgba(0,0,0,0.08)` | Card drop shadows |
| `--color-divider` | `#E5E7EB` | Horizontal rules, subtle separators |
| `--color-border` | `#E5E7EB` | Input/card/chip borders (alias of divider for border contexts) |
| `--color-error` | `#DC2626` | Destructive actions, error text (same red as 🔴 allergen-critical) |

---

## 2. Typography

### Font Family

```
Primary: system-ui, -apple-system, "SF Pro Display", "Inter", sans-serif
Fallback: "Helvetica Neue", Arial, sans-serif
```

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--text-hero-title` | `32px / 2rem` | 800 | 1.15 | Hero food name on detail screen |
| `--text-card-title` | `26px / 1.625rem` | 700 | 1.2 | Recipe card titles |
| `--text-section-heading` | `20px / 1.25rem` | 700 | 1.3 | Section headers ("Ingredients") |
| `--text-nav-title` | `18px / 1.125rem` | 600 | 1.4 | Screen header/nav title |
| `--text-body` | `15px / 0.9375rem` | 400 | 1.55 | Ingredient descriptions |
| `--text-caption` | `13px / 0.8125rem` | 400 | 1.4 | Calories, delivery time labels |
| `--text-label-sm` | `12px / 0.75rem` | 500 | 1.3 | Category badge text, bottom nav labels |
| `--text-stat-value` | `16px / 1rem` | 600 | 1.3 | Stats row values (20min, 2 servings, Medium, 520 cal) |
| `--text-stat-label` | `12px / 0.75rem` | 400 | 1.3 | Stats row labels (italic, Cook Time, Servings, Difficulty, Calories) |
| `--text-step-body` | `20px / 1.25rem` | 400 | 1.7 | Cook Mode step text (mobile) — larger for kitchen readability |
| `--text-step-body-lg` | `22px / 1.375rem` | 400 | 1.7 | Cook Mode step text (tablet/desktop) |

---

## 3. Spacing Scale

Based on a 4px base unit.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `4px` | Micro gaps |
| `--space-2` | `8px` | Icon padding, tight inline gaps |
| `--space-3` | `12px` | Card inner top/bottom padding sections |
| `--space-4` | `16px` | Standard padding, card horizontal padding |
| `--space-5` | `20px` | Section gaps |
| `--space-6` | `24px` | Card vertical padding |
| `--space-8` | `32px` | Screen horizontal margin |
| `--space-10` | `40px` | Large section separators |
| `--space-12` | `48px` | Bottom nav height clearance |

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `8px` | Filter tab pills (inactive) |
| `--radius-md` | `12px` | Navigation icon buttons, ingredient image cards |
| `--radius-lg` | `16px` | Active filter tab, text inputs |
| `--radius-xl` | `20px` | Recipe cards, notification/list cards |
| `--radius-2xl` | `24px` | Hero image corners, primary CTA buttons, onboarding path cards |
| `--radius-full` | `9999px` | Bottom nav active indicator, quantity selectors, circular icon buttons |

---

## 5. Shadows & Elevation

| Level | CSS Value | Usage |
|---|---|---|
| `elevation-0` | `none` | Flat surface backgrounds |
| `elevation-1` | `0 1px 4px rgba(0,0,0,0.06)` | Inactive filter tabs |
| `elevation-2` | `0 2px 12px rgba(0,0,0,0.08)` | Recipe cards, nav buttons |
| `elevation-3` | `0 4px 24px rgba(0,0,0,0.12)` | Modal/bottom sheets, Moody FAB |

---

## 6. Iconography

> **Moods are words, not icons (product rule).** Every mood is rendered as its **text label** — `Tired`, `Stressed`, `Cozy`, `Celebratory`, `Focused`, `Adventurous`, etc. — never as an emoji or pictogram. Mood chips, the Home check-in, mood definitions, the mood selector, and (roadmap) the Emotional Food Map all use word chips. Earlier drafts paired each mood with an emoji (😴, 😰, …); those are **dropped** for mood display. Colour may still key to a mood (e.g. a left-border accent), but the identifier the user reads is always the word. (This rule is specific to moods — functional UI icons below are unaffected.)

### Style
- **Stroke weight:** 1.75px
- **Style:** Line icons (outline), not filled — except active bottom nav icon (filled)
- **Size:** 22×22px at standard density; 18×18px in tight contexts
- **Color:** Inherits from context (`--color-primary`, `--color-text-secondary`, or `#FFFFFF`)

### Icon Set (Used in UI)

The full emoji/icon catalogue (with replacement-tracking) lives in `ICON_AUDIT.md`; this is the core interaction set. Bottom nav is the **5 MoodFood destinations** — there is no Orders/Rewards/Explore.

| Icon | Context |
|---|---|
| `chevron-left` | Back navigation button |
| `more-horizontal` (···) | Options / overflow menu (top right) |
| `home` | Bottom nav — Home / Mood Check-In (active = filled) |
| `search` | Bottom nav — Search / Discover |
| `book-open` | Bottom nav — Diary |
| `shopping-cart` | Bottom nav — Grocery |
| `calendar` | Bottom nav — Planner |
| `heart` | Save / favourite a recipe (outline = unsaved, filled = saved) |
| `clock` | Recipe cook time |
| `bell` | Notification centre **[ROADMAP]** |
| `plus` / `minus` | Add item / serving & quantity steppers (grocery, planner, servings) |

---

## 7. Component Library

### 7.1 Navigation Bar (Top)

```
[Back Button]   [Screen Title]   [Options Button]
```

- Height: `56px`
- Background: transparent over `--color-surface-bg`; frosted glass (`backdrop-filter: blur(12px)`) when scrolled
- Back button: `40×40px` rounded square, `--color-surface-card`, `elevation-2`
- Options button: same as back button
- Title: `--text-nav-title`, centered, `--color-text-primary`
- On hero-image screens: buttons use `--color-overlay-nav` background, white icon

---

### 7.2 Bottom Navigation Bar

```
[🏠 Home]  [🔍 Search]  [📖 Diary]  [🛒 Grocery]  [📅 Planner]
```

- Height: `80px` + safe-area inset (extra 8px over icon-only version to accommodate labels)
- Background: `--color-surface-bg`
- 5 items equally spaced
- **Active item:** icon sits inside `48×48px` circle, `--color-primary` fill, white icon; label in `--color-text-on-primary` (actually primary colour text when circle bg is not used — `--color-primary`, `10px`, `600`)
- **Inactive items:** `--color-surface-pill` background circle `44×44px`, `--color-primary-muted` icon; label in `--color-text-secondary`, `10px`, `400`
- Text labels: always visible below icon; `10px`, no truncation (labels are all ≤8 chars)
- `aria-label` required on each nav button even when labels are visible (e.g., `aria-label="Home"`)
- **Hidden in Cook Mode** — no bottom nav in `/app/cook/:sessionId`
- xs/sm/md only — replaced by left sidebar on xl+ (1024px+)

---

### 7.3 Filter Tab Bar

```
[Featured ▪filled]  [Protein Plates]  [Salads]  [Bowls ›]
```

- Horizontally scrollable, no scroll indicator
- Item height: `44px`
- Padding: `12px 20px`
- **Active:** `--color-primary` background, white text, `--radius-full`
- **Inactive:** `--color-surface-pill` background, `--color-text-secondary` text, `--radius-full`
- Gap between tabs: `10px`

---

### 7.4 Recipe Card

The primary discovery surface — used on Home results, Search, Favourites, and "similar recipes". No price, no "add to bag"; a recipe card communicates *fit* (mood/time/difficulty) and offers save + start actions. See `WIREFRAMES.md` Screen 14b / Screen 16 for in-context layouts.

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐    │
│  │           [Recipe Image]            │ [♡]│  save (heart) top-right
│  └─────────────────────────────────────┘    │
│  [Title, 2 lines max]                       │
│  🕐 20 min  ·  Medium  ·  98% match         │  meta row
│  [Comforting] [Quick]              [▶ Cook] │  mood tags + start
└─────────────────────────────────────────────┘
```

- Background: `--color-surface-card`
- Border radius: `--radius-xl`
- Shadow: `--shadow-2`
- Padding: `0 0 16px 0` (image bleeds to top/side edges, text padded `16px`)
- Title: `--text-card-title` (scale down to `--text-section-heading` in dense grids)
- Meta row: `--text-caption`, `--color-text-secondary`; `•` separators; match-score optional
- Mood/context tags: pill chips, `--color-surface-pill` bg, `--text-label-sm`
- Save button: `44×44px`, heart icon — outline `--color-primary-muted` (unsaved) / filled `--color-primary` (saved)
- Recipe image: full width, `200px` height (16:9), `border-radius: --radius-xl --radius-xl 0 0`
- Optional badges overlay: `[ROADMAP]` Adaptable badge (§7.27), Skill Push badge (§7.15)

> **Removed (was §7.5–§7.8): Cart Item Card, Quantity Selector, Rewards/Promo Card, Cart Footer.** These were a restaurant-delivery template (carts, checkout, promo codes) and are **not part of MoodFood** — see the scope note at the top of this file. Grocery quantity steppers use the generic `plus`/`minus` controls; subscription checkout is a Stripe-hosted page (no in-app cart). Section numbers `7.9+` are unchanged to keep cross-references stable.

---

### 7.9 Food Detail — Hero Section

```
┌────────────────────────────────────────────────┐
│  [Back]          [Hero Food Image]      [···]  │
│                                                │
│         (image fills top ~48% of screen)       │
└────────────────────────────────────────────────┘
```

- Image: 100% width, `48vh` height (min `280px`, max `380px`), object-fit cover
- Nav buttons: absolutely positioned, `--color-overlay-nav` background, white icon
- Floating spinach/leaf decoratives: absolute positioned SVG accents (optional brand touch)

---

### 7.10 Recipe Detail — Stats Row

```
[⏱ Cook Time]  [👤 Servings]  [📊 Difficulty]  [🔥 Calories]
[20 min      ]  [2 people   ]  [Medium        ]  [520 cal    ]
```

- 4 columns, equal width
- Label: `--text-stat-label`, italic, `--color-text-secondary`
- Value: `--text-stat-value`, `--color-text-primary`
- No border/divider between — whitespace only
- Labels always reflect recipe attributes — never delivery, pricing, or restaurant context

---

### 7.11 Ingredient Chip Card

> **Note:** This visual component (photo tile with label) is not used in the Recipe Detail ingredient list — that uses a pantry-aware text list (see Screen 17). The Ingredient Chip Card may appear in recipe search result previews or ingredient browsing contexts. Do not use it in the Ingredients tab or Cook Mode.

```
┌─────────────────┐
│   [Food Image]  │
│   Broccoli      │  ← white italic text, bottom
└─────────────────┘
```

- Size: `90×90px` (mobile), scales up on tablet
- Border radius: `--radius-md`
- Image: full cover
- Label: `12px`, `400` weight, italic, white, bottom-aligned with `8px` bottom padding
- Dark gradient overlay for text legibility

---

### 7.12 "See All" Button

- Inline text link style OR outlined pill
- `--radius-full`, border `1.5px solid --color-primary`, `--color-primary` text
- Padding: `8px 16px`

---

### 7.13 Moody FAB (Floating Action Button)

Persistent Moody access button present on all screens except Cook Mode.

```
Mobile (xs–md):           Desktop/Tablet (xl+):
  ┌──────┐                  [Bottom of sidebar]
  │  🟢  │  ← 56×56px       ┌──────┐
  │Moody │  primary bg       │  🟢  │ ← 48×48px
  └──────┘  bottom-right     └──────┘ primary bg
  above nav bar
```

- **Mobile:** `56×56px`, `--color-primary` background, white Moody icon (24px), `--radius-full`, `elevation-3`
- **Position (mobile):** `position: fixed; bottom: calc(80px + 16px + env(safe-area-inset-bottom)); right: 16px` — always floats above the bottom nav
- **Desktop/Tablet:** `48×48px`, positioned at the bottom of the left sidebar, `--radius-full`, same colouring
- **First-launch pulse:** Subtle expanding ring animation for 3 cycles on first app open (`animation: pulse-ring 2s ease-out 3`), then stops. Re-triggers once after onboarding completes.
- **Hidden in Cook Mode:** FAB is `display: none` on `/app/cook/:sessionId`. The in-session [Ask Moody] in the utility row serves that context.
- **Open state:** Tapping FAB opens the Moody Panel (bottom sheet on mobile, pinned side panel on desktop). FAB transforms to a close/dismiss button while panel is open.
- `aria-label="Ask Moody"` always set.

---

### 7.14 Pantry Status Indicators  `[ROADMAP]`

Used in the Ingredients tab and Cook Mode ingredient drawer. Always paired with a text label (not icon alone).

| Status | Icon | Color token | Meaning |
|---|---|---|---|
| In pantry | ✅ (or custom check icon) | `--color-status-have` | Sufficient quantity available |
| Low stock | ⚠️ (or custom warning icon) | `--color-status-partial` | Present but quantity below recipe need |
| Need to buy | 🛒 (or custom cart icon) | `--color-status-need` | Not in pantry |

- Icon size: `18×18px` inline with ingredient text
- Status text: `12px`, `--color-text-secondary`, displayed to the right of the ingredient name
- `[+ Add to bag]` affordance: appears only for 🛒 and ⚠️ items; `--color-primary` text, `14px`, tappable inline

---

### 7.15 Skill Push Badge

Applied to recipe cards and Recipe Detail when `recipe.skill_band > user.skill_band`.

```
┌────────────────────────┐
│  ↑ A little stretch    │  ← 12px, 500 weight, violet
└────────────────────────┘
```

- Background: `rgba(124,58,237,0.08)` (violet tint)
- Border: `1px solid rgba(124,58,237,0.25)`
- Text: `--color-skill-push` (`#7C3AED`), `12px`, `500` weight
- Border radius: `--radius-sm`
- Padding: `4px 10px`
- On recipe cards: top-right corner badge
- On Recipe Detail overview: appears in the stats row area, one line below difficulty

---

### 7.16 Optional Question Card (Mood Check-In)

Used on the Home / Mood Check-In screen to present each of the 5 optional questions as a distinct, scannable section.

```
┌──────────────────────────────────────────────────┐
│  Q1  How are you feeling?          [optional]     │  ← header row
│                                                   │
│  [Tired]  [Stressed]  [Energised]  →             │  ← content (word chips or slider)
│  [Cozy]   [Celebratory]  [Focused]               │
│                                                   │
└──────────────────────────────────────────────────┘
```

**States:**

| State | Visual |
|-------|--------|
| **Unanswered** | Background: `--color-surface-bg`. Header text: `--color-text-secondary`. Content chips: border-only, `--color-border`. "optional" badge: `--color-surface-pill`, `--color-text-secondary`. |
| **Answered** | Background: `--color-surface-card`. Header text: `--color-text-primary`, `600` weight. Active chip: `--color-primary` bg, white text. Left border accent: `3px solid --color-primary`. |
| **Hover / Focus** | Background: `rgba(var(--color-primary-rgb), 0.04)`. Subtle lift: `box-shadow: var(--elevation-1)`. |

**Anatomy:**
- Card background: `--color-surface-card`, `--radius-xl`, `--elevation-1`
- Padding: `16px`
- Section separator between questions: `8px` gap (no divider line — gap only)
- Question label row: `Q1` number in `11px/600` uppercase `--color-text-muted`; question text in `14px/600` `--color-text-primary`; "optional" badge is a `10px` pill in `--color-surface-pill`
- Content area: standard chip row (filter/selection chips, see §7.3) or slider
- No submit button per card — answering a chip immediately sets the value. The global CTA below all 5 cards is the only submission point.

**"optional" badge:**
```css
.optional-badge {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-surface-pill);
  border-radius: var(--radius-full);
  padding: 2px 8px;
}
```

---

### 7.17 Settings Row Edit Pattern

Consistent treatment for all editable preference rows within the Settings screen.

```
┌──────────────────────────────────────────────────┐
│  Row label                    Current value  [✏] │  ← inline edit (single value)
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Row label                              [Edit →] │  ← navigates to sub-screen
│  Summary of current values                       │
└──────────────────────────────────────────────────┘
```

**Inline edit [✏]** — for single-value settings (e.g. skill level, servings, units):
- Tapping [✏] or the row opens an inline dropdown, stepper, or picker within the row
- Confirm: tap away or press Done
- Row height: `52px`

**Sub-screen [Edit →]** — for complex multi-value settings (e.g. cuisines, allergies, equipment, mood definitions):
- Tapping the row navigates to a dedicated settings sub-page (push navigation on mobile; right panel on desktop)
- Summary line below the label shows condensed current values in `13px`, `--color-text-secondary`
- Row height: `60px` (two-line row)

**Section headers within Settings:**
- `11px`, `600` weight, uppercase, `--color-text-muted`
- `16px` top margin, `8px` bottom margin before first row
- No background — section label floats above rows

**Destructive rows** (Delete account, Sign out):
- Text colour: `--color-error` (`#DC2626`)
- No [Edit →] chevron — tap triggers confirmation sheet

---

### 7.18 Bypass / Skip Section Card

Used in onboarding steps that are optional. Provides a clear, non-shameful path to skip a section while communicating what skipping means.

```
┌──────────────────────────────────────────────────────────┐
│  [content of the optional section — chips, inputs, etc.] │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │           Continue →                               │  │  56px primary
│  └────────────────────────────────────────────────────┘  │
│  [I eat everything — skip this step]                     │  ← bypass link
└──────────────────────────────────────────────────────────┘
```

**Bypass link styling:**
```css
.bypass-link {
  display: block;
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-secondary);
  padding: 12px 0 8px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.bypass-link:active {
  color: var(--color-text-primary);
}
```

**Rules:**
- Bypass link is always below the primary CTA — never above it (avoids accidental skips)
- Bypass link text is specific to the section, not generic ("I eat everything" not "Skip")
- After bypass, Moody shows an inline confirmation message in the chat thread (not a modal): e.g. *"Got it — no dietary restrictions set. I'll suggest everything!"*
- Bypassed steps appear in the Review screen with "Not set — using defaults [Set up →]" in `--color-text-muted`
- For safety-critical sections (allergies), bypass includes a secondary confirmation: *"Just to confirm — no allergies or intolerances? [Confirm] [Go back]"*

---

### 7.19 Allergen Severity Chip

Used in onboarding Step 2 and Settings → Allergies to communicate the severity of each registered allergen or intolerance.

```
Selected allergen chip with severity:

[🔴 Peanuts ▾]     ← tapping ▾ opens severity picker
[🟡 Lactose ▾]
[🟠 Nightshades ▾]
```

**Severity picker (inline, appears below chip):**
```
┌──────────────────────────────────────────────────────────┐
│  🔴 Peanuts — how serious?                               │
│                                                          │
│  [🔴 Life-threatening ●]  Trace amounts excluded         │
│  [🟡 Intolerant      ]   Ingredient excluded             │
│  [🟠 Prefer to avoid ]   Soft filter — usually excluded  │
└──────────────────────────────────────────────────────────┘
```

**Token definitions:**

| Severity | Colour | Token | Behaviour |
|----------|--------|-------|-----------|
| Life-threatening 🔴 | Red | `--color-allergen-critical: #DC2626` | Absolute hard filter; trace-amount warning on recipes |
| Intolerant 🟡 | Amber | `--color-allergen-intolerant: #D97706` | Strong exclusion; no override available |
| Prefer to avoid 🟠 | Orange | `--color-allergen-soft: #EA580C` | Soft exclusion; user can override in a session |

**Chip anatomy:**
- Background: tinted version of severity colour at 10% opacity
- Border: `1.5px solid` severity colour
- Text: severity colour, `13px`, `500` weight
- Severity dot: `8px` filled circle in severity colour, left-padded
- Chevron `▾`: indicates expandable severity picker
- Padding: `6px 12px`

**Tree nut sub-selector** (appears when "Tree nuts" is selected):
```
[Tree nuts 🔴 ▾]  ← tapping expands

  Which specific tree nuts? (or leave all selected)
  [All tree nuts ✓]  ← toggle-all chip
  [Almonds ✓] [Cashews ✓] [Walnuts ✓] [Pecans]
  [Pistachios] [Macadamia] [Brazil] [Hazelnuts]
  [Pine nuts] [Coconut]
```

---

### 7.20 Admin Design Theme  `[ROADMAP]`

The Admin CMS (`/admin`) uses MoodFood's design token system but with a distinct visual identity to prevent confusion with the user-facing app.

**Admin colour overrides (applied via `.admin-theme` root class):**
```css
.admin-theme {
  --admin-primary: #1E40AF;          /* Blue — distinct from app green */
  --admin-primary-hover: #1D3DA8;
  --admin-surface-bg: #F8FAFC;       /* Slightly cooler grey */
  --admin-surface-card: #FFFFFF;
  --admin-sidebar-bg: #1E293B;       /* Dark sidebar */
  --admin-sidebar-text: #CBD5E1;
  --admin-sidebar-active: #FFFFFF;
  --admin-danger: #DC2626;
  --admin-warning: #D97706;
  --admin-success: #16A34A;
}
```

**Admin layout pattern (desktop only — no mobile admin):**
- Top navigation bar: `64px`, `--admin-sidebar-bg`, white text, app name + section nav tabs
- Content area: `max-width: 1440px`, centred, `32px` horizontal padding
- Metric cards: `--admin-surface-card`, `--radius-xl`, `--elevation-1`, `16px` padding
- Data tables: zebra-striped rows (`--admin-surface-bg` odd), no outer border, `1px` row separators
- Charts: use Recharts or Chart.js; colours from `--admin-primary` palette + neutral greys

---

### 7.21 Onboarding Path Selector Card

Used on the Welcome screen to present the two onboarding paths. The "Tell Me Everything" card is visually dominant to encourage the comprehensive path.

```
┌──────────────────────────────────────────────────┐
│  ⚡ Quick Setup  (~5 min)                         │  ← outlined, secondary
│  The essentials — I'll learn the rest as we go.  │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  🧠 Tell Me Everything  (~20–30 min)  [RECOMMENDED│  ← primary bg, dominant
│  Build my full profile so I'm sharp from         │
│  the very first recipe.                          │
└──────────────────────────────────────────────────┘
```

**"Tell Me Everything" card:**
- Background: `--color-primary` (green)
- Text: white
- "RECOMMENDED" badge: `10px`, white text, `rgba(255,255,255,0.25)` bg, `--radius-full`
- Border radius: `--radius-2xl`
- Padding: `20px`
- Elevation: `--elevation-2`

**"Quick Setup" card:**
- Background: `--color-surface-card`
- Border: `2px solid --color-border`
- Text: `--color-text-primary`
- Border radius: `--radius-2xl`
- Padding: `20px`

**Spacing between cards:** `12px`

> **Scope note.** MVP ships **two** paths: **Quick Setup** (5 condensed screens, ~5 min) and **Tell Me Everything** = the **6-step standard wizard** (lifestyle → allergies → cooking → kitchen/taste → moods → location & review). The card's "~20–30 min" depth refers to the full **15-module Deep Dive**, which is `[ROADMAP]`. A third "💬 Just tell me in a message" (Moody-chat) path is also `[ROADMAP]`. See `WIREFRAMES.md` Screen 9 and `03-implementation-roadmap.md` Phase 2.

---

### 7.22 Onboarding Progress Bar

The MVP **standard onboarding** ("Tell Me Everything") uses this segmented progress bar with **6 segments** (`Step X of 6`). The full **15-module Deep Dive** `[ROADMAP]` reuses the exact same component with 15 segments (`Module X of 15`) — segmented bars (not dots) convey scope without feeling never-ending. The example below shows the Deep Dive (15-segment) variant.

```
●●●●●●○○○○○○○○○   Module 6 of 15
```

```css
.onboarding-progress-bar {
  display: flex;
  gap: 3px;
  height: 4px;
  border-radius: var(--radius-full);
}
.onboarding-progress-segment {
  flex: 1;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-border);        /* incomplete */
  transition: background 300ms ease;
}
.onboarding-progress-segment.complete {
  background: var(--color-primary);       /* complete */
}
.onboarding-progress-segment.current {
  background: var(--color-primary);
  opacity: 0.6;                           /* in progress */
}
```

**Below the bar:** `Module X of 15` in `12px`, `--color-text-secondary`
**On bypass:** bypassed segments render with `--color-border` (same as incomplete) — no visual punishment

---

### 7.23 Emotion Card (Module 5 — Emotional Food Map)  `[ROADMAP]`

One card per emotional state. Stacked vertically on mobile, grid on desktop.

```
┌──────────────────────────────────────────────────┐
│  When you're TIRED                               │  ← 18px/700, word label (no emoji)
│                                                  │
│  Your appetite…      [More] [Same ●] [Less]      │  14px chips, single-select
│                                                  │
│  You want…    [Comforting ✓] [Quick ✓] [Warm ✓]  │  multi-select chips
│               [Familiar] [Light] [Hearty]         │
│                                                  │
│  Cooking willingness…  [Will cook] [Simple ✓]    │  single-select
│                        [Leftovers] [Takeout]      │
│                                                  │
│  Anything else?  [ free text input ]             │  optional
└──────────────────────────────────────────────────┘
```

- Background: `--color-surface-card`
- Border radius: `--radius-2xl`
- Border-left: `4px solid` — colour keyed to emotion (tired = `#6B7280` grey, stressed = `#EF4444` red, happy = `#F59E0B` amber, sad = `#3B82F6` blue, cozy = `#8B5CF6` violet)
- Padding: `20px`
- Gap between cards: `12px`
- Sensitive cards (PMS/hormonal): [Skip this one] link appears top-right in `12px`, `--color-text-muted` — non-judgmental, always visible

---

### 7.24 Profile Completeness Bar

Shown in Settings → Your Profile and at the end of Quick Setup review.

```
Profile completeness
████████░░  78%

[Tell Moody more →]   ← appears when < 100%
```

```css
.profile-completeness-bar {
  height: 8px;
  background: var(--color-surface-pill);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.profile-completeness-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-primary) 0%,
    var(--color-primary-light) 100%
  );
  border-radius: var(--radius-full);
  transition: width 600ms ease;
}
```

**Label:** `14px/500`, `--color-text-primary` — "Profile completeness"
**Percentage:** `14px/700`, `--color-primary`
**"Tell Moody more →"** link: `13px`, `--color-primary`, underlined — only shown when < 100%
**100% state:** Bar fills, label changes to "Moody knows you well ✓", green tick icon, no CTA

---

### 7.25 Progressive Discovery Prompt

The in-session question card that appears at session end for Quick Setup users. Feels like a conversation, not a form.

```
┌──────────────────────────────────────────────────┐
│  [Moody avatar 48px]                             │
│                                                  │
│  Quick question for you…                         │  18px/600
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  When you're stressed, what do you tend   │  │  Moody bubble — speech bubble
│  │  to reach for food-wise?                  │  │  --color-moody-bubble bg
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [chip answers]                                  │
│                                                  │
│  [Free text — optional]                          │
│                                                  │
│  [ Save this → ]   [Not now]                     │
│                                                  │
│  Profile: ████████░░  78%                        │
└──────────────────────────────────────────────────┘
```

- Appears as a **bottom sheet** on mobile (slides up after session ends)
- On desktop: inline card at the bottom of the session summary
- Moody bubble uses the same speech bubble style as the Moody callout (Section 7.13 adjacent)
- Dismiss: "Not now — ask me later" is always available, no persistence, no guilt
- Chip answers are pre-populated suggestions — free text always available as alternative

---

### 7.26 Allergen Substitution Card  `[ROADMAP]`

> MVP allergen handling is **exclude/penalise only** (🔴/🟡 excluded, 🟠 soft-penalised) per the recommendation engine in `02-architecture-and-data.md §7`. The verified-substitution system below — swap cards, "Use this swap", confidence/verification badges — depends on the roadmap `ingredient_substitutions` table and substitution tools, and ships post-MVP.

Used in the Recipe Detail Ingredients tab and the Cook Mode mid-step prompt to present a specific ingredient swap. Each card represents one allergen-containing ingredient and its recommended alternative.

```
┌────────────────────────────────────────────────────────────┐
│  🔄  Heavy cream  →  Coconut cream                         │  ← 14px/600
│      Use the same quantity (200ml)                         │  ← 13px secondary
│                                                            │
│      Flavour impact: Adds a light coconut note             │  ← 13px secondary
│      Texture impact: Nearly identical in sauces            │
│      Note: Works well in savoury dishes                    │
│                                                            │
│      ● Verified by Moody  ★★★★★  142 cooks used this swap │  ← 12px muted
│                                                            │
│      [✓ Use this swap]          [Keep original]            │
└────────────────────────────────────────────────────────────┘
```

**Card anatomy:**

| Element | Spec |
|---------|------|
| Container | `--color-surface-card`, `--radius-xl`, `--elevation-1`, `16px` padding |
| Left border | `4px solid` severity colour: 🟡 `--color-allergen-intolerant`, 🟠 `--color-allergen-soft`, 🔴 `--color-allergen-critical` |
| Swap header | `14px/600 --color-text-primary`: `[Original] → [Substitute]` |
| Quantity line | `13px/400 --color-text-secondary` |
| Impact rows | `13px/400 --color-text-muted`; label in `500` weight |
| Confidence line | `12px/400 --color-text-muted`: `● Verified` or `● Moody's suggestion (not verified)` |
| Star rating | inline `★` in `--color-status-partial` (amber), count in `--color-text-muted` |
| Primary CTA | `[✓ Use this swap]` — `48px`, `--color-primary` bg, white text, `--radius-lg`, `48% width` |
| Secondary CTA | `[Keep original]` — `48px`, outlined `2px solid --color-border`, `--color-text-secondary`, `48% width` |
| Gap between CTAs | `8px` |

**State transitions:**

| State | Left border | Content change |
|-------|-------------|----------------|
| Unreviewed | 4px severity colour | Default content + both CTAs |
| Accepted | `4px solid --color-status-have` (`#16A34A`) | Header updates to `✓ Swapped to Coconut cream`. CTAs replaced by `[Change swap ↩]` text link |
| Declined | `4px solid --color-divider` | Header updates to `Keeping original — dairy present`. CTAs replaced by `[Reconsider? ↩]` text link |

**🔴 Life-threatening — safety warning variant:**

```
┌────────────────────────────────────────────────────────────┐
│  ⛔  LIFE-THREATENING ALLERGEN — Peanuts                    │  ← 14px/700 red
│                                                            │
│  This recipe uses peanut butter. Even if you substitute    │  ← 13px body
│  it, cross-contamination from shared equipment or          │
│  manufacturing can still be dangerous.                     │
│                                                            │
│  Only proceed if your substitute is from a confirmed       │
│  peanut-free facility.                                     │
│                                                            │
│  [I understand — show substitution option]  (outlined)     │
│  [Find me a safer recipe →]                 (primary)      │
└────────────────────────────────────────────────────────────┘
```

- Background: `rgba(220,38,38,0.04)` (very light red tint)
- Left border: `4px solid --color-allergen-critical` (`#DC2626`)
- Header: `--color-allergen-critical`, `700` weight
- Primary CTA is "Find me a safer recipe" — the safe default action is ALWAYS first

**"Moody's suggestion" indicator:**
```css
.substitution-ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-pill);
  border-radius: var(--radius-full);
  padding: 2px 8px;
}
.substitution-verified-badge {
  color: var(--color-status-have);  /* green */
  background: rgba(22,163,74,0.08);
}
```

**"Apply all swaps" CTA (multi-swap scenario):**
- Full-width, `56px`, `--color-primary`, appears after all individual swap cards
- Label: `✓ Apply all swaps & Start Cooking`
- Below it: `[Save this version of the recipe]` — `13px` text link, `--color-primary`
- Below that: `[Cook with originals instead]` — `13px` text link, `--color-text-muted`

---

### 7.27 "Adaptable for You" Recipe Section & Badges  `[ROADMAP]`

Two badge types are used to communicate allergen substitution availability on recipe cards and search results.

#### "Adaptable" Badge (🟠 Prefer to avoid — recipe shown in main results)

```
┌────────────────────────────────┐
│  🔄 Adaptable                  │  ← chip on recipe card
└────────────────────────────────┘
```

```css
.badge-adaptable {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary);
  border: 1.5px solid var(--color-primary);
  border-radius: var(--radius-full);
  padding: 3px 10px;
  background: rgba(61, 90, 30, 0.06);  /* primary at 6% */
}
```

- Appears on recipe cards in the normal results list when the recipe contains a 🟠 soft-filter allergen AND a verified substitution exists
- Position: below the mood/context tag chips, above the [♡] save button
- Tapping the badge opens the Ingredients tab on Recipe Detail, scrolled to the substitution card

#### "Adaptable for you" Section Header (🟡 Intolerant — separate section)

The section header that separates the Adaptable section from the main results:

```
── Adaptable for you ─────────────────────────────────────
These recipes need one small swap to work for you.
```

```css
.adaptable-section-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 0 8px;
  border-top: 1px solid var(--color-divider);
  margin-top: 8px;
}
.adaptable-section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.adaptable-section-sublabel {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-secondary);
}
```

#### "Adaptable for you" Recipe Card (in the separate section)

Same as a standard result card but with an additional inline swap line beneath the recipe title:

```
┌─────────────────────────────────────────────────────────────┐
│  [img 88×88]  Butter Chicken                                │
│               🔄 Swap heavy cream → coconut cream           │  ← swap line
│               🕐 35 min  ·  Medium                         │
│               [Comforting] [Warming]               [♡] [▶] │
└─────────────────────────────────────────────────────────────┘
```

**Swap line spec:**
- `🔄` icon + `Swap [original ingredient] → [substitute]`
- `13px/400`, `--color-primary`
- If multiple swaps: `🔄 2 swaps needed — tap to see`
- Tapping the card body or the swap line opens Recipe Detail with the Ingredients tab pre-scrolled to the substitution cards

#### Design rules

1. **"Adaptable for you" section is always below all main results** — never mixed in. The visual separation makes it clear these are a different category of result.
2. **🔴 life-threatening allergen recipes are never in either location.** No badge, no section, no appearance in any result feed.
3. **If zero adaptable recipes exist** for the user's 🟡 allergens: the section is omitted entirely. No empty state shown.
4. **The swap line is honest** — it names the specific ingredient being swapped, not just "dairy-free version available." Specificity builds trust.
5. **Verified substitutions only appear in the "Adaptable for you" section.** AI-generated-only substitutions are available within a recipe's detail view but do not qualify a recipe for the section.

---

### 7.28 Pantry Freshness Indicator  `[ROADMAP]`

Displayed at the top of the Pantry screen and in the stale-pantry interstitial. Communicates how up-to-date the user's pantry data is.

```
┌────────────────────────────────────────────────┐
│  ✅ Last updated 2 days ago · 24 items  [Verify →] │
└────────────────────────────────────────────────┘
```

**Four states:**

| Status | Icon | Label copy | Background | Text colour | CTA |
|--------|------|------------|------------|-------------|-----|
| Fresh (0–5 days) | ✅ | "Last updated [N] days ago · [X] items" | `rgba(22,163,74,0.06)` | `--color-status-have` | None |
| Getting old (6–12 days) | ⚠️ | "Getting a bit old — last updated [N] days ago" | `rgba(245,158,11,0.08)` | `--color-status-partial` | [Quick verify →] |
| Stale (13–20 days) | ⚠️ | "Pantry might be out of date" | `rgba(217,119,6,0.10)` | `--color-allergen-intolerant` | [Update now →] |
| Very stale (21+ days) | 🔴 | "Pantry is very out of date — shopping lists may not be accurate" | `rgba(220,38,38,0.06)` | `--color-allergen-critical` | [Update now →] |

```css
.pantry-freshness-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  font-size: 13px;
  font-weight: 500;
}
.pantry-freshness-bar .freshness-cta {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
```

**Pantry item row — "last verified" indicator:**

Items not verified in 7+ days show a subtle age note below their quantity:
```
🧄 Garlic · 1 head
   Updated 8 days ago           ← 11px, --color-text-muted, only shown ≥7 days
```

---

### 7.29 Notification List Item (In-App Notification Centre)  `[ROADMAP]`

Used in the 🔔 Notification Centre (`/app/notifications`) and in the notification centre slide-in panel on desktop.

```
┌────────────────────────────────────────────────┐
│▌ 🥕 Category label              2h ago        │  ← header row
│  Main notification body text — this can be    │  ← body, max 2 lines
│  up to two lines of copy.                     │
│  "Action text →"                              │  ← deep-link CTA, optional
└────────────────────────────────────────────────┘
```

**Anatomy:**

| Element | Spec |
|---------|------|
| Container | `--color-surface-card`, `--radius-lg`, `--elevation-1`, padding `12px 14px` |
| Left accent (unread) | `3px solid --color-primary`, `border-radius: 3px 0 0 3px` |
| Left accent (read) | `none` |
| Category icon | 18px emoji/icon, left-aligned |
| Category label | `13px/600`, `--color-text-primary` (unread) or `--color-text-secondary` (read) |
| Timestamp | `12px/400`, `--color-text-muted`, right-aligned in header row |
| Body text | `13px/400`, `--color-text-secondary`, max 2 lines, truncated with `…` |
| Action link | `13px/600`, `--color-primary`, underlined, displayed on its own line |
| Gap between items | `8px` |

**Swipe-to-dismiss (mobile):**
- Swipe left ≥ 80px → reveals red [Dismiss ✕] button (44px wide, `--color-allergen-critical` bg, white text)
- Swipe full width → dismisses immediately with slide-out animation

**Category icons by notification type:**

| Category | Icon |
|----------|------|
| Pantry & Shopping | 🥕 |
| Meal reminders | 🍽 |
| Cooking | 🍳 |
| Cook streak | 🔥 |
| Insights & Weekly | 📊 |
| Variety nudge | 🔄 |
| Skill push | ↑ |
| Seasonal | 🌱 |
| Profile | 👤 |
| Subscription | ⭐ |
| New feature | ✨ |

---

### 7.30 Notification Toast / Banner (In-App Real-Time)  `[ROADMAP]`

A transient notification that slides down from the top of the screen when a notification arrives while the app is foregrounded. Different from the notification centre — this is ephemeral.

```
┌─────────────────────────────────────────────────────────────┐
│  🥕  Your whole milk expires tomorrow                        │
│       Moody found 3 recipes — tap to see them               │
└─────────────────────────────────────────────────────────────┘
```

**Spec:**
- Position: slides down from top of screen, below the status bar
- Width: `calc(100% - 32px)`, max-width `480px`, centred
- Background: `--color-surface-card`
- Border radius: `--radius-xl`
- Shadow: `--elevation-3`
- Padding: `12px 16px`
- Icon: 20px emoji, left-aligned
- Title: `14px/600 --color-text-primary`
- Body: `12px/400 --color-text-secondary`, max 1 line
- Auto-dismiss: after 5 seconds
- Tap → navigates to deep link and marks notification read
- Swipe up → dismisses immediately
- If multiple toasts queue: stack with 8px gap; max 2 visible at once; extras queue

```css
.notification-toast {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 8px);
  left: 16px;
  right: 16px;
  max-width: 480px;
  margin: 0 auto;
  background: var(--color-surface-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-3);
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  z-index: 9999;
  animation: toast-in 280ms var(--ease-out),
             toast-out 200ms var(--ease-out) 4.8s forwards;
}
@keyframes toast-in {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);     opacity: 1; }
}
@keyframes toast-out {
  from { transform: translateY(0);     opacity: 1; }
  to   { transform: translateY(-100%); opacity: 0; }
}
```

**🔔 Bell icon badge (top navigation bar):**
```css
.notification-bell-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  background: var(--color-allergen-critical);  /* red */
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid var(--color-surface-bg);  /* creates the "ring" separation */
}
```

- Shows numeric count when unread notifications > 0
- "99+" when count > 99
- Hidden when count = 0
- Animates in with a `scale(1.2) → scale(1)` bounce when count increases

---

## 8. Motion & Animation

| Property | Value | Usage |
|---|---|---|
| Default duration | `200ms` | Button presses, tab switches |
| Enter duration | `280ms` | Card appear, screen transitions |
| Easing | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | All transitions (ease-out) |
| Scale press | `scale(0.97)` | Tap feedback on buttons/cards |
| Skeleton shimmer | `1.4s` linear infinite | Loading placeholders |
| Moody thinking pulse | `1.2s` ease-in-out infinite | Moody avatar pulse while AI processes |
| FAB pulse ring | `2s` ease-out × 3 cycles | First-launch attention animation on FAB |
| Pantry status update | `300ms` ease-out | Icon transitions when re-checking after serving change |

---

## 9. Imagery Guidelines

- **Style:** Clean top-down or 45° overhead food photography on neutral white/wood backgrounds
- **Color mood:** Bright, fresh, high contrast — greens especially punchy
- **Aspect ratio:** 16:9 for menu card images; 1:1 for ingredient chips; full-bleed hero
- **Background removal:** Not used — full scene photos preferred
- **Alt text:** Always descriptive, e.g. "Bowl of broccoli, spinach and snap peas on white surface"

---

## 10. Accessibility

| Standard | Requirement |
|---|---|
| Color contrast | AA minimum — all text on backgrounds ≥ 4.5:1 |
| Touch targets | Minimum `44×44px` for all interactive elements |
| Focus indicators | `2px solid --color-primary`, `2px offset` |
| Font minimum | `12px` rendered size — no smaller |
| Images | All food images have descriptive `alt` text |
| Motion | Respect `prefers-reduced-motion` — disable scale/slide transitions |
| Nav buttons | All bottom nav and sidebar nav items must have `aria-label` even when visible text label is shown |
| Status icons | Pantry status icons (✅/⚠️/🛒) must never rely on colour or icon alone — always pair with text ("in pantry", "low stock", "need to buy") |
| Cook Mode | Step text minimum `20px`; Previous/Next controls minimum `64×64px` tap targets; voice commands must have visual equivalents |

### Error State Patterns

Applied whenever an operation fails. Moody never shows technical error messages to users.

| Scenario | Pattern |
|---|---|
| **Moody API timeout / failure** | Moody avatar with neutral expression + message: "Something went wrong on my end — want to try again?" + [Retry] primary button. Never show status codes or stack traces. |
| **Network offline — general** | Top banner: "No internet connection" in `--color-status-need` bg. Non-blocking — user can still browse saved/cached content. |
| **Network offline — Cook Mode** | Replace wake lock banner with: "No connection — your recipe is saved locally. Keep cooking!" in `--color-surface-wake` bg. Session continues fully offline. |
| **Recipe import failure** | Toast (bottom, 4s): "I couldn't read that URL. Try a different link or paste the recipe text." + [Try again] + [Paste manually] actions. |
| **Pantry cross-reference failure** | Ingredients tab: inline message "Pantry check unavailable — tap to retry" replacing status icons. Does not block recipe viewing. |
| **Session not found** | Cook Mode: "This session has expired — want to start fresh?" + [Start over] + [Back to recipe]. |

### Loading / Skeleton State Patterns

| Scenario | Pattern |
|---|---|
| **Moody processing mood → recipes** | Moody avatar pulse animation + caption "Finding your recipes…" + 3 skeleton recipe cards (same card dimensions, shimmer fill) |
| **Recipe import processing** | Full-screen loader with Moody avatar + "Reading the recipe…" caption |
| **Ingredients tab opening (pantry check)** | Inline shimmer on each ingredient row's status icon for ~1s while `pantry-recipe-compare` runs |
| **Search results loading** | Skeleton list cards — same height/structure as result cards, shimmer fill |
| **Recipe Detail image loading** | `--color-surface-pill` placeholder fills hero area; cross-fades to image on load (`transition: opacity 300ms`) |

---

## 11. Design Tokens (CSS Custom Properties)

```css
:root {
  /* ── Brand Colors ─────────────────────────────────────────── */
  --color-primary: #3D5A1E;
  --color-primary-light: #4E7228;
  --color-primary-muted: #6B8F4A;
  --color-surface-bg: #E9F0E1;
  --color-surface-card: #FFFFFF;
  --color-surface-pill: #D9E6CF;
  --color-surface-wake: rgba(61, 90, 30, 0.06);

  /* ── Text Colors ──────────────────────────────────────────── */
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;        /* hints, "optional", eyebrows, timestamps */
  --color-text-on-primary: #FFFFFF;

  /* ── Accent Colors ────────────────────────────────────────── */
  --color-accent-badge: #D4287A;      /* category / featured recipe badge */

  /* ── Functional Status Colors ─────────────────────────────── */
  --color-status-have: #16A34A;       /* Pantry: in stock ✅ */
  --color-status-partial: #F59E0B;    /* Pantry: low stock ⚠️ */
  --color-status-need: #D97706;       /* Pantry: need to buy 🛒 */
  --color-skill-push: #7C3AED;        /* Skill Push badge ↑ */
  --color-ingredient-active: #FEF3C7; /* Active step ingredient highlight */
  --color-moody-bubble: #D9E6CF;      /* Moody callout bubble bg */

  /* ── Allergen Severity Colors ─────────────────────────────── */
  --color-allergen-critical: #DC2626;   /* 🔴 life-threatening — hard filter */
  --color-allergen-intolerant: #D97706; /* 🟡 intolerant — strong exclusion */
  --color-allergen-soft: #EA580C;       /* 🟠 prefer to avoid — soft filter */

  /* ── Utility Colors ───────────────────────────────────────── */
  --color-overlay-nav: rgba(61, 90, 30, 0.55);
  --color-shadow: rgba(0, 0, 0, 0.08);
  --color-divider: #E5E7EB;
  --color-border: #E5E7EB;            /* input/card/chip borders (alias of divider) */
  --color-error: #DC2626;             /* destructive actions / error text */
  --color-primary-rgb: 61, 90, 30;    /* for rgba(var(--color-primary-rgb), α) tints */

  /* ── Typography ───────────────────────────────────────────── */
  --font-family: system-ui, -apple-system, "Inter", sans-serif;
  --text-hero-title: 800 2rem/1.15 var(--font-family);
  --text-card-title: 700 1.625rem/1.2 var(--font-family);
  --text-section-heading: 700 1.25rem/1.3 var(--font-family);
  --text-nav-title: 600 1.125rem/1.4 var(--font-family);
  --text-body: 400 0.9375rem/1.55 var(--font-family);
  --text-caption: 400 0.8125rem/1.4 var(--font-family);
  --text-label-sm: 500 0.75rem/1.3 var(--font-family);
  /* Cook Mode step text — kitchen-optimised readability */
  --text-step-body: 400 1.25rem/1.7 var(--font-family);     /* 20px mobile */
  --text-step-body-lg: 400 1.375rem/1.7 var(--font-family); /* 22px tablet+ */

  /* ── Spacing ──────────────────────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ── Border Radius ────────────────────────────────────────── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* ── Shadows / Elevation ──────────────────────────────────── */
  /* `--shadow-N` is canonical; `--elevation-N` is a kept alias because
     component specs above reference both names interchangeably. */
  --shadow-1: 0 1px 4px rgba(0,0,0,0.06);
  --shadow-2: 0 2px 12px rgba(0,0,0,0.08);
  --shadow-3: 0 4px 24px rgba(0,0,0,0.12);
  --elevation-1: var(--shadow-1);
  --elevation-2: var(--shadow-2);
  --elevation-3: var(--shadow-3);

  /* ── Motion ───────────────────────────────────────────────── */
  --duration-fast: 200ms;
  --duration-normal: 280ms;
  --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```
