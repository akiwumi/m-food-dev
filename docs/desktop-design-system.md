# MoodFood — Desktop Design System

> Derived from a structural and visual study of **meyers.dk** (captured 2026-06-16), re-themed for MoodFood.
> **Scope: desktop only (≥1280px).** Tablet and mobile are out of scope for this document and keep their existing mobile-app design system. Nothing here should be applied below 1024px.
> This is a specification. It contains no implementation code — only tokens, rules, and layout structure for a designer/engineer to build against.

---

## 1. Design DNA (what we are cloning from Meyers)

Meyers is a Danish food brand. Its desktop site reads as a **printed food magazine**, not a SaaS app. The traits worth cloning for MoodFood's desktop experience:

1. **Photo-led, full-bleed.** Food photography runs edge to edge. Type sits *on top* of imagery, not beside it.
2. **Oversized editorial display type.** Headlines are enormous (up to 128px), uppercase, tight leading, set in a single brand display face.
3. **Two-tone headlines.** The first line in a warm accent color, the second in cream — a signature move.
4. **Warm, earthy, low-saturation palette.** Cream, sand, espresso, olive, forest, ochre gold, burgundy, peach. Nothing neon. It feels organic and appetizing.
5. **Dark sticky top bar** with the wordmark and a thin row of nav links.
6. **Alternating content blocks** down a long single-column scroll: image + short editorial copy + one text-link CTA, repeating with varied background tints.
7. **Generous whitespace and a calm grid.** Content is centered in a ~1232px column; full-bleed sections break out of it.
8. **Small button radius (~4px), flat fills, no shadows.** Restraint over decoration.

MoodFood keeps this editorial-food feeling but bends the palette and voice toward **mood and emotion** (the product matches recipes to how you feel).

---

## 2. Color System

All colors sampled from the live Meyers site, then organized into a MoodFood token set. Values are the canonical hex.

### 2.1 Core neutrals (surfaces & ink)

| Token | Hex | RGB | Role |
|---|---|---|---|
| `color/bg/page` | `#F4F2E0` | 244 242 224 | Default page background (warm ivory) |
| `color/bg/raised` | `#E5E0CA` | 229 224 202 | Cards, raised panels, secondary surface |
| `color/bg/sunken` | `#D6CEB4` | 214 206 180 | Section bands, sunken/grouped surfaces (warm sand) |
| `color/bg/muted` | `#C7BB9F` | 199 187 159 | Muted chips, disabled surfaces |
| `color/ink/primary` | `#291D1A` | 41 29 26 | Primary text & dark sections (espresso) |
| `color/ink/onDark` | `#F4F2E0` | 244 242 224 | Text/icons on espresso or dark photo |
| `color/ink/subtle` | `rgba(41,29,26,0.65)` | — | Secondary/caption text on light surfaces |

### 2.2 Brand accents (the "mood" palette)

These earthy hues do double duty: brand accents **and** the visual language for moods. Map each mood to one accent so the UI shifts tone with the user's selected mood.

| Token | Hex | RGB | Suggested mood pairing | Role |
|---|---|---|---|---|
| `color/accent/gold` | `#BF8F2D` | 191 143 45 | Energized / Happy | **Primary** accent — links, primary buttons, headline accent line |
| `color/accent/olive` | `#484C38` | 72 76 56 | Calm / Grounded | Surface accent, dark editorial bands |
| `color/accent/forest` | `#16382B` | 22 56 43 | Focused / Restorative | Deep surface accent, footer |
| `color/accent/peach` | `#F3C2B0` | 243 194 176 | Comforted / Cozy | Soft surface, secondary buttons |
| `color/accent/wine` | `#75313D` | 117 49 61 | Indulgent / Rich | Emphasis surface, tags |

### 2.3 Semantic & status

| Token | Hex | Role |
|---|---|---|
| `color/state/success` | `#484C38` (olive) | Saved, confirmed |
| `color/state/warning` | `#BF8F2D` (gold) | Attention, pending |
| `color/state/danger` | `#75313D` (wine) | Destructive, errors |
| `color/border/hairline` | `rgba(41,29,26,0.12)` | Dividers, input borders |
| `color/overlay/scrim` | `rgba(41,29,26,0.45)` | Photo scrim behind overlaid headlines |

### 2.4 Usage rules

- **Default page = ivory `#F4F2E0`.** Never pure white. White does not exist in this system.
- **Default text = espresso `#291D1A`.** Never pure black for body copy.
- **One accent per view.** When a mood is active, that mood's accent leads; other accents recede to neutrals. Don't paint a screen in five accents at once.
- **Dark bands** use espresso, olive, or forest with `color/ink/onDark` text — use them to punctuate the scroll, not for whole pages.
- **Contrast:** body text on any sand/ivory surface must use espresso (passes AA). Gold (`#BF8F2D`) is **not** AA for small body text on ivory — use it for large headline accents, ≥18px bold links, or button fills with espresso text only.

