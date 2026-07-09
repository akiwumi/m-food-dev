# MoodFood — App Design System

> Derived from `src/styles.css` and `src/App.tsx` as built.
> **Scope: mobile-first PWA** (the app shell at < 1024px). Desktop editorial system is in `docs/desktop-design-system.md`.

---

## 1. Design Language

MoodFood's visual identity is **cool-toned frosted glass over a teal gradient**. The aesthetic references fitness/health apps: floating frosted cards, pill buttons, circular icon buttons, blue selection states, and a bold sans-serif type scale. Every surface that isn't photography is either the app gradient, white glass, or sage.

Key personality traits:
- **Soft and airy.** The background gradient is pale teal-to-white; surfaces are translucent white glass.
- **One accent color per state.** Blue (`#7cc3dc`) owns active/selected. Coral (`#ef6a4f`) owns alerts and destructive actions. Ink owns primary actions.
- **Editorial type.** Headings are weight 800, tight negative tracking, large. Eyebrow labels are 10px uppercase, letter-spaced, in `--blue-deep`.
- **Photography-first.** Hero panels are always a food photograph behind a gradient scrim.

---

## 2. Color Tokens

Defined in `:root` in `src/styles.css`.

### 2.1 Ink & Text

| Token | Value | Role |
|---|---|---|
| `--ink` | `#171a1c` | Primary text, icon fills, primary button background |
| `--dark` | `#171a1c` | Alias for `--ink` (legacy) |
| `--muted` | `#8b9694` | Secondary text, captions, placeholder |

### 2.2 Accent

| Token | Value | Role |
|---|---|---|
| `--blue` | `#7cc3dc` | Active/selected state background, progress bars, active icons |
| `--blue-deep` | `#57aecb` | Links, eyebrow labels, icon accents, section labels |
| `--coral` | `#ef6a4f` | Destructive actions, notification badges, error states, saved-recipe heart |

### 2.3 Surfaces

| Token | Value | Role |
|---|---|---|
| `--bg1` | `#e7f1f0` | Gradient start (top of page) |
| `--bg2` | `#f4f9f8` | Gradient mid-point |
| `--cream` | `#eef4f3` | Panel backgrounds (onboarding, detail sheet) |
| `--sage` | `#e9f2f1` | Chips, muted pill backgrounds, inactive states, secondary surfaces |
| `--white` | `#ffffff` | Pure white (inputs, card interiors when not frosted) |

### 2.4 Glass

| Token | Value | Role |
|---|---|---|
| `--glass` | `rgba(255,255,255,.62)` | Light glass (overlays) |
| `--glass-strong` | `rgba(255,255,255,.84)` | Primary frosted card surface |

### 2.5 Structural

| Token | Value | Role |
|---|---|---|
| `--line` | `rgba(23,26,28,.07)` | Borders, dividers, input borders |
| `--shadow` | `0 18px 44px rgba(30,55,55,.10)` | Large card shadow |
| `--shadow-sm` | `0 8px 22px rgba(30,55,55,.08)` | Small element shadow |

### 2.6 App Background

The page background is a CSS gradient on `body` and `.app`:

```css
background: linear-gradient(180deg, #dceef2 0%, #eaf4f3 30%, #f5fbfa 100%)
```

Frosted glass cards float above this gradient — the visible background between cards is this teal-to-white gradient.

### 2.7 Semantic Colours

| Use | Color |
|---|---|
| Success / confirmed | `#1f7a4d` (green text), `#cdeede` (green surface) |
| Warning / offline | `#9a6a1c` (text), `#fff5e8` (surface), `#f0d9b8` (border) |
| Danger / destructive | `#a33` (red text), `rgba(176,40,40,.25)` (border) |
| Invite / trial | `var(--blue-deep)` text on `#eaf6fa` surface |
| Allergen alert | `#9a2a2a` on `#fdecec` |

---

## 3. Typography

### 3.1 Type Family

**Single typeface throughout the entire app:**

```
"Plus Jakarta Sans", system-ui, sans-serif
```

Loaded from Google Fonts (`weights: 400, 500, 600, 700, 800`). The `font: inherit` rule ensures buttons, inputs, and selects all inherit this.

> **Note:** Earlier CSS layers reference `"Playfair Display"` (serif) for headings. The modern redesign block (line ~46) overrides all `h1–h4` to Plus Jakarta Sans with `!important`. No new Playfair usage should be added.

### 3.2 Scale

