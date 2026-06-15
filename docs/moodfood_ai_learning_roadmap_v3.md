# MoodFood AI Learning and Recommendation Roadmap (v3)

> **What changed from the previous version.** The earlier roadmap had the right
> philosophy but assumed a foundation that does not yet exist in the code. Three
> corrections, verified against the repository:
>
> 1. **The behavioral records to "reuse" are empty.** `mood_entries`,
>    `recommendation_runs`, `cooking_sessions`, and `diary_entries` exist in the
>    migrations but nothing in `src/` writes to them. App state lives in
>    `localStorage`. Phase 2 is greenfield instrumentation, not reuse.
> 2. **There is no telemetry.** Phase 0 cannot "measure a baseline" — it must
>    first *build* the event/timing pipeline that produces those metrics.
> 3. **AI curation is the current default search path,** not an opt-in extra
>    (`fetchCuratedRecipes` → the `recipes` edge function). Defaulting it off is
>    the single largest change here and carries quality risk, so it needs a gate.
>
> v3 keeps the original principles and slice structure, fixes the sequencing, and
> foregrounds the pilot's real near-term state: **cold-start, where stated
> preferences and deterministic ranking carry almost all the weight.**

---

## Executive Recommendation

The central architecture is correct:

- Search, safety filtering, and baseline ranking must work without AI.
- Allergies, dietary rules, religious restrictions, and explicit exclusions remain hard constraints.
- Learned preferences remain soft ranking signals.
- AI explains recommendations and summarizes patterns; it does not decide what is safe.

The main correction is **honesty about the starting point**. MoodFood has the
schema for behavioral learning but is not yet collecting any of it, has no
telemetry, and currently routes normal search through AI by default. So the near-term
plan is not "measure, then learn." It is:

1. Build the measurement pipeline (it does not exist yet).
2. Decide where behavioral data lives (today it is per-device `localStorage`).
3. Make deterministic ranking good enough to be the default — and *prove* it
   before removing AI from the hot path.
4. Only then invest in behavioral event capture and learned signals, because a
   pilot has no historical behavior to learn from for months.

This roadmap is optimized for:

- Faster, AI-independent search
- Faster, lower-risk development
- Lower AI and recipe-provider cost
- **Measurable** recommendation quality (which first requires building measurement)
- Strong privacy and safety controls
- Avoiding duplicate data models and feedback loops

---

## Current MoodFood Foundation (as verified in code)

Real and usable today:

- React, TypeScript, Vite, PWA, Capacitor
- Supabase Auth, RLS, Edge Functions, migrations — wired but **optional**: the
  client falls back to `localStorage` and bundled recipes when Supabase is not
  configured (`isSupabaseConfigured`).
- Deterministic local recommendation scoring with a version constant
  (`RANKING_CONFIG_VERSION = "pilot-v1"`).
- Client and server safety filters.
- External recipe-provider search (`recipes` edge function, Spoonacular +
  TheMealDB) with a local/bundled fallback.
- Authenticated AI gateway with deterministic fallbacks.
- Automated tests for safety, ranking determinism, search filters, providers.

Foundation gaps the previous roadmap glossed over:

- **No telemetry/analytics anywhere in `src/`.** No latency, empty-result, open,
  save, or completion metrics are collected.
- **The learning tables are unused.** `mood_entries`, `recommendation_runs`,
  `cooking_sessions`, `diary_entries` are never written from the client; mood,
  cooking, and diary state persist only in `localStorage`.
- **AI curation is the default**, not opt-in: the primary client call is
  `fetchCuratedRecipes`, and the `recipes` function performs OpenAI ranking when
  a key is present.
- **`RANKING_CONFIG_VERSION` is a constant, not a per-run record** — there are no
  runs to stamp it onto yet.

Extend these foundations; do not build parallel systems that later need reconciliation.

---

## Product Principles

### 1. Search Never Requires AI
Explicit search uses structured provider queries, deterministic filters, safety
checks, and deterministic ranking. AI curation is opt-in and reserved for clearly
labeled personalized experiences where its latency and cost are justified.

### 2. Safety Is a Separate, Non-Negotiable Layer
Safety runs before ranking and again after any external or AI step. AI output is
never proof that a recipe is safe.