---

## 3. Typography

**MoodFood uses a single typeface across the whole app — keep it.** The desktop design system does **not** introduce a second display face. The Meyers "oversized editorial headline" effect is achieved entirely with the existing app font at heavy weight and large size, not by adding a serif.

### 3.1 Type family

| Token | Family | Notes |
|---|---|---|
| `font/sans` | **`"Plus Jakarta Sans", system-ui, sans-serif`** | The app's existing font. Used for **everything** — headlines, body, UI, labels. |

> This matches `src/styles.css` (body and `h1–h4` are all Plus Jakarta Sans). Do **not** substitute Meyer Grand or any other face. The "display" role below is just Plus Jakarta Sans at weight 800.

The app's existing heading convention: weight **800**, tight negative tracking (`letter-spacing: -0.025em` on headings, up to `-0.04em` on large hero text), line-height ~1.05–1.12. Carry that forward at desktop scale.

### 3.2 Display scale (desktop) — Plus Jakarta Sans @ 800

Headlines are weight **800**, with negative tracking (`-0.03em` to `-0.04em`) and tight leading.

| Token | Size / Line-height | Use |
|---|---|---|
| `type/display/hero` | 96–112px / 1.02 | Full-bleed hero headline over photography |
| `type/display/xl` | 56–64px / 1.04 | Section openers ("Find food for your mood") |
| `type/display/lg` | 44px / 1.05 | Block titles |
| `type/display/md` | 30px / 1.1 | Card cluster headers |

> **Case.** Meyers sets headlines UPPERCASE; the app's current convention is sentence case with tight tracking. Pick one and apply it consistently. Recommended: **sentence case** to stay true to MoodFood, reserving uppercase only for the two-tone hero (§3.4) if you want the editorial punch. Either way, Plus Jakarta Sans at 800 carries the weight — Meyers' look came from *scale and tracking*, which this font reproduces well.

### 3.3 Text scale (sentence case)

| Token | Size / Line-height / Weight | Use |
|---|---|---|
| `type/lead` | 20px / 1.5 / 500 | Intro paragraph under a headline |
| `type/body` | 16px / 1.6 / 400 | Default body copy |
| `type/body-sm` | 14px / 1.5 / 400 | Captions, recipe meta (time, servings) |
| `type/label` | 13–14px / 1.2 / 700, +0.04em tracking | Nav links, button labels, eyebrows |

### 3.4 The two-tone headline (signature move)

Replicate the Meyers hero treatment:

- Headline overlaid on a full-bleed food photo, bottom-left aligned.
- **Line 1** in the active mood accent (default `color/accent/gold`).
- **Line 2** in `color/ink/onDark` (cream).
- A soft `color/overlay/scrim` gradient from the bottom ensures legibility.
- Example: line 1 "FEELING COZY?" (gold) / line 2 "EAT SOMETHING WARM" (cream).

---

## 4. Layout & Grid

| Token | Value | Notes |
|---|---|---|
| `layout/content-max` | 1232px | Centered content column (matches Meyers) |
| `layout/wide-max` | 1440px | Wide media / hero clips |
| `layout/gutter` | 32px | Left/right page padding at ≥1280px |
| `layout/columns` | 12 | Underlying grid for editorial blocks |
| `layout/col-gap` | 24px | Gutter between grid columns |

**Structural rules**

- **Full-bleed vs. column.** Hero and image bands break out to full viewport width; text-heavy blocks stay inside the 1232px column.
- **Single-column editorial scroll.** The homepage is a vertical sequence of blocks, not a dense dashboard. Each block = one idea.
- **Alternating background tints.** Cycle `bg/page` → `bg/sunken` → a dark accent band → `bg/page` to give rhythm down the scroll.
- **Asymmetric image/text blocks.** A block is typically ~60% image / ~40% text (or reversed on the next block) inside the grid.

### 4.1 Vertical rhythm / spacing scale

| Token | Value |
|---|---|
| `space/1` | 4px |
| `space/2` | 8px |
| `space/3` | 16px |
| `space/4` | 24px |
| `space/5` | 40px |
| `space/6` | 64px |
| `space/7` | 96px |
| `space/8` | 128px |

Section-to-section padding on desktop: `space/7`–`space/8`. Generous. The calm comes from the whitespace.

---

## 5. Components

Described as specs, not code.

### 5.1 Top navigation bar

- **Sticky**, full width, background `color/ink/primary` (espresso).
- Left: a thin horizontal row of `type/label` nav links in cream, e.g. **Moods · Recipes · Saved · Pantry · About**. Hover → `color/accent/gold`.
- Right: the **MOODFOOD** wordmark (display face, uppercase) + account/login affordance.
- Height ≈ 64px. No shadow; a hairline `color/border/hairline` at the bottom edge if needed.
- A secondary utility strip (smaller links: gift cards, customer service equivalent → e.g. "Mit MoodFood / My MoodFood") may sit above or below, mirroring Meyers' two-tier header.

