# MoodFood — Video Style Guide for NotebookLM
**Purpose:** Ensure every MoodFood video has a consistent look, feel, and voice that is harmonious with the app's design system.  
**Apply to:** All videos produced with NotebookLM — onboarding video, instructional tutorial, any future marketing clips.

---

## 1. Visual Identity

### Colour Palette
Use only these colours. They match the app's design tokens exactly.

| Role | Hex | Usage |
|---|---|---|
| Background — light | `#dceef2` | Full-screen gradient start |
| Background — mid | `#eaf4f3` | Full-screen gradient end |
| Ink / primary text | `#171a1c` | All headings, labels |
| Accent blue | `#7cc3dc` | Selected states, pill highlights, CTAs |
| Accent blue deep | `#57aecb` | Eyebrow text, icons, emphasis |
| Coral / alert | `#ef6a4f` | Warnings, urgency moments only |
| Muted text | `#8b9694` | Subtitles, captions, secondary info |
| White (glass) | `rgba(255,255,255,0.88)` | Card overlays, frosted panels |

**Background:** Always use the mint-to-pale gradient (`#dceef2` → `#eaf4f3` → `#ffffff`), never a flat colour or unrelated pattern.

---

## 2. Typography

### Primary Typeface: Plus Jakarta Sans
- **Available free at:** fonts.google.com/specimen/Plus+Jakarta+Sans
- Headings: **Weight 800 (ExtraBold)**, letter-spacing -0.025em
- Subtitles / body: **Weight 600 (SemiBold)** or 400
- Captions / labels: **Weight 700**, UPPERCASE, letter-spacing 0.18em, blue-deep colour
- Never use Serif for UI text — Playfair Display is the app's accent font (recipe titles only)

### Text sizing guide
| Element | Size |
|---|---|
| Main title overlay | 48–56px |
| Section title | 32–36px |
| Body caption | 16–18px |
| Eyebrow label | 11–12px (uppercase, tracked) |

---

## 3. Screen Recording Style

- **Viewport:** 430 × 932px (iPhone 14 Pro portrait)
- **Frame:** Show the recording inside a soft phone silhouette — no hardware buttons, just a rounded rectangle with a gentle drop shadow (`0 24px 60px rgba(20,50,55,0.18)`)
- **Placement:** Centre the phone frame on the gradient background with 10–15% padding on all sides
- **Scale:** Never crop the phone frame — always show the full screen
- **Cursor:** No visible mouse cursor. Tap interactions should use a soft blue ripple animation (50px circle, `#7cc3dc` at 60% opacity, 300ms fade out)

### Transitions
- **Between scenes:** Smooth cross-fade, 400ms
- **Screen interactions:** Element entry = fade-up (`translateY(14px)` → `0`, 400ms ease)
- **Sheet slides:** Bottom-sheet entry = `translateY(100%)` → `0`, 380ms cubic-bezier(0.22, 1, 0.36, 1) — match the app's feel exactly
- **Never use:** Hard cuts between app screens, wipes, spinning transitions, or 3D flips

---

## 4. Audio

### Voiceover
- **Tone:** Warm, calm, personal. Like a knowledgeable friend, not a product announcer.
- **Pace:** Conversational — allow natural pauses between sentences. Never rushed.
- **Gender / voice:** Neutral or warm female preferred. Avoid corporate or robotic synthetic voices.
- **NotebookLM voice setting:** Use "Warm conversational" or equivalent. Avoid "News reader" and "Formal presenter" presets.
- **Volume:** Voiceover should sit at -6 dB to -3 dB. Never competing with music.

### Background Music
- **Genre:** Soft ambient / lo-fi / minimal piano. Calm but modern. Think late-evening kitchen ambience.
- **Key:** Major key — warm, positive, not melancholic.
- **Tempo:** 70–85 BPM. Slow and unhurried.
- **NotebookLM music prompt (use verbatim or adapt):**  
  *"Soft ambient background music, minimal lo-fi piano, warm and calming, 75 BPM, major key, light percussion, no vocals, suitable for a wellness app tutorial video"*
- **Volume:** Music should fade to **-18 dB** under voiceover. It should be nearly inaudible — presence only, not distraction.
- **Music entry/exit:** Fade in over 2s at video start. Fade out over 3s before the last spoken word.