### 3. Learning Must Be Measurable — Which Means Measurement Must Exist First
No learned signal enters ranking unless quality can be compared before and after.
That requires a telemetry pipeline that does not exist yet; building it is Phase 0.

### 4. User Intent Beats Inferred Behavior
Explicit preferences and corrections outweigh inferred ones. A few skips or views
must never become permanent dislikes. **In the pilot's cold-start state, stated
preferences are nearly the entire signal — design for that, not for rich history.**

### 5. AI Explains Deterministic Facts
The canonical learned profile is calculated from validated events. AI turns those
facts into readable summaries; it never invents or overwrites canonical signals.

### 6. Privacy Comes Before Collection
Mood, food behavior, household needs, and health-adjacent data are sensitive
(`household_diners`, `health_trend_snapshots`, `family_health_snapshots` already
model some of this). Collect the minimum, explain why, define retention, and make
it easy to inspect, correct, export, or delete — through a single enforcement point.

---

## Target Architecture

```text
User request
  -> hard constraints and safety rules
  -> provider candidate retrieval or local fallback
  -> normalized recipe candidates
  -> deterministic ranking
  -> diversified results
  -> recommendation run recorded        (NEW: nothing records runs today)
  -> user interactions linked to that run (NEW: no event capture today)
  -> deterministic learned signals
  -> measured ranking experiment
  -> optional AI explanation or readable summary
```

Keep three concepts separate:

1. **Stated profile** — what the user explicitly tells MoodFood (the dominant
   signal during the pilot).
2. **Observed signals** — validated events: saves, cooking completions, ratings.
3. **Derived taste profile** — versioned, explainable aggregates from observed signals.

---

## Decision (Resolved): Behavioral Data Is Server-Side

**Goal of this pilot: prove that behavioral learning improves recommendations.**
That goal cannot be met with per-device `localStorage` — learning would reset on
reinstall and, critically, you could never measure aggregate quality or run the
baseline-vs-learned comparison. Therefore behavioral events are persisted
**server-side (Supabase)**.

Consequences, all now in scope:

- The pilot is no longer "no-backend" for behavioral data.
- MoodFood becomes custodian of sensitive (mood + health-adjacent) data, so the
  **Data Governance gate below is a hard prerequisite** — consent, retention, and
  deletion controls ship *with the first event write*, not after.
- The measurement spine (Phase 0 telemetry → recorded runs → linked events →
  replay evaluation in Phase 4) is what produces the proof you need.

---

## Data Governance Gate — Consent, Retention, Deletion (Hard Prerequisite)

No behavioral event may be written server-side until every control below is live.
This gate sits between Phase 0 and Phase 2 and blocks Slice 2.

### Consent (collect nothing without it)
- **Explicit, separate opt-in** for behavioral learning, distinct from auth/ToS.
  Default **off**. Learning does not run and no events are written until the user
  turns it on.
- **Plain-language disclosure** at the opt-in point: what is collected (the event
  set in Phase 2), why (to improve recommendations), where it is stored, and how
  to turn it off or delete it.
- **Granular scope:** behavioral events and mood/health-adjacent context are
  separate consents — a user may allow recommendation learning without consenting
  to mood/health context being retained for learning.
- **Re-consent on material change:** if the event set or use expands, re-prompt;
  do not silently widen collection under old consent.
- **Consent is itself recorded** (version, timestamp, scope) so every stored event
  is traceable to a consent that authorized it. Events arriving without a valid
  consent record are rejected server-side.

### Retention (data does not live forever by default)
- **Defined retention window** per data class (e.g. raw events vs. derived
  aggregates). Raw events expire on a schedule; derived taste signals may persist
  longer but carry `last_observed` time and decay (Phase 3).
- **Automated expiry job** (idempotent) deletes or anonymizes events past the
  window — not a manual cleanup.
- **Minimization:** store the controlled-vocabulary event fields only; no raw
  free-text, no unnecessary mood/health detail. Coarsen sensitive context where a
  reference suffices.
- **Pause ≠ delete:** "pause learning" stops new writes and freezes use of
  existing signals; it does not erase. "Reset/forget" deletes. Keep them distinct.