| Role | Size | Weight | Tracking | Notes |
|---|---|---|---|---|
| Hero display | `clamp(40px, 9vw, 58px)` | 800 | `-.025em` | Landing headline |
| Large display | 40px | 800 | `-.03em` | Home greeting |
| Section heading | 34–36px | 800 | `-.025em` | Auth, billing titles |
| Card heading | 28–32px | 800 | `-.025em` | Stat values, recipe titles |
| Sub-heading | 22–24px | 700–800 | 0 | Section sub-titles |
| Body | 16px | 400–500 | 0 | Form inputs (always 16px to prevent iOS zoom) |
| Body small | 12–14px | 400 | 0 | Secondary body, recipe meta |
| Caption | 10–12px | 600–700 | 0 | Timestamps, helper text |
| Eyebrow label | 9–11px | 700 | `.12em`–`.2em` | Section labels, uppercase chips; color `var(--blue-deep)` |

### 3.3 Line Heights

- Display / headings: `1.02`–`1.12`
- Body: `1.5`–`1.65`
- Caption: `1.4`–`1.5`

---

## 4. Spacing

Incremental scale used across the system. No formal token names — values are applied inline.

| Step | Value | Common uses |
|---|---|---|
| 1 | 4px | Inner chip padding, gap between tiny elements |
| 2 | 6–8px | Gap between pills, icon–label pairs |
| 3 | 10–12px | Card inner padding edges, list item gaps |
| 4 | 14–16px | Standard card padding, section gap |
| 5 | 18–22px | Large card padding, heading margins |
| 6 | 28–32px | Section top margins |
| 7 | 40–50px | Inter-section spacing |
| screen | 20px 16px | Standard screen padding (top/sides) |
| screen-bottom | 110px | Bottom padding (clears fixed nav) |

---

## 5. Shape

### 5.1 Border Radius Reference

| Context | Radius |
|---|---|
| Hero image / home hero | 28–30px |
| Frosted cards (main surface) | 24px |
| Cards (detail sheet, billing) | 26–28px |
| Secondary cards | 22px |
| Bottom sheet (onboarding) | 32px 32px 0 0 |
| Buttons — primary / secondary | 99px (pill) |
| Buttons — cook controls, CTA bar | 18px |
| Inputs | 14–16px |
| Chips / tags / pills | 99px |
| Icon buttons (circular) | 50% |
| Avatar rings | 50% |
| Moody AI avatar | 50% |
| Progress bar / segment | 99px |
| Toast / A2HS banner | 18px |
| Empty state | 22px |
| Small decorative | 10–14px |

### 5.2 Elevation

Three levels, achieved through shadow + glass opacity:

| Level | CSS | Used on |
|---|---|---|
| Elevated | `var(--shadow)` = `0 18px 44px rgba(30,55,55,.10)` | Main cards (pick-card, home checkin, hero) |
| Low | `var(--shadow-sm)` = `0 8px 22px rgba(30,55,55,.08)` | Icon buttons, choice pills, stat cards |
| Active glow | `0 6px 18px rgba(100,185,220,.4)` | Selected mood/choice pills |
| Hero shadow | `0 20px 50px rgba(20,50,60,.18)` | Home hero photo card |
| FAB | `0 12px 28px rgba(23,26,28,.3)` | Moody FAB button |
| Bottom nav | `0 -8px 30px rgba(30,55,55,.08)` | Fixed nav bar |

---

## 6. The Frosted Glass System

The defining visual pattern. Any card that floats above the gradient uses this recipe:

```css
background: var(--glass-strong);            /* rgba(255,255,255,.84) */
border: 1px solid rgba(255,255,255,.7);
border-radius: 24px;
box-shadow: var(--shadow);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
```

**Variants:**

| Variant | Background | Blur | Used on |
|---|---|---|---|
| Strong | `rgba(255,255,255,.84)` | 16–20px | Cards, home check-in, notif cards |
| Light | `rgba(255,255,255,.88)` | 16px | Home hero chips, stat cards, link cards |
| Navigation | `rgba(255,255,255,.84)` + `blur(20px)` | 20px | Bottom nav, onboarding footer |
| Moody note | `rgba(255,255,255,.80)` | 14px | AI note in feed |
| Overlay sheets | White (opaque) | none | Login sheet, onboarding bottom sheet |

---

## 7. Components

### 7.1 Buttons

**Primary**
```css
background: var(--ink);      /* #171a1c */
color: #fff;
border-radius: 99px;
padding: 15px 22px;
font-weight: 700;
box-shadow: var(--shadow-sm);
```
Active: `transform: scale(.97)`. Disabled: `opacity: .38`.

