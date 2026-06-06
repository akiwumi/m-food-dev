# MoodFood Icon Audit
*Last updated: 2026-06-05*

This document catalogues every icon and emoji used across the MoodFood app. Use it as a reference when redesigning or replacing icons. Each entry includes where it appears, what it communicates, and a slot for the replacement.

> **Scope.** Product scope is governed by the blueprint set (`00`–`03`); see `DESIGN_SYSTEM.md` for the visual contract. Sections that catalogue **roadmap** surfaces (pantry, notifications, allergen substitution, admin CMS, video tab, "Safe Mode", profile sharing, the 15-module Deep Dive / Emotional Food Map) are tagged **`[ROADMAP]`** — design them, but they ship post-MVP.

---

## How to Use This File

| Column | Purpose |
|--------|---------|
| **Current** | The emoji or symbol currently used |
| **Meaning** | What the icon communicates to the user |
| **Appears On** | Screen(s) or component(s) where it lives |
| **Replacement** | Fill this in during the redesign phase |
| **Notes** | Design constraints or context |

---

## 1. Navigation Bar (Bottom Tab Bar)

The bottom tab bar has **exactly 5 items** (mobile/tablet); on desktop (xl+) it becomes a left sidebar. Videos and Settings are **not** tab-bar items — see note below. This matches `DESIGN_SYSTEM.md §7.2` and `WIREFRAMES.md` nav summary.

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| 🏠 | Home / Mood Check-In | Tab bar | | Active state = filled; inactive = outline |
| 🔍 | Search / Discover recipes | Tab bar | | |
| 📖 | Food Diary | Tab bar | | |
| 🛒 | Grocery List | Tab bar | | Opens Grocery hub (Lists / Bag / Pantry tabs) |
| 📅 | Meal Planner | Tab bar | | |

**Not in the bottom nav:**
- 🎬 **Video Tutorials** — reached via a [🎬 Videos] toggle on Search (mobile) or a sidebar item (desktop). `[ROADMAP]`-adjacent: video library is sequenced into build Phase 8.
- ⚙ **Settings** — reached from the profile/avatar entry in the top bar, not the tab bar.

---

## 2. Mood Vocabulary

