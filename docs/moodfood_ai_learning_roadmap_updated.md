# MoodFood AI Learning and Recommendation Roadmap

## Executive Recommendation

The original roadmap has the right central architecture:

- Search, safety filtering, and baseline ranking must work without AI.
- Allergies, dietary rules, religious restrictions, and explicit exclusions remain hard constraints.
- Learned preferences remain soft ranking signals.
- AI explains recommendations and summarizes patterns; it does not decide what is safe.

The main improvement is sequencing. Do not begin with broad behavioral tracking and a separate learned-profile system. First establish measurable baselines, simplify the existing recommendation path, define trustworthy events, and prove that each learning signal improves recommendations.

This updated roadmap is optimized for:

- Faster user-visible search
- Faster, lower-risk development
- Lower AI and recipe-provider costs
- Measurable recommendation quality
- Strong privacy and safety controls
- Avoiding duplicate data models and feedback loops

---

## Current MoodFood Foundation

MoodFood already has useful building blocks:

- React, TypeScript, Vite, PWA, and Capacitor
- Supabase Auth, RLS, Edge Functions, and migrations
- Deterministic local recommendation scoring with a version identifier
- Client and server safety filters
- External recipe-provider search with local fallback
- Existing `mood_entries`, `recommendation_runs`, `cooking_sessions`, and `diary_entries`
- Authenticated AI gateway with deterministic fallbacks
- Automated tests for safety, ranking determinism, search filters, and providers

The roadmap should extend these foundations rather than create parallel systems that later need reconciliation.

---

## Product Principles

### 1. Search Never Requires AI

Explicit recipe search must use structured provider queries, deterministic filters, safety checks, and deterministic ranking. AI curation should be opt-in and reserved for experiences where its added latency and cost are justified.

### 2. Safety Is a Separate, Non-Negotiable Layer

Safety rules run before ranking and again after any external or AI-assisted step. AI output is never trusted as proof that a recipe is safe.

### 3. Learning Must Be Measurable

No learned signal should enter ranking unless MoodFood can compare recommendation quality before and after it.

### 4. User Intent Beats Inferred Behavior

Explicit preferences and corrections have more weight than inferred preferences. A few skips or views must not become permanent dislikes.

### 5. AI Explains Deterministic Facts

The canonical learned profile is calculated from validated events. AI may turn those facts into readable summaries, but it must not invent or directly overwrite canonical preference signals.

### 6. Privacy Comes Before Collection

Mood, food behavior, household needs, and health-adjacent preferences are sensitive. Collect the minimum useful data, explain why it is collected, define retention, and make it easy to inspect, correct, export, or delete.

---

## Target Architecture

```text
User request
  -> hard constraints and safety rules
  -> provider candidate retrieval or local fallback
  -> normalized recipe candidates
  -> deterministic ranking
  -> diversified results
  -> recommendation run recorded
  -> user interactions linked to that run
  -> deterministic learned signals
  -> measured ranking experiment
  -> optional AI explanation or readable summary
```

Keep three concepts separate:

1. **Stated profile:** what the user explicitly tells MoodFood.
2. **Observed signals:** validated events such as saves, cooking completions, and ratings.
3. **Derived taste profile:** versioned, explainable aggregates calculated from observed signals.

---

# Phase 0 - Define Success and Measure the Baseline

## Goal

Know whether changes make MoodFood faster and recommendations better.

## Establish Baseline Metrics

Track these before changing ranking behavior:

- Search latency: median and slowest 5 percent
- Time to first useful recipe result
- Empty-result rate
- Recipe-provider failure and fallback rate
- AI call rate, latency, failure rate, and cost per active user
- Result open rate
- Save rate
- Cooking-start rate
- Cooking-completion rate
- Rating rate
- Safety-filter rejection count
- Confirmed safety incidents, with a target of zero

## Define the Primary Recommendation Outcome

Use cooking completion or a high rating as the strongest positive signal. Saves and opens are useful but weaker. Avoid treating views as preference proof.

## Exit Gate

Do not begin learned ranking until MoodFood can associate a recommendation run with later user outcomes and compare ranking versions.

---

# Phase 1 - Simplify and Speed Up the Existing Search Path

## Goal

Make normal search fast, deterministic, observable, and independent of AI.

## Actions