**Secondary**
```css
background: var(--glass-strong);
color: var(--ink);
border: 1px solid rgba(255,255,255,.8);
border-radius: 99px;
padding: 15px 22px;
font-weight: 700;
box-shadow: var(--shadow-sm);
backdrop-filter: blur(12px);
```

**Ghost**
```css
border: 0;
background: transparent;
color: var(--muted);
font-weight: 700;
padding: 10px;
```

**Link-coral** (destructive secondary)
```css
border: 0;
background: transparent;
color: var(--coral);
font-weight: 700;
```

**Circular icon button**
```css
width: 46px;
height: 46px;
border-radius: 50%;
background: #fff;
box-shadow: var(--shadow-sm);
border: 0;
display: grid;
place-items: center;
```

**CTA (hero / landing)**
```css
background: #fff;
color: var(--ink);
border-radius: 99px;
min-height: 54px;
font-weight: 800;
font-size: 16px;
box-shadow: 0 10px 30px rgba(0,0,0,.35);
```

### 7.2 Choice Pills (mood, time, meal category)

Default:
```css
border: 1px solid var(--line);
background: rgba(255,255,255,.85);
border-radius: 99px;
padding: 9px–10px 14px–16px;
font-weight: 600;
box-shadow: var(--shadow-sm);
```

Active / selected:
```css
background: var(--blue);           /* #7cc3dc */
color: var(--ink);
border-color: var(--blue);
box-shadow: 0 6px 18px rgba(100,185,220,.4);
transform: scale(1.04);
```

### 7.3 Cards

**Pick card (recipe in feed)**
```
Layout: image (44%) | content | heart button (32px)
Radius: 24px (frosted glass)
Min-height: 180px
```

**Search grid article**
```
Full-width image (210px tall) + content below
Absolute heart button top-right (40px circle)
Saved state: heart becomes coral with shadow
```

**Home hero**
```
Radius: 28px
Height: 44vh min 280px
Photo fill + gradient scrim (dark at bottom)
Overlay chips top-left, info + go-button bottom
```

**Stat card**
```css
background: rgba(255,255,255,.88);
backdrop-filter: blur(16px);
border: 1px solid rgba(255,255,255,.75);
border-radius: 22px;
padding: 18px;
```
Contains: 42px icon ring (`var(--bg1)` bg, `var(--blue-deep)` icon), label, value, unit.

**Notification card**
```css
background: var(--glass-strong);
border: 1px solid rgba(255,255,255,.7);
border-radius: 18px;
backdrop-filter: blur(12px);
```
Unread: `border-color: var(--blue)`.
Icon variants: confirm/welcome = `#dff1f7`/`var(--blue-deep)`, receipt = `#cdeede`/green, reminder = `#fde3dc`/`var(--coral)`.

**Empty state**
```css
padding: 45px 20px;
text-align: center;
background: var(--white);
border: 1px dashed var(--line);
border-radius: 22px;
```

### 7.4 App Header

```
Grid: [48px logo ring] [flex meta] [46px icon button]
Logo ring: 48px circle, white bg, shadow-sm
Meta: name (15px / 800) + subtitle (11px / muted)
Icon button: bell with optional coral notification dot
```

### 7.5 Bottom Navigation

```css
position: fixed; bottom: 0; height: 78px;
background: var(--glass-strong);
backdrop-filter: blur(20px);
border-top: 1px solid rgba(255,255,255,.6);
box-shadow: 0 -8px 30px rgba(30,55,55,.08);
```

Inactive item: `color: #60695b`. Active item: `color: var(--blue-deep)`, `font-weight: 700`.

### 7.6 Top Bar (inner screens)

```css
height: 62px;
grid-template-columns: 50px 1fr 50px;
padding: 0 10px;
```
Back/action buttons: 42px circles, white, shadow-sm. Title: 18px / 800, center-aligned.

### 7.7 Search Box

```css
display: flex; gap: 10px; align-items: center;
border: 1px solid var(--line);
background: var(--white);
border-radius: 17px;
padding: 13px 15px;
```
Input inside has no border and transparent background.

### 7.8 Choice Toggles (filter toggle, sub-mode toggle)

Pill row with active pill having white background and subtle shadow inside a sage container:
```css
.sub-mode-toggle { background: var(--sage); border-radius: 14px; padding: 3px; }
.sub-mode-toggle button.active { background: var(--white); box-shadow: 0 2px 8px rgba(0,0,0,.08); }
```

### 7.9 Moody AI Avatar