### Deletion & Export (single enforcement point)
- **`delete-account` is the one enforcement path.** It must cascade to *all*
  behavioral and health-adjacent data: `mood_entries`, `recommendation_runs`,
  `cooking_sessions`, `diary_entries`, the interaction-event log, derived taste
  signals, AI-generated summaries, **and** the existing `household_diners`,
  `health_trend_snapshots`, `family_health_snapshots`.
- **Per-signal deletion:** "forget this" removes a single derived signal and the
  events supporting it, without nuking the whole profile.
- **Learning-off + wipe:** turning learning off offers an immediate "also delete
  what you've learned" option.
- **Export:** the user can export their stored behavioral and profile data in a
  readable format, covering the same tables as deletion.
- **Verification:** an automated test asserts that after `delete-account`, no row
  in any of the listed tables references that user ID. Deletion completeness is a
  tested invariant, not an assumption.

### Governance Exit Gate
- Opt-in defaults off; no events are written without a valid, recorded consent.
- Retention windows are defined and an automated expiry job runs.
- `delete-account` provably removes every listed data class (covered by a test).
- Export returns the user's behavioral + profile data.
- Pause, per-signal forget, and full reset are distinct and all work.

> Until this gate passes, behavioral events stay client-only (or are not collected).
> This is what makes server-side collection of sensitive data defensible rather
> than accidental.

---

# Phase 0 — Build Measurement, Then Capture a Baseline

## Goal
Be able to tell whether changes make MoodFood faster and recommendations better.
**This phase builds the telemetry that does not currently exist.**

## Build First
- A minimal event/timing sink (one `events` table or a lightweight analytics
  Edge Function) plus client-side timing around search and result rendering.
- Batched, non-blocking writes (never on the interactive search path).

## Then Capture Baseline Metrics
- Search latency: median and slowest 5 percent
- Time to first useful result
- Empty-result rate
- Recipe-provider failure and fallback rate
- AI call rate, latency, failure rate, and cost per active user
- Result open rate, save rate
- Cooking-start and cooking-completion rate
- Rating rate
- Safety-filter rejection count
- Confirmed safety incidents, target zero

## Define the Primary Outcome
Cooking completion or a high rating is the strongest positive signal. Saves and
opens are weaker. Views are not preference proof. **Because pilot completions will
be sparse, also capture a lightweight explicit "good suggestion?" thumb as a
faster-converging evaluation label — used for evaluation only, never as a permanent
dislike.**

## Exit Gate
- Telemetry pipeline ships and is verified end to end.
- A baseline exists for latency, empty results, and provider behavior.
- A recommendation run can be associated with later outcomes (requires runs to be
  recorded — see Phase 2 / the data-residency decision).

---

# Phase 1 — Make Deterministic Search the Default (and Prove It)

## Goal
Make normal search fast, deterministic, observable, and AI-independent — without
shipping a quality regression.

## Actions
- Make AI curation explicitly opt-in; default it **off** for normal search.
  (Today it is the default path via `fetchCuratedRecipes` → the `recipes` function.)
- Keep AI curation available only for clearly labeled personalized experiences.
- Ensure live-provider and local-fallback search honor the same hard constraints.
- Define one shared ranking + safety contract so client and server do not drift.
- Record the ranking config version and provider source for each run.

## Quality Gate (new — do not skip)
Before defaulting AI off, run a head-to-head on a fixed sample of representative
queries: deterministic ranking vs. current AI-curated ranking, scored by a human
or the explicit thumb. **Default AI off only if deterministic quality is at parity
or better.** "Faster" must not mean "worse."

## Runtime Performance Track
- Do not send the full deep profile when only safety constraints and filters are needed.
- Coalesce identical provider requests; short-lived cache of **non-personalized**
  candidate data only. Apply user-specific safety/ranking after retrieval. Never
  cache personalized responses across users.
- Return only result-screen fields; load full detail on open, provided safety
  checks still have enough ingredient data.
- Batch analytics writes off the search response path.
- Cancel stale searches when filters change.
- Review image sizes, lazy loading, and large bundles separately.

