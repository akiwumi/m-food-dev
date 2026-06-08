# Full-Screen Cooking Instructions Design

## Goal

Replace the current dark, terse cook mode with a full-screen, instruction-led
experience that provides reliable imagery, detailed cooking guidance, and a
visual style based on the approved `screen 3.png` reference.

## Visual Direction

The cooking instructions page intentionally has a focused visual identity based
on the approved reference:

- Pale blue-white background.
- Large translucent or white rounded panels.
- Oversized rounded corners and soft, low-contrast shadows.
- Black geometric sans-serif headings and clean sans-serif body copy.
- Circular white controls.
- Light blue accents for selected states, timers, progress, and the primary
  next-step action.
- Generous spacing and a calm, health-app feel.

The page does not use the current dark green cook-mode theme or decorative serif
headings.

## Full-Screen Step Layout

One cooking step fills the viewport. The instruction-led hierarchy is:

1. Header with close/back, `Step X of Y`, and optional overflow control.
2. Progress bar.
3. Large step-specific image area.
4. Floating rounded instruction panel containing:
   - Short action-oriented step title.
   - Detailed method.
   - Optional factual `Look for` cue.
   - Active ingredients and equipment.
   - Verified timer when available.
   - Persistent Previous and Next controls.

The Next action finishes the cook on the final step and opens the existing meal
rating/logging flow.

## Recipe Step Model

Extend each recipe step while keeping existing recipes compatible:

```ts
type RecipeStep = {
  text: string;
  title?: string;
  detail?: string;
  cue?: string;
  image?: string;
  timer?: number;
  active?: string[];
  equipment?: string[];
};
```

The UI uses `detail ?? text` for the detailed method and derives a concise title
from `title ?? text`.

## Image Reliability

Image priority:

1. Verified provider step image.
2. Main recipe image.
3. Styled no-image state.

The app must not generate step images with AI. A reusable image component handles
empty URLs and load errors without leaving broken image icons.

Trusted image domains used by recipe providers must be allowed by the production
Content Security Policy.

## Detailed Instructions

The recipes Edge Function enriches provider steps before returning them.

- Preserve provider ingredients, order, timings, temperatures, quantities, and
  safety facts.
- Moody may rewrite terse steps into clearer instructions and factual visual
  cues.
- Moody must never invent ingredients, timings, temperatures, quantities,
  doneness temperatures, or safety claims.
- If enrichment fails or returns invalid data, use the original provider steps.
- Existing bundled recipes continue to work without enrichment.

## Provider Mapping

For Spoonacular:

- Preserve analyzed instruction order.
- Map step ingredients and equipment into the structured step fields.
- Use provider step images when present.

For TheMealDB fallback:

- Split the original instructions into ordered steps.
- Use the main meal image as the image fallback.
- Preserve the source URL and original facts.

## Interaction Behavior

- Previous and Next controls remain visible at the bottom of the instruction
  panel.
- Timer control appears only when the step has a verified timer.
- Screen-awake behavior remains active during cook mode when supported.
- The layout fits mobile first and remains centered on larger screens.
- The instruction panel may scroll internally when content exceeds the viewport,
  while navigation remains reachable.

## Error Handling

- Broken step image: try main recipe image.
- Broken main image: show styled no-image state.
- Missing detailed method: show original step text.
- Failed AI enrichment: return original provider steps.
- Missing timer, ingredients, equipment, or cue: omit that UI section.
- Zero steps: show a clear unavailable-instructions state with a link to the
  original recipe when available.

## Testing

- Unit tests for provider step normalization and factual fallback behavior.
- Unit tests for image source priority and broken-image fallback.
- UI tests for Previous, Next, final-step completion, and optional sections.
- Build verification and browser review at mobile and desktop widths.
- Live recipe function verification confirms returned steps remain usable when
  Spoonacular fails and TheMealDB fallback is used.
