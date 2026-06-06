# MoodFood Wireframes — All Screen Dimensions

> **Scope & status.** Build scope is governed by the blueprint set (`00-MASTER-BLUEPRINT.md` → `03-implementation-roadmap.md`). These wireframes draw the **full** product vision; not all of it is MVP. Screen headings carry one of:
> - *(untagged)* — **MVP**, part of the core build (blueprint Phases 0–8).
> - **`[ROADMAP]`** — designed, but ships **post-MVP** (blueprint Phase 9 / master-plan Phase 2–3). Includes: Decide-for-Me, Collections, the Deep-Dive onboarding modules + Moody-chat onboarding path, Pantry, Allergen Substitution, Notifications settings/centre, Profile Sharing, Skill-Upgrade prompt, and the Admin CMS.
> - **`[LEGACY — NOT MOODFOOD]`** — a leftover restaurant-delivery template (Screens 1–3); kept only as a responsive-layout reference, **not** a MoodFood surface.
>
> **Onboarding paths (Screens 9–13):** MVP ships **Quick Setup** (Screen 9Q) and the **6-step standard wizard** (Screens 10, 10b, 11, 12, 13, 13b). The Deep-Dive modules (10c–10g, 13c–13f) and the Moody-chat path are `[ROADMAP]`. Progress reads **"Step X of 6"** in MVP; **"Module X of 15"** is the Deep-Dive variant.
>
> **Mood sets:** 6 personalised mood **definitions** (Screen 13) · 9 **check-in** moods (Screen 14) · 15-state **Emotional Food Map** (Screen 10e, `[ROADMAP]`). See `ICON_AUDIT.md §2`.

## Breakpoint System

| Name | Range | Target Device |
|---|---|---|
| `xs` | 320px–374px | iPhone SE, small Android |
| `sm` | 375px–430px | iPhone 14/15, standard Android |
| `md` | 431px–767px | iPhone 15 Pro Max, large phones |
| `lg` | 768px–1023px | iPad Mini, small tablet |
| `xl` | 1024px–1279px | iPad Pro 11", large tablet |
| `2xl` | 1280px+ | Desktop, iPad Pro 13"+ |

---

## Responsive Layout Grid

```
xs/sm/md  →  1 column,  horizontal padding: 16px
lg        →  2 columns, horizontal padding: 32px
xl        →  2 columns, horizontal padding: 48px,  max content width: 960px
2xl       →  3 columns, horizontal padding: 64px,  max content width: 1200px
```

---

---

> ⚠️ **LEGACY SCREENS — NOT MOODFOOD:** Screens 1, 2, and 3 below originated from a food-delivery restaurant ordering template. They describe restaurant menus, delivery carts, and restaurant-style food detail pages. They are **not** part of MoodFood and should not be used as reference for building. The canonical MoodFood screens begin at **Screen 4 (Splash Screen)**. Screens 1–3 are retained below for historical reference only and will be removed in the next document revision.

---

## Screen 1 — Restaurant Menu [LEGACY — NOT MOODFOOD]

### XS (320–374px)

```
┌──────────────────────────────────────┐  320px
│  STATUS BAR (24px)                   │
├──────────────────────────────────────┤
│  [◄] ← 36px btn   Restaurants Manu  │  [···] 36px btn
│       ↑ 8px gap   font: 16px/600     │  height: 56px
├──────────────────────────────────────┤
│  ← 16px pad                          │
│  [Featured ▪] [Protein Plates] [Sal…]│  scroll→
│   pill h:40px  gap:8px               │
│                               16px → │
├──────────────────────────────────────┤
│  ← 16px pad                 16px →   │
│  ┌──────────────────────────────┐    │
│  │ Greens Bowl         [🛍 36px]│    │
│  │ font: 22px/700               │    │
│  │ Broccoli florets, Spinach…   │    │  card
│  │ font: 13px  2 lines max      │    │  margin
│  │                              │    │  bottom
│  │ $12.75 • 800 CALS            │    │  16px
│  │ font: 13px/500               │    │
│  │ ┌──────────────────────────┐ │    │
│  │ │     [food image 160px h] │ │    │
│  │ └──────────────────────────┘ │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ Rainbow Veggie      [🛍]     │    │
│  │ ...                          │    │
│  └──────────────────────────────┘    │
├──────────────────────────────────────┤
│  BOTTOM NAV (68px + safe area)       │
│  [🏠]    [🍽●]    [🎁]    [⊞]       │
│  nav circles: 40px  active: primary  │
└──────────────────────────────────────┘
```

### SM (375–430px) — Primary design target

```
┌────────────────────────────────────────────┐  375px
│  STATUS BAR (44px — iOS notch devices)     │
├────────────────────────────────────────────┤
│  [◄ 40px]    Restaurants Manu    [··· 40px]│  56px
├────────────────────────────────────────────┤
│ ←16px                                16px→ │
│  [Featured ▪▪] [Protein Plates] [Salads] …→│  48px
├────────────────────────────────────────────┤
│ ←16px                                16px→ │
│  ┌────────────────────────────────────┐    │
│  │ Greens Bowl              [🛍 44px] │    │
│  │ font: 26px/700                     │    │
│  │ Broccoli florets, Spinach, Salt,   │    │
│  │ Black pepper, Springtime Green...  │    │  card
│  │ font: 14px                         │    │  margin
│  │                                    │    │  bottom
│  │ $12.75  •  800 CALS                │    │  16px
│  │ font: 14px/600                     │    │
│  │ ┌──────────────────────────────┐   │    │
│  │ │    [food image ~200px tall]  │   │    │
│  │ └──────────────────────────────┘   │    │
│  └────────────────────────────────────┘    │
│                                            │
│  ┌────────────────────────────────────┐    │
│  │ Rainbow Veggie           [🛍]      │    │
│  │ ...                                │    │
│  └────────────────────────────────────┘    │
├────────────────────────────────────────────┤
│  BOTTOM NAV (72px + 34px safe area)        │
│   [🏠 44px] [🍽● 48px] [🎁 44px] [⊞ 44px]│
└────────────────────────────────────────────┘
```

### MD (431–767px)

```
┌───────────────────────────────────────────────────┐  430px+
│  STATUS BAR                                       │
├───────────────────────────────────────────────────┤
│  [◄ 44px]    Restaurants Menu    [··· 44px]        │  60px
├───────────────────────────────────────────────────┤
│ ←24px                                       24px→ │
│  [Featured ▪▪] [Protein Plates] [Salads] [Bowls]…→│  52px
├───────────────────────────────────────────────────┤
│ ←24px                                       24px→ │
│  ┌─────────────────────────────────────────────┐  │
│  │ Greens Bowl                      [🛍 48px]  │  │
│  │ font: 28px/700                              │  │
│  │ Broccoli florets, Spinach, Salt, Black      │  │
│  │ pepper, Springtime Green...                 │  │
│  │ font: 15px                                  │  │
│  │                                             │  │
│  │ $12.75  •  800 CALS                         │  │
│  │ ┌───────────────────────────────────────┐   │  │
│  │ │      [food image ~220px tall]         │   │  │
│  │ └───────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────┤
│  BOTTOM NAV (72px + safe area)                    │
└───────────────────────────────────────────────────┘
```

### LG (768px–1023px) — Tablet portrait: 2-column card grid

```
┌────────────────────────────────────────────────────────────────┐  768px
│  STATUS BAR                                                    │
├────────────────────────────────────────────────────────────────┤
│  [◄]        Restaurants Menu                          [···]    │  64px
├────────────────────────────────────────────────────────────────┤
│ ←32px                                                   32px→ │
│  [Featured▪▪] [Protein Plates] [Salads] [Bowls] [Smoothies]   │  52px (no scroll needed)
├────────────────────────────────────────────────────────────────┤
│ ←32px                             gap:16px             32px→  │
│  ┌──────────────────────────┐    ┌──────────────────────────┐  │
│  │ Greens Bowl      [🛍]    │    │ Rainbow Veggie   [🛍]    │  │
│  │ font: 22px               │    │ ...                       │  │
│  │ Broccoli florets…        │    │                           │  │
│  │ $12.75 • 800 CALS        │    │ $13.50 • 650 CALS        │  │
│  │ [food image ~180px tall] │    │ [food image ~180px tall] │  │
│  └──────────────────────────┘    └──────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────┐    ┌──────────────────────────┐  │
│  │ Lemon Quinoa Bowl [🛍]   │    │ ...                       │  │
│  └──────────────────────────┘    └──────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  BOTTOM NAV (80px)  — wider tap targets                        │
└────────────────────────────────────────────────────────────────┘
```

### XL (1024px–1279px) — Tablet landscape: sidebar + content

```
┌────────────────────────────────────────────────────────────────────────────────┐  1024px
│  TOP BAR (56px): [◄] Restaurants Menu [···]                max-width: 960px   │
├─────────────────┬──────────────────────────────────────────────────────────────┤
│  SIDEBAR 240px  │  CONTENT AREA                                                │
│  ─────────────  │  ← 48px pad                                        48px → │
│  [Profile]      │  [Featured] [Protein Plates] [Salads] [Bowls] [Smoothies]   │
│  ─────────────  │  ──────────────────────────────────────────────────────────  │
│  • Featured   ◄ │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  • Protein Plt  │  │ Greens Bowl    │  │ Rainbow Veggie │  │ Lemon Quinoa   │ │
│  • Salads       │  │ [🛍]           │  │ [🛍]           │  │ [🛍]           │ │
│  • Bowls        │  │ $12.75 800CAL  │  │ $13.50 650CAL  │  │ $11.00 520CAL  │ │
│  • Smoothies    │  │ [food image]   │  │ [food image]   │  │ [food image]   │ │
│  ─────────────  │  └────────────────┘  └────────────────┘  └────────────────┘ │
│  [Bag icon]     │  ┌────────────────┐  ┌────────────────┐  ...               │
│  [Home]         │  │ ...            │  │ ...            │                    │
│  [Rewards]      │  └────────────────┘  └────────────────┘                    │
└─────────────────┴──────────────────────────────────────────────────────────────┘
  No bottom nav — sidebar handles navigation
```

### 2XL (1280px+) — Desktop: 3-column grid, max-width container

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐  1280px+
│  TOP BAR (64px):  [◄]  Restaurants Menu  [···]                                           │
│                                         centered, max-width: 1200px                      │
├─────────────────┬────────────────────────────────────────────────────────────────────────┤
│  SIDEBAR 280px  │  ← 64px                                                        64px →  │
│                 │  [Featured] [Protein Plates] [Salads] [Bowls] [Smoothies] [Drinks]      │
│  [Logo]         │  ──────────────────────────────────────────────────────────────────── │
│  ─────────────  │                                                                        │
│  CATEGORIES     │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  • Featured   ◄ │  │ Greens Bowl  │  │ Rainbow Veg  │  │ Lemon Quinoa │  │ Avo Plate  │ │
│  • Protein Plt  │  │ [🛍]         │  │ [🛍]         │  │ [🛍]         │  │ [🛍]       │ │
│  • Salads       │  │ $12.75       │  │ $13.50       │  │ $11.00       │  │ $15.00     │ │
│  • Bowls        │  │ 800 CALS     │  │ 650 CALS     │  │ 520 CALS     │  │ 780 CALS   │ │
│  • Smoothies    │  │ [food img]   │  │ [food img]   │  │ [food img]   │  │ [food img] │ │
│  • Drinks       │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│  ─────────────  │                                                                        │
│  [Your Bag]     │  ┌──────────────┐  ┌──────────────┐  ...                              │
│  [Home]         │  │ ...          │  │ ...          │                                   │
│  [Rewards]      │  └──────────────┘  └──────────────┘                                   │
└─────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 2 — Your Bag / Cart [LEGACY — NOT MOODFOOD]

### XS (320–374px)

```
┌──────────────────────────────────────┐
│  STATUS BAR                          │
├──────────────────────────────────────┤
│  [◄]        Your bag        [···]    │  56px
├──────────────────────────────────────┤  ← scroll start
│ ←16px                        16px→  │
│  ┌──────────────────────────────┐   │
│  │ [●] Protein Plates (pink)    │   │
│  │ Rainbow Veggie Quinoa    ┌───┤   │
│  │ Power Bowl               │img│   │  card
│  │ Herbed shredded          │80x│   │  margin
│  │ $14.75                   │80 │   │  12px
│  │                      [─ 02 +]   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ [●] Featured (pink)          │   │
│  │ Rainbow Veggie Quinoa    ┌───┤   │
│  │ Power Bowl               │img│   │
│  │ Herbed shredded          │80x│   │
│  │ $10.50                   │80 │   │
│  │                      [─ 01 +]   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ [🏷] You're about to get     │   │
│  │      Grillix rewarded        │   │
│  │ You're 350 pts from a Free   │   │  rewards
│  │ Rosemary Focaccia!           │   │  card
│  │                              │   │
│  │ [___Promo code____] [ Add ]  │   │
│  └──────────────────────────────┘   │
├──────────────────────────────────────┤  ← scroll end
│  ─────── (light divider) ─────────  │
│  Subtotal              $14.75        │  40px
│                                      │
│  ┌────────────────────────────────┐  │
│  │    Continue to checkout        │  │  56px
│  └────────────────────────────────┘  │
│  (safe area)                         │
└──────────────────────────────────────┘
```

### SM (375–430px) — Primary target

```
┌────────────────────────────────────────────┐
│  STATUS BAR (44px)                         │
├────────────────────────────────────────────┤
│  [◄]          Your bag            [···]    │  56px
├────────────────────────────────────────────┤  scroll
│ ←16px                              16px→  │
│  ┌──────────────────────────────────────┐  │
│  │ [●] Protein Plates              ┌──┐ │  │
│  │ Rainbow Veggie Quinoa           │  │ │  │
│  │ Power Bowl                      │img│ │  │  card h ~120px
│  │ Herbed shredded                 │88x│ │  │
│  │ $14.75                          │88 │ │  │
│  │                          [─ 02 +] │ │  │
│  └──────────────────────────────────┘  │  │
│  (gap 12px)                            │  │
│  ┌──────────────────────────────────┐  │  │
│  │ [●] Featured                ┌──┐ │  │
│  │ Rainbow Veggie Quinoa       │img│ │  │
│  │ Power Bowl                  │   │ │  │
│  │ $10.50                 [─ 01 +] │  │
│  └──────────────────────────────────┘  │  │
│  (gap 12px)                            │  │
│  ┌──────────────────────────────────┐  │  │
│  │ [🏷 48px sq]  You're about to   │  │  │
│  │               get Grillix       │  │  │
│  │               rewarded          │  │  │
│  │ You're 350 pts from a Free      │  │  │  rewards
│  │ Rosemary Focaccia!              │  │  │  card
│  │                                 │  │  │
│  │ [_____Enter promo code____] [Add│] │  │
│  └──────────────────────────────────┘  │  │
├────────────────────────────────────────────┤  sticky footer
│  Subtotal                      $14.75      │  44px
├────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │
│  │       Continue to checkout           │  │  56px
│  └──────────────────────────────────────┘  │
│  (34px safe area)                          │
└────────────────────────────────────────────┘
```

### MD (431–767px)