### Sound Effects
- **Tap sound:** Soft, subtle "click" — not a loud phone tap. 1–3ms attack, quick decay. Volume -20 dB.
- **Screen transition:** Optional soft "whoosh" — very subtle, barely perceptible.
- **Success/completion:** A gentle 2-note chime (C and G, ascending) when onboarding completes or a meal is logged.

---

## 5. Text Overlays & Captions

### Overlay style
- Background: `rgba(23, 26, 28, 0.72)` pill/card with `border-radius: 99px` (for short labels) or `20px` (for multi-line)
- Text: White (`#ffffff`), Plus Jakarta Sans Bold
- Padding: 10px 20px (pill) / 18px 24px (card)
- Animation: Fade in 200ms, hold, fade out 200ms before next scene

### Subtitle / caption style (for accessibility)
- Font: Plus Jakarta Sans 600
- Size: 16px
- Colour: White
- Background: Semi-transparent dark bar at bottom of frame
- Position: Lower third, 32px from bottom of phone frame

### Eyebrow labels (section titles)
- ALL CAPS
- Colour: `#57aecb` (blue-deep)
- Letter spacing: 0.18em
- Weight: 700
- Appears above section title, 12px size

---

## 6. Logo Usage

- Always use the MoodFood logo (`/images/logo-1.png`) + wordmark "MoodFood" in Plus Jakarta Sans ExtraBold
- Minimum logo size: 64px height
- Placement: Centre of screen on fade-in/fade-out, or top-left corner at 44px height during tutorials
- Never stretch, rotate, recolour, or place on a clashing background
- On dark backgrounds (splash, cook mode): use the logo with a drop shadow (`0 4px 12px rgba(0,0,0,0.4)`)

---

## 7. NotebookLM Generation Settings

When using NotebookLM to generate or narrate these scripts, use the following settings for consistency:

### Audio generation
```
Style: Warm and conversational
Pacing: Relaxed (not fast)
Voice: Warm neutral or warm female
Music background: Minimal ambient (see music spec above)
Sound effects: Subtle tap sounds enabled
```

### Script formatting for NotebookLM ingestion
- Paste the voiceover lines only — remove the `**Visual:**` and `**Text overlay:**` sections before feeding to the audio generator
- Leave blank lines between paragraphs so NotebookLM inserts natural pauses
- Mark pauses with `[pause]` where a 1–2 second silence is important (e.g. after the opening rhetorical question)

### Recommended NotebookLM prompt prefix (paste before each script section)
```
You are narrating a short video for a calm, modern food app called MoodFood. 
The tone is warm, personal, and unhurried — like a knowledgeable friend 
talking you through something helpful. Speak at a conversational pace with 
natural pauses. The audience is someone downloading a wellness app for the 
first time.
```

---

## 8. Scene Structure Template

Use this structure for every scene in every MoodFood video:

```
[SCENE TITLE] (timecode–timecode)
Visual: [what appears on screen]
Voiceover: [the words spoken]
Text overlay: [any text that appears on screen]
Sound: [any specific audio cues]
```

---

## 9. Do Not

- Do not use stock footage of people eating in a hurry or looking stressed — the brand is calm and supportive
- Do not use harsh, high-contrast lighting in food shots — prefer warm, natural side light
- Do not use the coral (`#ef6a4f`) as a background colour — it is for alerts only
- Do not use drop shadows heavier than `0 24px 60px rgba(20,50,55,0.18)`
- Do not place text directly over complex imagery without a semi-transparent background behind it
- Do not use a grid of multiple food photos — one beautiful photograph per scene
- Do not rush the voiceover to fit the visuals — trim the visuals instead

---

## 10. Approval Checklist

Before publishing any video:
- [ ] Colours match the palette above exactly
- [ ] Plus Jakarta Sans used throughout
- [ ] Phone frame centred on mint gradient background
- [ ] Voiceover pace is calm — no sentence feels rushed
- [ ] Music is barely perceptible under voiceover
- [ ] MoodFood logo appears in the first and last 3 seconds
- [ ] Subtitle/caption track included for accessibility
- [ ] No visible cursor or development-mode indicators on screen recordings
- [ ] All app screens are captured at 430 × 932 mobile viewport