```css
width: 52–58px; height: 52–58px;
border-radius: 50%;
background: linear-gradient(145deg, #a8dce8, #5baec5);
border: 4px solid rgba(255,255,255,.8);
color: #fff;
box-shadow: var(--shadow-sm);
```

### 7.10 Hero / Detail Photo Layout

```
.detail-image: height 42vh min 330px, position relative
Image fills container (object-fit: cover)
Back button: absolute top-left, white circle
Action buttons: absolute top-right row
Bottom: content sheet with -24px top margin overlap, 28px 28px 0 0 radius
```

### 7.11 Bottom Sheet / Panel

```css
background: var(--cream);
border-radius: 28px 28px 0 0;
padding: 18px;
```
Drag handle: `42px × 4px`, `var(--line)` color, 99px radius, centered top.
Backdrop: `rgba(17, 33, 12, .6)` scrim.

### 7.12 Onboarding Sheet

```css
background: #fff;
border-radius: 32px 32px 0 0;
margin-top: -28px;           /* overlaps hero photo */
box-shadow: 0 -10px 40px rgba(20,50,55,.1);
```

### 7.13 Progress Segments

Step segments (onboarding / intro pages):
```css
height: 4px; border-radius: 99px;
background: var(--line);     /* inactive */
/* active: */
background: var(--blue);     /* or var(--ink) in intro pages */
```

### 7.14 Forms / Inputs

```css
border: 1px solid var(--line);
background: #fff;
border-radius: 14–16px;
padding: 14–15px;
font-size: 16px;             /* prevents iOS auto-zoom */
outline-color: var(--blue-deep);
box-shadow: var(--shadow-sm);
```

Error text: `color: var(--coral); font-size: 12px; font-weight: 600`.

### 7.15 FAB (Moody floating button)

```css
position: fixed; right: 16px; bottom: 92px;
width: 52px; height: 52px; border-radius: 50%;
background: var(--ink);
color: white;
box-shadow: 0 12px 28px rgba(23,26,28,.3);
```

### 7.16 Eyebrow Labels

Used above headings to categorise content:
```css
font-size: 10–11px;
letter-spacing: .12em–.2em;
font-weight: 700;
color: var(--blue-deep);
text-transform: uppercase;
```

### 7.17 Pantry / Tag Chips

Items in a user's pantry or filter tags:
```css
background: var(--white);
border: 1px solid var(--line);
border-radius: 99px;
padding: 8px 8px 8px 14px;
font-size: 13px; font-weight: 600;
box-shadow: var(--shadow-sm);
```

### 7.18 Hero Chip (photo overlays)

Glass chips overlaid on hero photos:
```css
background: rgba(255,255,255,.88);
backdrop-filter: blur(14px);
border-radius: 99px;
padding: 8px 14px;
font-size: 13px; font-weight: 700;
box-shadow: 0 4px 14px rgba(0,0,0,.12);
```

### 7.19 Cook Mode

Full-screen, gradient background.
Instruction card: `var(--glass-strong)`, `blur(18px)`, `34px` radius, thick border `1px solid #ffffffc7`.
Step number: tiny uppercase label, 10px, `.17em` tracking.
Step text: 800 weight, `clamp(25px, 7vw, 34px)`.
Cook buttons: 18px radius, minimum 48px height.
Active (next) button: `var(--blue)` background, ink text.

---

## 8. Motion

### 8.1 Entry Animation

All direct children of `.screen`, `.entry`, and `.onboarding main`:

```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}
animation: fade-up .4s ease both;
```

### 8.2 Button Feedback

```css
/* All buttons */
transition: transform .13s ease, box-shadow .18s ease, background .18s ease;

/* Primary / secondary on :active */
transform: scale(.97);

/* Active pill on :active */
transform: scale(.96);
```

### 8.3 Active Pill

Active state adds scale + glow:
```css
transform: scale(1.04);
box-shadow: 0 6px 18px rgba(100,185,220,.4);
transition: all .14s–.15s ease;
```

### 8.4 Thinking / Loading State

AI loading state (`.thinking-state`):
- Green-tinted gradient card (`#f7fbf0 → #e8f2d7`)
- Orbiting dot animation on a dark circle
- Pulsing dots below (`.thinking-lines`)

```css
@keyframes thinking-pulse { 50% { opacity: .3; transform: scale(.9); } }
@keyframes thinking-orbit { to { transform: rotate(360deg); } }
```