```
┌───────────────────────────────────────────────────┐
│  STATUS BAR                                       │
├───────────────────────────────────────────────────┤
│  [◄]           Your bag                [···]      │  60px
├───────────────────────────────────────────────────┤  scroll
│ ←24px                                      24px→ │
│  ┌───────────────────────────────────────────┐   │
│  │ [●] Protein Plates                   ┌──┐ │   │  card h: 128px
│  │ Rainbow Veggie Quinoa Power Bowl     │img│ │   │
│  │ Herbed shredded                      │96x│ │   │
│  │ $14.75                               │96 │ │   │
│  │                              [─ 02 +]    │   │
│  └───────────────────────────────────────┘   │   │
│  (16px gap)                                  │   │
│  ┌───────────────────────────────────────┐   │   │
│  │ Featured item...                  [img]   │
│  │ $10.50                        [─ 01 +]   │
│  └───────────────────────────────────────┘   │   │
│  Rewards card (full width)                   │   │
├───────────────────────────────────────────────────┤  sticky
│  Subtotal                            $14.75       │  48px
├───────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐  │
│  │          Continue to checkout               │  │  60px
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

### LG (768px+) — Side-by-side cart + summary

```
┌────────────────────────────────────────────────────────────────┐
│  [◄]  Your bag  [···]                           max-w: 960px   │  64px
├─────────────────────────────────┬──────────────────────────────┤
│  CART ITEMS (left 60%)          │  ORDER SUMMARY (right 40%)   │
│                                 │                              │
│  [Protein Plates card full w]   │  ┌──────────────────────┐   │
│  [Featured card full w]         │  │ Order Summary        │   │
│  [Rewards / promo card]         │  │                      │   │
│                                 │  │ Items (3)   $25.25   │   │
│                                 │  │ Delivery     $2.99   │   │
│                                 │  │ ─────────────────── │   │
│                                 │  │ Total       $28.24   │   │
│                                 │  │                      │   │
│                                 │  │ [Enter promo code]   │   │
│                                 │  │ [Add]                │   │
│                                 │  │                      │   │
│                                 │  │ [Continue to checkout│   │
│                                 │  └──────────────────────┘   │
│                                 │  (sticky on scroll)         │
└─────────────────────────────────┴──────────────────────────────┘
  No bottom nav on lg+ — sidebar or top nav handles navigation
```

---

## Screen 3 — Food Detail [LEGACY — NOT MOODFOOD]

### XS (320–374px)

```
┌──────────────────────────────────────┐
│  [◄ overlay]    ← absolute   [···]   │  ← over hero image
│                                      │
│                                      │
│         [HERO IMAGE]                 │  260px tall
│         full bleed                   │
│         object-fit: cover            │
│                                      │
├──────────────────────────────────────┤
│ ←16px                        16px→  │
│  Green Veggie Bowl                   │  font: 26px/700
│                                      │
│  Broccoli florets, Spinach, Salt,    │  font: 13px
│  Black pepper, Springtime Green,     │  color: secondary
│  Spinach Arugula or other leafy      │
│  greens, Fresh mint...               │
│                                      │
│  ┌─────┬──────────┬──────┬────────┐  │  stats row
│  │Manu │Est.Cals  │Ingr. │Deliver │  │  font: 11px label
│  │Price│          │      │Time    │  │  font: 15px value
│  │$12.75│800      │12    │55m     │  │
│  └─────┴──────────┴──────┴────────┘  │
│                                      │
│  Ingredients               [See All] │  section header 18px
│                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ 🥦   │  │  🥬  │  │  🥬  │       │  ingredient chips
│  │Brocc │  │Brass │  │Spin  │       │  76×76px
│  └──────┘  └──────┘  └──────┘       │
└──────────────────────────────────────┘
```

### SM (375–430px) — Primary target

```
┌────────────────────────────────────────────┐
│  [◄ 44px overlay]              [··· 44px]  │  ← absolute, over hero
│                                            │
│                                            │
│              [HERO IMAGE]                  │  320px tall
│              full bleed                    │  (~ 46vw)
│              object-fit: cover             │
│                                            │
│                                            │
├────────────────────────────────────────────┤  ← content panel slides up
│ ←16px                              16px→  │
│  Green Veggie Bowl                         │  font: 30px/700, mt: 20px
│                                            │
│  Broccoli florets, Spinach, Salt, Black    │  font: 14px/1.55
│  pepper, Springtime Green, Spinach Arugula │  color: --text-secondary
│  or other leafy greens, Fresh mint...      │
│                                            │
│  ┌──────────┬────────────┬───────┬───────┐ │
│  │Manu Price│Est.Calories│Ingred.│Deliv. │ │  stats row
│  │  $12.75  │    800     │  12   │  55m  │ │  label: 11px italic
│  └──────────┴────────────┴───────┴───────┘ │  value: 16px/600
│                                            │
│  Ingredients                    [See All]  │  20px/700 + outlined pill
│                                            │
│  ┌────────┐  ┌────────┐  ┌────────┐        │
│  │  🥦    │  │   🥬   │  │   🥬   │        │  ingredient chips
│  │Broccoli│  │Brassica│  │Spinach │        │  88×88px each
│  └────────┘  └────────┘  └────────┘        │  gap: 12px
│                                            │
│  (16px bottom padding)                     │
└────────────────────────────────────────────┘
  Note: no bottom nav visible on detail — back nav handles exit
```

### MD (431–767px)

```
┌───────────────────────────────────────────────────┐
│  [◄ overlay]                          [··· overlay]│
│                                                   │
│              [HERO IMAGE]                         │  360px tall
│              full bleed                           │
│                                                   │
├───────────────────────────────────────────────────┤
│ ←24px                                      24px→ │
│  Green Veggie Bowl                                │  font: 34px/700
│                                                   │
│  Description text 2-3 lines                       │  font: 15px
│                                                   │
│  ┌──────────┬────────────┬───────────┬──────────┐ │
│  │Manu Price│Est.Calories│Ingredients│Deliv.Time│ │  stats row — equal cols
│  │ $12.75   │ 800        │ 12        │ 55m      │ │
│  └──────────┴────────────┴───────────┴──────────┘ │
│                                                   │
│  Ingredients                         [See All]    │
│                                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ 🥦     │ │  🥬    │ │  🥬    │ │ +more  │     │  4 chips at 96×96px
│  │Broccoli│ │Brassica│ │Spinach │ │        │     │
│  └────────┘ └────────┘ └────────┘ └────────┘     │
└───────────────────────────────────────────────────┘
```

### LG (768px+) — Two-column detail layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [◄]  Green Veggie Bowl  [···]                    max-w: 960px   │  64px
├──────────────────────────────────────┬───────────────────────────┤
│  LEFT: Image panel (50%)             │  RIGHT: Info panel (50%)  │
│                                      │                           │
│  ┌────────────────────────────────┐  │ ←32px             32px→  │
│  │                                │  │  Green Veggie Bowl        │  font: 36px
│  │      [HERO IMAGE]              │  │  (no hero — left panel)   │
│  │      ~400px × auto             │  │  Description text...      │
│  │      rounded corners           │  │  font: 15px               │
│  │      border-radius: 20px       │  │                           │
│  └────────────────────────────────┘  │  ┌──┬──┬──┬──┐           │
│                                      │  │  │  │  │  │  stats    │
│  Ingredient chips row                │  └──┴──┴──┴──┘           │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │                           │
│  │🥦  │ │ 🥬 │ │ 🥬 │ │... │ │... │ │  Ingredients  [See All]  │
│  └────┘ └────┘ └────┘ └────┘ └────┘ │                           │
│  5 chips at 96×96px                  │  ┌───┐ ┌───┐ ┌───┐       │
│                                      │  │🥦 │ │ 🥬│ │ 🥬│       │
│                                      │  └───┘ └───┘ └───┘       │
│                                      │                           │
│                                      │  [  Add to Bag  $12.75 ] │  CTA button
└──────────────────────────────────────┴───────────────────────────┘
```

### XL / 2XL (1024px+) — Rich desktop layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TOP NAV: [◄]  [MoodFood Logo]  [Categories ▾]  [Search]  [🛍 Bag]          │
├─────────────────────┬────────────────────────────────────────────────────────┤
│  BREADCRUMB NAV     │                                                        │
│  Menu > Salads >    │  ┌─────────────────────────────────┐  ┌────────────┐  │
│  Green Veggie Bowl  │  │                                 │  │  ADD TO    │  │
│                     │  │        [HERO IMAGE]              │  │  BAG PANEL │  │
│  RELATED ITEMS      │  │        600px × 400px             │  │            │  │
│  ┌───┐ ┌───┐ ┌───┐  │  │        rounded 20px              │  │ $12.75     │  │
│  │   │ │   │ │   │  │  └─────────────────────────────────┘  │ 800 cals   │  │
│  └───┘ └───┘ └───┘  │                                        │            │  │
│                     │  Green Veggie Bowl                      │ [Qty ─ 1 +]│  │
│  RATING             │  font: 40px/700                         │            │  │
│  ★★★★☆ 4.2         │                                        │ [Add $12.75│  │
│  (128 reviews)      │  Full ingredient description            │  to bag  ] │  │
│                     │                                        └────────────┘  │
│                     │  ┌─────┬──────────┬──────────┬─────────┐              │
│                     │  │Price│  Cals    │Ingredients│Delivery │              │
│                     │  │$12.75│  800    │    12    │  55m    │              │
│                     │  └─────┴──────────┴──────────┴─────────┘              │
│                     │                                                        │
│                     │  Ingredients                         [See All]        │
│                     │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│                     │  │ 🥦 │ │ 🥬 │ │ 🥬 │ │ 🧅 │ │ 🌿 │ │ +6 │           │
│                     │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘           │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior Rules

### Layout Transitions

| Breakpoint | Layout Mode | Navigation | Card Grid |
|---|---|---|---|
| xs, sm, md | Single column, full-width cards | Bottom tab bar | 1 column |
| lg | Two-column cards, tab bar | Bottom tab bar | 2 columns |
| xl | Sidebar (240px) + content | Left sidebar | 3 columns |
| 2xl | Sidebar (280px) + content | Left sidebar | 4 columns |

### Component Scaling Rules

**Filter Tab Bar**
- xs/sm/md: Horizontally scrollable, `overflow-x: auto`, snap scrolling
- lg: Wraps or fits in one row (no scroll needed)
- xl+: Replaces tab bar with sidebar category list

**Menu Cards**
- xs: Image height `160px`
- sm: Image height `200px`
- md: Image height `220px`
- lg+: Image height `180px` (2-column grid, shorter cards)

**Hero Image (Detail Screen)**
- xs: `260px` fixed height
- sm: `min(320px, 46vw)`
- md: `min(360px, 48vw)`
- lg+: Left panel, `auto` height fills panel

**Bottom Navigation**
- xs/sm/md: Fixed bottom, icon-only, `72px` + safe-area
- lg: Bottom nav retained (portrait tablet)
- xl+: Hidden — replaced by left sidebar

**Typography Scaling**

| Element | xs | sm | lg | xl |
|---|---|---|---|---|
| Card title | 22px | 26px | 22px | 20px |
| Hero food name | 26px | 30px | 36px | 40px |
| Body text | 13px | 14px | 15px | 15px |
| Stats value | 14px | 16px | 16px | 18px |

**Touch Targets**
- All breakpoints: minimum `44×44px`
- xl+: `40×40px` acceptable (cursor users)

**Cart Footer**
- xs/sm/md: Sticky to bottom of viewport above safe area
- lg: Sticky within scroll container (right sidebar panel)
- xl+: Fixed right panel — always visible

---

## CSS Responsive Skeleton

```css
/* Base (xs — 320px) */
.screen {
  background: var(--color-surface-bg);
  min-height: 100dvh;
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

.content-container {
  padding: 0 16px;
  max-width: 100%;
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.filter-tabs {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 10px;
  padding: 0 16px;
  scrollbar-width: none;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(72px + env(safe-area-inset-bottom));
  display: flex;
}

/* sm — 375px */
@media (min-width: 375px) {
  .hero-image { height: clamp(280px, 46vw, 360px); }
  .card-title { font-size: 1.625rem; }
}

/* md — 431px */
@media (min-width: 431px) {
  .content-container { padding: 0 24px; }
  .menu-card-image { height: 220px; }
}

/* lg — 768px: 2-column card grid */
@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .content-container { padding: 0 32px; }
  .filter-tabs { overflow-x: visible; flex-wrap: wrap; }
  .hero-image { height: auto; }

  /* Detail: two-column layout */
  .detail-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
}

/* xl — 1024px: sidebar navigation */
@media (min-width: 1024px) {
  .app-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
  }

  .bottom-nav { display: none; }
  .sidebar-nav { display: flex; flex-direction: column; }

  .card-grid { grid-template-columns: repeat(3, 1fr); }
  .content-container {
    padding: 0 48px;
    max-width: 960px;
    margin: 0 auto;
  }
}

/* 2xl — 1280px: 4-column grid, wider sidebar */
@media (min-width: 1280px) {
  .app-layout { grid-template-columns: 280px 1fr; }
  .card-grid { grid-template-columns: repeat(4, 1fr); }
  .content-container {
    padding: 0 64px;
    max-width: 1200px;
  }

  /* Detail: image left, sticky info right */
  .detail-layout {
    grid-template-columns: 55% 1fr;
    align-items: start;
  }

  .detail-info-panel {
    position: sticky;
    top: 80px;
  }
}
```

---

## Interaction States

| State | Visual Treatment |
|---|---|
| Default | As specified per component |
| Hover (pointer device) | `opacity: 0.9`, cursor: pointer |
| Active / Pressed | `transform: scale(0.97)`, `200ms ease-out` |
| Focus (keyboard) | `outline: 2px solid var(--color-primary)`, `outline-offset: 2px` |
| Disabled | `opacity: 0.4`, `pointer-events: none` |
| Loading (card) | Skeleton shimmer, same card dimensions |
| Empty state | Centered icon + headline + subtext inside content area |

---

## Safe Area Handling (Mobile)

```css
.screen {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}

.cart-footer {
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}
```

Always use `min-height: 100dvh` (not `100vh`) to account for dynamic browser chrome on mobile.

---

---

# Part 2 — MoodFood Full App Screens

All screens below follow the breakpoint system and responsive rules defined in Part 1. Each wireframe shows the primary mobile layout (375px) plus a tablet/desktop variant where the layout meaningfully differs. The notation `[sm]` means 375px target; `[lg+]` means 768px+.

---

## Screen 4 — Splash Screen

```
┌────────────────────────────────────────────┐  375×812px
│                                            │
│                                            │
│                                            │
│         ┌──────────────────────┐           │
│         │                      │           │
│         │   [MoodFood Logo]    │           │  logo: 120×120px
│         │   circular / icon    │           │  gentle float animation
│         │                      │           │  (slow up/down, 3s loop)
│         └──────────────────────┘           │
│                                            │
│              MoodFood                      │  font: 32px/800
│         Food that fits your mood           │  font: 16px/400
│                                            │
│         ● ● ●  (loading dots)              │  animated pulse
│                                            │
│                                            │
│                                            │
└────────────────────────────────────────────┘
  Background: --color-surface-bg (mint green)
  Duration: 2s then auto-navigate:
    → /setup/start   if first launch (no auth token)
    → /app/home      if auth token valid
    → /auth/login    if token expired
```

---

## Screen 5 — Landing Page (`/`)

### SM — Mobile

```
┌────────────────────────────────────────────┐
│  [MoodFood Logo]              [Log in] [▶] │  top nav, 60px
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │    [Hero food image — full bleed]    │  │  300px, parallax
│  │    Slow animated pan                 │  │
│  │                                      │  │
│  │  ┌──────────────────────────────┐    │  │
│  │  │  Food that fits              │    │  │  overlay text
│  │  │  your mood.                  │    │  │  font: 36px/800
│  │  └──────────────────────────────┘    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Tell Moody how you feel.                  │  font: 18px/400
│  She'll find what to cook.                 │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │         Start for free →             │  │  primary CTA 56px
│  └──────────────────────────────────────┘  │
│  Already a member? [Log in]                │
│                                            │
├────────────────────────────────────────────┤
│  HOW IT WORKS                              │
│                                            │
│  [😴 icon]  Tell Moody your mood           │
│  [🍳 icon]  Get matched recipes            │
│  [📋 icon]  Cook step-by-step              │
│  [📊 icon]  Track your food life           │
│                                            │
├────────────────────────────────────────────┤
│  PRICING PREVIEW                           │
│  Free 7-day trial · $10/mo · $100/yr       │
│  [See all plans →]                         │
├────────────────────────────────────────────┤
│  [Footer: Privacy · Terms · Contact]       │
└────────────────────────────────────────────┘
```

### LG+ — Desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [Logo]    How it works   Pricing   [Log in]   [Start free →]            │  top nav 72px
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ← 10% padding                                               10% pad → │
│  ┌──────────────────────────┐   ┌──────────────────────────────────────┐ │
│  │                          │   │                                      │ │
│  │  Food that fits          │   │   [Hero food image — full bleed]     │ │
│  │  your mood.              │   │   animated pan, border-radius: 24px  │ │
│  │  font: 56px/800          │   │   460px height                       │ │
│  │                          │   │                                      │ │
│  │  Tell Moody how you      │   └──────────────────────────────────────┘ │
│  │  feel. She'll find       │                                            │
│  │  what to cook.           │                                            │
│  │                          │                                            │
│  │  [Start for free →]      │                                            │
│  │  [Log in]                │                                            │
│  └──────────────────────────┘                                            │
│                                                                          │
│  ── HOW IT WORKS ─────────────────────────────────────────────────────── │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ [😴 icon]    │  │ [🍳 icon]    │  │ [📋 icon]    │  │ [📊 icon]    │ │
│  │ Tell Moody   │  │ Get matched  │  │ Cook step    │  │ Track your   │ │
│  │ your mood    │  │ recipes      │  │ by step      │  │ food life    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 6 — Auth: Sign Up (`/auth/signup`)

### SM

```
┌────────────────────────────────────────────┐
│  [◄ Back]                                  │  56px
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│                                            │
│  [MoodFood logo 64px]                      │  centered
│                                            │
│  Create your account                       │  font: 26px/700
│  7 days free, then $10/month               │  font: 14px, secondary
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Full name                            │  │  input 52px
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Email address                        │  │  input 52px
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Password                          👁 │  │  input 52px
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Confirm password                  👁 │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │        Create account →              │  │  primary btn 56px
│  └──────────────────────────────────────┘  │
│                                            │
│  ── or ─────────────────────────────────   │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [G icon]  Continue with Google     │  │  social btn 52px
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  [ icon]  Continue with Apple       │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Already have an account? [Log in]         │  font: 14px
│  By signing up you agree to [Terms]        │  font: 12px, secondary
└────────────────────────────────────────────┘
```

---

## Screen 7 — Auth: Log In (`/auth/login`)

### SM

```
┌────────────────────────────────────────────┐
│  [◄ Back]                                  │
├────────────────────────────────────────────┤
│ ←24px                                      │
│  [Logo 64px]                               │
│  Welcome back                              │  26px/700
│  Good to see you again                     │  14px, secondary
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Email address                        │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Password                          👁 │  │
│  └──────────────────────────────────────┘  │
│  [Forgot password?]         right-aligned  │  14px
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │             Log in →                 │  │  56px primary
│  └──────────────────────────────────────┘  │
│  ── or ────────────────────────────────    │
│  [G] Continue with Google                  │
│  [ ] Continue with Apple                   │
│  Don't have an account? [Sign up]          │
└────────────────────────────────────────────┘
```

---

## Screen 8 — Subscription / Pricing (`/subscribe`)

### SM

```
┌────────────────────────────────────────────┐
│  [◄ Back]         Choose your plan         │  56px
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│                                            │
│  Start with 7 days free                    │  20px/700
│  Cancel anytime · No credit card needed    │  13px, secondary
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  ⭐ MOST POPULAR                      │  │  badge
│  │  Annual                              │  │  selected state:
│  │  $100 / year  (2 months free)        │  │  border: 2px primary
│  │  = $8.33 / month                     │  │  bg: primary tint
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Monthly                             │  │
│  │  $10 / month                         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ✓ All features included                   │
│  ✓ Moody AI — unlimited                    │
│  ✓ Social recipe import                    │
│  ✓ Video library                           │
│  ✓ Multi-device sync                       │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │    Start free trial →                │  │  56px primary
│  └──────────────────────────────────────┘  │
│  [Continue without subscribing]            │  subtle link
└────────────────────────────────────────────┘
```

---

## Screen 9 — Onboarding: Welcome & Path Selection (`/setup/start`)

### SM

```
┌────────────────────────────────────────────┐
│                                            │  no progress bar — pre-step
├────────────────────────────────────────────┤
│                                            │
│      [Moody avatar — animated, 120px]      │
│         Warm, friendly illustrated face    │
│                                            │
│  Hi! I'm Moody.                            │  30px/800, centred
│                                            │
│  I'm going to learn how you eat,           │  16px/400, centred
│  what makes you happy, and how you         │
│  feel — then help you figure out           │
│  what to cook, every single day.           │
│                                            │
│  The more you tell me, the better          │  14px, --color-text-secondary
│  I get from the very first session.        │
│                                            │
│  How would you like to get started?        │  16px/600
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  ⚡ Quick Setup  (~5 min)            │  │  56px, outlined card
│  │  The essentials — I'll learn the     │  │  14px secondary inside
│  │  rest as we cook together.           │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🧠 Tell Me Everything  (~20–30 min) │  │  56px, primary card
│  │  Build my full profile now so I'm    │  │  14px secondary inside
│  │  sharp from the very first recipe.   │  │  [RECOMMENDED] badge top-right
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Or let Moody ask you ────────────────  │
│  ┌──────────────────────────────────────┐  │
│  │  💬 Just tell me in a message →      │  │  outlined card, smaller
│  │  "I'm vegan, love Thai, quick meals" │  │  opens Moody chat sheet
│  └──────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

> **Path routing:** "Quick Setup" → Screen 9Q-1. "Tell Me Everything" → Screen 10, the **6-step standard wizard** ("Step 1 of 6") in MVP; the full **15-module Deep Dive** ("Module 1 of 15", Screens 10c–10g / 13c–13f) is `[ROADMAP]` and extends the same flow. "Just tell me in a message" (Moody chat) is `[ROADMAP]`; when built, AI parses the message, populates what it can, then routes to Quick Setup review.

---

## Screen 9Q — Quick Setup Path (5 condensed screens)

### Screen 9Q-1 — Safety & Basics (`/setup/quick/safety`)

```
┌────────────────────────────────────────────┐
│  [◄]   ● ○ ○ ○ ○   Quick Setup 1 of 5    │
├────────────────────────────────────────────┤
│  Let's cover the essentials                │  22px/700
│                                            │
│  ── How do you eat? ─────────────────────  │
│  [Omnivore] [Vegetarian] [Vegan]           │
│  [Pescatarian] [Gluten-free] [Dairy-free]  │
│  [Halal] [Kosher] [Keto] [Other +]         │
│                                            │
│  ── Any allergies? ──────────────────────  │
│  ┌──────────────────────────────────────┐  │
│  │ ⚠️ Important for your safety         │  │  amber banner
│  └──────────────────────────────────────┘  │
│  [Peanuts] [Tree nuts] [Dairy] [Eggs]      │
│  [Gluten] [Shellfish] [Soy] [Fish]         │
│  [Sesame] [+ More allergens]               │
│  Tap to add → choose severity              │
│                                            │
│  [I have no allergies]                     │  secondary link
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### Screen 9Q-2 — Cooking Basics (`/setup/quick/cooking`)

```
┌────────────────────────────────────────────┐
│  [◄]   ● ● ○ ○ ○   Quick Setup 2 of 5    │
├────────────────────────────────────────────┤
│  Your cooking basics                       │  22px/700
│                                            │
│  Skill level                               │
│  [Beginner] [Developing ●] [Intermediate]  │
│  [Advanced]                                │
│                                            │
│  Weeknight cook time                       │
│  [<15 min] [15–30 ●] [30–60] [60+]        │
│                                            │
│  Servings  [─] 2 [+]                       │
│                                            │
│  Your favourite cuisines  (up to 5)        │
│  [Search cuisines…]                        │
│  [Thai ✕] [Italian ✕]                      │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### Screen 9Q-3 — Taste & Kitchen (`/setup/quick/taste`)

```
┌────────────────────────────────────────────┐
│  [◄]   ● ● ● ○ ○   Quick Setup 3 of 5    │
├────────────────────────────────────────────┤
│  How you cook                              │  22px/700
│                                            │
│  Equipment you have                        │
│  [Oven ✓] [Air fryer] [Blender]           │
│  [Wok] [Instant Pot] [+ More]             │
│                                            │
│  Spice tolerance                           │
│  None ──────●──────────── Fire lover       │
│                                            │
│  Cooking style                             │
│  Comfort ──────●───────── Adventurous      │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
│  [Use defaults — skip]                     │  secondary
└────────────────────────────────────────────┘
```

### Screen 9Q-4 — Starter Moods (`/setup/quick/moods`)

```
┌────────────────────────────────────────────┐
│  [◄]   ● ● ● ● ○   Quick Setup 4 of 5    │
├────────────────────────────────────────────┤
│  Your 3 most common moods                  │  22px/700
│  (You can add all 6 later)                 │  14px secondary
│                                            │
│  😴 Tired                                  │
│  When I'm tired I want…                    │
│  [Quick ✓] [Minimal cleanup ✓] [Warming]   │
│  Max time: [20 min ●] [30] [No limit]      │
│                                            │
│  😰 Stressed                               │
│  [Familiar ✓] [Comforting ✓] [Quick]       │
│                                            │
│  🧸 Cozy                                   │
│  [Warming ✓] [Rich] [Slow-cooked]          │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
│  [Use defaults for all moods — skip]       │
└────────────────────────────────────────────┘
```

### Screen 9Q-5 — Finish & Review (`/setup/quick/finish`)

```
┌────────────────────────────────────────────┐
│  [◄]   ● ● ● ● ●   Quick Setup 5 of 5    │
├────────────────────────────────────────────┤
│  [Moody avatar — excited]                  │
│  "That's enough to get started!            │
│   I'll learn the rest as we go."           │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Safety     Vegetarian, Peanuts🔴 [✏]│  │
│  │ Skill      Developing          [✏]  │  │
│  │ Cook time  15–30 min           [✏]  │  │
│  │ Cuisines   Thai, Italian       [✏]  │  │
│  │ Moods      3 of 6 set          [✏]  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Profile: ████░░░░░░  34% complete         │
│  Moody will ask you the rest over time.    │  13px secondary
│                                            │
│  📍 Location  [Set now] [Skip]             │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │      Let's cook! →                   │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## Screen 10 — Onboarding Step 1: Dietary Lifestyle (`/setup/lifestyle`)

### SM

```
┌────────────────────────────────────────────┐
│  [◄]    ● ○ ○ ○ ○ ○    Step 1 of 6        │  56px top bar
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│  How do you eat?                           │  22px/700
│  Select everything that applies.           │  14px, secondary
│                                            │
│  ── Lifestyle ──────────────────────────   │  11px/600 uppercase
│  [Omnivore — no restrictions]              │  full-width outlined chip
│  [Vegetarian] [Vegan] [Pescatarian]        │
│  [Flexitarian]                             │
│                                            │
│  ── Religious / Ethical ────────────────   │
│  [Halal] [Kosher]                          │
│                                            │
│  ── Medical / Dietary approach ─────────   │
│  [Gluten-free] [Dairy-free] [Nut-free]     │
│  [Egg-free] [Keto] [Paleo] [Low-carb]      │
│  [Low-sodium] [Diabetic-friendly]          │
│  [Whole30] [Raw food]                      │
│                                            │
│  ── Something else? ────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │ Describe it…  (Moody will figure it) │  │  text input, optional
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │  56px primary, sticky
│  └──────────────────────────────────────┘  │
│  [I eat everything — skip this step]       │  13px, --color-text-secondary
└────────────────────────────────────────────┘
```

**Bypass behaviour:** Tapping "I eat everything — skip this step" sets `dietary_lifestyle: ["omnivore"]` and advances to Step 2. No penalty or shame — Moody notes *"No restrictions set — I'll suggest everything!"*

**Conflict detection:** If user selects both "Vegan" and "Halal", Moody notes at the bottom: *"These are fully compatible — I'll apply both."* If user selects "Vegan" and "Pescatarian", Moody notes: *"These conflict — which takes priority?"* (inline prompt, not a blocker).

---

## Screen 10b — Onboarding Step 2: Allergies & Intolerances (`/setup/allergies`)

### SM — Two-section scrollable screen

```
┌────────────────────────────────────────────┐
│  [◄]    ● ● ○ ○ ○ ○    Step 2 of 6        │  56px
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│  [⚠️ Safety]  Your allergies &             │  22px/700
│  intolerances                             │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🔴 This is your safety net.          │  │  alert card, amber bg
│  │ Moody will NEVER suggest a recipe    │  │  13px
│  │ containing anything you mark here.   │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Allergies (anaphylactic risk) ──────   │  section label
│  Tap to add. Then choose severity →        │  12px, secondary
│                                            │
│  [Milk / Dairy] [Eggs] [Peanuts ✓🔴]      │  chips; ✓ = selected
│  [Tree nuts ✓🔴▾] [Fish] [Shellfish]       │  ▾ = has sub-selector
│  [Molluscs] [Wheat / Gluten] [Soy]        │
│  [Sesame] [Mustard] [Celery]               │
│  [Lupin] [Sulphites] [Corn / Maize]        │
│  [+ Type a specific food]                  │
│                                            │
│  🔴 Peanuts — severity:                    │  inline severity row
│  [🔴 Life-threatening ●] [🟡 Intolerant]   │  after chip tapped
│  [🟠 Prefer to avoid]                      │
│                                            │
│  🔴 Tree nuts — severity: Life-threatening │  summary line
│  ▾ Which tree nuts?  (tap to specify)      │  expandable
│  [Almonds ✓] [Cashews ✓] [Walnuts ✓]      │  sub-selector grid
│  [Pecans] [Pistachios] [Macadamia]         │
│  [Brazil] [Hazelnuts] [Pine nuts]          │
│  [Coconut]                                 │
│  [All tree nuts]  ← selects all            │
│                                            │
│  ── Food Intolerances ──────────────────   │
│  Causes discomfort, not anaphylaxis.       │  12px secondary
│                                            │
│  [Lactose ✓🟡] [Fructose] [FODMAPs]        │
│  [Histamine] [Nightshades] [Garlic/Onion]  │
│  [Gluten sensitivity (non-coeliac)]        │
│  [Artificial sweeteners] [Caffeine]        │
│  [Alcohol] [Sulphites (non-allergic)]      │
│  [+ Type a specific food]                  │
│                                            │
│  🟡 Lactose — severity:                    │
│  [🟡 Intolerant ●] [🟠 Prefer to avoid]   │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │  56px primary, sticky
│  └──────────────────────────────────────┘  │
│  [I have no allergies — skip this step]    │  13px secondary
└────────────────────────────────────────────┘
```

**Severity legend (shown once at top of section, collapsible):**
- 🔴 **Life-threatening** — Absolute exclusion. Trace amounts. No exceptions.
- 🟡 **Intolerant** — Moody avoids this ingredient in all recommendations.
- 🟠 **Prefer to avoid** — Soft filter; skipped often but not always.

**Bypass behaviour:** "I have no allergies — skip this step" sets empty allergen and intolerance arrays and logs `onboarding_steps_bypassed: ["allergies"]`. User can add allergens any time in Settings → Allergies.

**Post-bypass safety prompt:** If user bypasses, Moody shows a one-time confirmation: *"Just to confirm — you have no food allergies or intolerances? I'll suggest all ingredients."* → [Confirm] or [Go back and set them]

---

## Screen 10c — Deep Dive Module 3: Food Identity & Cultural Heritage (`/setup/identity`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  [◄]  ●●●○○○○○○○○○○○○  Module 3 of 15    │  progress bar, 15 segments
├────────────────────────────────────────────┤
│  Your food story                           │  22px/700
│  There are no right answers here.          │  14px, secondary
│                                            │
│  ── What does food mean to you? ─────────  │
│  Pick everything that feels true.          │  13px secondary
│  [Fuel] [Pleasure ✓] [Comfort ✓]           │
│  [Creative expression] [Social glue ✓]     │
│  [Cultural identity ✓] [Health tool]       │
│  [Reward] [Ritual]                         │
│                                            │
│  ── Your food roots ─────────────────────  │
│  What food culture(s) shaped how you       │  14px
│  grew up eating?                           │
│  [Search countries or regions…]            │
│  [West African ✕] [British ✕]              │
│                                            │
│  ── Comfort food ────────────────────────  │
│  When you need food to make you feel       │
│  better, what does it look like?           │
│  [Familiar childhood dish ✓] [Warm meal]   │
│  [Specific cuisine] [Something sweet]      │
│  [Whatever I ate growing up ✓]             │
│                                            │
│  Describe it if you like…                  │  12px
│  ┌──────────────────────────────────────┐  │
│  │ Jollof rice, anything with plantain  │  │  free text, optional
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Food memories ───────────────────────  │
│  Any dishes that carry strong positive     │
│  memories for you?                         │
│  ┌──────────────────────────────────────┐  │
│  │ My grandmother's pepper soup         │  │  free text, optional
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Aversions from experience ───────────  │
│  Foods you used to eat but stopped, or     │
│  foods you were forced to eat and now      │
│  dislike?                                  │
│  ┌──────────────────────────────────────┐  │
│  │ Overcooked liver — forced as a child │  │  free text, optional
│  └──────────────────────────────────────┘  │
│                                            │
│  Is the way you eat an important part      │
│  of who you are?                           │
│  [Yes, strongly ✓] [Somewhat] [Not really] │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │  56px primary
│  └──────────────────────────────────────┘  │
│  [Skip — Moody will learn this over time]  │
└────────────────────────────────────────────┘
```

---

## Screen 10d — Deep Dive Module 4: Sensory Profile (`/setup/sensory`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  [◄]  ████○○○○○○○○○○○○  Module 4 of 15   │
├────────────────────────────────────────────┤
│  How you like to eat                       │  22px/700
│  Two people who love Italian can want      │  14px secondary
│  completely different things.              │
│                                            │
│  ── Textures you love ──────────────────   │
│  [Crispy ✓] [Crunchy] [Chewy]              │
│  [Creamy ✓] [Soft/Pillowy] [Firm/Dense]   │
│  [Mixed textures ✓] [Delicate/Light]       │
│                                            │
│  ── Textures you dislike ───────────────   │
│  [Slimy ✓] [Gelatinous ✓] [Mushy]         │
│  [Stringy] [Gritty] [None]                 │
│                                            │
│  ── Temperature ─────────────────────────  │
│  [Always hot meals ✓] [Warm] [Room temp]   │
│  [Cold meals fine] [Iced/Chilled]          │
│  [Seasonal — depends]                      │
│                                            │
│  ── Flavour profile ─────────────────────  │
│  Savoury/Umami ●──────────── Bright/Acidic │
│       7                                    │
│  Mild ──────────●──────────── Bold/Intense │
│              8                             │
│  Simple ────●────────────── Complex/Layered│
│          6                                 │
│  Sweet in savoury: Not for me ●──── Love it│
│                              4             │
│                                            │
│  ── Richness ────────────────────────────  │
│  [Light and clean] [Moderate ✓] [Rich]     │
│  [Depends on mood]                         │
│                                            │
│  ── Portions ────────────────────────────  │
│  [One generous plate ✓] [Many small dishes]│
│  [Grazing] [Depends entirely]              │
│                                            │
│  ── Presentation ────────────────────────  │
│  [Matters a lot] [Nice bonus ✓] [Not at all│
│                                            │
│  ── Anything genuinely repulsive? ───────  │
│  ┌──────────────────────────────────────┐  │
│  │ Strong fish smell, offal             │  │  free text
│  └──────────────────────────────────────┘  │
│  Common: [Slimy] [Offal] [Pungent cheese]  │
│  [Strong fish] [Gelatinous] [Overcooked veg│
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
│  [Skip — Moody figures this out as we cook]│
└────────────────────────────────────────────┘
```

---

## Screen 10e — Deep Dive Module 5: Emotional Food Map (`/setup/emotions`)  `[ROADMAP]`

### SM — One emotional state per card, vertically scrollable

```
┌────────────────────────────────────────────┐
│  [◄]  █████○○○○○○○○○○○  Module 5 of 15   │
├────────────────────────────────────────────┤
│  Your emotional food map                   │  22px/700
│  This is the heart of how Moody            │  14px secondary
│  understands you. No right answers.        │
│                                            │
│  ┌──────────────────────────────────────┐  │  ← emotion card
│  │  😴 When you're TIRED                │  │  18px/700
│  │                                      │  │
│  │  Your appetite…                      │  │  14px/500
│  │  [Stays the same ✓] [Drops] [Rises]  │  │
│  │                                      │  │
│  │  You want food that is…              │  │
│  │  [Comforting ✓] [Quick ✓] [Warm ✓]   │  │
│  │  [Familiar] [Light] [Hearty]         │  │
│  │  [Zero effort] [Treat] [Healthy]     │  │
│  │                                      │  │
│  │  Cooking willingness…                │  │
│  │  [Will cook properly] [Simple only ✓]│  │
│  │  [Leftovers/batch] [Takeout] [Nothing│  │
│  │                                      │  │
│  │  Anything else?                      │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │ Always want something carby    │  │  │  free text per emotion
│  │  │ when tired                     │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  😰 When you're STRESSED             │  │
│  │  Appetite: [Rises ✓] [Drops] [Same]  │  │
│  │  Want: [Familiar ✓] [Comforting ✓]   │  │
│  │  [Zero effort ✓] [Salty] [Crunchy]   │  │
│  │  Cook willingness: [Leftovers ✓]     │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │ Stress eating is real for me   │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  💙 When you're SAD / LOW            │  │
│  │  (same card structure)               │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  😰 When you're ANXIOUS              │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  😊 When you're HAPPY / EXCITED      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🏆 When you've ACCOMPLISHED something│  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  😑 When you're BORED                │  │
│  │  Do you eat out of boredom?          │  │
│  │  [Yes — often ✓] [Sometimes] [Rarely]│  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🤒 When you're UNDER THE WEATHER    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  💪 After EXERCISE                   │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🧠 When OVERWHELMED by choices      │  │
│  │  How many recipe options max?        │  │
│  │  [3–4] [5–6 ✓] [8–10] [Show me all] │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │  sensitive — skip prominent
│  │  🌙 Hormonal / PMS  [Skip this one]  │  │
│  │  Cravings? Appetite changes?         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │  56px primary
│  └──────────────────────────────────────┘  │
│  [Skip — I'll explore this with Moody]     │
└────────────────────────────────────────────┘
```

---

## Screen 10f — Deep Dive Module 6: Cooking Psychology (`/setup/cooking-psychology`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  [◄]  ██████○○○○○○○○○○  Module 6 of 15   │
├────────────────────────────────────────────┤
│  You and cooking                           │  22px/700
│  How you feel about the kitchen            │  14px secondary
│  shapes everything Moody does.             │
│                                            │
│  Cooking feels like…                       │  16px/600
│  A chore ─────────────●────── Pure joy     │  slider 0–10
│                       7                    │
│                                            │
│  ── What kills the joy? ─────────────────  │
│  Pick all that are true for you            │
│  [Too many dishes ✓] [Timing components ✓] │
│  [Don't know if it'll work] [Already hungry│
│  [No inspiration] [Expensive ingredients]  │
│  [Cooking alone] [Long prep ✓] [Complex]   │
│  [Nothing — I love all of it]              │
│                                            │
│  ── What makes cooking feel great? ──────  │
│  [Nailing a dish ✓] [Learning something]   │
│  [Impressing someone] [The smells & sounds]│
│  [Quick satisfying wins ✓] [Feeding people │
│  I love ✓] [Creative impulse] [Compliments]│
│                                            │
│  ── Your biggest cooking anxiety ────────  │
│  (one honest answer)                       │
│  [Ruining an expensive dish]               │
│  [Timing multiple things ✓]                │
│  [Unfamiliar ingredients]                  │
│  [Making it too spicy or bland]            │
│  [Kitchen too small] [Not enough time]     │
│  [Family won't like it] [None — confident] │
│                                            │
│  ── How you follow recipes ──────────────  │
│  [Follow exactly — every gram]             │
│  [Follow closely, trust my seasoning ✓]    │
│  [Use recipes as rough guides]             │
│  [Cook from feel — recipes are inspiration]│
│                                            │
│  ── Cleanup ──────────────────────────── │
│  [Clean as I go ✓] [Batch at the end]      │
│  [Varies] [I'd rather order in]            │
│                                            │
│  ── Cooking with company ────────────────  │
│  [Love cooking with someone ✓]             │
│  [Prefer cooking alone]                    │
│  [Depends who it is]                       │
│                                            │
│  ── Kitchen atmosphere ──────────────────  │
│  [Always music ✓] [Podcast/audiobook]      │
│  [TV on in background] [Silence and focus] │
│  [Depends on what I'm making]              │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
│  [Skip — Moody will pick this up as we cook│
└────────────────────────────────────────────┘
```

---

## Screen 10g — Deep Dive Module 7: Social Food Dynamics (`/setup/social`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  [◄]  ███████○○○○○○○○○  Module 7 of 15   │
├────────────────────────────────────────────┤
│  Who you cook for                          │  22px/700
│  Food is social. This changes              │  14px secondary
│  everything.                               │
│                                            │
│  ── Primarily cooking for ───────────────  │
│  [Just me] [Me + partner ✓]               │
│  [Me + housemate] [Family — young kids]    │
│  [Family — older kids] [Varies a lot]      │
│                                            │
│  ── Other dietary needs at home? ────────  │
│  Does anyone you regularly cook for have   │
│  different needs from you?                 │
│  [Yes — add household member ✓] [No]       │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ + Household member                   │  │  expanded card
│  │ Name:       [Partner          ]      │  │
│  │ Dietary:    [Vegetarian ✓]           │  │
│  │ Allergies:  [None]                   │  │
│  └──────────────────────────────────────┘  │
│  [+ Add another person]                    │
│                                            │
│  ── Cooking for others dynamic ──────────  │
│  [I cook more ambitiously ✓]               │
│  [I play it safe to not disappoint]        │
│  [It adds pressure I don't enjoy]          │
│  [It adds joy and purpose]                 │
│  [I just make what I was going to anyway]  │
│                                            │
│  ── Entertaining ─────────────────────── │
│  [Never] [Occasionally ✓] [Monthly]        │
│  [Weekly] [I love hosting]                 │
│                                            │
│  When you entertain you…                   │
│  [Cook something you know well ✓]          │
│  [Go all-out — it's a performance]         │
│  [Order in to avoid stress]                │
│  [Make it a group cooking experience]      │
│                                            │
│  ── Food opinions in your household ─────  │
│  [Strong limits — constrains what I make]  │
│  [Mild preferences I work around ✓]        │
│  [Everyone eats everything]                │
│  [I cook what I want — they adapt]         │
│                                            │
│  ── Budget per meal per person ──────────  │
│  [Under $3] [$3–6] [$6–12 ✓] [$12–20]     │
│  [Not a concern]                           │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
│  [Skip — I mostly cook for myself]         │
└────────────────────────────────────────────┘
```

---

## Screen 11 — Onboarding Step 3: Cooking Profile (`/setup/assessment`)

### SM

```
┌────────────────────────────────────────────┐
│  [◄]    ● ● ● ○ ○ ○    Step 3 of 6        │
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│  Tell me about your cooking                │  22px/700
│  (or Moody can set this from a message ↗)  │  12px link
│                                            │
│  Your skill level                          │  16px/600
│  [Beginner ●] [Developing] [Intermediate]  │  single-select chips
│  [Advanced]                                │
│                                            │
│  How much time on weeknights?              │
│  [<15 min] [15–30 min ●] [30–60] [60+]    │
│                                            │
│  How much time on weekends?                │
│  Quick ─────────────●──── All day         │  slider, 15–120 min
│  About 60 minutes                          │
│                                            │
│  Servings you cook for                     │
│  [─]  2 people  [+]                        │  stepper 1–10
│                                            │
│  Your favourite cuisines  (up to 5)        │
│  ┌──────────────────────────────────────┐  │
│  │ Search cuisines...                   │  │  searchable
│  └──────────────────────────────────────┘  │
│  [Thai ✕] [Italian ✕] [Japanese ✕]         │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │  56px primary, sticky
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## Screen 12 — Onboarding Step 4: Kitchen & Taste (`/setup/preferences`)

### SM

```
┌────────────────────────────────────────────┐
│  [◄]    ● ● ● ● ○ ○    Step 4 of 6        │
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│  Your kitchen & taste                      │  22px/700
│                                            │
│  Kitchen equipment you have                │
│  [Oven ✓] [Air fryer] [Blender ✓]         │  checkbox chip grid
│  [Wok] [Instant Pot] [Stand mixer]         │
│  [BBQ / Grill] [Sous vide] [Rice cooker]   │
│  [Food processor] [Microwave only]         │
│  [+ Other]                                 │
│                                            │
│  Spice tolerance                           │
│  None ──────────●──────────── Fire lover   │
│  Medium (6 / 10)                           │
│                                            │
│  Cooking style                             │
│  Comfort ──────●─────────── Adventurous    │
│  Slightly adventurous (7 / 10)             │
│                                            │
│  Health goals  (optional, pick up to 3)   │
│  [More protein] [Less sugar] [More fibre]  │
│  [Heart healthy] [Lower calories]          │
│  [More variety] [Gut health] [Bone health] │
│  [Energy focus]                            │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │  56px primary
│  └──────────────────────────────────────┘  │
│  [Use sensible defaults — skip this step]  │  13px secondary
└────────────────────────────────────────────┘
```

**Bypass behaviour:** Sets equipment = ["oven"] (most universal default), spice = 5, adventurousness = 5, health_goals = []. Moody note: *"No problem — I'll use defaults and adjust as we go."*

---

## Screen 13 — Onboarding Step 5: Mood Definitions (`/setup/moods`)

### SM — One mood shown per screen, swipeable

```
┌────────────────────────────────────────────┐
│  [◄]    ● ● ● ● ● ○    Step 5 of 6        │
│  Mood 1 of 6: 😴 Tired                     │
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│                                            │
│  When you're tired,                        │  20px/700
│  what kind of food do you want?            │  16px/400
│                                            │
│  [Moody avatar, small — asking question]   │  48px
│  "This is YOUR definition — no wrong       │
│   answers."                                │
│                                            │
│  I want food that is…  (pick any)          │  section label
│  [Quick ✓] [Minimal cleanup ✓]             │
│  [Comforting ✓] [Warming] [Light]          │
│  [High-protein] [Surprise me]              │
│                                            │
│  I want to avoid…  (optional)              │
│  [Spicy] [Heavy] [Dairy] [Lots of prep]    │
│  [Strong flavours]                         │
│                                            │
│  Max cook time when tired?                 │
│  [15 min] [20 min ●] [30 min] [No limit]  │
│                                            │
│  ── Remaining moods ─────────────────────  │
│  😰 Stressed  🧸 Cozy  🎉 Celebratory     │  horizontal pill scroll
│  🎯 Focused   🗺️ Adventurous              │  upcoming moods (greyed)
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │       Next mood: Stressed →          │  │  56px primary
│  └──────────────────────────────────────┘  │
│  [Skip remaining moods — use defaults]     │  subtle link
└────────────────────────────────────────────┘
```

### LG+ — All 6 moods visible as cards in a grid

```
┌──────────────────────────────────────────────────────────────────┐
│  [◄]  Step 5 of 6: Mood Definitions                              │  64px
├──────────────────────────────────────────────────────────────────┤
│  Define what each mood means for YOU in food terms.              │
│  max-width: 960px, centered                                      │
│                                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ 😴 Tired            │  │ 😰 Stressed          │               │
│  │ [Quick ✓][Minimal✓] │  │ [Familiar][Comfort✓] │               │
│  │ [Warming ✓]         │  │ [Quick ✓]            │               │
│  │ Avoid: [Heavy ✓]    │  │ Avoid: [Complex]     │               │
│  │ Max: 20 min         │  │ Max: 30 min          │               │
│  └─────────────────────┘  └─────────────────────┘               │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ 🧸 Cozy             │  │ 🎉 Celebratory       │               │
│  │ [Warming][Rich ✓]   │  │ [Impressive ✓]       │               │
│  │ ...                 │  │ Max: 90 min          │               │
│  └─────────────────────┘  └─────────────────────┘               │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ 🎯 Focused          │  │ 🗺️ Adventurous       │               │
│  │ [Brain food ✓]      │  │ [New cuisines ✓]     │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Continue →                              │   │  56px
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Screen 13c — Deep Dive Module 11: Food Discovery & Curiosity (`/setup/discovery`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  [◄]  ███████████○○○○○  Module 11 of 15  │
├────────────────────────────────────────────┤
│  How you discover food                     │  22px/700
│                                            │
│  ── Where do you find recipe ideas? ─────  │
│  [TikTok ✓] [Instagram ✓] [YouTube]        │
│  [Food blogs] [Cookbooks ✓] [Restaurants]  │
│  [Family & friends] [I stick to my rotation│
│                                            │
│  ── Cookbook influence ──────────────────  │
│  Any cookbooks that significantly shaped   │
│  how you cook?                             │
│  ┌──────────────────────────────────────┐  │
│  │ Yotam Ottolenghi — changed how I     │  │
│  │ use spices                           │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Food travel ──────────────────────── │
│  Has travel significantly shaped what      │
│  you love to eat?                          │
│  [Yes — a lot ✓] [Somewhat] [Not really]   │
│  ┌──────────────────────────────────────┐  │
│  │ Ghana and Thailand — both defining   │  │  if Yes
│  └──────────────────────────────────────┘  │
│                                            │
│  ── A new ingredient you've never used ─── │
│  [Excited — I love the challenge ✓]        │
│  [Curious but I want guidance]             │
│  [I prefer what I know]                    │
│  [Depends entirely on my mood]             │
│                                            │
│  ── Following food trends ──────────────   │
│  [Love cooking viral/trending dishes]      │
│  [Sometimes, if it appeals ✓]              │
│  [Rarely] [Not at all]                     │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
│  [Skip — I'll tell Moody as we go]         │
└────────────────────────────────────────────┘
```

---

## Screen 13d — Deep Dive Module 12: Routine & Rhythm (`/setup/routine`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  [◄]  ████████████○○○○  Module 12 of 15  │
├────────────────────────────────────────────┤
│  Your food routine                         │  22px/700
│  Moody plans around your real life,        │  14px secondary
│  not an ideal version of it.               │
│                                            │
│  ── Breakfast ───────────────────────────  │
│  [Always eat it] [Sometimes ✓] [Never —    │
│  not a breakfast person]                   │
│                                            │
│  ── Biggest meal of the day ─────────────  │
│  [Lunch] [Dinner ✓] [It varies]            │
│                                            │
│  ── How you plan meals ──────────────────  │
│  [Full week planned] [Day before ✓]        │
│  [Decide on the day] [Never plan]          │
│                                            │
│  ── Decision fatigue hits me… ───────────  │
│  [After a long day ✓] [Weeknight dinners ✓]│
│  [When already hungry ✓] [When tired]      │
│  [Always] [Rarely — I'm a natural planner] │
│                                            │
│  ── Batch cooking ───────────────────────  │
│  [Yes — regularly] [Occasionally ✓]        │
│  [Rarely] [Never]                          │
│                                            │
│  ── Takeout or delivery ─────────────────  │
│  In a typical week, how often does this    │
│  replace cooking?                          │
│  [Never] [1–2 times ✓] [3–4 times]         │
│  [More than that — cooking is the exception│
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
│  [Use defaults — skip]                     │
└────────────────────────────────────────────┘
```

---

## Screen 13e — Deep Dive Module 13: Health & Body Relationship (`/setup/health`)  `[ROADMAP]`

> Sets **Safe Mode** (hides calories) — see `ICON_AUDIT.md` redesign note 3. MVP renders calories normally.

### SM
> **Design note:** This entire screen uses body-neutral, non-clinical, shame-free language. Skip button is large and prominent throughout. No weight-loss framing, no calorie focus.

```
┌────────────────────────────────────────────┐
│  [◄]  █████████████○○○  Module 13 of 15  │
├────────────────────────────────────────────┤
│  Your health & food relationship           │  22px/700
│  Optional — skip anything that             │  14px, --color-text-secondary
│  doesn't feel right.                       │
│                                            │
│  ── How you think about nutrition ───────  │
│  [I track macros carefully]                │
│  [Generally nutrition-aware ✓]             │
│  [I eat intuitively — I don't overthink]   │
│  [I prefer not to focus on nutrition]      │
│                                            │
│  ── Health conditions affecting eating ──  │
│                              [Skip this ↗] │  prominent skip link
│  Select any that apply                     │
│  [Type 2 diabetes] [IBS / IBD]             │
│  [Coeliac disease] [GERD / Acid reflux]    │
│  [High cholesterol] [High blood pressure]  │
│  [PCOS] [Thyroid condition]                │
│  [Eating disorder history *]               │
│  [I'd rather not share] [None ✓]           │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ * Selecting this activates Safe Mode │  │  small info card, calm styling
│  │ — no visible calorie counts, no      │  │
│  │ "light" or "low-cal" framing, purely │  │
│  │ positive language throughout.        │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Energy and food ─────────────────────  │
│  Do you notice food significantly          │
│  affecting your energy levels?             │
│  [Yes, significantly] [Somewhat ✓]         │
│  [Not particularly]                        │
│                                            │
│  ── Body goals  ─────────────────────────  │
│  Entirely optional — you can skip this.   │
│  [Not relevant to me ✓]                   │
│  [Maintaining where I am]                  │
│  [Gradual fat loss]                        │
│  [Building muscle / strength]              │
│  [Managing a health condition]             │
│  [I'd rather not say]                      │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │          Continue →                  │  │
│  └──────────────────────────────────────┘  │
│  [Skip this whole section]                 │  prominent bypass
└────────────────────────────────────────────┘
```

---

## Screen 13f — Deep Dive Module 14: Life Stage & Practical Context (`/setup/context`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  [◄]  ██████████████○○  Module 14 of 15  │
├────────────────────────────────────────────┤
│  Your life right now                       │  22px/700
│  Last one before the finish line!          │  14px, friendly
│                                            │
│  ── Life stage ──────────────────────────  │
│  [Student] [Young professional ✓]          │
│  [Parent — young kids] [Parent — older]    │
│  [Empty nester] [Retired]                  │
│  [Carer for family member] [Other]         │
│                                            │
│  ── Your kitchen ────────────────────────  │
│  [Tiny — single hob & microwave]           │
│  [Small but functional]                    │
│  [Normal home kitchen ✓]                   │
│  [Large, well-equipped]                    │
│  [Semi-pro setup]                          │
│                                            │
│  ── Food budget ─────────────────────────  │
│  [Very tight — every penny matters]        │
│  [Budget-conscious — I watch it]           │
│  [Comfortable ✓]                           │
│  [Not a concern]                           │
│                                            │
│  ── Novelty vs. familiarity ─────────────  │
│  How often do you want Moody to push       │
│  you somewhere new?                        │
│  Always push me ─────●──── Comfort please  │
│  Balanced                                  │
│                                            │
│  ── Your biggest frustration ────────────  │
│  Right now with food and cooking?          │  14px/600
│  ┌──────────────────────────────────────┐  │
│  │ I never know what to cook on         │  │  free text — high-value signal
│  │ weeknights and always end up with    │  │
│  │ the same 5 meals                     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Anything else Moody should know? ────  │
│  ┌──────────────────────────────────────┐  │
│  │ I'm trying to learn more West        │  │  open invitation
│  │ African cooking                      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │    One more step — almost there! →   │  │  56px primary
│  └──────────────────────────────────────┘  │
│  [Skip — just get me cooking]              │
└────────────────────────────────────────────┘
```

---

## Screen 13b — Onboarding Step 6: Location & Permissions + Review (`/setup/location`)

### SM — Two sections, scrollable

```
┌────────────────────────────────────────────┐
│  [◄]    ● ● ● ● ● ●    Step 6 of 6        │  56px — last step!
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│  Almost there!                             │  22px/700
│  Two quick questions — both optional.      │  14px secondary
│                                            │
│  ── Your location ──────────────────────   │  11px/600 uppercase
│  Helps Moody suggest seasonal produce and  │  13px secondary
│  locally-available ingredients.            │
│                                            │
│  [📍 Detect my location automatically]    │  outlined primary btn, 48px
│                                            │
│  or type it:                               │  12px secondary
│  ┌──────────────────────────────────────┐  │
│  │ City, Country  (e.g. London, UK)     │  │  text input
│  └──────────────────────────────────────┘  │
│                                            │
│  [Skip — don't share location]             │  13px secondary
│                                            │
│  ─────────────────────────────────────     │
│                                            │
│  ── Permissions ────────────────────────   │
│  Grant these now or later in Settings.     │  13px secondary
│                                            │
│  🔔 Push notifications                     │
│  Meal reminders, weekly insights           │  12px secondary
│  [Allow] [Not now]                         │
│                                            │
│  📷 Camera                                 │
│  Scan recipes and barcodes                 │
│  [Allow] [Not now]                         │
│                                            │
│  🎙 Microphone                             │
│  Voice cook mode                           │
│  [Allow] [Not now]                         │
│                                            │
│  ─────────────────────────────────────     │
│                                            │
│  ── Review your profile ────────────────   │
│                                            │
│  [Moody avatar — happy]                    │  56px
│  "Here's everything I know about you       │  14px
│   so far. I'll keep learning as we go."   │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🥗 Lifestyle    Vegetarian      [✏] │  │
│  │ ⚠️ Allergies    Peanuts 🔴, TN 🔴 [✏] │  │
│  │ 🥄 Intolerances Lactose 🟡      [✏] │  │
│  │ 👩‍🍳 Skill         Developing     [✏] │  │
│  │ ⏱  Cook time    15–30 min       [✏] │  │
│  │ 🍽️ Servings      2 people        [✏] │  │
│  │ 🌏 Cuisines      Thai, Italian   [✏] │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🔧 Equipment   Oven, Air fryer  [✏] │  │
│  │ 🌶 Spice        6 / 10          [✏] │  │
│  │ 🗺 Style         Slightly adventur [✏] │  │
│  │ 🎯 Goals         More protein   [✏] │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 😴 Moods       4 / 6 defined    [✏] │  │
│  │ (Tired, Stressed, Cozy, Celebratory)│  │
│  │ 2 moods using defaults              │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 📍 Location    London, UK       [✏] │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │      Looks good — let's cook! →     │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Bypassed steps** show as: `"Not set — using defaults  [Set up →]"` in muted text so the user can optionally complete them before proceeding.

**[✏] tapping** navigates back to that step and returns here after saving — the review screen acts as a lightweight hub for any last-minute edits.

---

---

> **Subscription flow note:** New users complete Auth (Sign Up) → 7-day free trial starts automatically (no payment required) → Onboarding (Quick Setup: Screens 9Q-1 to 9Q-5 | Deep Dive: Screens 10 → 10b → 10c → 10d → 10e → 10f → 10g → 11 → 12 → 13 → 13c → 13d → 13e → 13f → 13b) → first recipe results. The Subscription/Pricing screen (Screen 8) is surfaced **after the user sees their first Moody results** — at maximum perceived value. It is also accessible any time from Settings → Subscription.

---

## Screen 14c — Progressive Discovery Prompt (in-session, Quick Setup users)

> Appears at the end of a session — never during check-in or cook mode. Max once per session. User can always dismiss.

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│                                            │
│  [Moody avatar — curious, friendly]  48px  │
│                                            │
│  Quick question for you…                   │  18px/600
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ When you're stressed, what do you    │  │  Moody's question — conversational
│  │ tend to reach for food-wise?         │  │  18px/400, --color-moody-bubble bg
│  └──────────────────────────────────────┘  │
│                                            │
│  [More of it ✓] [Less than usual]          │  quick chips for fast answers
│  [Same as always]                          │
│                                            │
│  And what kind of food?                    │  14px/500 follow-up
│  [Familiar & comforting] [Salty/crunchy]   │
│  [Sweet] [Whatever's easiest]              │
│                                            │
│  Anything else?                            │  12px
│  ┌──────────────────────────────────────┐  │
│  │ Stress eating is real for me —       │  │  free text, optional
│  │ usually salty and crunchy            │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   Save this →                        │  │  48px primary
│  └──────────────────────────────────────┘  │
│  [Not now — ask me later]                  │  secondary dismiss
│                                            │
│  Profile: ████████░░  78% complete         │  13px progress bar + %
│                                            │
├────────────────────────────────────────────┤
│  BOTTOM NAV                                │
└────────────────────────────────────────────┘
```

**Prompt sequencing (which question appears when):**
| Trigger | Question module | Sample question |
|---------|----------------|----------------|
| After first completed cook | Cooking Psychology | "How did that feel to cook?" |
| After first 5★ rating | Sensory Profile | "What made that one special?" |
| After first 1–2★ rating | Sensory Profile | "What was off about it?" |
| Session 3 | Emotional Food Map | "When you're stressed, what do you reach for?" |
| Session 5 | Routine & Rhythm | "Do you tend to plan meals or decide on the day?" |
| End of first full week | Social Dynamics | "Who are you mostly cooking for?" |
| Session 8 | Food Discovery | "Where do you usually find new recipe ideas?" |
| Session 10 | Health (handled sensitively) | "Do you notice what you eat affecting your energy?" |
| Profile 70%+ complete | — | "Want to tell me more? Takes 3 min" → opens remaining modules |

---

## Screen 14 — Home / Mood Check-In (`/app/home`)

> **Design rule:** All 5 questions are optional. The "Show me recipes →" CTA is **always enabled** from the moment this screen loads — even with zero questions answered. Each unanswered question is filled by Moody using the user's profile. Tapping a question card expands it inline; a single chip tap answers it immediately.

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR (44px)                         │
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│  Good evening, Alex 🌙                     │  20px/600
│  Tuesday · 6:42 PM                         │  13px, secondary
│                                            │
│  What does tonight look like?              │  22px/700, --color-text-primary
│  Answer any — Moody fills the rest.        │  13px/400, --color-text-secondary
│                                            │
│  ── Q1 ─────────────────────────────────   │  question label: 11px/600 uppercase
│  How are you feeling?          [optional]  │  14px/600 + pill badge
│  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐             │
│  │😴│  │😰│  │⚡│  │🧸│  │🎉│  →          │  scroll horizontally
│  │Tir│  │Str│  │Ene│  │Coz│  │Cel│         │  chip: 68×68px
│  └──┘  └──┘  └──┘  └──┘  └──┘             │  active = primary bg + white text
│  ┌──┐  ┌──┐  ┌──┐  ┌──┐                   │
│  │🎯│  │🗺│  │💙│  │😊│                   │
│  │Foc│  │Adv│  │Sad│  │Hap│               │
│  └──┘  └──┘  └──┘  └──┘                   │
│                                            │
│  ── Q2 ─────────────────────────────────   │
│  How's your energy?            [optional]  │  14px/600
│  Exhausted ──────●──────────── Energised   │  slider 0–100, default: neutral 50
│                                            │
│  ── Q3 ─────────────────────────────────   │
│  What are you in the mood for? [optional]  │  14px/600
│  [Light] [Hearty ✓] [Healthy] [Indulgent]  │  chip row, multi-select
│  [High-protein] [Surprise me 🎲]           │
│                                            │
│  ── Q4 ─────────────────────────────────   │
│  How much time do you have?    [optional]  │  14px/600
│  [<15 min] [15–30 ●] [30–60] [60+]        │  single-select chips
│                                            │
│  ── Q5 ─────────────────────────────────   │
│  What kind of meal?            [optional]  │  14px/600
│  [Breakfast] [Lunch] [Dinner ✓] [Snack]   │  single-select; auto-set by time-of-day
│  [Anything]                                │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   Show me recipes →                  │  │  56px, --color-primary, always active
│  └──────────────────────────────────────┘  │
│  [Just pick for me — Moody decides all]    │  13px, --color-text-secondary, centred
│                                            │
│  ── Your week ──────────────────────────   │
│  🍳 5 meals cooked  · ⭐ Variety: Good     │  mini stats, 12px
│  [This week's plan →]    [Grocery list →]  │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠●] [🔍] [📖] [🛒] [📅]   │
└────────────────────────────────────────────┘
```

**Q5 auto-state:** On load, the meal-type chip matching the current time-of-day is pre-highlighted (Breakfast before 11am, Lunch 11am–2pm, Dinner 5pm–10pm, Snack otherwise) but is still considered "optional" — the user can change it or clear it.

**Returning-home state** (after viewing recipe results, user taps back to Home):
- Questions collapse to a summary strip: "😴 Tired · 35% energy · Dinner · 30 min"
- [Change] link at the right reopens the full 5-question form
- Recipe results remain visible below the summary strip

---

### LG+ — Sidebar layout, pre-submission state (5-question form in sidebar)

```
┌─────────────────┬──────────────────────────────────────────────────────────┐
│  SIDEBAR        │  CONTENT AREA (empty — awaiting mood submission)          │
│                 │                                                            │
│  [Logo]         │                                                            │
│  ─────────────  │         [Moody avatar — welcoming, 80px]                  │
│  🏠 Home      ◄ │                                                            │
│  🔍 Search      │    "Good evening, Alex. Answer as many or as few          │
│  📖 Diary       │     questions as you like — I'll handle the rest."        │
│  🛒 Grocery     │    font: 18px/400, centred, --color-text-secondary        │
│  📅 Planner     │                                                            │
│  🎬 Videos      │                                                            │
│  ─────────────  │                                                            │
│  ⚙ Settings     │                                                            │
│                 │                                                            │
│  ─────────────  │                                                            │
│  Q1 How do      │                                                            │
│  you feel?      │  ← 11px/600 uppercase label                               │
│  ┌──┐┌──┐┌──┐  │                                                            │
│  │😴││😰││⚡│  │                                                            │
│  └──┘└──┘└──┘  │                                                            │
│  ┌──┐┌──┐┌──┐  │                                                            │
│  │🧸││🎉││🎯│  │                                                            │
│  └──┘└──┘└──┘  │                                                            │
│                 │                                                            │
│  Q2 Energy      │                                                            │
│  E ──●────── E+ │                                                            │
│                 │                                                            │
│  Q3 Mood for…   │                                                            │
│  [Hearty ✓]    │                                                            │
│  [Healthy]      │                                                            │
│                 │                                                            │
│  Q4 Time avail. │                                                            │
│  [15–30 min ●] │                                                            │
│                 │                                                            │
│  Q5 Meal type   │                                                            │
│  [Dinner ✓]    │                                                            │
│                 │                                                            │
│  ┌───────────┐  │                                                            │
│  │Show me → │  │  ← always active                                          │
│  └───────────┘  │                                                            │
│  [Just pick]    │                                                            │
└─────────────────┴──────────────────────────────────────────────────────────┘
```

### LG+ — Sidebar layout, post-submission state (recipe results)

```
┌─────────────────┬──────────────────────────────────────────────────────────┐
│  SIDEBAR        │  CONTENT: RECIPE RESULTS (after mood submitted)           │
│                 │                                                            │
│  [Logo]         │  ← "You're tired, 30 mins. Here's what I'd make tonight." │
│  ─────────────  │  font: 18px, Moody callout                                │
│  🏠 Home      ◄ │  ─────────────────────────────────────────────────────── │
│  🔍 Search      │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  📖 Diary       │  │ [Recipe img] │  │ [Recipe img] │  │ [Recipe img] │   │
│  🛒 Grocery     │  │ Name         │  │ Name         │  │ Name         │   │
│  📅 Planner     │  │ ⏱ 20min  🔥 │  │ ⏱ 25min     │  │ SKILL PUSH ↑ │   │
│  🎬 Videos      │  │ [Comforting] │  │ [Fast]       │  │ [A little    │   │
│  ─────────────  │  │ [♡] [+Plan]  │  │ [♡] [+Plan]  │  │  stretch]    │   │
│  ⚙ Settings     │  └──────────────┘  └──────────────┘  └──────────────┘   │
│                 │  ...                                                       │
│  ─────────────  │                                                            │
│  YOUR SESSION   │  ── Continue or Recheck ──────────────────────────────── │
│  😴 Tired       │  [Change answers]             [Load more recipes]        │
│  35% energy     │                                                            │
│  Dinner · 30min │                                                            │
│  [Change →]     │  ── Quick Stats ────────────────────────────────────────  │
│                 │  5 meals this week · Variety: Good · 1 nutrition alert   │
│  ─────────────  │                                                            │
│  ⚡ Moody       │                                                            │
│  [Ask Moody…]   │                                                            │
└─────────────────┴──────────────────────────────────────────────────────────┘
```

**Sidebar post-submission:** The 5 questions collapse to a compact "YOUR SESSION" summary showing only the answered values. [Change →] re-expands the full question form in the sidebar and clears the results panel (replaced by the welcoming Moody state) until re-submitted.

---

---

## Screen 14b — Recipe Results (Mobile, `/app/home` post-submission)

### SM — Moody loading state (shown while AI processes mood → recipes, ~2–5s)

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│  Good evening, Alex 🌙                     │  20px/600
│  Tuesday · 6:42 PM                         │
│                                            │
│  [Moody avatar — gentle pulse animation]   │  64px, breathing pulse
│  Finding your recipes…                     │  14px, --color-text-secondary
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [shimmer skeleton recipe card]      │  │  skeleton card 1
│  │  ░░░░░░░░░░░░░░░  ░░░░░░░░░░░       │  │  same height as real card
│  │  ░░░░░░░░░  ░░░░  ░░░░░░░░          │  │  shimmer fill, --color-surface-pill
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  [shimmer skeleton recipe card]      │  │  skeleton card 2
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  [shimmer skeleton recipe card]      │  │  skeleton card 3
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠●] [🔍] [📖] [🛒] [📅]   │
└────────────────────────────────────────────┘
```

### SM — Recipe Results (loaded)

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│ ←16px                              16px→  │
│  ┌──────────────────────────────────────┐  │
│  │  [Moody icon 28px]                   │  │  Moody callout card
│  │  "You're tired with 20 mins —        │  │  --color-moody-bubble bg
│  │   here's what I'd cook tonight."     │  │  14px italic
│  └──────────────────────────────────────┘  │
│                                            │
│  [List ≡ ▪ Grid ⊞]    [Change mood ↩]    │  right-aligned toggles
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ [img 88×88]  One-Pan Lemon Chicken   │  │  result card 1
│  │              🕐 18 min · Easy        │  │  84px min height
│  │              [Comforting] [Fast]     │  │
│  │                              [♡] [▶] │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ [img 88×88]  Pasta e Fagioli         │  │  result card 2
│  │              🕐 20 min · Easy        │  │
│  │              [Warming] [Hearty]      │  │
│  │                              [♡] [▶] │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ [img 88×88]  Mushroom Omelette       │  │  result card 3
│  │              🕐 8 min · Easy         │  │
│  │              [Fast] [Protein]        │  │
│  │                              [♡] [▶] │  │
│  └──────────────────────────────────────┘  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  subtle divider
│  ┌──────────────────────────────────────┐  │
│  │ [img 88×88]  Pumpkin Risotto         │  │  Skill Push card — last
│  │ ↑ A little stretch                   │  │  violet badge --color-skill-push
│  │              🕐 40 min · Medium      │  │
│  │              [Adventurous]           │  │
│  │                              [♡] [▶] │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [Load more recipes]    [Change my mood]   │  secondary links
│                                            │
│  ── Adaptable for you ──────────────────   │  ← section separator, only
│  These recipes need one swap for you.      │    shown if 🟡 allergen recipes
│                                            │    have verified substitutions
│  ┌──────────────────────────────────────┐  │
│  │ [img 88×88]  Butter Chicken          │  │  Adaptable card
│  │ 🔄 Swap dairy → coconut cream        │  │  swap label: 13px, --color-primary
│  │              🕐 35 min · Medium      │  │
│  │              [Comforting] [Warming]  │  │
│  │                              [♡] [▶] │  │
│  └──────────────────────────────────────┘  │
│                                            │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠●] [🔍] [📖] [🛒] [📅]   │
└────────────────────────────────────────────┘
```

**"Adaptable for you" section rules:**
- Only appears when the user has 🟡 Intolerant allergens registered AND at least one otherwise-excluded recipe has a verified substitution for every 🟡 allergen ingredient
- Always separated from main results by a labelled divider — never mixed into the main list
- Section header: `Adaptable for you` in `14px/600 --color-text-primary` + `These recipes need one small swap.` in `12px --color-text-secondary`
- Each card shows the swap inline: `🔄 Swap [original] → [substitute]` in `13px --color-primary`
- If multiple swaps needed: `🔄 2 swaps for you` — tap card to see details
- 🔴 life-threatening allergen recipes are **never** shown in this section

**"Adaptable" badge on main results (🟠 prefer to avoid):**
- Appears as a small chip on recipe cards in the main results: `🔄 Adaptable` — `11px/500`, `--color-primary`, outlined chip style
- Tap opens substitution detail in the Recipe Detail Ingredients tab
- Does not affect recipe ordering or score

**Loading → results transition:** Skeleton cards cross-fade to real cards as each result arrives (staggered, 80ms between cards). Moody callout card fades in first.

---

## Screen 15 — "Decide for Me" Mode  `[ROADMAP]`

### SM — Single-result overlay

```
┌────────────────────────────────────────────┐
│  (dim overlay over Home screen)            │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [Moody avatar, animated — thinking] │  │  bottom sheet
│  │                                      │  │  slides up
│  │  "You're tired and have 20 mins.     │  │
│  │   Here's what I'd make tonight."     │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │    [Full recipe image]         │  │  │
│  │  │    320px wide, 200px tall      │  │  │
│  │  └────────────────────────────────┘  │  │
│  │                                      │  │
│  │  One-Pan Lemon Chicken               │  │  22px/700
│  │  ⏱ 18 min  · 👤 2  · Easy           │  │
│  │  [Comforting] [Fast] [Low effort]    │  │
│  │                                      │  │
│  │  ┌──────────────────────────────┐    │  │
│  │  │     ▶ Start Cooking →        │    │  │  56px primary
│  │  └──────────────────────────────┘    │  │
│  │                                      │  │
│  │  [See the recipe first]              │  │  subtle link → Recipe Detail
│  │  [Show me other options]             │  │  ← dismisses sheet, reveals
│  └──────────────────────────────────────┘  │  Screen 14b results list behind
└────────────────────────────────────────────┘
```

**"Show me other options" behaviour:** Dismisses the bottom sheet with a slide-down animation. Reveals Screen 14b (the full recipe results list) already populated behind the overlay — the user does **not** re-submit their mood. The single-pick recipe is pinned at the top of the list with a "Moody's top pick" label so it remains discoverable.

---

## Screen 16 — Search & Recipe Discovery (`/app/search`)

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│ ←16px                              16px→  │
│  ┌──────────────────────────────────────┐  │
│  │ 🔍 "something cozy, no dairy, 25min" │  │  search bar 48px
│  └──────────────────────────────────────┘  │
│  [Filter 🔽]                               │  filter chip, right
│                                            │
│  ── Content type ────────────────────────   │
│  [Recipes ●] [🎬 Videos]                  │  toggle — Videos reveals video
│                                            │  library within Search context
│  ── Filters (collapsed, tap to expand) ─   │
│  Mood · Time · Cuisine · Difficulty        │  chip summary row
│  Pantry-only: OFF                          │
│                                            │
│  ── Results: 24 recipes ─────────────────  │
│  [List / Grid toggle  ≡ ⊞]                │  right-aligned
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ [img 80×80]  Cozy Tomato Soup        │  │  list view card
│  │              🕐 25min · Easy         │  │  84px height
│  │              [Comforting] [Fast]     │  │
│  │              ♡                       │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ [img 80×80]  Mushroom Risotto        │  │
│  │              🕐 35min · Medium       │  │
│  │              [Cozy] [New for you ✦] │  │
│  │              ♡                       │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ [img 80×80]  Pumpkin Gnocchi         │  │
│  │  ↑ A little stretch               ♡ │  │  skill push row
│  └──────────────────────────────────────┘  │
│  [Load more]                               │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍●] [📖] [🛒] [📅]   │
└────────────────────────────────────────────┘
```

### Filter Sheet (bottom sheet overlay)

```
┌────────────────────────────────────────────┐
│  ── (drag handle) ──────────────────────   │
│  Filters                      [Reset all]  │  20px/700
│                                            │
│  Mood                                      │  section label
│  [😴 Tired ✓] [😰 Stressed] [🧸 Cozy ✓]  │
│                                            │
│  Cook time                                 │
│  0 ─────────────────●──── 60 min           │  range slider
│  Up to 30 minutes                          │
│                                            │
│  Cuisine                                   │
│  [Thai ✓] [Italian ✓] [Japanese] [Mexican] │  chip grid, scrollable
│  [Indian] [French] [Korean] [Greek] +more  │
│                                            │
│  Difficulty                                │
│  [Easy ✓] [Medium ✓] [Hard]                │
│                                            │
│  Other                                     │
│  [Pantry-only 🥕] [New for me ✦] [High-protein] │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │     Show 24 recipes →                │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Video toggle behaviour:** Switching to [🎬 Videos] in the content type row replaces recipe list cards with video thumbnail cards (same layout as Screen 27 but inline within Search). Filters adapt — Mood filter hidden, Cuisine/Length/Platform filters shown instead. This is how Video Library is accessed on mobile — no separate nav item required.

---

## Screen 17 — Recipe Detail (`/app/recipes/:id`)

### SM — Scroll-up card pattern (overview state)

```
┌────────────────────────────────────────────┐
│  [◄ frosted]               [♡] [⋮]        │  absolute, over image
│                                            │
│         [HERO IMAGE — full bleed]          │  55–60vh, sticky/fixed
│         parallax: scrolls at 0.5x speed   │
│                                            │
│  ┌───────────────────────────────────────┐ │
│  │  Cozy Tomato & Lentil Soup            │ │  gradient overlay at image base
│  │  🕐 25min · 👤2 · Easy · 🇮🇹 Italian │ │  title + meta
│  └───────────────────────────────────────┘ │
│                                            │
├────────────────────────────────────────────┤  ← rounded-top card, scrolls up
│  [Moody icon 32px]                         │
│  "Warm and low-effort — great for a        │  Moody callout, 14px italic
│   tired Tuesday. You have 7 of 9           │  ← pantry summary (populated pantry)
│   ingredients already."                   │
│  — OR (empty pantry / new user): ─────    │
│  "Looks perfect for a tired Tuesday.       │  Moody callout, empty pantry variant
│   Set up your pantry as you shop and       │
│   I'll track what you have next time."    │
│                                            │
│  [↑ A little stretch]  ← if Skill Push   │  violet badge, --color-skill-push
│                            only shown if  │  recipe.skill_band > user.skill_band
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   👁 View Recipe                     │  │  56px primary CTA
│  └──────────────────────────────────────┘  │  → scrolls to/activates Ingredients tab
│  [♡ Save]    [🛒 Bag (2)]    [📅 Plan]     │  bag badge shows item count
│                                            │
│  Serves  [─] 2 [+]    |  Metric ⇄ Imp     │  scaler + unit toggle
│  ────────────────────────────────────────  │
│  [Ingredients●] [Steps] [Notes] [Nutrition]│  tabs — Ingredients default
│  ────────────────────────────────────────  │
│  (see Ingredients Tab detail below)        │
└────────────────────────────────────────────┘
  Note: bottom nav hidden while scrolled deep; reappears on scroll-up
```

---

### SM — Ingredients Tab (pantry-aware + shopping bag)

```
┌────────────────────────────────────────────┐
│  [◄ frosted]               [♡] [⋮]        │
│         [HERO IMAGE — sticky]              │
│  Cozy Tomato & Lentil Soup  · 25min · Easy │
├────────────────────────────────────────────┤
│  [Ingredients●] [Steps] [Notes] [Nutrition]│
│  ────────────────────────────────────────  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🛒 Shopping Bag  ·  2 items needed  │  │  ← bag summary pill
│  │  [+ Add all needed]    [View bag →]  │  │  two CTAs
│  └──────────────────────────────────────┘  │
│                                            │
│  Ingredients (9)   Serves [─] 2 [+]        │  section header + scaler
│  ────────────────────────────────────────  │
│                                            │
│  ✅ 400g canned tomatoes     in pantry    │  ← green dot, no action
│  🛒 200g red lentils         need to buy  │  ← amber, [+ Add to bag]
│     [+ Add to bag]                        │
│  ✅ 1 onion, diced           in pantry    │
│  ⚠️ 2 cloves garlic          low stock   │  ← yellow, [+ Add to bag]
│     [+ Add to bag]                        │
│  ✅ 1 tsp cumin              in pantry    │
│  🛒 800ml vegetable stock    need to buy  │  ← amber, [+ Add to bag]
│     [+ Add to bag]                        │
│  ✅ 1 tsp smoked paprika     in pantry    │
│  ✅ Salt and pepper          in pantry    │
│  🛒 Fresh parsley (garnish)  need to buy  │  ← amber, [+ Add to bag]
│     [+ Add to bag]                        │
│                                            │
│  ── Nutrition per serving ──────────────   │
│  Cal 340 · P 18g · C 52g · Fat 4g         │
│                                            │
│  ── Similar recipes ────────────────────   │
│  [card] [card] [card]  →                  │
│                                            │
├────────────────────────────────────────────┤  ← sticky bottom bar
│  ┌──────────────────────────────────────┐  │
│  │  ▶ Start Cooking  →  Steps           │  │  56px primary, --color-primary
│  └──────────────────────────────────────┘  │
│  🔆 Screen will stay on while you cook     │  12px caption, below button
└────────────────────────────────────────────┘
```

**Ingredient status legend (shown once, inline, collapsible):**
- ✅ = in pantry, enough quantity
- ⚠️ = in pantry, but quantity is low — may need more
- 🛒 = not in pantry — add to shopping bag to remember

---

### SM — Steps Tab (cook-along mode, entered from Ingredients)

```
┌────────────────────────────────────────────┐
│  [◄ frosted]               [♡] [⋮]        │
│         [HERO IMAGE — 80px strip]          │  collapses after Step 1
├────────────────────────────────────────────┤
│  [Ingredients] [Steps●] [Notes] [Nutrition]│
│  ────────────────────────────────────────  │
│                                            │
│  🔆 Screen is staying on            [✕]   │  ← wake lock notice banner
│  ────────────────────────────────────────  │
│                                            │
│  Step 1 of 7                               │  step counter
│  ████░░░░░░░░░░░░░░░░░░░░░  progress bar   │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │  Add the onion and garlic to the     │  │
│  │  pan and fry over medium heat for    │  │  STEP TEXT — 20px min
│  │  5 minutes until softened.           │  │  generous line height
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ⏱ [5 min timer]  ← tap to start          │  auto-detected timer chip
│                                            │
│  💡 "Don't rush this step — the sweeter   │  Moody tip, collapsible
│     the onion, the better the soup."      │
│                                            │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │  ← Previous     │  │   Next Step →   │  │  64px controls
│  └─────────────────┘  └─────────────────┘  │
│                                            │
│  [🎙 Voice Mode]  [🥕 Ingredients]  [Moody]│  utility row
└────────────────────────────────────────────┘
```

**Wake Lock banner behaviour:**
- Appears when Steps tab activates
- [✕] taps disables wake lock and collapses the banner (user acknowledges)
- On iOS Capacitor: `NativeKeepAwake.keepOn()` called; banner confirms it is active

---

### SM — Notes Tab

```
┌────────────────────────────────────────────┐
│  [◄ frosted]               [♡] [⋮]        │
│         [HERO IMAGE — 80px strip]          │
├────────────────────────────────────────────┤
│  [Ingredients] [Steps] [Notes●] [Nutrition]│
│  ────────────────────────────────────────  │
│                                            │
│  My Notes                   [Bold I Link📎]│  formatting toolbar, right-aligned
│  ┌──────────────────────────────────────┐  │
│  │ Tap to add your notes about this     │  │  text area, 44px min height,
│  │ recipe…                              │  │  expands as user types
│  │                                      │  │  14px/1.6, --color-text-primary
│  └──────────────────────────────────────┘  │
│  [📎 Attach photo]                         │  tap → camera/photo library
│                                            │
│  ── Moody's note ───────────────────────   │  section (always shown if populated)
│  ┌──────────────────────────────────────┐  │
│  │  💡 "Try finishing with a squeeze    │  │  --color-moody-bubble bg
│  │     of lemon — it brightens the      │  │  14px italic
│  │     lentils nicely."                 │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Previous notes (2) ────────────────    │
│  ┌──────────────────────────────────────┐  │
│  │  12 Apr — "Reduced cumin to ½ tsp   │  │  past note cards, newest first
│  │  — much better. Kids loved it."     │  │  13px, --color-text-secondary
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  3 Mar — "Used Greek yogurt instead  │  │
│  │  of crème fraîche. Worked well."    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │           Save note →                │  │  primary btn, 56px
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

### SM — Nutrition Tab

```
┌────────────────────────────────────────────┐
│  [◄ frosted]               [♡] [⋮]        │
│         [HERO IMAGE — 80px strip]          │
├────────────────────────────────────────────┤
│  [Ingredients] [Steps] [Notes] [Nutrition●]│
│  ────────────────────────────────────────  │
│                                            │
│  Per serving  · Serves [─] 2 [+]          │  inline serving adjuster
│                                            │
│  ── Macros ─────────────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │  🔥 Calories    340 kcal             │  │
│  │  💪 Protein     18g                 │  │  macro rows
│  │  🌾 Carbs        52g                │  │  icon + label + value
│  │  🫒 Fat           4g                │  │  16px/600 values, 13px labels
│  │  🥦 Fibre        12g                │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Micronutrients ─────────────────────   │
│  [Iron  Good] [Calcium Good] [Vit D  Low]  │  status pills: green/amber/red
│  [Zinc  Good] [Folate Good]                │
│                                            │
│  ── Moody's nutrition note ─────────────   │
│  ┌──────────────────────────────────────┐  │
│  │  💡 "Great protein hit — your diary  │  │  --color-moody-bubble bg
│  │     has been low this week. This     │  │  14px italic
│  │     helps balance it."              │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  ℹ️ Nutritional values are estimated  │  │  disclaimer card
│  │  and may vary. Not medical advice.   │  │  12px, --color-text-secondary
│  └──────────────────────────────────────┘  │
│                                            │
│  [View full insights →]                    │  link to Screen 22
└────────────────────────────────────────────┘
```

---

### LG (768–1023px) — iPad Portrait: Wide Hero + Tabs Below

```
┌──────────────────────────────────────────────────────┐
│         [HERO IMAGE — full bleed, 40vh]              │
│  [◄]                                      [♡] [⋮]   │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Cozy Tomato & Lentil Soup                      │ │
│  │  🕐 25min · 👤2 · Easy · 🇮🇹 Italian            │ │
│  └─────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│  "Warm and low-effort. You have 7 of 9 ingredients." │
│  [▶ Start Cooking]  [♡]  [🛒 Bag(2)]  [📅]          │
│  Serves [─] 2 [+]  ·  Metric ⇄                      │
│  ──────────────────────────────────────────────────  │
│  [Ingredients●]  [Steps]  [Notes]  [Nutrition]       │
│  ──────────────────────────────────────────────────  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🛒 Shopping Bag · 2 items     [+ Add all] [→]  │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ✅ 400g canned tomatoes    in pantry               │
│  🛒 200g red lentils        need to buy [+ Add]     │
│  ✅ 1 onion, diced          in pantry               │
│  ⚠️  2 cloves garlic        low stock  [+ Add]      │
│  ✅ 1 tsp cumin             in pantry               │
│  🛒 800ml vegetable stock   need to buy [+ Add]     │
│  ✅ 1 tsp smoked paprika    in pantry               │
│  ✅ Salt and pepper         in pantry               │
│  🛒 Fresh parsley           need to buy [+ Add]     │
│                                                      │
│  ── Nutrition ──  Cal 340 · P 18g · C 52g · F 4g   │
│  ──────────────────────────────────────────────────  │
│  [▶ Start Cooking → Steps]  🔆 Screen stays on      │  sticky bottom
└──────────────────────────────────────────────────────┘
```

---

### XL / 2XL (1024px+) — Desktop/iPad Landscape: Fixed Image + Scrollable Content

```
┌──────────────────────────┬───────────────────────────────────────────────┐
│  LEFT COLUMN (42%)       │  RIGHT COLUMN (58%) — scrollable              │
│  sticky / fixed          │                                               │
│                          │  Cozy Tomato & Lentil Soup                    │
│  [HERO IMAGE]            │  🇮🇹 Italian · Easy · 25 min                 │
│  fills column height     │  ─────────────────────────────────────────    │
│                          │  "Warm and low-effort — great for tonight.    │
│  ─────────────────────   │   You have 7 of 9 ingredients already."       │
│  Nutrition               │                                               │
│  (≥1440px: always open)  │  [▶ Start Cooking]   🔆 screen stays on      │
│  Cal  340                │  [♡ Save]  [🛒 Bag (2)]  [📅 Plan]           │
│  P    18g                │  Serves [─] 2 [+]  ·  Metric ⇄              │
│  Carbs 52g               │  ─────────────────────────────────────────    │
│  Fat   4g                │  [Ingredients●]  [Steps]  [Notes]            │
│  Fibre 12g               │  ─────────────────────────────────────────    │
│  [Show full →]           │                                               │
│                          │  ┌─────────────────────────────────────────┐  │
│  ─────────────────────   │  │ 🛒 Shopping Bag · 2 items needed        │  │
│  [video thumbnail]       │  │ [+ Add all needed to bag]  [View bag →] │  │
│  if linked               │  └─────────────────────────────────────────┘  │
│                          │                                               │
│                          │  Ingredient              Status    Action     │
│                          │  ─────────────────────────────────────────    │
│                          │  400g canned tomatoes   ✅ pantry            │
│                          │  200g red lentils        🛒 buy   [+Add]     │
│                          │  1 onion, diced          ✅ pantry           │
│                          │  2 cloves garlic         ⚠️ low   [+Add]    │
│                          │  1 tsp cumin             ✅ pantry           │
│                          │  800ml vegetable stock   🛒 buy   [+Add]     │
│                          │  1 tsp smoked paprika    ✅ pantry           │
│                          │  Salt and pepper         ✅ pantry           │
│                          │  Fresh parsley           🛒 buy   [+Add]     │
│                          │                                               │
│                          │  ─────────────────────────────────────────    │
│                          │  Similar recipes ↓                           │
└──────────────────────────┴───────────────────────────────────────────────┘
```

**Switching to Steps tab (desktop):**  
The right column replaces the ingredient list with step-by-step cook mode content. The image column remains. The wake lock badge 🔆 appears in the top bar.

---

### XL / 2XL — Steps Tab (Desktop Cook Mode)

```
┌──────────────────────────┬───────────────────────────────────────────────┐
│  LEFT COLUMN (30%)       │  RIGHT COLUMN (70%) — cook mode               │
│  sticky / fixed          │                                               │
│  [Recipe image,          │  Cozy Tomato & Lentil Soup                    │
│   narrower crop]         │  Step 3 of 7  ·  🔆 Screen on       [─]      │
│                          │  ████████████░░░░░░░░░░░░  progress bar       │
│  [Video PiP overlay      │  ─────────────────────────────────────────    │
│   if cook-along active]  │                                               │
│                          │  Add the onion and garlic to the pan          │
│  ─────────────────────   │  and fry over medium heat for 5 minutes       │
│  Ingredients (pantry)    │  until softened and translucent.              │
│                          │                                               │
│  ☑ 400g tomatoes  ✅    │  ⏱ [5 min timer]  ← tap to start             │
│  ☑ 200g lentils   ✅    │                                               │
│  ☑ 1 onion        ✅    │  💡 "Don't rush this step — the sweeter       │
│  ☐ 2 garlic  ⚠️ ← now  │     the onion, the better the soup."          │
│  ☐ 1 tsp cumin    ✅    │                                               │
│  ☐ 800ml stock    🛒    │  ┌────────────────┐   ┌────────────────┐      │
│  ☐ paprika        ✅    │  │  ← Previous    │   │   Next Step →  │      │
│  ☐ S&P            ✅    │  └────────────────┘   └────────────────┘      │
│  ☐ parsley        🛒    │                                               │
│                          │  [🎙 Voice Mode]              [Ask Moody ↗]  │
│  [🎙 Voice Mode]         │                                               │
│  [Ask Moody ↗]           │  [✕ Exit cook mode]                          │
└──────────────────────────┴───────────────────────────────────────────────┘
```

**Left column ingredient list during cook mode:**
- Shows pantry status icons (✅ / ⚠️ / 🛒) alongside each item
- Items check off (☑) as steps reference them — auto-highlighted
- Active step ingredients highlighted in amber
- Pantry status is informational during cooking — no shopping actions available

---

## Screen 17b — Allergen Substitution Panel  `[ROADMAP]`

*Triggered from: Recipe Detail Ingredients tab (allergen warning inline), "Adaptable for you" recipe cards, Cook Mode mid-step prompt, or Moody chat.*

### SM — Ingredients Tab Substitution View

```
┌────────────────────────────────────────────┐
│  [◄ frosted]               [♡] [⋮]        │
│         [HERO IMAGE — 80px strip]          │
├────────────────────────────────────────────┤
│  [Ingredients●] [Steps] [Notes] [Nutrition]│
│  ────────────────────────────────────────  │
│                                            │
│  ┌─ ⚠ Allergen found ──────────────────┐  │  amber banner, --color-allergen-intolerant
│  │  This recipe contains dairy (milk,  │  │  bg: rgba(217,119,6,0.08)
│  │  butter). Moody found a swap.       │  │  13px, dismissible [✕]
│  └─────────────────────────────────────┘  │
│                                            │
│  ✅ 400g cherry tomatoes    in pantry     │
│  ✅ 200g pasta              in pantry     │
│                                            │
│  ┌─ 🔄 Allergen swap ──────────────────┐  │  swap card, primary-tinted border
│  │  🟡 Heavy cream  →  Coconut cream   │  │  14px/600, --color-text-primary
│  │  Use the same quantity (200ml)       │  │  13px, --color-text-secondary
│  │                                      │  │
│  │  Flavour: Adds a light coconut note  │  │
│  │  Texture: Nearly identical           │  │
│  │  Note: Works best in savoury sauces  │  │
│  │                                      │  │
│  │  ● Verified by Moody  ★★★★★ (142)   │  │  confidence indicator, 12px
│  │                                      │  │
│  │  [✓ Use this swap]  [Keep original]  │  │  48px primary / outlined
│  └─────────────────────────────────────┘  │
│                                            │
│  ┌─ 🔄 Allergen swap ──────────────────┐  │  second swap card (if multiple)
│  │  🟡 Parmesan  →  Nutritional yeast  │  │
│  │  Use half the quantity (25g → 12g)   │  │
│  │                                      │  │
│  │  Flavour: Deep umami — very close    │  │
│  │  Texture: Different (flakes vs       │  │
│  │  grated) — sprinkle at the end       │  │
│  │                                      │  │
│  │  ● Moody's suggestion (not verified) │  │  12px, --color-text-muted
│  │                                      │  │
│  │  [✓ Use this swap]  [Keep original]  │  │
│  └─────────────────────────────────────┘  │
│                                            │
│  ✅ Garlic, olive oil, pepper  in pantry  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   ✓ Apply all swaps & Start Cooking  │  │  56px --color-primary
│  └──────────────────────────────────────┘  │
│  [Save this version of the recipe →]       │  13px link, --color-primary
│  [Cook with originals instead]             │  13px link, --color-text-muted
└────────────────────────────────────────────┘
```

**Swap card states:**

| State | Visual |
|-------|--------|
| **Unreviewed** | Amber left border (`--color-allergen-intolerant`). [Use this swap] primary. [Keep original] outlined. |
| **Swap accepted** | Green left border (`--color-status-have`). `✓ Swapped to [substitute]` label. Ingredient text in list updates inline. |
| **Original kept** | Grey left border. `Keeping original — [allergen] present.` warning badge. |

**🔴 Life-threatening allergen — special screen state:**

```
┌──────────────────────────────────────────────────┐
│  ⛔ Safety warning                                │  red banner, full-width
│  This recipe contains peanuts, which you've       │
│  marked as LIFE-THREATENING.                      │
│                                                   │
│  Even after substituting the ingredient,          │
│  cross-contamination from shared equipment        │
│  or manufacturing can still be dangerous.         │
│                                                   │
│  Only proceed if you are certain your             │
│  substitute ingredient is manufactured in a       │
│  peanut-free facility.                            │
│                                                   │
│  [I understand the risk — show substitution]      │  outlined, NOT primary CTA
│  [Take me to a safer recipe →]                    │  primary CTA
└──────────────────────────────────────────────────┘
```

This screen only appears for 🔴 allergens when the user has opened a recipe directly (e.g., via URL import, Search, or shared link). Moody never pushes 🔴 allergen recipes in recommendations.

### SM — Cook Mode Mid-Step Substitution Prompt

*Appears as a blocking bottom sheet when a cook step references an allergen ingredient that was NOT swapped before starting.*

```
┌────────────────────────────────────────────┐
│  (cook mode step visible dimly behind)     │
│                                            │
│  ┌──────────────────────────────────────┐  │  bottom sheet, slides up
│  │  [Moody icon 32px]                   │  │
│  │  This step uses heavy cream —        │  │  16px/600
│  │  which contains dairy.               │  │
│  │                                      │  │
│  │  Want to swap it now?                │  │  14px, --color-text-secondary
│  │                                      │  │
│  │  🔄 Replace with coconut cream (1:1) │  │  suggestion, --color-primary
│  │  Same quantity, nearly identical.    │  │  13px
│  │                                      │  │
│  │  [✓ Yes, use coconut cream]          │  │  48px primary
│  │  [No — use heavy cream as written]   │  │  outlined, --color-text-secondary
│  │  [Ask Moody for more options]        │  │  text link
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Mid-step substitution rules:**
- Only appears if user started Cook Mode without applying the substitution first
- Appears immediately before the step that introduces the allergen ingredient (not mid-step)
- Does NOT block the step — [No — use heavy cream as written] always available
- Decision is saved to `cooking_sessions.substitutions_applied_json`
- If "Yes" selected: the current step text updates in real-time to name the substitute

### LG+ — Substitution Panel (Recipe Detail Desktop)

The substitution panel is an inline section on the Ingredients tab, not a modal. It appears between the allergen-containing ingredient row and the next ingredient.

```
┌─────────────────────┬─────────────────────────────────────────────────────┐
│                     │  [Ingredients●]  [Steps]  [Notes]  [Nutrition]      │
│  HERO IMAGE         │  ──────────────────────────────────────────────────  │
│  sticky             │  □ 400g cherry tomatoes  ✅ in pantry               │
│                     │  □ 200g pasta            ✅ in pantry               │
│                     │                                                     │
│                     │  ┌─ 🔄 Dairy swap ─────────────────────────────┐   │
│                     │  │  🟡 200ml heavy cream                        │   │
│                     │  │  → Replace with coconut cream  ·  Same qty   │   │
│                     │  │  Flavour: light coconut note                  │   │
│                     │  │  ● Verified  ★★★★★ (142 cooks)              │   │
│                     │  │  [✓ Use swap]          [Keep original]        │   │
│                     │  └──────────────────────────────────────────────┘   │
│                     │                                                     │
│                     │  □ 4 garlic cloves        ✅ in pantry             │
│                     │  □ Olive oil               ✅ in pantry             │
│                     │  □ Fresh basil (garnish)   🛒 need to buy           │
│                     │    [+ Add to bag]                                   │
│                     │                                                     │
│                     │  [✓ Apply all swaps & Start Cooking →]              │
│                     │  [Save this version of the recipe]                  │
└─────────────────────┴─────────────────────────────────────────────────────┘
```

---

## Screen 18 — Cook Mode (`/app/cook/:sessionId`)

*Mobile full-screen cook mode — entered by tapping "Start Cooking → Steps" on the Ingredients tab sticky footer*

**Cook Mode global rules:**
- Bottom nav is **hidden** — no navigation distraction while cooking
- Moody FAB is **hidden** — the [Ask Moody] button in the utility row provides contextual access with cook session context
- Wake Lock is **active** — screen stays on for entire session

### SM — Steps view (active cooking)

```
┌────────────────────────────────────────────┐
│  STATUS BAR — 🔆 Screen on (Wake Lock)     │  ← system bar note
├────────────────────────────────────────────┤
│  [✕ Exit]     Cozy Tomato Soup   [🥕 Ingr]│  56px top bar
│                               🔆 screen on │  ← wake lock badge, top right
│  Step 3 of 7                               │  progress label
│  ████████░░░░░░░░░░░░░░░░░░░░░░            │  progress bar, --color-primary
├────────────────────────────────────────────┤
│                                            │
│  [food image strip — 80px height]          │  collapses after user confirms
│  [Tap to expand ↑]                         │  Step 1 done
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │  Add the onion and garlic to the     │  │
│  │  pan and fry over medium heat for    │  │  STEP TEXT
│  │  5 minutes until softened.           │  │  20px min, 1.6 line height
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ⏱ [5 min timer]  ← tap to start          │  auto-detected timer chip
│  (Running: 3:42 remaining)                 │  when active
│                                            │
│  💡 "Don't rush this step — the sweeter   │  Moody tip, collapsible
│     the onion, the better the soup."  [−] │
│                                            │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │  ← Previous     │  │   Next Step →   │  │  64px tall, full-radius
│  └─────────────────┘  └─────────────────┘  │
│                                            │
│  [🎙 Voice]   [🥕 Ingredients]  [Ask Moody]│  utility row 48px
├────────────────────────────────────────────┤
│  (no bottom nav in cook mode)              │
└────────────────────────────────────────────┘
```

---

### SM — Ingredient Drawer (slide-up, pantry-aware)

Triggered by tapping [🥕 Ingr] in the top bar or the utility row.

```
┌────────────────────────────────────────────┐
│  ── (drag handle, 40px wide) ───────────   │
│  Ingredients (9)              [Serves: 2 ▾]│  header
│  ────────────────────────────────────────  │
│                                            │
│  ☑ 400g canned tomatoes  ✅ had in pantry │  checked = used in recipe
│  ☑ 200g red lentils      🛒 bought        │
│  ☑ 1 onion, diced        ✅ had in pantry │
│  ┃ 2 cloves garlic   ⚠️  ← active step   │  ← highlighted with left accent border
│  ☐ 1 tsp cumin           ✅ had in pantry │  --color-ingredient-active bg
│  ☐ 800ml vegetable stock 🛒 bought        │
│  ☐ 1 tsp smoked paprika  ✅ had in pantry │
│  ☐ Salt and pepper       ✅ had in pantry │
│  ☐ Fresh parsley         🛒 bought        │
└────────────────────────────────────────────┘
```

**Pantry status in drawer:**
- ✅ = had in pantry before starting
- 🛒 = was in shopping bag (user bought it before cooking)
- ⚠️ = was low stock; used up during cooking
- Active step ingredient highlighted with left accent border + `--color-ingredient-active` background
- **No pantry deduct prompt here** — deduction is handled exclusively in the Finish Cooking sheet to avoid duplicate prompts

---

### SM — Voice Mode overlay: Moody Speaking (TTS)

Shown when Moody reads the step aloud. Entering Voice Mode always begins here.

```
┌────────────────────────────────────────────┐
│  ┌──────────────────────────────────────┐  │
│  │  🔊 MOODY IS READING…               │  │  dark frosted overlay
│  │                                      │  │
│  │  [Moody avatar — animated mouth]     │  │  gentle speaking animation
│  │                                      │  │
│  │  ▓▓▓▓ ▓▓▓  ▓▓▓▓▓▓  (waveform out)  │  │  output waveform animation
│  │                                      │  │
│  │  "Add the onion and garlic to        │  │  current step text scrolls
│  │   the pan and fry over medium        │  │  as Moody reads it (karaoke)
│  │   heat for 5 minutes…"              │  │
│  │                                      │  │
│  │  [⏸ Stop reading — I'll take over]  │  │  ← interrupts TTS, goes to STT
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**State transition:** TTS completes (or user taps "Stop reading") → overlay transitions to STT state below.

### SM — Voice Mode overlay: Listening (STT)

Shown after Moody finishes reading, awaiting user command.

```
┌────────────────────────────────────────────┐
│  ┌──────────────────────────────────────┐  │
│  │  🎙 LISTENING…                       │  │  dark frosted overlay
│  │                                      │  │
│  │  ~~~~~ (input waveform animation)    │  │  mic input animation
│  │                                      │  │
│  │  "Say: Next · Back · Repeat ·        │  │
│  │   Pause · How much longer? ·         │  │
│  │   What's next?"                      │  │
│  │                                      │  │
│  │  [Stop voice mode]                   │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

**Voice Mode full state sequence:**  
`Tap [🎙 Voice Mode]` → TTS: Moody reads current step → STT: Listening for command → Command executes → TTS: Moody reads next step → loop. Each transition animates the waveform direction (output ▓▓▓ → input ~~~).

---

### SM — Finish Cooking flow

```
┌────────────────────────────────────────────┐
│  ┌──────────────────────────────────────┐  │
│  │  🎉 That's it! All done.             │  │  completion sheet
│  │                                      │  │
│  │  How was it?                         │  │
│  │  ⭐ ⭐ ⭐ ⭐ ☆   ← tap to rate       │  │
│  │                                      │  │
│  │  [📖 Log to Diary]                   │  │  ← auto-logged, user confirms
│  │                                      │  │
│  │  Update your pantry?                 │  │
│  │  [✓ Yes — deduct what I used]        │  │  ← Moody auto-fills what was used
│  │  [Skip for now]                      │  │
│  │                                      │  │
│  │  [← Back to Recipe]  [🏠 Home]      │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

Note: 🔆 Wake Lock is released automatically when Finish Cooking is confirmed.

---

### LG+ — Cook Mode desktop

```
┌─────────────────────────────────┬──────────────────────────────────────────┐
│  LEFT: Image + Ingredients(30%) │  RIGHT: Steps content (70%)              │
│                                 │                                          │
│  [Recipe image, sticky]         │  Cozy Tomato Soup  ·  Step 3 of 7       │
│                                 │  🔆 Screen on  ████████░░░░░ progress    │
│  [Video PiP — cook-along]       │  ─────────────────────────────────────   │
│  if linked                      │                                          │
│  ─────────────────────────────  │  Add the onion and garlic to the pan     │
│                                 │  and fry over medium heat for 5 minutes  │
│  Ingredients (9)                │  until softened and translucent.         │
│  ☑ 400g tomatoes   ✅          │                                          │
│  ☑ 200g lentils    🛒          │  ⏱ [5 min timer]  (3:42 remaining)       │
│  ☑ 1 onion         ✅          │                                          │
│  ┃ 2 garlic   ⚠️  ← active    │  💡 "Don't rush this step — the sweeter  │
│  ☐ 1 tsp cumin     ✅          │     the onion, the better the soup." [−] │
│  ☐ 800ml stock     🛒          │                                          │
│  ☐ paprika         ✅          │  ┌────────────────┐  ┌────────────────┐  │
│  ☐ S&P             ✅          │  │  ← Previous    │  │   Next Step →  │  │
│  ☐ parsley         🛒          │  └────────────────┘  └────────────────┘  │
│                                 │                                          │
│  [🎙 Voice Mode]                │  [🎙 Voice Mode]        [Ask Moody ↗]  │
│  [Ask Moody ↗]                  │  [✕ Exit cook mode]                     │
└─────────────────────────────────┴──────────────────────────────────────────┘
```

---

## Screen 19 — Favourites (`/app/favorites`)

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│ ←16px                              16px→  │
│  [Saved ●]  [Collections]                  │  tab toggle — Collections nests here
│  ─────────────────────────────────────────  │  no separate nav item needed
│  Favourites (23)           [≡ List ⊞ Grid] │  22px/700
│  ┌──────────────────────────────────────┐  │
│  │ 🔍 Search favourites…               │  │  search bar
│  └──────────────────────────────────────┘  │
│                                            │
│  [All] [Thai ✓] [Italian] [Under 30min]    │  filter chips, scroll
│                                            │
│  ── Grid view (2 cols) ────────────────    │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ [Recipe img]│  │ [Recipe img]│          │
│  │ Recipe Name │  │ Recipe Name │          │
│  │ ⏱ 20min    │  │ ⏱ 35min    │          │  2-col card grid
│  │ [♥ saved]  │  │ [♥ saved]  │          │
│  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐          │
│  │ [Recipe img]│  │ [Recipe img]│          │
│  │ ...         │  │ ...         │          │
│  └─────────────┘  └─────────────┘          │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖●] [🛒] [📅]   │
└────────────────────────────────────────────┘
```

---

## Screen 20 — Recipe Collections (`/app/collections`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│ ←16px                              16px→  │
│  Collections                 [+ New]       │  22px/700
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ [Cover image collage — 4 small imgs] │  │
│  │ Date Night                           │  │  collection card
│  │ 8 recipes                            │  │  160px height
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ [Cover image collage]                │  │
│  │ Sunday Batch Cook                    │  │
│  │ 12 recipes                           │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ [Cover image collage]                │  │
│  │ Kid-Friendly Weekdays                │  │
│  │ 5 recipes                            │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ [+ icon]  Create new collection      │  │  add card (dashed border)
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  BOTTOM NAV                                │
└────────────────────────────────────────────┘
```

---

## Screen 21 — Food Diary / Meal Journal (`/app/diary`)

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  Meal Diary                    [+ Log meal]│  22px/700
│  [7d] [30d] [90d]  ← range toggle         │  pill toggle, right
│                                            │
│  ── Tuesday 26 May ─────────────────────   │  date header
│  ┌──────────────────────────────────────┐  │
│  │ 🌙 Dinner · 😴 Tired                 │  │
│  │ Cozy Tomato & Lentil Soup            │  │  diary entry card
│  │ ⭐⭐⭐⭐ · 25min · Homemade           │  │
│  │ Cal 340 · P 18g · F 4g · C 52g      │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ ☀ Lunch · 🎯 Focused                │  │
│  │ Rainbow Quinoa Bowl                  │  │
│  │ ⭐⭐⭐⭐⭐ · 15min · Homemade         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Monday 25 May ──────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │ 🌙 Dinner · 🧸 Cozy                 │  │
│  │ Chicken Tikka Masala                 │  │
│  │ ⭐⭐⭐⭐ · 45min · Homemade           │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Moody notice ────────────────────────  │
│  ┌──────────────────────────────────────┐  │
│  │ 💬 "You've had chicken 4 days in a   │  │
│  │    row — want to mix it up tonight?" │  │
│  │ [Show me alternatives]               │  │
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖●] [🛒] [📅]   │
└────────────────────────────────────────────┘
```

### Manual Log Entry Sheet

```
┌────────────────────────────────────────────┐
│  ── (drag handle) ─────────────────────    │
│  Log a meal                   [Cancel]     │  20px/700
│                                            │
│  What did you eat?                         │
│  ┌──────────────────────────────────────┐  │
│  │ Describe your meal or type recipe…   │  │  text area / chat input
│  └──────────────────────────────────────┘  │
│  or [Link a saved recipe]                  │
│                                            │
│  Meal type                                 │
│  [Breakfast] [Lunch] [Dinner ✓] [Snack]    │
│                                            │
│  Mood at the time                          │
│  [😴 Tired ✓] [😰 Stressed] ...           │
│                                            │
│  Servings                                  │
│  [─]  2  [+]                               │
│                                            │
│  Notes  (optional)                         │
│  ┌──────────────────────────────────────┐  │
│  │ Was delicious, a bit salty...        │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │           Log meal →                 │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## Screen 22 — Nutrition & Insights (`/app/insights`)

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  Insights                   [7d] [30d] [90d]│  22px/700 + range pills
│                                            │
│  ── This week ──────────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │  🎯 Variety Score                    │  │
│  │  ████████░░  Good (76/100)           │  │  score card
│  │  "5 different cuisines this week"    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🔁 Repeat Alert                     │  │
│  │  Chicken 4 of 7 dinners              │  │  alert card
│  │  [Show me alternatives →]            │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Macros (this week) ────────────────    │  section
│  ┌──────────────────────────────────────┐  │
│  │  Protein    ████████░░  Adequate     │  │
│  │  Fibre      ████░░░░░░  Low ⚠        │  │  bar chart rows
│  │  Carbs      ██████████  Good         │  │  colour-coded bars
│  │  Fat        ███████░░░  Good         │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  💬 "Your lunches are low in fibre this    │
│     week — here are five quick fixes."     │  Moody gentle hint
│  [Show fibre-rich recipes →]               │
│                                            │
│  ── Micronutrients (30-day) ─────────────  │
│  [Iron   Good] [Calcium  Good] [Vit D Low] │  pill badges: green/amber
│  [Zinc   Good] [Folate   Good]             │
│                                            │
│  ── Meals cooked (weekly) ─────────────    │
│  Mon ██  Tue ██  Wed █  Thu ███           │  mini bar chart
│  Fri ██  Sat     Sun █                    │
│                                            │
│  ── Cuisine breakdown ─────────────────    │
│  Italian 40% · Thai 30% · Japanese 30%    │  donut / pill breakdown
│                                            │
│  [Mood → food patterns →]                  │  link to deep dive
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖●] [🛒] [📅]   │  ← Diary (📖) active; Insights
└────────────────────────────────────────────┘    lives under the Diary section
```

### LG+ — Dashboard grid layout

```
┌─────────────────┬──────────────────────────────────────────────────────────┐
│  SIDEBAR        │  INSIGHTS DASHBOARD  (max-width: 960px)                  │
│                 │                                                           │
│  📊 Insights  ◄ │  ┌──────────────────┐  ┌──────────────────┐             │
│  ...            │  │ Variety Score    │  │ Repeat Alert     │             │
│                 │  │ 76/100 Good      │  │ Chicken 4/7 days │             │
│  Range          │  └──────────────────┘  └──────────────────┘             │
│  [7d][30d][90d] │                                                           │
│                 │  ┌──────────────────────────────────────────────────┐    │
│                 │  │ Macros (this week)                               │    │
│                 │  │ Protein ████████░░ Adequate                      │    │
│                 │  │ Fibre   ████░░░░░░ Low ⚠                         │    │
│                 │  │ Carbs   ██████████ Good                          │    │
│                 │  │ Fat     ███████░░░ Good                          │    │
│                 │  └──────────────────────────────────────────────────┘    │
│                 │                                                           │
│                 │  ┌──────────────────┐  ┌──────────────────┐             │
│                 │  │ Meals cooked     │  │ Cuisine split    │             │
│                 │  │ Mon-Sun bar chart│  │ Donut chart      │             │
│                 │  └──────────────────┘  └──────────────────┘             │
│                 │                                                           │
│                 │  ┌──────────────────────────────────────────────────┐    │
│                 │  │ Moody insight: "Your lunches are low in fibre…"  │    │
│                 │  │ [Show fibre-rich recipes →]                       │    │
│                 │  └──────────────────────────────────────────────────┘    │
└─────────────────┴──────────────────────────────────────────────────────────┘
```

---

## Screen 23 — Grocery Hub (`/app/grocery`)

The Grocery nav item is a **tabbed hub**: Lists | Shopping Bag | Pantry. This gives Pantry a clear navigation home on mobile without requiring a dedicated nav slot.

### SM — Hub with tabs

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  [Lists ●]  [Shopping Bag 🛒]  [Pantry 🥕] │  tab bar, 44px
│  ─────────────────────────────────────────  │
│  (content below changes per active tab)    │
└────────────────────────────────────────────┘
```

### SM — Lists tab (active)

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  [Lists ●]  [Shopping Bag 🛒]  [Pantry 🥕] │  tab bar
│  ─────────────────────────────────────────  │
│  Grocery Lists               [+ New list]  │  22px/700
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  📋 Weekly Shop                      │  │
│  │  14 items · 4 checked                │  │  list card
│  │  From: Week plan 26 May              │  │  80px height
│  │                             [→ Open] │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  🎉 Party Night                      │  │
│  │  8 items · 0 checked                 │  │
│  │                             [→ Open] │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  [+]  Create new list               │  │  dashed card
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖] [🛒●] [📅]   │
└────────────────────────────────────────────┘
```

---

## Screen 23.5 — Shopping Bag (`/app/grocery` → Shopping Bag tab)

Accessible from: Grocery Hub "Shopping Bag" tab, and "View bag →" CTA on Recipe Detail Ingredients tab.

### SM — Shopping Bag tab (recipe-scoped)

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  [Lists]  [Shopping Bag 🛒 ●]  [Pantry]   │  tab bar
│  ─────────────────────────────────────────  │
│                                            │
│  Shopping Bag                              │  22px/700
│  For: Cozy Tomato & Lentil Soup            │  14px, --color-text-secondary
│  Expires in 23 hours                       │  13px, amber if <2hrs
│                                            │
│  ── Items needed (3) ───────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │  🛒 200g red lentils                 │  │  ← swipe left to remove
│  │       [Remove ✕]                     │  │  or tap ✕ icon
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  ⚠️ 2 cloves garlic (low stock)      │  │
│  │       [Remove ✕]                     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  🛒 800ml vegetable stock            │  │
│  │       [Remove ✕]                     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  🛒 Fresh parsley (garnish)          │  │
│  │       [Remove ✕]                     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [+ Add item manually…]                    │  text input inline
│                                            │
│  ── Actions ────────────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │  📋 Convert to Grocery List          │  │  secondary btn — promotes bag
│  └──────────────────────────────────────┘  │  to a named, aisle-sorted list
│  [Clear bag]                               │  red text, no button style
│                                            │
│  Note: Store ordering available in a       │  13px, --color-text-secondary
│  future update                             │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖] [🛒●] [📅]   │
└────────────────────────────────────────────┘
```

### SM — Empty Shopping Bag

```
┌────────────────────────────────────────────┐
│  [Lists]  [Shopping Bag 🛒 ●]  [Pantry]   │
│  ─────────────────────────────────────────  │
│                                            │
│         [Moody avatar — friendly]          │
│                                            │
│  Your bag is empty                         │  20px/700, centered
│                                            │
│  Open a recipe's Ingredients tab and       │  14px, --color-text-secondary
│  tap [+ Add to bag] on anything you        │  centered
│  need to pick up.                          │
│                                            │
│  [Browse recipes →]                        │  primary btn
└────────────────────────────────────────────┘
```

---

## Screen 24 — Grocery List Detail (`/app/grocery/:listId`)

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  [◄]  Weekly Shop            [⋮ Options]  │  56px
│  14 items · 4 checked                      │  13px, secondary
├────────────────────────────────────────────┤  scroll
│  [+ Add item manually…]                    │  quick add
│                                            │
│  ── PRODUCE ─────────────────────────────  │  aisle header
│  ☑ 2 onions                               │  checked = strikethrough
│  ☑ 3 garlic cloves                        │
│  ☐ 400g spinach                           │  ← tap to check
│  ☐ 2 lemons                               │
│                                            │
│  ── PANTRY ──────────────────────────────  │
│  ☑ 400g canned tomatoes                   │
│  ☐ 200g red lentils                       │
│  ☐ 1 tsp cumin                            │
│  ☐ 1 tsp smoked paprika                   │
│                                            │
│  ── DAIRY ───────────────────────────────  │
│  ☐ 200ml crème fraîche                    │
│                                            │
│  ── MEAT ────────────────────────────────  │
│  ☐ 400g chicken thighs                    │
│                                            │
│  💬 Moody: "Crème fraîche is expensive —  │
│     Greek yogurt works just as well here."│
│                                            │
│  ── Checked (4) ────────────────────────   │
│  [Show / Hide checked items]               │  collapsible
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [Share list]    [Clear checked]     │  │  utility row
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  BOTTOM NAV                                │
└────────────────────────────────────────────┘
```

---

## Screen 25 — Meal Planner (`/app/planner`)

### SM — Week view

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  Meal Planner         [Week ●] [Month]     │  22px/700 + toggle
│  26 May – 1 Jun                [← →]      │  week nav arrows
│                                            │
│  ── Mon 26 ────────────────────────────    │
│  B  [+ Add breakfast]                      │  B = Breakfast slot
│  L  Quinoa Bowl  ⏱ 15m  [✕]              │  L = Lunch, recipe pill
│  D  Cozy Tomato Soup ⏱ 25m  [✕]         │  D = Dinner
│                                            │
│  ── Tue 27 ────────────────────────────    │
│  B  [+ Add]                                │
│  L  [+ Add]                                │
│  D  [+ Add]                                │
│                                            │
│  ── Wed 28 ────────────────────────────    │
│  B  [+ Add]                                │
│  L  Avocado Toast ⏱ 10m  [✕]            │
│  D  [+ Add]                                │
│                                            │
│  (Thu–Sun collapsed, tap to expand)        │
│                                            │
│  ── Plan actions ───────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │  🤖 Auto-generate this week          │  │  secondary btn
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  🛒 Create grocery list              │  │  primary btn
│  └──────────────────────────────────────┘  │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖] [🛒] [📅●]   │
└────────────────────────────────────────────┘
```

### Auto-Generate Sheet

```
┌────────────────────────────────────────────┐
│  ── (drag handle) ─────────────────────    │
│  Generate this week's plan                 │  20px/700
│                                            │
│  Tell Moody your constraints…              │
│  ┌──────────────────────────────────────┐  │
│  │ "Vegetarian 3 days, fish 2 days,     │  │  text input / prompt
│  │  max 25 min weekdays, fun Saturday"  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Or set rules:                             │
│  Max weekday cook time   [30 min ▾]        │
│  Weekend cook time        [60 min ▾]        │
│  Repeat prevention        5 days           │
│  Include breakfast        [ON ●]           │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │     🤖 Generate plan →              │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### LG+ — Calendar grid

```
┌─────────────────┬──────────────────────────────────────────────────────────┐
│  SIDEBAR        │  WEEK: 26 May – 1 Jun    [← Prev]  [Next →]             │
│  📅 Planner  ◄  │                                                           │
│                 │  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐     │
│  [Auto-gen]     │  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │     │
│  [From templ]   │  │  26  │  27  │  28  │  29  │  30  │  31  │   1  │     │
│  [Make grocery] │  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤     │
│                 │  │ B    │ B    │ B    │ B    │ B    │ B    │ B    │     │
│  Drag from:     │  │[+add]│[+add]│Avo T.│[+add]│[+add]│Eggs  │[+add]│     │
│  ┌───────────┐  │  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤     │
│  │ Recipe    │  │  │ L    │ L    │ L    │ L    │ L    │ L    │ L    │     │
│  │ search …  │  │  │Q.Bow │[+add]│[+add]│Wrap  │[+add]│[+add]│[+add]│     │
│  │           │  │  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤     │
│  │ [result]  │  │  │ D    │ D    │ D    │ D    │ D    │ D    │ D    │     │
│  │ [result]  │  │  │Soup  │[+add]│Pasta │Curry │Fish  │Roast │[+add]│     │
│  │ [result]  │  │  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘     │
│  └───────────┘  │  ← drag recipe cards into calendar slots                │
│                 │                                                           │
│                 │  [🛒 Generate grocery list from this plan]               │
└─────────────────┴──────────────────────────────────────────────────────────┘
```

---

## Screen 26 — Recipe Import (`/app/import`)

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  Import a Recipe                           │  22px/700
│                                            │
│  [🔗 Paste URL]    [📷 Scan Recipe]        │  two main CTAs, tab-like
│  ──────────────────────────────────────    │  active tab underline
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Paste any recipe URL…                │  │  URL input 52px
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │     Import →                         │  │  56px primary
│  └──────────────────────────────────────┘  │
│                                            │
│  Works with:                               │
│  [🎬 YouTube] [📱 TikTok] [📸 Instagram]   │  platform icons
│  [📌 Pinterest] [🌐 Any website]           │
│                                            │
│  ── Recent Imports ─────────────────────   │
│  ┌─────────────────────────────────────┐   │
│  │ 📹 [yt thumb]  Perfect Carbonara    │   │  import history card
│  │                SortedFood · YouTube │   │
│  │                Italian · 20min      │   │
│  │                [View recipe]        │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 📱 [tk thumb]  5-Min Fried Rice     │   │
│  │                @chefjohn · TikTok   │   │
│  │                [View recipe]        │   │
│  └─────────────────────────────────────┘   │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍●] [📖] [🛒] [📅]   │
└────────────────────────────────────────────┘
```

### Import Preview (after URL processed)

```
┌────────────────────────────────────────────┐
│  [✕ Cancel]   Review Import      [Save ✓]  │  56px
│  Extracted from: YouTube · SortedFood      │  13px, secondary
├────────────────────────────────────────────┤
│                                            │
│  [Video thumbnail — 16:9, full width]      │
│  ▶ Perfect Carbonara in 15 min  14:23      │  embedded/linked
│                                            │
│  ⚠ Flags:  [Nutrition estimated]           │  amber flag chips
│             [Servings inferred: 2]         │
│                                            │
│  Recipe Name (editable)                    │
│  ┌──────────────────────────────────────┐  │
│  │ Perfect Carbonara                    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Details                                   │
│  ⏱ Prep 5m  🍳 Cook 15m  👤 Serves 2     │  editable inline
│  📊 Medium · 🇮🇹 Italian                   │
│                                            │
│  Ingredients (5)              [Edit all]   │
│  • 200g spaghetti                          │
│  • 100g guanciale                          │
│  • 3 eggs + 1 yolk                        │
│  • 50g Pecorino Romano                     │
│  • Black pepper                            │
│                                            │
│  Steps (4)                    [Edit all]   │
│  1. Boil salted water…                     │
│  2. Fry guanciale until crisp…             │
│  ...                                       │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │     Save to library →                │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

---

## Screen 27 — Video Library (`/app/videos`)

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  🎬 Video Library              [+ Import]  │  22px/700
│  ┌──────────────────────────────────────┐  │
│  │ 🔍 Search videos…                   │  │  search bar
│  └──────────────────────────────────────┘  │
│                                            │
│  [All] [YouTube] [TikTok] [Instagram]      │  platform filter pills
│  [Saved ♥] [Linked] [Under 5min]          │
│                                            │
│  ── 2-column thumbnail grid ─────────────  │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ [thumbnail 16:9]│  │ [thumbnail 16:9]│  │
│  │ ▶ 14:23  [YT]  │  │ ▶ 3:45  [TT]   │  │  video card
│  │ Perfect         │  │ 5-Min Pasta      │  │  height ~130px
│  │ Carbonara       │  │                  │  │
│  │ SortedFood      │  │ @chefjohn        │  │
│  │ 🇮🇹 Italian     │  │ 🇮🇹 Italian     │  │
│  │ [View Recipe]   │  │ [View Recipe]    │  │
│  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ [thumbnail]     │  │ [thumbnail]     │  │
│  │ ...             │  │ ...             │  │
│  └─────────────────┘  └─────────────────┘  │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍●] [📖] [🛒] [📅]   │  ← Search active (Videos is a
└────────────────────────────────────────────┘    Search content type on mobile)
```

**Mobile access path:** Video Library on mobile is reached via Search → [🎬 Videos] content type toggle. On desktop/tablet, it appears as a dedicated sidebar item. This avoids adding a 6th nav item to mobile.

---

## Screen 28 — Video Detail / Player (`/app/videos/:id`)

### SM

```
┌────────────────────────────────────────────┐
│  [◄ Back]                        [⭐ Save] │  56px
├────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  │       EMBEDDED VIDEO PLAYER          │  │  16:9, full width
│  │       iframe / WebView               │  │  ~211px tall at 375px
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│  [Platform fallback: thumb + open in app]  │
│                                            │
│  Perfect Carbonara in 15 Minutes           │  18px/700
│  SortedFood · YouTube · 14:23             │  13px, secondary
│  🇮🇹 Italian · Medium · 20 min cook       │  tag pills
│                                            │
│  ┌──────────────────────┐ ┌─────────────┐  │
│  │ 🍳 View Full Recipe  │ │ ▶ Cook Along│  │  action buttons
│  └──────────────────────┘ └─────────────┘  │
│  [📋 Add to Plan]    [🛒 Add to Grocery]   │
│                                            │
│  ── About ─────────────────────────────    │
│  A quick, authentic carbonara using only   │
│  5 ingredients. No cream needed.           │
│                                            │
│  ── Ingredients Preview ───────────────    │
│  • 200g spaghetti                          │
│  • 100g guanciale                          │
│  • 3 eggs + 1 yolk                        │
│  • 50g Pecorino Romano                     │
│  [See all ingredients →]                  │
└────────────────────────────────────────────┘
```

---

## Screen 29 — Pantry Tracker (`/app/pantry`)  `[ROADMAP]`

**Mobile access:** Grocery Hub (🛒 nav) → Pantry tab. Also accessible from the "Use what I have" link on Search, and from the Ingredients tab's ingredient status area for new users.  
**Desktop access:** Dedicated sidebar nav item.

### SM — Main Pantry View

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  Pantry                     [+ Add] [📷]   │  22px/700 · 📷 = barcode scan
│                                            │
│  ┌──────────────────────────────────────┐  │  pantry freshness bar
│  │ ✅ Last updated 2 days ago           │  │  green = fresh (0–5 days)
│  │ 24 items · [Verify all →]            │  │  amber = stale (6–12 days)
│  └──────────────────────────────────────┘  │  red = very stale (13+ days)
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🔍 Search pantry…                   │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [All] [Expiring ⚠] [Produce]             │  filter chips
│  [Pantry] [Dairy] [Freezer]                │
│                                            │
│  ── Attention needed ───────────────────   │  only shown if items need action
│  ┌──────────────────────────────────────┐  │
│  │ 🔴 Whole Milk · Expired yesterday    │  │  red — expired
│  │             [Remove from pantry ✕]   │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ ⚠️ Greek Yoghurt · Expires tomorrow  │  │  amber — expiring soon
│  │ 400g  [Find recipes]  [Mark used ✓]  │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── PRODUCE ────────────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │ 🧅 Onions  · 3 units                 │  │  pantry item row
│  │ Updated 2 days ago         [Edit ✏]  │  │  13px secondary
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🧄 Garlic  · 1 head                  │  │
│  │ Updated 5 days ago         [Edit ✏]  │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🥕 Carrots  · 4 medium               │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── PANTRY / DRY GOODS ─────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │ 🥫 Canned Tomatoes  · 3 cans         │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🫙 Olive Oil  · ~300ml remaining     │  │  ← approximate quantity ok
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🧂 Salt  · In stock                  │  │  ← no quantity needed for staples
│  └──────────────────────────────────────┘  │
│                                            │
│  ── DAIRY ──────────────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │ 🧀 Cheddar  · ~150g                  │  │
│  │ ⚠️ Low stock                         │  │  amber warning
│  └──────────────────────────────────────┘  │
│                                            │
│  [🔍 Use what I have → find recipes]       │  CTA link, --color-primary
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖] [🛒●] [📅]   │
└────────────────────────────────────────────┘
```

**Pantry freshness bar spec:**

| Staleness status | Bar colour | Label | Action CTA |
|-----------------|------------|-------|------------|
| Fresh (0–5) | `--color-status-have` green | "Last updated [N] days ago · [X] items" | None |
| Getting old (6–12) | `--color-status-partial` amber | "Getting a bit old — last updated [N] days ago" | [Quick verify →] |
| Stale (13–20) | `--color-allergen-intolerant` amber-red | "Pantry might be out of date — Moody may suggest buying things you have" | [Update now →] |
| Very stale (21+) | `--color-allergen-critical` red | "Pantry is very out of date — shopping lists may not be accurate" | [Update now →] |

### SM — Stale Pantry Warning State

When pantry is Stale or Very Stale and the user is about to generate a grocery list, Moody shows this interstitial:

```
┌────────────────────────────────────────────┐
│  ── (drag handle) ─────────────────────    │
│                                            │
│  [Moody icon 40px]                         │
│  Before I make your shopping list…         │  18px/600
│                                            │
│  Your pantry hasn't been updated in        │  14px secondary
│  12 days. I might add things you           │
│  already have.                             │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   ✓ Update pantry first (2 min)      │  │  56px primary
│  └──────────────────────────────────────┘  │
│  [Generate list anyway — I'll check it]    │  text link, secondary
└────────────────────────────────────────────┘
```

### SM — Weekly Pantry Review (triggered by notification)

A quick verification flow — not a full edit. User confirms or removes each item in ~30 seconds.

```
┌────────────────────────────────────────────┐
│  [✕ Cancel]  Pantry Check     [Done ✓]    │  progress: "3 of 8 items"
├────────────────────────────────────────────┤
│                                            │
│  [Moody icon 32px]                         │
│  "Quick question — is this still in        │
│  your kitchen?"                            │  14px italic, moody bubble
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🧅 Onions — you listed 3 units      │  │  item card
│  │                                      │  │
│  │  [✓ Yes, still have them]            │  │  48px primary
│  │  [✗ Used them up / don't have these] │  │  48px outlined
│  │  [Different amount →]                │  │  text link → quantity editor
│  └──────────────────────────────────────┘  │
│                                            │
│  [Skip remaining — verify later]           │  13px link
└────────────────────────────────────────────┘
```

**Weekly review behaviour:**
- Moody shows the 8 most-at-risk items (oldest `last_verified_at`, high-usage items, items with no expiry that may have been used)
- User taps Yes → sets `last_verified_at = now()`; No → removes item from pantry; Different amount → opens inline stepper
- Completing the review resets the staleness score to 0

### SM — Post-Shop Update (I Just Did a Shop)

```
┌────────────────────────────────────────────┐
│  ── (drag handle) ─────────────────────    │
│  Back from the shops?         [Cancel]     │
├────────────────────────────────────────────┤
│                                            │
│  Your last shopping list had 9 items.      │  14px secondary
│  Tick what you bought:                     │
│                                            │
│  [✓] 🥕 Carrots  · 4 medium               │  pre-ticked from grocery list
│  [✓] 🫙 Olive Oil  · 500ml                │
│  [✓] 🧀 Cheddar  · 200g                   │
│  [ ] 🌿 Basil (fresh)                      │  not ticked — user can adjust
│  [ ] 🥩 Chicken thighs  · 400g            │
│  [✓] 🥫 Canned Tomatoes  · 2 cans         │
│                                            │
│  + Anything else you bought?               │
│  ┌──────────────────────────────────────┐  │
│  │ 🔍 Add item…                        │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   ✓ Update my pantry with these      │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### SM — Add Item Sheet

```
┌────────────────────────────────────────────┐
│  ── (drag handle) ─────────────────────    │
│  Add pantry item               [Cancel]    │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 🔍 Scan barcode or search item…     │  │  combined input
│  └──────────────────────────────────────┘  │
│                                            │
│  Or scan barcode →  [📷 Open camera]       │
│                                            │
│  Quantity  (leave blank for "in stock")    │  helper text 12px
│  ┌──────────────┐   Unit  ┌──────────────┐ │
│  │ 2            │         │ cans      ▾  │ │
│  └──────────────┘         └──────────────┘ │
│                                            │
│  Expiry date  (optional but recommended)   │
│  ┌──────────────────────────────────────┐  │
│  │ DD / MM / YYYY                       │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │  helper tip
│  │  💡 Adding expiry dates lets Moody   │  │  collapsible
│  │  remind you before things go off     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │           Add to pantry →            │  │  56px primary
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### SM — Grocery List with Pantry Cross-Reference

*How a generated grocery list looks when Moody has used the pantry to filter out items the user already has:*

```
┌────────────────────────────────────────────┐
│  [◄]   Weekly Shop                [Share]  │  22px/700
│  7 items to buy · 5 already in pantry      │  13px secondary, --color-primary
├────────────────────────────────────────────┤
│                                            │
│  ── PRODUCE ────────────────────────────   │
│  ☐ 2 limes                                │
│  ☐ 1 bunch fresh coriander                │
│  ☐ 300g broccoli                          │
│                                            │
│  ── MEAT & FISH ────────────────────────   │
│  ☐ 400g chicken thighs                    │
│                                            │
│  ── PANTRY & DRY GOODS ─────────────────   │
│  ☐ 1 can coconut milk                     │
│     ⚠️ You have 1 can, need 2             │  amber note, 12px
│  ☐ 250ml fish sauce                       │
│                                            │
│  ── DAIRY ──────────────────────────────   │
│  ☐ 200g cheddar  (low stock in pantry)    │  restock note, 12px
│                                            │
│  ┌──────────────────────────────────────┐  │  collapsed section
│  │  ✅ Already in your pantry (5)  ▾    │  │  tap to expand
│  └──────────────────────────────────────┘  │
│  (expanded):                               │
│  ✅ Garlic · 3 heads                      │  12px, --color-status-have
│  ✅ Jasmine rice · 800g                   │
│  ✅ Soy sauce                             │
│  ✅ Olive oil · ~300ml                    │
│  ✅ Salt                                  │
│                                            │
│  [🔄 Regenerate list]  [Export to notes]  │  secondary links
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖] [🛒●] [📅]   │
└────────────────────────────────────────────┘
```

**"Already in pantry" section rules:**
- Collapsed by default — clean list for shopping
- Shows count in the collapsed header: "Already in your pantry (5)"
- Expandable to review what Moody skipped
- User can tap any skipped item to add it back to the list manually (e.g., if they want to buy more even though they have some)

---

## Screen 30 — Settings (`/app/settings`)

### SM

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  Settings                                  │  22px/700
│                                            │
│  ── Profile ────────────────────────────   │
│  ┌──────────────────────────────────────┐  │
│  │ [Avatar 48px]  Alex Johnson           │  │
│  │                akiwumi@gmail.com      │  │
│  │                [Edit profile →]       │  │
│  └──────────────────────────────────────┘  │
│  Your Food Profile & Sharing       [→]    │  → links to Screen 36
│  Comfort Adventurer · 6 moods              │  personality summary line
│                                            │
│  ── Dietary ────────────────────────────   │
│  Dietary preferences            [Edit →]  │  row → opens sub-screen
│  Vegetarian                                │
│  Allergies                       [Edit →]  │
│  Peanuts, Dairy                            │
│                                            │
│  ── Cooking ────────────────────────────   │
│  Skill level            Developing  [✏]   │
│  Cook time (weekday)    15–30 min   [✏]   │
│  Cook time (weekend)    60 min      [✏]   │
│  Servings default       2           [✏]   │
│  Equipment              Oven, AF… [Edit →] │
│  Top cuisines           Thai, It…  [Edit →]│
│                                            │
│  ── Taste ──────────────────────────────   │
│  Spice tolerance         6/10       [✏]   │
│  Adventurousness         7/10       [✏]   │
│                                            │
│  ── Moods ──────────────────────────────   │
│  Mood definitions                 [Edit →] │
│  6 moods configured                        │
│                                            │
│  ── Nutrition display ──────────────────   │
│  Nutrition disclosure    Gentle    [✏ ▾]  │
│  Gentle reminders        [ON  ●]           │
│                                            │
│  ── Units ──────────────────────────────   │
│  Measurement             Metric    [✏ ▾]  │
│                                            │
│  ── Notifications ──────────────────────   │
│  All notifications                [Edit →] │
│                                            │
│  ── Recalibrate ────────────────────────   │
│  My tastes changed               [→]      │
│  My schedule changed             [→]      │
│  My goals changed                [→]      │
│                                            │
│  ── Account ────────────────────────────   │
│  Subscription            Annual    [→]    │
│  Export my data                    [→]    │
│  Delete account                    [→]    │
│                                            │
│  ── About ──────────────────────────────   │
│  Privacy Policy                    [→]    │
│  Terms of Service                  [→]    │
│  Version 1.0.0                            │
│                                            │
│  [Sign out]                               │  red text, no button
├────────────────────────────────────────────┤
│  BOTTOM NAV                                │
└────────────────────────────────────────────┘
```

---

## Screen 31 — Settings: Mood Editor

### SM — Accessed from Settings → Mood Definitions (`/app/settings/moods`)

```
┌────────────────────────────────────────────┐
│  STATUS BAR                                │
├────────────────────────────────────────────┤
│  [◄]    Mood Definitions                   │  56px nav bar
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│                                            │
│  Your 6 moods                              │  16px/600
│  Tap any mood to edit how Moody            │  13px, --color-text-secondary
│  interprets it for you.                    │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ 😴  Tired                    [Edit →]│  │  tappable row
│  │     Quick · Minimal cleanup          │  │  13px chips, secondary
│  │     Avoid: Heavy  ·  Max: 20 min     │  │  12px, muted
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 😰  Stressed                 [Edit →]│  │
│  │     Familiar · Comfort · Quick       │  │
│  │     Avoid: Spicy                     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🧸  Cozy                     [Edit →]│  │
│  │     Warming · Rich                   │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🎉  Celebratory              [Edit →]│  │
│  │     Impressive · Restaurant quality  │  │
│  │     Max: 90 min                      │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🎯  Focused                  [Edit →]│  │
│  │     Brain food · Light               │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🗺️  Adventurous              [Edit →]│  │
│  │     New cuisines · Complex welcome   │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [+ Add a custom mood]                     │  secondary action, up to 9 total
│                                            │
└────────────────────────────────────────────┘
```

### SM — Single Mood Edit bottom sheet (slides up when [Edit →] tapped)

```
┌────────────────────────────────────────────┐  ← dim overlay behind
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
├────────────────────────────────────────────┤  ← bottom sheet, rounded-top 20px
│           ────  (drag handle)              │  8×40px pill, --color-border
│                                            │
│  😴  Tired                                 │  20px/700
│  "When I feel this way, I want food that…" │  13px, secondary
│                                            │
│  ── Want ───────────────────────────────   │  section label 11px/600 uppercase
│  [Quick ✓] [Minimal cleanup ✓] [Warming ✓] │  multi-select chips, primary when on
│  [Comforting] [Light] [High-protein]        │
│  [Surprise me] [Familiar]                  │
│                                            │
│  ── Avoid ──────────────────────────────   │
│  [Heavy ✓] [Spicy] [Dairy] [Complex]       │  multi-select, red-tint when on
│  [Rich] [Meaty]                            │
│                                            │
│  ── Max cook time ──────────────────────   │
│  No limit  ─────●──────────────  90 min   │  slider 5–90 min + "No limit" toggle
│  [ ] No time limit                         │  checkbox clears the limit
│                                            │
│  ── Cuisines to boost ──────────────────   │
│  (optional — leave blank to use profile)   │  12px muted
│  [Japanese ✓] [Thai] [Italian] …           │  searchable chip list
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │   Save changes                       │  │  48px primary button
│  └──────────────────────────────────────┘  │
│  [Cancel]                                  │  text link, --color-text-secondary
└────────────────────────────────────────────┘
```

**Save behaviour:** Changes take effect immediately and apply from the next mood check-in session. Past diary entries that used this mood are not retroactively changed.

### LG+ — Mood Definitions list as a settings sub-page (right panel)

On desktop, tapping "Mood Definitions" in the Settings sidebar opens the full mood list in the right panel. Tapping [Edit →] on a mood expands it **inline** (accordion-style) rather than a bottom sheet, showing the same fields as the mobile sheet above. [Save] collapses the accordion. Multiple moods can be open simultaneously.

---

## Screen 32 — Settings: Notifications  `[ROADMAP]`

**Access:** Settings → Notifications  
All notification types are individually toggleable. Each toggle controls both push AND in-app delivery (users can optionally split channels per notification type via the channel picker that appears when a row is tapped).

### SM — Full Notifications Settings Screen

```
┌────────────────────────────────────────────┐
│  [◄]    Notifications                      │  56px nav bar
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│                                            │
│  ┌──────────────────────────────────────┐  │  master toggle card
│  │  Push notifications      [Enabled ●] │  │  16px/600
│  │  Tap to manage device permission     │  │  13px secondary
│  └──────────────────────────────────────┘  │
│                                            │
│  Quiet hours                               │  16px/600
│  No notifications between                  │  13px secondary
│  [10:00 PM ▾]  and  [7:00 AM ▾]           │  time pickers
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  ── 🍽 Meal reminders ──────────────────   │  section header
│                                            │
│  Dinner reminder                [ON  ●]   │
│  Time              [6:00 PM ▾]  [push ▾]  │  time + channel pickers
│                                            │
│  Breakfast reminder             [OFF ○]   │
│  Lunch reminder                 [OFF ○]   │
│  Plan meal reminder             [ON  ●]   │
│  "You planned risotto tonight…"            │  12px example copy, muted
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  ── 🥕 Pantry & Shopping ───────────────   │
│                                            │
│  Weekly pantry check-in         [ON  ●]   │
│  Every Sunday at  [8:00 AM ▾]             │
│  "Quick 2-min pantry review"               │  12px example, muted
│                                            │
│  Expiring soon alerts           [ON  ●]   │
│  Items expiring within 3 days             │  12px, secondary
│                                            │
│  Already expired alerts         [ON  ●]   │
│                                            │
│  Low stock alerts               [OFF ○]   │
│                                            │
│  Post-shop update reminder      [ON  ●]   │
│  "Back from shops? Update pantry"          │  12px example
│                                            │
│  Grocery list ready             [ON  ●]   │
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  ── 🍳 Cooking ─────────────────────────   │
│                                            │
│  Cook streak milestones         [ON  ●]   │
│  "You've cooked 5 days in a row 🔥"       │  12px example
│                                            │
│  Recipe ready to cook           [ON  ●]   │
│  When you have 90%+ of ingredients        │  12px secondary
│                                            │
│  Skill push nudge               [ON  ●]   │
│  Seasonal recipes               [ON  ●]   │
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  ── 📊 Insights ────────────────────────   │
│                                            │
│  Weekly food review             [ON  ●]   │
│  Every Monday at  [8:00 AM ▾]             │
│                                            │
│  Variety nudges                 [ON  ●]   │
│  "Had chicken 4 days running…"            │  12px example
│                                            │
│  Nutrition nudges               [OFF ○]   │
│  Seasonal shift alerts          [ON  ●]   │
│                                            │
│  ────────────────────────────────────────  │
│                                            │
│  ── 👤 Profile & App ───────────────────   │
│                                            │
│  Profile completeness nudges    [ON  ●]   │
│  Re-engagement reminders        [OFF ○]   │
│  New feature announcements      [ON  ●]   │
│                                            │
│  ── ⚙ Subscription ─────────────────────  │
│                                            │
│  Trial expiry warnings          [ON  ●]   │
│  (cannot be fully disabled)               │  12px, muted
│                                            │
└────────────────────────────────────────────┘
```

**Toggle row behaviour:**
- Tapping the label or toggle area toggles the notification on/off
- Tapping the [push ▾] channel pill opens a 3-option picker: `Push only` · `In-app only` · `Both`
- Tapping the time picker opens the system time picker
- ON state: toggle pill is `--color-primary` filled; label in `--color-text-primary`
- OFF state: toggle pill is `--color-surface-pill`; label in `--color-text-secondary`
- Trial warning row: toggle is always ON; tapping shows toast: "Trial notifications can't be turned off — but you can adjust your subscription any time"

### SM — Channel Picker (appears below row when channel pill tapped)

```
┌──────────────────────────────────────────────┐
│  Dinner reminder — how do you want it?       │
│                                              │
│  ● Push + in-app  (recommended)             │  selected state
│  ○ Push only                                 │
│  ○ In-app bell only                          │
│                                              │
│  [Done]                                      │
└──────────────────────────────────────────────┘
```

### SM — In-App Notification Centre (`/app/notifications`)

*Accessed via 🔔 bell icon in the top navigation bar. Badge shows unread count.*

```
┌────────────────────────────────────────────┐
│  [◄]    Notifications       [Mark all read]│
├────────────────────────────────────────────┤
│                                            │
│  ── Today ──────────────────────────────   │
│                                            │
│  ┌──────────────────────────────────────┐  │  UNREAD — primary left border
│  │▌ 🥕 Pantry                           │  │  3px --color-primary
│  │  Your whole milk expires tomorrow.   │  │  14px/500
│  │  Moody found 3 recipes that use it.  │  │  13px secondary
│  │  "View recipes →"             2h ago │  │  deep link + timestamp
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │  UNREAD
│  │▌ 🍽 Time to cook                     │  │
│  │  It's 6pm — what's for dinner?       │  │
│  │  "See tonight's ideas →"      1h ago │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── Yesterday ──────────────────────────   │
│                                            │
│  ┌──────────────────────────────────────┐  │  READ — no accent
│  │  🔥 Cook streak                      │  │
│  │  You cooked 5 days in a row!         │  │
│  │  "See your week →"         Yesterday │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  📊 Weekly review ready              │  │
│  │  5 meals · 3 cuisines · nice work.   │  │
│  │  "Read your review →"      Yesterday │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ── 3 days ago ─────────────────────────   │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  🛒 Shopping list ready              │  │
│  │  7 items to buy · 5 already in your  │  │
│  │  pantry — skipped automatically      │  │
│  │  "View list →"             3 days ago│  │
│  └──────────────────────────────────────┘  │
│                                            │
│  (Notifications removed after 30 days)    │  12px, --color-text-muted
│                                            │
├────────────────────────────────────────────┤
│  BOTTOM NAV: [🏠] [🔍] [📖] [🛒] [📅]   │
└────────────────────────────────────────────┘
```

**Notification centre rules:**
- Unread: `3px solid --color-primary` left border, label `500` weight
- Read: no left border, text at `400` weight `--color-text-secondary`
- Tapping any notification → marks read + navigates to deep link
- Swipe left → [Dismiss ✕] — removes from centre
- "Mark all read" — marks all without navigating
- Notifications auto-expire after 30 days
- Bell icon: unread badge count up to 99; "99+" for overflow

### LG+ — Notifications Settings (desktop)

On desktop, notification settings appear as the full content area in the Settings right panel. Toggle rows are wider (720px max) with time and channel pickers shown inline to the right of each row. Section headers use the standard settings section header spec (11px uppercase).

The Notification Centre is accessible from the 🔔 bell icon in the persistent left sidebar, opening as a 360px-wide slide-in panel from the right edge of the screen.

---

## Screen 33 — Settings: Subscription & Billing

### SM

```
┌────────────────────────────────────────────┐
│  [◄]    Subscription                       │
├────────────────────────────────────────────┤
│ ←24px                                      │
│                                            │
│  Current plan                              │  16px/600
│  ┌──────────────────────────────────────┐  │
│  │  ⭐ Annual                           │  │
│  │  $100 / year · Renews 26 May 2027    │  │  plan card
│  │  [Manage billing → Stripe portal]    │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Usage                                     │
│  ✓ Moody AI — unlimited                    │
│  ✓ All features                            │
│  ✓ Multi-device sync                       │
│                                            │
│  ── Change plan ────────────────────────   │
│  [Monthly $10/mo]  [Annual $100/yr]        │
│                                            │
│  ── Danger zone ────────────────────────   │
│  [Cancel subscription]                     │  red text link
│  Cancels at end of period (26 May 2027)    │  13px, secondary
└────────────────────────────────────────────┘
```

---

## Screen 34 — Recalibration Wizards

### SM — "My tastes changed" example

```
┌────────────────────────────────────────────┐
│  [◄ Cancel]   Update your tastes           │  56px
├────────────────────────────────────────────┤
│                                            │
│  [Moody avatar — curious expression]       │  64px
│  "Let's see what's changed."              │
│                                            │
│  What's shifted?  (pick any)              │
│  [New cuisine interests] [Spice changed]   │  chips
│  [Mood definitions] [Comfort vs Adventure] │
│  [Dietary change] [New allergies]          │
│                                            │
│  ── Selected: Cuisine interests ────────   │
│                                            │
│  Your current top 3:                       │
│  [Thai] [Italian] [Japanese]               │
│                                            │
│  Updated top cuisines:                     │
│  ┌──────────────────────────────────────┐  │
│  │ Search cuisines…                     │  │
│  └──────────────────────────────────────┘  │
│  [Korean ✓] [Mexican ✓] [Thai]             │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │      Save changes →                  │  │  56px primary
│  └──────────────────────────────────────┘  │
│  Confidence scores will reset for          │
│  affected preferences only.               │  13px, secondary
└────────────────────────────────────────────┘
```

---

## Screen 35 — Moody AI Panel (Global)

### SM — Bottom Sheet

```
┌────────────────────────────────────────────┐
│  (app content — dimmed behind sheet)       │
│                                            │
│                                            │
├────────────────────────────────────────────┤  ← slides up from bottom
│  ── (drag handle) ─────────────────────    │
│  [Moody avatar 36px]  Ask Moody           │  18px/700 · [✕ close]
│                                            │
│  Context pills:                            │
│  [😴 Tired] [⏱ 20 min] [🚫 Peanuts]       │  always visible, read-only
│                                            │
│  ─────────────────────────────────────────  │  chat transcript
│  Moody: "You're tired with 20 mins —       │  Moody bubble (left)
│          here are three ideas for tonight."│
│                                            │
│  [Recipe card — Lemon Chicken]             │  inline recipe card
│  [Recipe card — Pasta e Fagioli]           │
│  [Recipe card — Omelette]                  │
│                                            │
│  [Start cooking Lemon Chicken]             │  action chips
│  [Show me more]  [Surprise me]             │
│  ─────────────────────────────────────────  │
│                                            │
│  Suggested: [What's quick tonight?]        │  quick reply chips
│             [Something with my pantry]     │
│             [Explain why]                  │
│             [Undo last action]             │
│                                            │
│  ┌──────────────────────────────────┐ [↑] │
│  │ Ask Moody anything…              │     │  input bar + send
│  └──────────────────────────────────┘     │
└────────────────────────────────────────────┘
```

### LG+ — Pinnable Side Panel (iPad/Desktop)

```
┌──────────────────────────────────────────┬───────────────────────────────┐
│  MAIN CONTENT AREA                        │  MOODY PANEL (pinned right)   │
│  (any screen)                             │  320px wide                   │
│                                           │                               │
│                                           │  [Moody avatar]  Ask Moody   │
│                                           │  [Pin 📌] [✕ Close]          │
│                                           │  ─────────────────────────── │
│                                           │  Context:                     │
│                                           │  [😴 Tired][⏱ 20m][🚫 Nuts] │
│                                           │  ─────────────────────────── │
│                                           │  Chat transcript…             │
│                                           │                               │
│                                           │  [inline recipe cards]        │
│                                           │                               │
│                                           │  [Suggested replies…]         │
│                                           │  ─────────────────────────── │
│                                           │  ┌───────────────────────┐   │
│                                           │  │ Ask Moody…        [↑] │   │
│                                           │  └───────────────────────┘   │
└──────────────────────────────────────────┴───────────────────────────────┘
  Moody FAB (56×56px mobile / 48×48px desktop, primary bg) persists on all screens
  when panel is closed — EXCEPT in Cook Mode (/app/cook/:sessionId) where it is hidden.
  Tap FAB → slides in this panel.
```

---

## Screen 36 — Psychological Food Profile Share (`/app/share`)  `[ROADMAP]`

### SM

```
┌────────────────────────────────────────────┐
│  [◄]    Your Food Profile                  │
├────────────────────────────────────────────┤
│ ←24px                              24px→  │
│                                            │
│  [Avatar 64px]  Alex Johnson               │
│  Food Personality                          │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Comfort Adventurer                  │  │  personality title card
│  │  "Craves familiar warmth with an     │  │  with illustrated icon
│  │   adventurous streak on weekends."   │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌─────────────────┐ ┌─────────────────┐   │
│  │ 🍝 Top cuisines │ │ 🎯 Mood trends  │   │
│  │ Italian · Thai  │ │ Often: Tired    │   │  2-col stat cards
│  │ Japanese        │ │ Best mood: Cozy │   │
│  └─────────────────┘ └─────────────────┘   │
│  ┌─────────────────┐ ┌─────────────────┐   │
│  │ ⚡ Cooking pace │ │ 🌍 Adventurous  │   │
│  │ Structured      │ │ Score: 7/10     │   │
│  └─────────────────┘ └─────────────────┘   │
│                                            │
│  ── Sharing ────────────────────────────   │
│  Visibility                                │
│  [Private ●] [Friends] [Public link]       │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  📤 Share my profile                 │  │  primary
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  📋 Copy profile link                │  │  secondary
│  └──────────────────────────────────────┘  │
│                                            │
│  What's included:                          │
│  ✓ Food personality type                   │
│  ✓ Favourite cuisines                      │
│  ✓ Mood patterns                           │
│  ✗ Diary entries (never shared)            │
│  ✗ Nutrition data (never shared)           │
└────────────────────────────────────────────┘
```

---

## Screen 37 — Skill Upgrade Prompt (Modal)  `[ROADMAP]`

### SM — Triggered after 3 Band+1 completions

```
┌────────────────────────────────────────────┐
│  (full screen overlay — celebration feel)  │
│  soft confetti animation, primary bg tint  │
├────────────────────────────────────────────┤
│                                            │
│         [Moody avatar — excited]           │
│                                            │
│  You've been cooking                       │  24px/700, centered
│  above your level —                        │
│  and nailing it.                           │
│                                            │
│  You completed 3 medium-difficulty         │  16px, secondary
│  recipes rated 4+ stars.                   │
│                                            │
│  Ready for more of that?                   │  20px/600
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Yes, show me more like those →     │  │  56px primary
│  └──────────────────────────────────────┘  │
│                                            │
│  [Not yet — keep it comfortable]           │  subtle link
│  (I'll check in again after 5 more meals)  │  12px, secondary
│                                            │
└────────────────────────────────────────────┘
```

---

## Screen 38 — Empty States

### SM — Home (no diary yet, new user)

```
┌────────────────────────────────────────────┐
│  ← same as Home screen, mood check-in top  │
│                                            │
│  ── Moody's first message ──────────────   │
│  ┌──────────────────────────────────────┐  │
│  │ [Moody avatar]                       │  │
│  │ "Welcome! Tell me how you're feeling │  │
│  │  and I'll find your first recipe."   │  │
│  │                                      │  │
│  │ Or start with:                       │  │
│  │ [I'm tired — keep it easy]           │  │  quick reply chips
│  │ [Show me something Thai]             │  │
│  │ [Surprise me completely]             │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### SM — Search: no results

```
┌────────────────────────────────────────────┐
│  ← search bar with query ──────────────    │
│                                            │
│            [Moody avatar — shrug]          │
│                                            │
│  No exact matches                          │  20px/700, centered
│  "under 10 min, vegan, Korean"             │  14px, query echoed
│                                            │
│  [Relax the time limit]                    │  suggestion chips
│  [Try any vegan cuisine]                   │
│  [Let Moody decide]                        │
│                                            │
│  Or chat with Moody →  [Ask Moody]         │
└────────────────────────────────────────────┘
```

### SM — Diary: empty

```
┌────────────────────────────────────────────┐
│  ← diary header ────────────────────────   │
│                                            │
│            [Moody avatar — welcoming]      │
│                                            │
│  Your food story starts here               │  20px/700
│                                            │
│  Cook a recipe to auto-log your first meal │  14px, secondary
│  or add one manually.                      │
│                                            │
│  [+ Log a meal now]                        │  primary btn
│  [Find something to cook →]                │  secondary
└────────────────────────────────────────────┘
```

---

## Navigation Structure Summary

| Platform | Nav Pattern | Primary Items | Secondary / Nested |
|---|---|---|---|
| Mobile (xs–md) | Fixed bottom tab bar, 5 items + labels, `80px` | 🏠 Home · 🔍 Search · 📖 Diary · 🛒 Grocery · 📅 Planner | Videos via Search [🎬 Videos] toggle; Pantry via Grocery → Pantry tab; Shopping Bag via Grocery → Bag tab; Favourites/Collections via Diary → Saved tab; Insights via Diary section; Settings from Profile card |
| Tablet portrait (lg) | Fixed bottom tab bar (wider tap targets) | 🏠 Home · 🔍 Search · 📖 Diary · 🛒 Grocery · 📅 Planner | Same nesting as mobile |
| Tablet landscape / Desktop (xl+) | Left sidebar, 240–280px | Home · Search · Videos · Favourites · Collections · Diary · Insights · Grocery · Planner · Import · Pantry · Settings | Moody panel pinnable on right |

**Grocery Hub tabs (mobile):** The Grocery nav item opens a tabbed view: [Lists] [Shopping Bag 🛒] [Pantry 🥕]. This collapses three related features into one nav slot.

**Diary section (mobile):** The Diary nav item includes access to: Meal Diary (default), Insights (via link/tab in diary header), Favourites (via "Saved" tab), Collections (via Favourites → Collections tab).

**Moody FAB:**
- `56×56px` on mobile — `position: fixed; bottom: calc(80px + 16px + env(safe-area-inset-bottom)); right: 16px`
- `48×48px` at bottom of left sidebar on desktop/tablet
- Primary background, white Moody icon, `elevation-3`
- **Hidden in Cook Mode** (`/app/cook/:sessionId`) — [Ask Moody] in the utility row serves that context instead
- Disappears (or transforms to close button) when Moody panel is already open

---

---

## Screen 40 — Admin CMS: Overview Dashboard (`/admin`)  `[ROADMAP]`

> **Owner-only interface.** Never visible to app users. Protected by admin credentials + MFA. All data shown is aggregated — no individual user PII in analytics views.

### LG+ (primary admin interface — desktop only)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ADMIN TOP BAR                                                              │
│  MoodFood Admin    [Overview] [Users] [Analytics] [CMS] [Revenue] [Health] │
│                                                 [Eugene ▾]  [Sign out]     │
├──────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Overview                                             Last updated: 2 min  │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  DAU Today   │  │  New Signups │  │  Trial→Paid  │  │  MRR         │  │
│  │   1,847      │  │   +23        │  │   34.2%      │  │  $12,480     │  │
│  │  ↑ 12% vs 7d │  │  ↑ vs avg   │  │  ↑ 2.1pp     │  │  ↑ $340 MoM  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────┐  ┌────────────────────────┐ │
│  │  Active Users — Last 30 days             │  │  App Health            │ │
│  │  [line chart: DAU / WAU / MAU]           │  │  ✅ Error rate: 0.3%   │ │
│  │                                          │  │  ✅ AI latency: 1.2s   │ │
│  │                                          │  │  ✅ API uptime: 99.9%  │ │
│  │                                          │  │  ⚠️  Sentry: 3 new err │ │
│  └──────────────────────────────────────────┘  └────────────────────────┘ │
│                                                                             │
│  ┌────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  Mood Distribution (7 days)    │  │  Top Cuisines Searched           │  │
│  │  😴 Tired       32%  ████████  │  │  1. Italian      18%            │  │
│  │  😰 Stressed    21%  █████     │  │  2. Thai         16%            │  │
│  │  🧸 Cozy        17%  ████      │  │  3. Japanese     13%            │  │
│  │  ⚡ Energised   12%  ███       │  │  4. Mexican      11%            │  │
│  │  🎯 Focused     10%  ██        │  │  5. Indian       9%             │  │
│  │  🗺️ Adventurous  8%  ██        │  │  ...                            │  │
│  └────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Geographic Usage — Active Users by Country                          │   │
│  │  [world heat map — countries coloured by user density]               │   │
│  │  Top: 🇺🇸 USA 38% · 🇬🇧 UK 22% · 🇦🇺 AU 14% · 🇨🇦 CA 9% · 🇩🇪 DE 5%│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 41 — Admin CMS: User Analytics (`/admin/analytics`)  `[ROADMAP]`

### LG+

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ADMIN TOP BAR (same as Screen 40)                                          │
├──────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Analytics     [Engagement ●] [Features] [AI/Moody] [Dietary] [Revenue]   │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ── Retention ─────────────────────────────────────────────────────────    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Cohort Retention — Day 1 / 7 / 30                                   │  │
│  │  [grouped bar chart by weekly cohort]                                │  │
│  │  Day 1: 78%  Day 7: 52%  Day 30: 34%                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ── Onboarding Funnel ─────────────────────────────────────────────────    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Welcome screen         100%  ██████████████████████████████████    │  │
│  │  Step 1 — Lifestyle      96%  ████████████████████████████████      │  │
│  │    Bypassed (omnivore)   18%  of those who saw step 1               │  │
│  │  Step 2 — Allergies      91%  ████████████████████████████          │  │
│  │    Bypassed (no allergy) 43%  of those who saw step 2               │  │
│  │  Step 3 — Cooking        89%  ███████████████████████████           │  │
│  │  Step 4 — Kitchen/Taste  82%  █████████████████████████             │  │
│  │    Bypassed              29%  of those who saw step 4               │  │
│  │  Step 5 — Moods          78%  ████████████████████████              │  │
│  │    Bypassed              41%  of those who saw step 5               │  │
│  │  Step 6 — Location       76%  ████████████████████████              │  │
│  │    Location granted      61%  of those who saw step 6               │  │
│  │  Completed onboarding    74%  ██████████████████████                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ── Mood Check-In Behaviour ────────────────────────────────────────────   │
│  Q1 (mood)     answered: 89%  │  Q2 (energy)    answered: 67%             │
│  Q3 (pref)     answered: 71%  │  Q4 (time)      answered: 82%             │
│  Q5 (meal)     answered: 76%  │  "Just pick for me": 11% of sessions      │
│                                                                             │
│  ── Dietary Prevalence (anonymised, % of user base) ──────────────────     │
│  Vegetarian 22% · Vegan 11% · Pescatarian 8% · Gluten-free 14%            │
│  Dairy-free 12% · Halal 7% · Keto 9% · No restrictions 31%                │
│                                                                             │
│  ── Allergen Prevalence (anonymised, % of users with any allergen) ────    │
│  Dairy 28% · Peanuts 22% · Tree nuts 19% · Gluten 17% · Shellfish 12%     │
│  Soy 10% · Eggs 9% · Fish 8% · Sesame 6%                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 42 — Admin CMS: Content & Notifications (`/admin/cms`)  `[ROADMAP]`

### LG+

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ADMIN TOP BAR                                                              │
├──────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  CMS     [Featured Recipes ●] [Push Notifications] [Announcements]         │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  Featured Recipes                         [+ Add Featured Recipe]          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Recipe name              Dates active       Status   Actions         │  │
│  │ Miso-Glazed Salmon       May 27 – Jun 10    LIVE     [Edit] [Remove] │  │
│  │ Summer Pasta Primavera   Jun 1 – Jun 30     Scheduled [Edit] [Remove]│  │
│  │ Thai Green Curry         Always             LIVE     [Edit] [Remove] │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Push Notifications                       [+ Compose Notification]         │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Title                   Sent        Target       Open rate  Status   │  │
│  │ "Plan your week 📅"     May 26      All paid     22%        Sent     │  │
│  │ "Trial ends tomorrow"   May 25      Trial users  41%        Sent     │  │
│  │ "Try voice mode! 🎙"    Scheduled   All users    —          Pending  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ── Compose Notification (slide-in panel) ──────────────────────────────   │
│  Title:    [Trial ending soon — keep your momentum!             ]          │
│  Body:     [Your 7-day free trial ends in 2 days. Subscribe     ]          │
│            [to keep Moody and all your saved recipes.            ]          │
│  Target:   [Trial users — expiring in 1–3 days ▾]                          │
│  Schedule: [Send now] or [Date/time picker]                                 │
│  Preview:  [📱 Preview on device]                                           │
│                                            [Send] [Save draft] [Cancel]    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 43 — Admin CMS: Revenue & Subscriptions (`/admin/revenue`)  `[ROADMAP]`

### LG+

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ADMIN TOP BAR                                                              │
├──────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Revenue                                                                    │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  MRR         │  │  ARR         │  │  New MRR     │  │  Churned MRR │  │
│  │  $12,480     │  │  $149,760    │  │  +$840       │  │  −$120       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  MRR Trend — Last 12 months  [line chart]                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ── Subscription Tier Distribution ─────────────────────────────────────   │
│  Free trial      312 users   20%  ████                                      │
│  Monthly         489 users   32%  ████████                                  │
│  Annual          744 users   48%  ████████████                              │
│                                                                             │
│  ── Recent Stripe Events ───────────────────────────────────────────────   │
│  [live feed — customer.subscription.created / updated / deleted events]    │
│  2026-05-27 14:32  subscription.created     monthly     akiwumi@gmail.com  │
│  2026-05-27 13:18  subscription.updated     annual      j.smith@email.com  │
│  2026-05-27 11:04  subscription.deleted     monthly     ——                 │
└────────────────────────────────────────────────────────────────────────────┘
```