- Make AI curation explicitly opt-in and default it off for normal search.
- Keep AI curation available only for clearly labeled personalized experiences.
- Ensure both live-provider and local-fallback search honor the same hard constraints.
- Define one shared ranking and safety contract so client and server implementations do not drift.
- Record the ranking configuration version and recipe-provider source for each recommendation run.
- Measure provider latency and payload size before adding more features.

## Runtime Performance Track

- Avoid sending the full deep profile when a request needs only safety constraints and search filters.
- Avoid repeated identical provider requests through request coalescing and short-lived caching of non-personalized candidate data.
- Apply user-specific safety and ranking after retrieving cached candidates; never cache personalized responses across users.
- Return only fields needed for the results screen, then load full recipe details when opened, provided safety checks still have enough ingredient data to operate.
- Batch non-critical analytics writes and send them outside the search response path.
- Cancel stale searches when the user changes filters.
- Review image sizes, lazy loading, and large route/component bundles separately from recommendation work.

## Exit Gate

- Search works without an AI key.
- Search latency and empty-result rate are measured.
- Safety tests pass for live and fallback providers.
- Ranking behavior is versioned and reproducible.

---

# Phase 2 - Design a Trustworthy Event Model

## Goal

Collect the smallest set of events needed to evaluate and improve recommendations.

## Reuse Existing Data

Build on existing MoodFood records:

- `mood_entries` for current mood and energy context
- `recommendation_runs` for candidate sets and ranking versions
- `cooking_sessions` for starts and completions
- `diary_entries` for ratings and outcomes

Add a compact interaction-event log only for actions not represented well by those records.

## Initial Event Set

Start with:

- Result impression
- Recipe opened
- Recipe saved or unsaved
- Cooking started
- Cooking completed
- Recipe rated
- Explicit dismissal or "not for me"

Delay noisy or ambiguous events such as passive skips until their meaning is tested.

## Event Quality Requirements

Each event should include:

- Stable event ID for idempotency
- User ID
- Event type from a controlled vocabulary
- Event time and server receipt time
- Recipe ID and provider source
- Recommendation-run ID and result position when applicable
- Ranking configuration version
- Relevant mood/search context reference
- Minimal metadata only

Validate event integrity server-side. RLS protects ownership but does not make client-submitted analytics trustworthy.

## Privacy Requirements

- Explain behavioral learning before enabling it.
- Provide a learning on/off control.
- Define retention and deletion behavior.
- Avoid raw free-text or unnecessary sensitive context in events.
- Include learned data in account export and deletion.

## Exit Gate

- Duplicate events are safely ignored.
- Recommendation outcomes can be traced to a ranking version.
- Users can disable and delete learning data.
- Event volume and storage cost are understood.

---

# Phase 3 - Build Deterministic Learned Signals

## Goal

Create explainable preference signals without AI.

## Start With High-Confidence Signals

Calculate:

- Frequently completed cuisines and meal types
- Highly rated ingredients and cuisines
- Typical completed-meal cooking time by context
- Repeated explicit dismissals
- Mood-to-completed-meal patterns
- Recency and repetition counts for each signal

## Confidence Rules

- Require multiple observations before changing ranking.
- Weight completed cooking and ratings more than opens or saves.
- Apply time decay so old behavior becomes less influential.
- Treat negative inference cautiously.
- Give explicit user corrections the highest priority.
- Store support count, confidence, last observed time, and derivation version for each signal.

## Avoid a Permanent AI-Owned Profile

The canonical learned profile should contain deterministic, versioned facts. AI-generated prose belongs in a separate summary field and can always be regenerated.

## Exit Gate

- Every learned signal can be explained from source events.
- Rebuilding the profile from the same events gives the same result.
- Sparse-data and cold-start users continue to receive useful results.
- Users can correct or suppress individual signals.

---

# Phase 4 - Evaluate Learned Ranking Before Full Rollout

## Goal

Prove that learning improves outcomes rather than reinforcing accidental behavior.

## Evaluation Process

- Replay historical recommendation runs against candidate ranking changes.
- Compare the baseline ranker with the learned-signal ranker.
- Roll out behind a feature flag to a small pilot group.
- Track cooking completion, rating, empty results, latency, and safety.
- Keep ranking configuration versions immutable and auditable.

## Protect Against Feedback Loops

