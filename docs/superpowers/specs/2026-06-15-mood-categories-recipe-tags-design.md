# Mood Categories and Recipe Tags Design

## Goal

Implement the 12 canonical MoodFood mood categories and use structured recipe tags for deterministic mood-based ranking, while preserving existing profile scoring, safety filtering, and learned signals.

## Canonical Moods

The check-in experience and new mood records use:

- Tired
- Stressed
- Sad
- Happy
- Adventurous
- Romantic
- Healthy
- Lazy
- Angry
- Anxious
- Focused
- Social

Historical mood values remain useful through compatibility aliases:

- Cozy maps to Sad
- Celebratory maps to Social
- Energised maps to Focused

Aliases are normalized when mood rules and historical learned mood signals are evaluated. Existing stored records do not require destructive migration.

## Architecture

Create a focused `src/moodRules.ts` module that owns:

- Canonical mood names and rules
- Historical mood normalization
- Recipe tag types and flattening
- Weighted mood-tag scoring
- Deterministic recipe tag inference

Extend `Recipe` with optional structured tags grouped by mood, effort, sensory, nutrition, occasion, and cooking style. Tags remain optional so older stored recipes and external provider payloads remain compatible.

`recipeScore()` keeps all existing profile and preference scoring, but replaces the flat direct mood bonus with structured mood-tag scoring. A small direct canonical mood match remains as a compatibility signal for recipes with explicit mood labels.

## Tagging

Bundled recipes receive deterministic inferred tags at ranking time. This covers the existing catalogue without manually maintaining a large duplicate taxonomy.

Inference uses stable recipe facts:

- Time and difficulty
- Ingredient count and text
- Recipe title, reason, cuisine, diets, equipment, and step count
- Existing mood labels

Live Spoonacular and TheMealDB recipes are tagged during provider normalization so the client receives explainable structured tags. Client-side inference remains the fallback for any untagged stored or provider recipe.

Inference must be conservative. It should assign only tags supported by recipe facts, avoiding claims such as `high_protein` or `high_fibre` without suitable provider/diet evidence.

## Ranking

Ranking order remains:

1. Apply hard safety, diet, equipment, time, cuisine, and search filters.
2. Calculate weighted mood-tag score from positive and negative mood rules.
3. Add existing profile, cuisine, flavour, texture, comfort, protein, time, energy, nutrition-goal, and learned-signal scores.
4. Sort by total deterministic score.

Unknown mood values produce no mood-tag score. Historical aliases use their canonical mood rule.

## UI And Data Compatibility

The home mood selector displays the 12 canonical moods. Personal mood-definition settings also display those moods.

Existing diary entries, ratings, and learned mood/cuisine signals are not rewritten. Alias normalization ensures older values still affect recommendations.

The deeper onboarding `cookingMoods` profiler remains unchanged because it describes cooking headspaces rather than the current check-in taxonomy.

## Backend And Database Scope

This iteration does not add `recipe_tags` or `mood_tag_rules` database tables. Current recommendation sources are bundled recipes and external providers, so runtime structured tags provide immediate value without introducing unused persistence and administration paths.

Database-backed taxonomy management can be added later if recipes become centrally managed in Supabase.

## Testing

Add focused tests proving:

- All 12 canonical moods exist.
- Historical aliases normalize correctly.
- Inference creates expected effort, sensory, nutrition, and occasion tags.
- Positive mood tags raise scores and negative tags lower scores.
- Mood-tag scoring changes recommendation order without bypassing hard safety filters.
- Provider normalization includes structured tags.

Run the complete test suite and production build after implementation.