## Exit Gate
- Search works with no AI key.
- Search latency and empty-result rate are measured (from Phase 0).
- Safety tests pass for live and fallback providers.
- Ranking behavior is versioned and reproducible.
- **Deterministic ranking passed the quality gate.**

---

# Phase 2 — Design a Trustworthy Event Model

> Server-side (decision resolved). **Blocked by the Data Governance gate** — no
> event is written until consent, retention, and deletion controls are live.

## Goal
Capture the smallest set of events needed to evaluate and improve recommendations.

## Start Writing the Existing Tables
These already exist but are unused — wire the client to actually populate them:
- `mood_entries` — current mood/energy context
- `recommendation_runs` — candidate sets and ranking version
- `cooking_sessions` — starts and completions
- `diary_entries` — ratings and outcomes

Add a compact interaction-event log only for actions not represented by those records.

## Initial Event Set
Result impression, recipe opened, saved/unsaved, cooking started, cooking
completed, recipe rated, explicit "not for me". Defer noisy events (passive skips)
until their meaning is tested.

## Event Quality
Stable event ID (idempotency), user ID, controlled-vocabulary type, event + receipt
time, recipe ID + provider source, run ID + result position, ranking config
version, mood/search context reference, minimal metadata. Validate integrity
server-side — RLS protects ownership but does not make client analytics trustworthy.

## Privacy
Enforced by the **Data Governance gate** above (consent opt-in, retention windows
+ expiry job, single-path deletion/export, pause vs. forget vs. reset). Phase 2
adds nothing new here — it simply must not write any event that the gate's consent
and minimization rules would not allow.

## Exit Gate
- Duplicate events are safely ignored.
- Outcomes trace to a ranking version.
- Users can disable and delete learning data.
- Event volume and storage cost are understood.

---

# Phase 3 — Build Deterministic Learned Signals

## Goal
Explainable preference signals without AI.

## Start With High-Confidence Signals
Frequently completed cuisines/meal types; highly rated ingredients/cuisines;
typical completed cooking time by context; repeated explicit dismissals;
mood-to-completed-meal patterns; recency and repetition counts.

## Confidence Rules
Require multiple observations; weight completions and ratings above opens/saves;
time-decay old behavior; treat negative inference cautiously; give explicit
corrections highest priority; store support count, confidence, last-observed time,
and derivation version per signal.

## Avoid a Permanent AI-Owned Profile
Canonical profile = deterministic, versioned facts. AI prose lives in a separate,
always-regenerable summary field.

## Cold-Start Reality
For most of the pilot there will be little or no behavioral history. Stated
onboarding preferences + deterministic ranking must produce good results with zero
events. Treat behavioral learning as an enhancement that activates only once a user
crosses an observation threshold.

## Exit Gate
- Every signal is explainable from source events.
- Rebuilding from the same events is deterministic.
- Sparse-data and cold-start users still get useful results.
- Users can correct or suppress individual signals.

---

# Phase 4 — Evaluate Learned Ranking Before Rollout

## Goal
Prove learning improves outcomes rather than reinforcing accidental behavior.

## Process
Replay historical runs against candidate ranking changes; compare baseline vs.
learned ranker; roll out behind a flag to a small pilot group; track completion,
rating, empty results, latency, safety; keep config versions immutable and auditable.

> Caveat: replay needs accumulated runs. In a fresh pilot this phase is months out;
> until then, rely on the Phase 1 quality gate and the explicit thumb for evaluation.

## Protect Against Feedback Loops
Preserve novelty and cuisine diversity; do not show only already-favored foods;
cap the max boost from learned preferences; offer an explicit "surprise me" mode.

## Exit Gate
Promote learned ranking only when it improves the chosen outcome without
unacceptable regressions in latency, diversity, empty results, or safety.

---

# Phase 5 — User-Facing Taste Memory

## Goal
Make learning visible, useful, and controllable before making it sophisticated.

Show what MoodFood believes, why, confidence in plain language, and the effect on
recommendations. Controls: correct, use less, use more, forget, pause learning,
reset. Never present uncertain observations as facts.

## Exit Gate
Pilot users understand why recommendations changed and can correct wrong inferences.

---

# Phase 6 — AI Summaries and Explanations

## Goal
Use AI where language adds value, never in the critical search or safety path.