- Preserve some novelty and cuisine diversity.
- Do not repeatedly show only already-favored foods.
- Limit the maximum boost from learned preferences.
- Allow explicit exploration modes such as "surprise me."

## Exit Gate

Promote learned ranking only when it improves the selected outcome without unacceptable regressions in latency, diversity, empty results, or safety.

---

# Phase 5 - Add the User-Facing Taste Memory

## Goal

Make learning visible, useful, and controllable before making it more sophisticated.

## Suggested Experience

Show:

- What MoodFood believes
- Why it believes it
- Confidence or evidence in plain language
- The effect on recommendations

Controls:

- Correct this
- Use this less
- Use this more
- Forget this
- Pause learning
- Reset taste memory

Do not present uncertain observations as facts.

## Exit Gate

Pilot users understand why recommendations changed and can successfully correct wrong inferences.

---

# Phase 6 - Add AI Summaries and Explanations

## Goal

Use AI where language adds value without placing AI in the critical search or safety path.

## Good AI Uses

- Turn deterministic learned signals into a readable taste summary.
- Explain why a displayed recipe ranked highly.
- Help Moody answer questions using current results and validated profile facts.
- Suggest profile corrections for the user to approve.

## Guardrails

- Give AI only the minimum required context.
- Validate structured AI responses.
- Never allow AI to change hard constraints.
- Never let AI directly overwrite canonical learned signals.
- Cache or regenerate prose summaries instead of calling AI during every search.
- Set cost, latency, timeout, and failure budgets.
- Keep deterministic fallback copy.

## Trigger Strategy

Run summaries in the background after enough new high-quality evidence exists, or when the user explicitly requests an update. Do not run after every rating, cooking completion, or small event batch.

## Exit Gate

AI failure has no effect on search, safety, or learned ranking. AI cost and usefulness are measurable.

---

# Phase 7 - Continue Performance and Reliability Work

## Goal

Improve speed based on measured bottlenecks rather than assumptions.

## Performance Priorities

1. Remove AI from normal search latency.
2. Reduce repeated provider calls and oversized result payloads.
3. Keep event writes and profile aggregation off the interactive request path.
4. Cache only non-personalized candidate data with clear expiry.
5. Load AI and secondary screens only when needed.
6. Optimize images and recipe-detail media.
7. Add monitoring for provider latency, fallback use, Edge Function timeouts, and client errors.

## Reliability Priorities

- Define graceful behavior for missing AI, provider failures, offline mode, and stale learned profiles.
- Ensure profile aggregation jobs are idempotent.
- Maintain a deterministic local fallback.
- Add rollback controls for ranking configurations.

---

# Development Order for Maximum Speed

Use thin vertical slices with exit gates, not fixed weekly phases.

## Slice 1 - Fast Deterministic Search

- Normal search defaults to no AI.
- Baseline latency and quality metrics are visible.
- Safety and fallback behavior remain intact.

## Slice 2 - One Measurable Learning Loop

- Record recommendation run.
- Record cooking completion or rating.
- Derive one high-confidence signal, such as preferred completed cuisine.
- Test its ranking effect behind a feature flag.

## Slice 3 - User Control

- Show that one learned signal.
- Let the user correct or forget it.
- Verify deletion and learning-off behavior.

## Slice 4 - Expand Signals

- Add cooking-time and mood-pattern signals.
- Add confidence, decay, and diversity controls.
- Evaluate each addition.

## Slice 5 - AI Language Layer

- Add readable summaries and explanations only after deterministic learning is useful.

This order creates usable improvements early and avoids spending weeks on an AI profile system before MoodFood has enough reliable behavioral data.

---

# What Not to Build Yet

Delay these until the earlier exit gates pass:

- AI curation on every search
- AI-written canonical taste profiles
- Large event vocabularies
- Scheduled AI summaries for all users
- Complex real-time learning
- Permanent negative preferences inferred from passive behavior
- A separate analytics system that duplicates existing MoodFood records
- Fine-grained personalization without an evaluation framework

---

# Recommended Next Decision

Start with Phase 0 and Slice 1.

The highest-value immediate change is making normal search explicitly deterministic while measuring latency, empty results, provider behavior, and recommendation outcomes. Then build one small, traceable learning loop from recommendation run to cooking completion or rating.

That path improves the app sooner, produces evidence for later decisions, and keeps AI in the role where it adds the most value: explanation, conversation, and readable personalization.
