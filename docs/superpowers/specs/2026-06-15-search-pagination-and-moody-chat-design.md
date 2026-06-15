# Search Pagination and Moody Chat Design

## Goal

Make explicit recipe search clearly AI-free, return five unique options per batch,
append five more options on request, and make every Ask Moody entry point open the
actual AI chat.

## Search Behavior

- Explicit recipe search uses provider filters, safety rules, and deterministic
  ranking only. It never requests OpenAI curation.
- The first search displays five recipes.
- "Show 5 more options" appends up to five recipes without removing visible
  results or repeating recipe IDs/titles.
- Live provider pages are used first. Bundled recipes provide continued options
  when live search is unavailable or exhausted.
- Repeating the same search starts again at the first batch.

## Product Language

- The recipe search page is titled "Search recipes", not "Ask Moody".
- Search copy describes deterministic filters and safety checks, not AI.
- Explicit-search telemetry reports no AI attempt.
- The optional AI-curated home mood feed remains available behind its existing
  opt-in setting.

## Moody Chat

- Desktop and floating Ask Moody controls open the Moody chat panel.
- The recipe-search navigation item is labeled "Search".
- Chat failure copy distinguishes sign-in requirements from temporary AI
  unavailability where possible.

## Testing

- Unit tests cover five-item batching, append deduplication, and offline
  continuation.
- Existing tests, TypeScript build, and rendered interactions must pass.