Good uses: readable taste summaries from deterministic signals; "why this ranked
highly"; Moody answering from current results + validated facts; suggested profile
corrections for user approval.

Guardrails: minimum context; validate structured responses; never change hard
constraints; never overwrite canonical signals; cache/regenerate prose instead of
calling AI per search; set cost/latency/timeout/failure budgets; keep deterministic
fallback copy.

Trigger: background-run after enough new high-quality evidence, or on explicit
request. Not after every rating or small batch.

## Exit Gate
AI failure has no effect on search, safety, or learned ranking. AI cost and
usefulness are measurable.

---

# Phase 7 — Continue Performance and Reliability Work

## Performance Priorities
1. Remove AI from normal search latency (the current #1 cost/latency driver).
2. Reduce repeated provider calls and oversized payloads (Spoonacular relax-retry
   + AI is the current hot path).
3. Keep event writes and aggregation off the interactive path.
4. Cache only non-personalized candidate data with clear expiry.
5. Lazy-load AI and secondary screens.
6. Optimize images and recipe-detail media.
7. Monitor provider latency, fallback use, Edge Function timeouts, client errors.

## Reliability Priorities
Define graceful behavior for missing AI, provider failure, offline, and stale
profiles; make aggregation idempotent; maintain a deterministic local fallback; add
rollback controls for ranking configs.

---

# Development Order for Maximum Speed

Thin vertical slices with exit gates.

## Slice 0 — Make Measurement Exist
Ship the telemetry sink and client timing. Without this, every later "measure"
step is fiction.

## Slice 1 — Fast Deterministic Search, Proven
Default normal search to no AI **after** the quality gate. Baseline metrics
visible. Safety and fallback intact.

## Slice 1.5 — Data Governance (blocks all server-side event capture)
Ship consent opt-in (default off, recorded), retention windows + an automated
expiry job, single-path deletion/export via `delete-account`, and the deletion-
completeness test. Nothing in Slice 2 may write until this passes.

## Slice 2 — One Measurable Learning Loop
Record a run; record a completion or rating; derive one high-confidence signal;
test its ranking effect behind a flag. **This is the first real proof point** that
behavioral learning moves the outcome.

## Slice 3 — User Control
Show that one signal; let the user correct/forget it; verify deletion and
learning-off behavior.

## Slice 4 — Expand Signals
Add cooking-time and mood-pattern signals; add confidence, decay, diversity
controls; evaluate each addition.

## Slice 5 — AI Language Layer
Readable summaries and explanations, only after deterministic learning is useful.

This order produces usable wins early (faster, cheaper, deterministic search) and
refuses to spend weeks on an AI profile system before there is reliable behavioral
data to feed it.

---

# What Not to Build Yet

- AI curation on every search
- AI-written canonical taste profiles
- Large event vocabularies
- Scheduled AI summaries for all users
- Complex real-time learning
- Permanent negative preferences from passive behavior
- A separate analytics system that duplicates the existing tables
- Fine-grained personalization without an evaluation framework
- **Server-side behavioral event capture before the telemetry pipeline and the
  Data Governance gate (consent/retention/deletion) are live**

---

# Recommended Next Steps

Decision is made: **behavioral data is server-side, and the objective is to prove
behavioral learning improves recommendations.** The order that gets you there:

1. **Build telemetry (Slice 0).** Nothing is measurable until this exists. It is
   also where the proof ultimately comes from.
2. **Prove deterministic ranking at parity, then default AI off (Slice 1).** This
   establishes the clean **baseline** that learning will be measured against.
3. **Ship the Data Governance gate (Slice 1.5).** Consent, retention, deletion,
   export — the hard prerequisite for collecting sensitive behavioral data.
4. **Run one measurable learning loop (Slice 2):** record run → record completion/
   rating → derive one signal → A/B it behind a flag against the baseline.
5. **Formalize the proof (Phase 4):** replay accumulated runs, compare baseline vs.
   learned ranker on cooking-completion / rating, hold latency, diversity, empty
   results, and safety flat.

**The proof you need is the delta in step 5 against the baseline in step 2.** That
is only possible because events are server-side, consented, and tied to versioned
ranking configs — which is exactly what steps 1–3 put in place.
