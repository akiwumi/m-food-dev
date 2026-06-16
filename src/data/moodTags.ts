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