Spinner (loading):
```css
border: 2–3px solid rgba(87,174,203,.25);
border-top-color: var(--blue-deep);
border-radius: 50%;
animation: spin .7–.8s linear infinite;
```

### 8.5 Home Hero Hover (desktop)

```css
.home-hero img { transition: transform .5s ease; }
.home-hero:hover img { transform: scale(1.03); }
```

### 8.6 A2HS Banner

```css
@keyframes a2hsIn { from { opacity: 0; transform: translateY(-8px); } to { ... } }
animation: a2hsIn .35s ease;
```

---

## 9. Layout

### 9.1 Screen Container

```css
.screen {
  width: 100%;
  max-width: 680px;
  margin: auto;
  padding: 20px 16px 110px;   /* 110px clears fixed bottom nav */
  overflow-x: hidden;
}
```

### 9.2 Responsive Breakpoints

| Breakpoint | Effect |
|---|---|
| `≥ 760px` | Mood row → 6 columns, search grid → 2 columns, welcome → 2-col layout, onboarding footer centered |
| `≥ 1040px` | Sidebar nav 240px, main content offset, pick-list → 2 columns |
| `≥ 1024px` | Desktop editorial system activates (see `docs/desktop-design-system.md`) |

### 9.3 Home Screen Layout

```
[App header]
[Home greeting h1]
[Hero photo card — full width, 44vh]
[Check-in card — frosted glass]
  [Mood pills]
  [Time pills]
  [Meal category pills]
[Stats row — 2 columns]
[Quick link cards]
```

### 9.4 Fixed Elements

| Element | z-index | Position |
|---|---|---|
| Desktop nav (editorial) | 35 | Top |
| Panel backdrop | 40 | Full screen |
| Nutrition sheet | 40 | Bottom |
| Moody FAB | 16 | Bottom-right |
| Bottom nav | 15 | Bottom |
| Sticky CTA | 10 | Above nav |
| A2HS banner (landing) | 50 | Bottom |

---

## 10. Icons

Uses **lucide-react** throughout. All icons are SVGs inheriting `currentColor`. No icon library switching.

Standard sizes:
- Navigation / header: 20–22px
- Card actions: 18–20px
- Inline / caption: 14–16px
- Hero accent: 28–36px

---

## 11. Photography

All food photography is sourced from **Unsplash** (URL constants in `App.tsx`). Patterns:

- **Hero panels**: full-bleed, `object-fit: cover`, always paired with a dark-to-transparent gradient scrim
- **Card thumbnails**: fixed height (`150px`–`210px`), `object-fit: cover`, clipped by card radius
- **Detail headers**: `42–52vh` tall, full-bleed
- **Recipe fallback**: gradient placeholder `linear-gradient(145deg, #dce9e7, #c8d8d5)` with centered icon

---

## 12. Voice Patterns

**Eyebrow labels** (section identifiers): terse, uppercase, blue-deep. Examples: `"MOOD MATCH"`, `"YOUR PICKS"`, `"STEP 3 OF 4"`.

**Headings**: sentence case, direct, first-person or imperative. Examples: `"How are you feeling?"`, `"Tonight's picks"`.

**Helper text / lede**: muted, conversational, 11–14px. Line-height ~1.6. Examples: `"Two minutes and we'll match you something good."`.

**Empty states**: encouraging, not apologetic. Show a relevant icon + serif-weight heading.

---

## 13. Quick Reference

```
Background gradient:  #dceef2 → #eaf4f3 → #f5fbfa
Ink (text/buttons):   #171a1c
Muted text:           #8b9694
Blue (active):        #7cc3dc
Blue-deep (accents):  #57aecb
Coral (alert/destruct):  #ef6a4f
Sage (muted surface): #e9f2f1
Glass card:           rgba(255,255,255,.84) + blur(16px)
Line:                 rgba(23,26,28,.07)
Shadow (card):        0 18px 44px rgba(30,55,55,.10)
Shadow (sm):          0 8px 22px rgba(30,55,55,.08)

Font:          "Plus Jakarta Sans" — 400/500/600/700/800
Heading:       800 weight, -.025em tracking, 1.05 line-height
Eyebrow:       700 weight, .15em tracking, 10–11px, uppercase, --blue-deep
Body:          400, 1.6 line-height, 14–16px
Caption:       600–700, 9–12px

Radius (cards):   24px
Radius (buttons): 99px (pill)
Radius (inputs):  14–16px
Radius (circles): 50%

Active state:  var(--blue) bg + scale(1.04) + blue glow shadow
Primary btn:   var(--ink) bg, white text, 99px, 15px 22px pad
```