> **Moods are displayed as words, not icons (product decision).** Mood chips render the **Mood Label** text only — e.g. `Tired`, `Stressed`, `Cozy`. The "Current" emoji in the tables below are **deprecated placeholders**, kept only as a historical mapping; do **not** render them in mood chips, and they are **not** in scope for the icon redesign. See `DESIGN_SYSTEM.md §6` ("Moods are words, not icons"). Colour may still key to a mood (e.g. a card's left-border accent), but the user-facing identifier is always the word.

The mood vocabulary exists at three levels of depth. **Don't conflate them** — they are different sets for different surfaces:

### 2a. The 6 Mood Definitions (MVP)

The canonical moods a user personalises in onboarding (Step 5, Screen 13) and edits in Settings → Mood Editor. These six drive the recommendation engine and match `03-implementation-roadmap.md` Phase 2.

| Current | Mood Label | Appears On | Replacement | Notes |
|---------|------------|------------|-------------|-------|
| 😴 | Tired | Mood definitions, Home check-in, Mood selector | | |
| 😰 | Stressed | Mood definitions, Home check-in, Mood selector | | |
| 🧸 | Cozy | Mood definitions, Home check-in, Mood selector | | |
| 🎉 | Celebratory | Mood definitions, Home check-in, Mood selector | | |
| 🎯 | Focused | Mood definitions, Home check-in, Mood selector | | |
| 🗺️ | Adventurous | Mood definitions, Home check-in, Mood selector | | |

### 2b. Home Check-In moods (MVP) — the 6 above **plus** 3

The Home mood check-in (Screen 14) offers **9** chips: the six definition moods plus the three below. These three have sensible engine defaults even though they aren't separately user-defined in MVP.

| Current | Mood Label | Appears On | Replacement | Notes |
|---------|------------|------------|-------------|-------|
| ⚡ | Energised | Home check-in, Mood selector | | Distinct from the Q2 energy slider; also the Quick Setup path icon |
| 💙 | Sad | Home check-in, Mood selector | | |
| 😊 | Happy | Home check-in, Mood selector | | |

### 2c. Emotional Food Map — 15 states  `[ROADMAP]`

The full Emotional Food Map is **Deep Dive Module 5** (`/setup/emotions`, Screen 10e) and ships post-MVP. It spans the 9 check-in moods above as broader emotional states **plus** the six below.

| Current | Mood Label | Appears On | Replacement | Notes |
|---------|------------|------------|-------------|-------|
| 🏆 | Accomplished | Emotional Food Map | | |
| 😑 | Bored | Emotional Food Map | | |
| 💪 | Post-exercise | Emotional Food Map | | |
| 🤒 | Under the weather / Sick | Emotional Food Map | | |
| 😟 | Anxious | Emotional Food Map | | Was 😰 — changed to avoid colliding with Stressed |
| 🥵 | Overwhelmed | Emotional Food Map | | Was 🧠 — changed to avoid colliding with the Moody avatar (§14) and Deep Dive path icon (§3) |

---

## 3. Onboarding Path Selector (Screen 9)

| Current | Path Label | Appears On | Replacement | Notes |
|---------|------------|------------|-------------|-------|
| ⚡ | Quick Setup (~5 min) | Onboarding path selector | | MVP. Outlined/secondary card style |
| 🧠 | Tell Me Everything (~10 min standard / ~20–30 min Deep Dive) | Onboarding path selector | | MVP = 6-step standard wizard; the full **15-module Deep Dive** depth is `[ROADMAP]`. Primary card, RECOMMENDED badge. (Also Overwhelmed-mood emoji — see §2c collision note) |
| 💬 | Just tell me in a message (Moody chat) | Onboarding path selector | | `[ROADMAP]` — tertiary / text-link style |

---

## 4. Allergen Substitution  `[ROADMAP]`

*(MVP allergen handling is exclude/penalise only; the verified-substitution system ships post-MVP — see `DESIGN_SYSTEM.md §7.26`.)*

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| 🔄 | Ingredient swap available / substitution applied | Recipe cards (Adaptable badge), Substitution Card header, Cook Mode mid-step prompt | | Consider a custom icon — arrows in a circle or ingredient-swap symbol |
| ⛔ | Life-threatening allergen safety warning | Substitution panel for 🔴 severity allergens | | Must remain visually alarming — do not soften |

---

## 5. Allergen & Safety Severity Indicators

| Current | Severity Level | Appears On | Replacement | Notes |
|---------|---------------|------------|-------------|-------|
| 🔴 | Life-threatening allergy (hard filter — trace amounts) | Allergen module, Recipe cards, Ingredient warnings | | Critical — must remain visually distinct from other severities |
| 🟡 | Intolerant (strong exclusion) | Allergen module, Recipe cards | | |
| 🟠 | Prefer to avoid (soft filter) | Allergen module, Recipe cards | | |
| 🟢 | Safe / In stock | Recipe cards, Pantry, Grocery list | | |

---

## 6. Recipe Cards & Results

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| ♡ / ❤️ | Save recipe / Favourite | Recipe card, Recipe detail | | Outline = unsaved; filled = saved |
| ⭐ / ★ | Rating | Recipe card, Diary, Rating prompt | | 1–5 star scale |
| 🕐 | Cook time | Recipe card, Recipe detail | | |
| 🔥 | Calories | Recipe card, Recipe detail | | Hidden when Safe Mode is active |
| 👤 | Servings / Portions | Recipe card, Recipe detail | | Also used as user/profile icon in some contexts |
| 🥗 | Food profile / Dietary match | Recipe card badges | | |
| 🍽 | Meal / Plated dish | Recipe card, Meal Planner | | |
| 🍳 | Cooking / In progress | Cooking mode, Tutorials | | |

---

## 7. Food & Pantry

*(Grocery/list icons are MVP; **pantry** surfaces — 🥕 pantry screen, freshness — are `[ROADMAP]`.)*

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| 🥕 | Pantry / Ingredients | Pantry screen, Grocery list | | |
| 🛒 | Grocery / Shopping list | Grocery tab, Add to list CTA | | |
| 📋 | List / Recipe steps | Recipe detail, Cooking mode | | |
| 📌 | Pinned / Saved item | Planner, Diary | | |

---

## 8. UI Actions & Controls

These are symbolic/typographic icons used for interactive controls — not emoji.

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| ◄ | Back / Navigate back | All screens with back navigation | | Should match platform convention (iOS: chevron left; Android: arrow left) |
| ··· | Overflow menu / More options | Recipe cards, Diary entries, Admin tables | | Typically 3 dots horizontal |
| ✏ / [✏] | Edit / Inline edit | Settings rows, Profile | | Appears as tap target beside editable values |
| ✓ | Selected / Done / Confirmed | Chip selections, Completion states, CTA | | |
| ✕ / × | Remove / Close / Dismiss | Tags, modals, bottom sheets | | |
| ▾ | Dropdown / Expandable | Select inputs, accordion sections | | Rotates 180° when open |
| [+] | Add / Create new | Household member card, Grocery list, Planner | | |
| [─] | Stepper minus / Decrease | Serving size adjuster, quantity stepper | | |
| ↑ | Skill push / Level up | Cooking skill nudges, Progress indicators | | |
| [Edit →] | Edit complex multi-value setting | Settings screen (complex rows) | | Text-based CTA, not icon-only |

---

## 9. Status & Feedback

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| ✅ | Complete / Success | Onboarding progress, module completion | | |
| ⚠️ | Warning / Caution | Allergen bypass confirmation, Safe Mode info card | | |
| 🚫 | Blocked / Not available | Ingredient unavailable, allergen conflict | | |
| 💡 | Tip / Moody suggestion | Contextual hints, Progressive Discovery prompts | | |

---

## 10. Media & Playback

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| ▶ | Play video | Video tutorials, Recipe video | | |
| 🔊 | Text-to-speech / Audio | Cooking mode (read-aloud steps) | | Toggle on/off |
| 🔆 | Screen wake lock (keep screen on) | Cooking mode | | Often shown as a brightness or screen icon |

---

## 11. Input & Permissions

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| 👁 | Show/hide password | Auth screens (login, signup) | | Toggle visibility of password field |
| 📷 | Camera / Photo upload | Profile photo, recipe photo upload | | |
| 🎙 | Microphone / Voice input | Moody chat (voice message) | | |
| 📍 | Location (specific point) | Location module (onboarding), Localisation badge | | |
| 🌍 / 🌏 | Location / Global / Region | Location module, Admin geo map | | |

---

## 12. Communication & Notifications

*(The 🔔 notification centre/toast and ✨ feature-announcement surfaces are `[ROADMAP]`; basic push reminders land in build Phase 8.)*

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| 🔔 | Notification bell / Notification centre | Top nav bar, Settings, Admin push composer | | Needs active (with red badge) and inactive (no badge) states |
| ✨ | New feature announcement | Notification centre, notification toast | | |
| 📤 | Share | Recipe detail (share recipe) | | |
| 🔗 | Link / Deep link | Admin CMS, shared recipe links | | |

## 12b. Pantry Freshness & Status  `[ROADMAP]`

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| ✅ | Pantry fresh / ingredient in stock | Pantry freshness bar (fresh), ingredient status | | Already used for pantry status; consider a custom "fresh" icon |
| ⚠️ | Pantry stale / low stock / expiring soon | Pantry freshness bar (stale), expiring items, ingredient rows | | |
| 🔴 | Pantry very stale / item expired | Pantry freshness bar (very stale), expired item row | | Must remain visually distinct from ⚠️ — different urgency level |

---

## 13. Analytics & Admin (Admin Dashboard Only)  `[ROADMAP]`

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| 📊 | Stats / Charts | Admin overview, Analytics tab | | |
| 🏷 | Tag / Label / Badge | Admin content tagging, Featured recipe labels | | |
| 📱 | Mobile / App platform | Admin device breakdown | | |
| 👤 | User / Account | Admin User Management | | |

---

## 14. Moody AI Assistant

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| 🧠 | Moody avatar / AI thinking | Chat screen, Progressive Discovery prompt, Loading state | | Consider a custom illustrated avatar instead of emoji |
| 💬 | Chat / Message | Moody chat tab, onboarding chat path | | |

---

## 15. Miscellaneous / Decorative

| Current | Meaning | Appears On | Replacement | Notes |
|---------|---------|------------|-------------|-------|
| 🎬 | Videos tab | Bottom navigation | | |
| 🥗 | Food profile badge | Recipe cards | | |
| 📖 | Diary / Journal | Bottom navigation | | |

---

## Redesign Notes

### Priority Tiers for Replacement

**Tier 1 — Replace First (Core UX / Highest Visibility)**
- Bottom nav icons (5 icons: Home · Search · Diary · Grocery · Planner)
- Recipe card actions: ♡ save, ⭐ rating, 🕐 time, 🔥 calories
- *(Moods are **not** in this list — they render as words, not icons; see §2.)*

**Tier 2 — Replace Second (Onboarding + Safety)**
- Allergen severity indicators (🔴🟡🟠🟢) — may become a custom colour-coded shape system
- Onboarding path icons (⚡🧠💬)
- Status icons (✅⚠️🚫)

**Tier 3 — Replace Third (System / Admin)**
- UI action symbols (◄ ··· ✏ ✓ ✕ ▾ [+] [─])
- Admin dashboard icons
- Media playback (▶ 🔊)

### Design Considerations

1. **Moods are words, not icons.** Mood is the most distinctive element of MoodFood, but it is expressed through **language** — clear, warm word chips (`Tired`, `Stressed`, `Cozy`…) — not pictograms. The brand identity in the mood surface comes from typography, colour accents, copy tone, and layout, not an illustrated emoji set. Do not design mood icons.

2. **Allergen severity MUST remain colour-coded.** Colour alone is not sufficient (accessibility) — pair colour with shape (e.g. 🔴 = octagon, 🟡 = triangle, 🟠 = circle) to ensure severity is never ambiguous.

3. **Safe Mode hides calorie icons.** `[ROADMAP]` — Safe Mode is set in the Deep Dive "Health & Body Relationship" module (`/setup/health`, Screen 13e), which is post-MVP. When built, the 🔥 calories icon (and any associated copy) must be conditionally rendered — fully hidden when `safe_mode_active: true`, not just greyed out. (MVP renders calories normally.)

4. **Navigation icons need active/inactive states.** Each tab icon needs two variants: filled (active) and outline (inactive). Design both states for all 5 bottom-nav icons (plus the sidebar-only Videos/Settings icons).

5. **Platform conventions for back navigation.** The ◄ back icon should follow iOS (chevron) and Android (arrow) conventions. Use system icons where platform provides them.

6. **Moody avatar.** Currently using 🧠 emoji as a placeholder. A custom illustrated character would better communicate Moody's personality and differentiate the AI assistant from generic chatbot UIs.

---

*Fill in the Replacement column as icons are designed. Link to Figma component if applicable.*
