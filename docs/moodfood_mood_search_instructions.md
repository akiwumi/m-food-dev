# MoodFood Mood Search Implementation Instructions

## Goal

Implement mood-based recipe search in the MoodFood app.

Users should be able to choose a mood, cuisine type, cooking time, and optional search text. The selected mood should add hidden search tags that improve recipe matching without replacing the existing cuisine or cooking-time filters.

---

## Moods to Support

The app should support the following moods:

- Focused
- Sad
- Energised
- Happy
- Tired
- Anxious

---

## Data Structure

Create a reusable TypeScript type for moods and mood tags.

```ts
export type Mood =
  | "focused"
  | "sad"
  | "energised"
  | "happy"
  | "tired"
  | "anxious";

export type MoodTag = {
  mood: Mood;
  label: string;
  description: string;
  tags: string[];
};
```

---

## Create Mood Tags File

Create this file:

```txt
src/data/moodTags.ts
```

Add the following code:

```ts
export type Mood =
  | "focused"
  | "sad"
  | "energised"
  | "happy"
  | "tired"
  | "anxious";

export type MoodTag = {
  mood: Mood;
  label: string;
  description: string;
  tags: string[];
};

export const moodSearchTags: MoodTag[] = [
  {
    mood: "focused",
    label: "Focused",
    description:
      "For meals that support mental clarity, concentration, and steady energy without feeling heavy.",
    tags: [
      "clarity",
      "concentration",
      "productive",
      "steady-energy",
      "alert",
      "brain-food",
      "light-but-filling",
      "no-crash"
    ]
  },
  {
    mood: "sad",
    label: "Sad",
    description:
      "For comforting, warming, familiar meals that feel emotionally soothing and gently uplifting.",
    tags: [
      "comfort",
      "warming",
      "familiar",
      "soothing",
      "gentle",
      "mood-lifting",
      "soft-textures",
      "feel-better"
    ]
  },
  {
    mood: "energised",
    label: "Energised",
    description:
      "For fresh, vibrant, protein-rich meals that match an active or motivated mood.",
    tags: [
      "high-energy",
      "active",
      "fresh",
      "vibrant",
      "protein-rich",
      "fuel",
      "light-meals",
      "pre-workout"
    ]
  },
  {
    mood: "happy",
    label: "Happy",
    description:
      "For colourful, fun, social, celebratory meals that feel enjoyable and uplifting.",
    tags: [
      "celebratory",
      "colorful",
      "fun",
      "social",
      "feel-good",
      "treat",
      "bright-flavors",
      "indulgent"
    ]
  },
  {
    mood: "tired",
    label: "Tired",
    description:
      "For easy, nourishing, low-effort meals that restore energy without requiring much cooking.",
    tags: [
      "low-effort",
      "quick",
      "easy",
      "nourishing",
      "restorative",
      "minimal-prep",
      "one-pot",
      "gentle-energy"
    ]
  },
  {
    mood: "anxious",
    label: "Anxious",
    description:
      "For calming, simple, warm, grounding meals that feel safe and easy to digest.",
    tags: [
      "calming",
      "grounding",
      "simple",
      "warm",
      "easy-digest",
      "soothing",
      "not-spicy",
      "light-comfort"
    ]
  }
];
```

---

## Create Mood Search Helper File

Create this file:

```txt
src/lib/moodSearch.ts
```

Add helper functions that make the mood search reusable.

```ts
import { moodSearchTags, type Mood, type MoodTag } from "@/data/moodTags";

export type BuildMoodSearchQueryOptions = {
  mood?: Mood;
  cuisine?: string;
  maxCookingTime?: number;
  query?: string;
};

export function getMoodByValue(mood: Mood): MoodTag | undefined {
  return moodSearchTags.find((item) => item.mood === mood);
}

export function getMoodTags(mood: Mood): string[] {
  return getMoodByValue(mood)?.tags ?? [];
}

export function buildMoodSearchQuery({
  mood,
  cuisine,
  maxCookingTime,
  query
}: BuildMoodSearchQueryOptions): string {
  const moodTags = mood ? getMoodTags(mood) : [];

  const parts = [
    cuisine,
    ...moodTags,
    maxCookingTime ? `${maxCookingTime}-minute` : undefined,
    query
  ];

  return parts
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter((part) => part.length > 0)
    .join(" ");
}
```

---

## Example Search Output

If the user selects:

```ts
mood = "tired";
cuisine = "Italian";
maxCookingTime = 30;
query = "pasta";
```

The generated search string should look like:

```txt
Italian low-effort quick easy nourishing restorative minimal-prep one-pot gentle-energy 30-minute pasta
```

---

## UI Requirements

Update the mood selector so it displays these labels:

- Focused
- Sad
- Energised
- Happy
- Tired
- Anxious

When a mood is selected, show the mood description below the selector as helper text.

Example:

```txt
Tired
For easy, nourishing, low-effort meals that restore energy without requiring much cooking.
```

The user should see the mood label and description, but the app should use the hidden mood tags in the recipe search.

---

## Search Logic Requirements

Update the recipe search so it combines:

1. Selected mood tags
2. Selected cuisine
3. Selected cooking time
4. User-entered search text, if present

The mood tags should improve the search but should not replace cuisine or cooking-time filters.

---

## Implementation Notes

- Keep the code TypeScript-safe.
- Keep mood tags reusable across the app.
- Do not hard-code mood logic inside UI components.
- Use the `buildMoodSearchQuery` helper wherever recipe search queries are created.
- Make sure the existing recipe search does not break.
- The user-facing UI should remain simple.
- The hidden tags should only be used internally for better search matching.

---

## Suggested Cursor Prompt

Paste this into Cursor:

```txt
I am building a recipe app called MoodFood.

Please implement mood-based recipe search.

Create src/data/moodTags.ts with the moods focused, sad, energised, happy, tired, and anxious. Each mood should include mood, label, description, and tags.

Create src/lib/moodSearch.ts with helper functions:

- getMoodByValue
- getMoodTags
- buildMoodSearchQuery

The buildMoodSearchQuery function should combine selected mood tags, cuisine, cooking time, and user search text into one clean search string.

Update the UI mood selector so it displays mood labels and shows the selected mood description as helper text.

Use the mood tags as hidden search keywords. Do not show the tags to the user.

Keep the code TypeScript-safe, reusable, and make sure it does not break the existing recipe search.
```

---

## Expected Result

After implementation, MoodFood should be able to turn a mood selection into useful recipe search keywords.

For example:

```txt
Mood: Tired
Cuisine: Italian
Cooking time: 30 minutes
Search text: pasta
```

Should internally search with:

```txt
Italian low-effort quick easy nourishing restorative minimal-prep one-pot gentle-energy 30-minute pasta
```

This allows the app to return recipes that better match how the user feels, without requiring AI in the search step.