### 5.2 Hero

- Full-bleed food photograph, min-height ~80vh on desktop.
- Bottom-aligned two-tone display headline (see §3.4).
- Optional single text-link CTA beneath in `type/label`, gold, with an arrow.
- Bottom scrim gradient for legibility.

### 5.3 Editorial content block

- Image on one side, text on the other (alternating sides down the page).
- Text side: an **eyebrow** (`type/label`, uppercase, mood accent) → display title → short `type/body` paragraph → one text-link CTA ("Read more →" style).
- Background alternates per §4.

### 5.4 Recipe card

- Surface `color/bg/raised` (sand), radius `radius/md` (8px), **no shadow** (rely on tint contrast).
- Photo on top (4:3), then: title in `type/display/md` or bold sans, meta row in `type/body-sm` (`color/ink/subtle`) — time · servings · mood tag.
- A small **mood chip** (pill) tinted with that recipe's mood accent.
- Hover: subtle lift via background darkening one step (sand → muted) or a hairline border, not a drop shadow.
- Grid: 3 cards across inside the content column on desktop.

### 5.5 Buttons

Small radius, flat fill, no shadow, `type/label`, padding ≈ 14px 20px.

| Variant | Fill | Text | Use |
|---|---|---|---|
| Primary | `color/accent/gold` | `color/ink/primary` | Main action ("Find recipes") |
| Secondary | `color/accent/peach` | `color/ink/primary` | Alternate action |
| Quiet | `color/bg/raised` | `color/ink/primary` | Tertiary / cancel |
| On-dark | `color/bg/page` | `color/ink/primary` | Buttons over dark/photo bands |

Hover: darken the fill ~8%. Focus: 2px `color/accent/gold` outline offset 2px.

### 5.6 Mood chip / tag

- Pill, radius `radius/pill` (999px), `type/label`.
- Background = the mood's accent at ~18% opacity; text = full-strength accent or espresso.
- Used to label recipes and as the mood selector control.

### 5.7 Footer

- Dark band (`color/accent/forest` or `color/ink/primary`), cream text.
- Multi-column link groups (About, Activities, Social), a newsletter signup, and the wordmark — mirroring Meyers' footer structure.

---

## 6. Shape, Elevation & Motion

| Token | Value | Notes |
|---|---|---|
| `radius/sm` | 4px | Buttons, inputs (matches Meyers' ~3.75px) |
| `radius/md` | 8px | Cards, chips' container |
| `radius/lg` | 16px | Large media containers |
| `radius/pill` | 999px | Mood chips, toggles |
| `elevation` | none | **No drop shadows.** Depth comes from background tint steps, not shadow. |
| `motion/duration` | 200–280ms | Hovers, reveals |
| `motion/easing` | ease-out | Calm, no bounce |
| `motion/scroll` | gentle fade/translate-up on block entry | Editorial reveal, subtle only |

---

## 7. Photography & Imagery

The single most important asset class — the system is photo-led.

- **Real food, natural light, warm tones.** Top-down or close macro shots, matching the palette's earthiness.
- Images run **full-bleed** in heroes and bands; **rounded `radius/lg`** when inside the content column.
- Always pair overlaid text with `color/overlay/scrim` for legibility.
- Avoid cool/blue-cast photography — it fights the warm palette.

---

## 8. Voice & Mood Theming (MoodFood's twist on Meyers)

Where Meyers themes by **season**, MoodFood themes by **mood**:

- Selecting a mood swaps the **active accent** (`§2.2`), the eyebrow color, the hero headline's first line, and chip tints — while neutrals stay constant. The page feels like it responds to how the user feels.
- Copy stays editorial and warm, but emotionally attuned: "Feeling low? Comfort on a plate." rather than marketing-speak.
- Keep one accent dominant per mood; never rainbow the screen.

---

## 9. Quick reference — token summary

**Backgrounds:** ivory `#F4F2E0` · sand-raised `#E5E0CA` · sand-sunken `#D6CEB4` · muted `#C7BB9F`
**Ink:** espresso `#291D1A` · cream-on-dark `#F4F2E0` · subtle `rgba(41,29,26,.65)`
**Accents:** gold `#BF8F2D` · olive `#484C38` · forest `#16382B` · peach `#F3C2B0` · wine `#75313D`
**Type:** Plus Jakarta Sans everywhere — display = 800 weight, tight tracking, up to ~112px; body 16px/400
**Shape:** radius 4 / 8 / 16 / pill · no shadows
**Grid:** 1232px content column, 12 cols, 32px gutter, full-bleed media
**Signature:** two-tone uppercase headline over full-bleed food photography

---

*Reference source: meyers.dk (structure & palette study). MoodFood keeps its existing app typeface (Plus Jakarta Sans) — do **not** adopt Meyers' brand font. Use original photography; do not reuse Meyers' assets.*
