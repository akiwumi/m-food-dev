import type { Profile } from "./store";
import { moods } from "./data";

// Deep food-psychology onboarding.
//
// Grounded in three validated instruments so the questions map to real signal,
// not vibes:
//   - Food Choice Questionnaire (FCQ): motives behind food choice
//     (health, mood, convenience, sensory appeal, natural content, price,
//      weight control, familiarity, ethical concern).
//   - Three-Factor Eating Questionnaire (TFEQ-R18): cognitive restraint,
//     uncontrolled eating, emotional eating -> the "eatingHabits" page.
//   - Taste-phenotype + comfort/emotional-eating research: flavor and texture
//     preferences, spice/intensity tolerance, mood-specific cravings.
//
// The flow is config-driven: add, remove, or reorder a page by editing this
// array. App.tsx renders each `type` generically.

export type QuestionType = "single" | "multi" | "scale" | "textgrid" | "stepper";

// Keys on Profile that this onboarding writes to.
export type OnboardingKey =
  | "diet" | "allergies" | "dislikedIngredients"
  | "flavorLikes" | "flavorAvoids" | "textureLikes" | "textureAvoids" | "spiceTolerance"
  | "proteins" | "vegetables" | "carbs" | "cuisines"
  | "foodValues" | "cookingMotivations" | "eatingHabits" | "emotionalTriggers"
  | "comfortFoods" | "comfortCues" | "avoidCues" | "moodNeeds"
  | "skill" | "equipment" | "cookingFor" | "servings" | "weeknightTime"
  | "planningStyle" | "nutritionGoals" | "novelty";

export type OnboardingQuestion = {
  id: string;
  section: string;
  eyebrow: string;
  title: string;
  text: string;
  type: QuestionType;
  key: OnboardingKey;
  options?: string[];
  rows?: string[];          // textgrid row labels
  placeholder?: string;
  min?: number;
  max?: number;
  lowLabel?: string;        // scale endpoints
  highLabel?: string;
  allowCustom?: boolean;    // multi: let the user add their own
  optional?: boolean;
};

export const onboardingQuestions: OnboardingQuestion[] = [
  // ---------------------------------------------------------------- Section 1
  {
    id: "diet", section: "Food & safety", eyebrow: "YOUR DIETARY LIFESTYLE",
    title: "How do you usually eat?", type: "single", key: "diet",
    text: "Pick the pattern closest to your everyday eating. This sets a baseline, never a cage.",
    options: ["Everything", "Flexitarian", "Pescatarian", "Vegetarian", "Vegan", "Gluten-free", "Halal", "Kosher"],
  },
  {
    id: "allergies", section: "Food & safety", eyebrow: "SAFETY FIRST",
    title: "Allergies and intolerances", type: "multi", key: "allergies",
    text: "Select anything that must never appear in a meal. These become hard safety filters that are never relaxed.",
    options: ["Dairy", "Gluten", "Wheat", "Peanuts", "Tree nuts", "Shellfish", "Fish", "Eggs", "Soy", "Sesame", "Mustard", "Celery"],
    allowCustom: true, optional: true,
  },
  {
    id: "dislikes", section: "Food & safety", eyebrow: "HARD NO'S",
    title: "Anything you just won't eat?", type: "multi", key: "dislikedIngredients",
    text: "Not allergies, just strong dislikes. Moody will steer recipes around these wherever it can.",
    options: ["Mushrooms", "Olives", "Cilantro", "Blue cheese", "Organ meats", "Anchovies", "Tofu", "Beetroot", "Oysters", "Raw tomato", "Raw onion", "Coconut"],
    allowCustom: true, optional: true,
  },

  // ---------------------------------------------------------------- Section 2
  {
    id: "flavor-likes", section: "Your palate", eyebrow: "TASTE PROFILE",
    title: "Which flavors pull you in?", type: "multi", key: "flavorLikes",
    text: "Your taste phenotype shapes everything Moody suggests. Pick everything that regularly sounds good.",
    options: ["Sweet", "Salty", "Sour/Tangy", "Savory/Umami", "Spicy/Hot", "Smoky", "Garlicky", "Herby/Fresh", "Rich/Buttery", "Bright/Citrusy", "Earthy", "Bittersweet"],
  },
  {
    id: "flavor-avoids", section: "Your palate", eyebrow: "TASTE PROFILE",
    title: "Any flavors that put you off?", type: "multi", key: "flavorAvoids",
    text: "Knowing what to dial down is as useful as knowing what to chase.",
    options: ["Very sweet", "Very salty", "Sour", "Bitter", "Very spicy", "Heavy/Greasy", "Fishy", "Pungent", "Overly herby"],
    optional: true,
  },
  {
    id: "texture-likes", section: "Your palate", eyebrow: "MOUTHFEEL",
    title: "Textures you reach for", type: "multi", key: "textureLikes",
    text: "Texture drives satisfaction as much as flavor. Choose the mouthfeels that make a meal feel right.",
    options: ["Creamy", "Crunchy", "Crispy", "Chewy", "Brothy/Soupy", "Silky/Smooth", "Fresh/Crisp", "Hearty/Chunky", "Tender", "Flaky"],
  },
  {
    id: "texture-avoids", section: "Your palate", eyebrow: "MOUTHFEEL",
    title: "Textures that put you off", type: "multi", key: "textureAvoids",
    text: "Texture aversions are real and personal. Moody will quietly avoid these.",
    options: ["Slimy", "Mushy", "Gritty", "Rubbery", "Greasy", "Dry", "Stringy", "Gelatinous"],
    optional: true,
  },
  {
    id: "spice", section: "Your palate", eyebrow: "HEAT",
    title: "How much heat do you like?", type: "scale", key: "spiceTolerance",
    text: "From gentle warmth to genuine fire. We use this to scale spice, never to surprise you.",
    lowLabel: "Avoid heat", highLabel: "Bring the fire",
  },

  // ---------------------------------------------------------------- Section 3
  {
    id: "proteins", section: "Ingredients", eyebrow: "BUILDING BLOCKS",
    title: "Proteins you enjoy", type: "multi", key: "proteins",
    text: "Pick the proteins you happily eat. Skip anything you'd rather not see on the plate.",
    options: ["Chicken", "Beef", "Pork", "Lamb", "Fish", "Shellfish", "Eggs", "Tofu/Tempeh", "Beans/Lentils", "Chickpeas", "Cheese", "Nuts/Seeds", "Yogurt"],
  },
  {
    id: "vegetables", section: "Ingredients", eyebrow: "BUILDING BLOCKS",
    title: "Vegetables you actually like", type: "multi", key: "vegetables",
    text: "The ones you reach for, not the ones you feel you should. Honest answers get better dinners.",
    options: ["Leafy greens", "Tomatoes", "Peppers", "Mushrooms", "Broccoli", "Sweet potato", "Squash", "Courgette", "Avocado", "Cauliflower", "Carrots", "Aubergine", "Corn", "Peas"],
  },
  {
    id: "carbs", section: "Ingredients", eyebrow: "BUILDING BLOCKS",
    title: "Your favorite bases", type: "multi", key: "carbs",
    text: "The carbs and grains that anchor a meal for you.",
    options: ["Pasta", "Rice", "Noodles", "Bread", "Potatoes", "Quinoa/Grains", "Tortillas", "Couscous", "Polenta", "Keep it low-carb"],
  },
  {
    id: "cuisines", section: "Ingredients", eyebrow: "FLAVOR WORLDS",
    title: "Which cuisines sound good?", type: "multi", key: "cuisines",
    text: "Gentle boosts toward the kitchens you love. Never rigid rules.",
    options: ["Italian", "Mediterranean", "Mexican", "Japanese", "Indian", "Thai", "Chinese", "French", "Middle Eastern", "Korean", "Greek", "American comfort", "Vietnamese", "Spanish"],
  },

  // ---------------------------------------------------------------- Section 4
  {
    id: "food-values", section: "Food psychology", eyebrow: "WHAT MATTERS MOST",
    title: "When you choose food, what drives it?", type: "multi", key: "foodValues",
    text: "Most people are pulled by several of these at once. Pick everything that rings true.",
    options: ["Tastes amazing", "Good for my health", "Quick & convenient", "Natural & whole", "Affordable", "Helps my weight goals", "Familiar & comforting", "Ethical & sustainable", "Lifts my mood", "Gives me energy"],
  },
  {
    id: "cooking-motivations", section: "Food psychology", eyebrow: "WHY YOU COOK",
    title: "What does cooking do for you?", type: "multi", key: "cookingMotivations",
    text: "The role cooking plays shapes how much effort feels worth it on any given night.",
    options: ["Restore my energy", "Feel creative", "Care for myself", "Build confidence", "Connect with people", "Save time", "Save money", "Try something new", "Wind down", "Feel accomplished"],
  },
  {
    id: "eating-habits", section: "Food psychology", eyebrow: "YOUR EATING STYLE",
    title: "How do you tend to eat?", type: "multi", key: "eatingHabits",
    text: "No right answers here, just patterns. They help Moody match the rhythm you actually live.",
    options: ["I plan meals ahead", "I decide at the last minute", "I batch-cook and reuse", "I love leftovers", "I graze through the day", "I crave the same meals often", "I eat mainly for fuel", "Food is a highlight of my day", "I watch portions closely", "I eat past full when it's delicious"],
  },
  {
    id: "emotional-triggers", section: "Food psychology", eyebrow: "MOOD & FOOD",
    title: "What changes how you eat?", type: "multi", key: "emotionalTriggers",
    text: "Emotions shift our cravings. Naming yours lets Moody support you instead of working against you.",
    options: ["Stress", "Sadness", "Boredom", "Celebration", "Tiredness", "Loneliness", "Anxiety", "Rewarding myself", "Social settings", "None — I eat on a schedule"],
    optional: true,
  },

  // ---------------------------------------------------------------- Section 5
  {
    id: "comfort-foods", section: "Comfort & mood", eyebrow: "YOUR COMFORT",
    title: "What does comfort food look like?", type: "multi", key: "comfortFoods",
    text: "The dishes you turn to when you need a meal to feel like a hug.",
    options: ["Pasta", "Soup or stew", "Fresh & light", "Baked goods", "Chocolate & sweets", "Spicy food", "Fried & crispy", "Cheesy dishes", "Rice or noodle bowls", "Grilled meats", "Bread & toast", "Curry"],
  },
  {
    id: "comfort-cues", section: "Comfort & mood", eyebrow: "YOUR COMFORT",
    title: "What makes a meal feel comforting?", type: "multi", key: "comfortCues",
    text: "The qualities, beyond any single dish, that signal comfort to you.",
    options: ["Warm", "Familiar", "Nostalgic", "One-pot", "Indulgent", "Light & clean", "Quick", "Hearty", "Crunchy", "Brothy"],
  },
  {
    id: "energy-drainers", section: "Comfort & mood", eyebrow: "WHAT DRAINS YOU",
    title: "What makes cooking feel like too much?", type: "multi", key: "avoidCues",
    text: "Moody will gently penalize these on low-energy nights so dinner stays doable.",
    options: ["Too many dishes", "Long prep", "Lots of chopping", "Unfamiliar steps", "Heavy meals", "Standing too long", "Complex timing", "Hard cleanup", "Too many ingredients"],
  },
  {
    id: "mood-needs", section: "Comfort & mood", eyebrow: "PERSONAL MOOD MEANINGS",
    title: "What helps in each mood?", type: "textgrid", key: "moodNeeds",
    text: "A small clue for each mood. Moody uses these the moment you check in feeling that way.",
    rows: moods,
    placeholder: "What usually helps?",
    optional: true,
  },

  // ---------------------------------------------------------------- Section 6
  {
    id: "skill", section: "Kitchen & goals", eyebrow: "YOUR KITCHEN",
    title: "How confident are you cooking?", type: "single", key: "skill",
    text: "This protects your energy and keeps suggestions in reach.",
    options: ["New cook", "Comfortable", "Confident", "Pro"],
  },
  {
    id: "equipment", section: "Kitchen & goals", eyebrow: "YOUR KITCHEN",
    title: "What can you cook with?", type: "multi", key: "equipment",
    text: "We'll never suggest a recipe that needs gear you don't have.",
    options: ["Stovetop", "Oven", "Microwave", "Blender", "Air fryer", "Slow cooker", "Instant Pot", "Grill", "Food processor"],
  },
  {
    id: "cooking-for", section: "Kitchen & goals", eyebrow: "YOUR TABLE",
    title: "Who are you usually cooking for?", type: "multi", key: "cookingFor",
    text: "Helps Moody scale portions and balance everyone's tastes.",
    options: ["Just me", "Partner", "Kids", "Roommates", "Friends", "Extended family"],
  },
  {
    id: "servings", section: "Kitchen & goals", eyebrow: "YOUR TABLE",
    title: "How many plates, usually?", type: "stepper", key: "servings",
    text: "A starting point for scaling. You can change it any night.",
    min: 1, max: 12,
  },
  {
    id: "weeknight-time", section: "Kitchen & goals", eyebrow: "YOUR TIME",
    title: "How long for a weeknight dinner?", type: "single", key: "weeknightTime",
    text: "Your realistic default, not your best-case.",
    options: ["15 min", "30 min", "45 min", "An hour+", "Depends on the day"],
  },
  {
    id: "planning", section: "Kitchen & goals", eyebrow: "YOUR RHYTHM",
    title: "How do you plan and shop?", type: "multi", key: "planningStyle",
    text: "So Moody fits how you already run your week.",
    options: ["Plan the whole week", "Decide same day", "Batch cook on weekends", "Shop fresh often", "Keep a stocked pantry", "Use what's about to expire"],
  },
  {
    id: "nutrition-goals", section: "Kitchen & goals", eyebrow: "WHERE YOU'RE HEADED",
    title: "Anything you're working toward?", type: "multi", key: "nutritionGoals",
    text: "Gentle nudges, never pressure. Informational only, never medical advice.",
    options: ["More protein", "More vegetables", "More fiber", "Less processed food", "Balanced meals", "More energy", "Gut-friendly", "Heart-healthy", "Lighter meals", "More variety", "No specific goal"],
    optional: true,
  },
  {
    id: "novelty", section: "Kitchen & goals", eyebrow: "ADVENTURE DIAL",
    title: "How far should Moody stretch you?", type: "scale", key: "novelty",
    text: "From the reliably familiar to the genuinely new.",
    lowLabel: "Keep it familiar", highLabel: "Surprise me",
  },
];

// Ordered, de-duplicated list of section names for progress display.
export const onboardingSections: string[] = onboardingQuestions.reduce<string[]>((acc, q) => {
  if (!acc.includes(q.section)) acc.push(q.section);
  return acc;
}, []);

export type ProfileValue = Profile[keyof Profile];
