import type { Profile } from "./store";
import { cookingMoodLabels, skillLabels } from "./data";

// Deep food-psychology + lifestyle onboarding.
//
// Grounded in validated instruments so questions map to real signal, not vibes:
//   - Food Choice Questionnaire (FCQ): motives behind food choice.
//   - Three-Factor Eating Questionnaire (TFEQ-R18): cognitive restraint,
//     uncontrolled eating, emotional eating -> the "eatingHabits" page.
//   - Taste-phenotype + comfort/emotional-eating research: flavour, texture,
//     spice/intensity tolerance, mood-specific cravings.
//
// Augmented with the deep profiler (recipe-profile-deep.jsx): cooking moods,
// religious/ethical practice, spice types, ingredient philosophy, pantry,
// confidence blockers, cooking methods, eating pattern, meal types, occasions,
// dining style, leftovers/waste, budget, inspiration, sustainability,
// presentation. Every answer is threaded into recommendation + AI curation.
//
// The flow is config-driven: add, remove, or reorder a page by editing this
// array. App.tsx renders each `type` generically.

export type QuestionType =
  | "single" | "multi" | "scale" | "textgrid" | "stepper"
  | "moodcards" | "skillcards" | "grouped-multi" | "record-single";

// Keys on Profile that this onboarding writes to.
export type OnboardingKey =
  | "diet" | "allergies" | "dislikedIngredients" | "dietReligious"
  | "flavorLikes" | "flavorAvoids" | "textureLikes" | "textureAvoids"
  | "spiceTolerance" | "spiceTypes" | "ingredientPhilosophy"
  | "proteins" | "vegetables" | "carbs" | "cuisines" | "pantryStaples"
  | "foodValues" | "cookingMotivations" | "eatingHabits" | "emotionalTriggers"
  | "comfortFoods" | "comfortCues" | "avoidCues" | "moodNeeds"
  | "cookingMoods" | "moodContext" | "foodRelationship"
  | "skill" | "confidenceBlockers" | "equipment" | "cookingMethods"
  | "cookingFor" | "servings" | "weeknightTime" | "typicalTime"
  | "eatingPattern" | "mealTypes" | "occasions" | "diningStyle"
  | "leftoverHabits" | "wasteApproach" | "planningStyle" | "budget"
  | "inspirationSources" | "nutritionGoals" | "sustainability" | "presentation"
  | "rankingPreference" | "novelty";

export type OptionGroup = { group: string; note?: string; items: string[] };

export type OnboardingQuestion = {
  id: string;
  section: string;
  eyebrow: string;
  title: string;
  text: string;
  type: QuestionType;
  key: OnboardingKey;
  options?: string[];
  groups?: OptionGroup[];   // grouped-multi
  rows?: string[];          // textgrid row labels
  rowsKey?: OnboardingKey;  // textgrid: pull rows from this profile field instead
  subKey?: string;          // record-single: slot inside the record key
  placeholder?: string;
  min?: number;
  max?: number;
  lowLabel?: string;        // scale endpoints
  highLabel?: string;
  allowCustom?: boolean;    // multi: let the user add their own
  optional?: boolean;
  showIf?: (p: Profile) => boolean;  // conditionally render this question
};

// ─── Grouped option data ──────────────────────────────────────────────────────

const ALLERGY_GROUPS: OptionGroup[] = [
  { group: "Grains & gluten", note: "Gluten is in wheat, barley, rye, and some oats", items: ["Wheat", "Gluten (all sources)", "Barley", "Rye", "Oats (gluten-sensitive)"] },
  { group: "Dairy & eggs", note: "Dairy allergy and lactose intolerance differ, pick what applies", items: ["Dairy (allergy)", "Lactose intolerance", "Eggs"] },
  { group: "Tree nuts", note: "Choose 'All tree nuts' if unsure", items: ["All tree nuts", "Cashews", "Walnuts", "Almonds", "Pistachios", "Hazelnuts", "Pecans", "Macadamia", "Brazil nuts", "Pine nuts"] },
  { group: "Peanuts & seeds", items: ["Peanuts", "Sesame", "Sunflower seeds", "Poppy seeds"] },
  { group: "Fish & seafood", note: "Fish and shellfish are separate allergens", items: ["All fish", "Salmon", "Tuna", "Cod / white fish", "All shellfish", "Crustaceans", "Molluscs"] },
  { group: "Legumes & soy", items: ["Soy / Soya", "Lentils", "Chickpeas", "Lupin"] },
  { group: "Vegetables & herbs", items: ["Celery", "Mustard", "Alliums (onion/garlic)"] },
  { group: "Other allergens", items: ["Sulphites", "Latex-fruit syndrome"] },
  { group: "Intolerances (non-allergic)", note: "Digestive discomfort rather than immune reactions", items: ["Fructose malabsorption", "FODMAP sensitivity", "Histamine intolerance", "Nightshade sensitivity", "Caffeine sensitivity", "Alcohol intolerance"] },
];

const CUISINE_GROUPS: OptionGroup[] = [
  { group: "African", items: ["West African / Ghanaian", "Nigerian", "Ethiopian / Eritrean", "East African / Kenyan", "North African / Moroccan", "South African", "Senegalese"] },
  { group: "Caribbean & Americas", items: ["Jamaican / Caribbean", "Latin American", "Mexican", "Brazilian", "Peruvian", "American / Southern BBQ"] },
  { group: "European", items: ["Italian", "French", "Spanish / Catalan", "Greek / Mediterranean", "British / Irish", "German / Austrian", "Eastern European", "Scandinavian", "Turkish"] },
  { group: "Middle East & South Asia", items: ["Lebanese / Levantine", "Iranian / Persian", "Israeli", "Indian / South Asian", "Pakistani", "Sri Lankan", "Bangladeshi", "Afghan"] },
  { group: "East & Southeast Asia", items: ["Chinese / Cantonese", "Japanese", "Korean", "Thai", "Vietnamese", "Filipino", "Indonesian / Malaysian", "Singaporean"] },
];

export const PANTRY_GROUPS: OptionGroup[] = [
  { group: "Grains & carbs", items: ["Rice (white)", "Rice (brown)", "Pasta", "Couscous", "Quinoa", "Bread / sourdough", "Oats", "Polenta", "Noodles"] },
  { group: "Shelf-stable proteins", items: ["Canned chickpeas", "Canned beans", "Canned tuna / sardines", "Dried lentils", "Dried beans", "Tofu"] },
  { group: "Sauces & condiments", items: ["Soy sauce / tamari", "Fish sauce", "Worcestershire", "Sriracha / hot sauce", "Miso paste", "Tahini", "Harissa", "Coconut milk", "Canned tomatoes", "Stock / bouillon"] },
  { group: "Oils & fats", items: ["Olive oil", "Neutral oil", "Sesame oil", "Coconut oil", "Butter / ghee"] },
  { group: "Acids & ferments", items: ["White wine vinegar", "Apple cider vinegar", "Balsamic", "Kimchi / sauerkraut", "Pickles"] },
  { group: "Aromatics", items: ["Garlic", "Ginger", "Onions / shallots", "Fresh chilli", "Lemongrass"] },
  { group: "Spices & dried herbs", items: ["Cumin", "Coriander", "Smoked paprika", "Turmeric", "Chilli flakes", "Cinnamon", "Cardamom", "Bay leaves", "Oregano", "Thyme", "Za'atar", "Sumac", "Ras el hanout", "Jerk seasoning"] },
];

export const onboardingQuestions: OnboardingQuestion[] = [
  // ──────────────────────────────────────────────────────── Section 0: Moods
  {
    id: "cooking-moods", section: "Your moods", eyebrow: "HOW YOU COOK",
    title: "Which cooking moods feel like you?", type: "moodcards", key: "cookingMoods",
    text: "These are the headspaces you cook from. Pick the ones you recognise, you'll check in with one each time you open Moody.",
  },
  {
    id: "mc-stress", section: "Your moods", eyebrow: "MOOD & FOOD",
    title: "When you're stressed, what does food do for you?", type: "record-single",
    key: "moodContext", subKey: "stress_response",
    text: "There's no wrong answer, this just helps Moody read your stressed-day check-ins.",
    options: ["Cooking is therapy, it helps me decompress", "I just need to eat fast and get back to it", "I reach for comfort food without thinking", "I often forget to eat or lose my appetite", "I usually just order something"],
  },
  {
    id: "mc-tired", section: "Your moods", eyebrow: "MOOD & FOOD",
    title: "On your most exhausted days, what's most likely?", type: "record-single",
    key: "moodContext", subKey: "tired_response",
    text: "So low-energy nights still end in something you'll actually eat.",
    options: ["I cobble together whatever is easiest", "Toast, cereal, or barely-cooking", "I order in, no shame", "I eat something I made earlier in the week", "I sometimes just don't eat properly"],
  },
  {
    id: "mc-happy", section: "Your moods", eyebrow: "MOOD & FOOD",
    title: "When you're in a great mood, cooking feels like…", type: "record-single",
    key: "moodContext", subKey: "happy_response",
    text: "Good days are a chance to stretch, or not. Your call.",
    options: ["A celebration, I make something special", "Creative time, I experiment", "The same as usual", "A reason to cook for someone else", "Still quick"],
  },
  {
    id: "food-relationship", section: "Your moods", eyebrow: "WHAT FOOD MEANS",
    title: "Which best describes your relationship with food?", type: "single", key: "foodRelationship",
    text: "The lens you bring to eating shapes everything Moody suggests.",
    options: ["Food is fuel, functional more than emotional", "One of life's great pleasures", "Deeply tied to my culture and identity", "About sharing and being with people", "My primary tool for managing my health", "A creative outlet, I love the craft"],
  },
  {
    id: "mc-variety", section: "Your moods", eyebrow: "VARIETY",
    title: "How do you feel about variety?", type: "record-single",
    key: "moodContext", subKey: "variety_vs_routine",
    text: "How hard should Moody push new things versus reliable favourites?",
    options: ["I crave variety, repetition bores me", "A balance of reliables and new things", "I like my rotation, fewer decisions", "Routine weekdays, exploratory weekends"],
  },

  // ────────────────────────────────────────────────── Section 1: Food & safety
  {
    id: "diet", section: "Food & safety", eyebrow: "YOUR DIETARY LIFESTYLE",
    title: "How do you usually eat?", type: "single", key: "diet",
    text: "Pick the pattern closest to your everyday eating. This sets a baseline, never a cage.",
    options: ["Omnivore", "Flexitarian", "Pescatarian", "Vegetarian", "Vegan", "Keto / Low Carb", "Paleo", "Raw Food"],
  },
  {
    id: "diet-religious", section: "Food & safety", eyebrow: "PRACTICE & ETHICS",
    title: "Any religious or ethical food practice?", type: "multi", key: "dietReligious",
    text: "These become firm rules Moody never breaks. Skip if none apply.",
    options: ["Halal", "Kosher", "Kosher (strict meat/dairy separation)", "Hindu Vegetarian", "Hindu (no beef)", "Jain", "Jain (strict)", "Seventh-Day Adventist", "Buddhist Vegetarian", "Rastafarian / Ital", "Eastern Orthodox Fasting", "No pork", "No alcohol in cooking", "No beef", "Traditional / Indigenous diet"],
    allowCustom: true, optional: true,
  },
  {
    id: "allergies", section: "Food & safety", eyebrow: "SAFETY FIRST",
    title: "Allergies and intolerances", type: "grouped-multi", key: "allergies",
    text: "Select anything that must never appear in a meal. These become hard safety filters that are never relaxed.",
    groups: ALLERGY_GROUPS, allowCustom: true, optional: true,
  },
  {
    id: "dislikes", section: "Food & safety", eyebrow: "HARD NO'S",
    title: "Anything you just won't eat?", type: "multi", key: "dislikedIngredients",
    text: "Not allergies, just strong dislikes. Moody will steer recipes around these wherever it can.",
    options: ["Mushrooms", "Olives", "Cilantro", "Blue cheese", "Organ meats", "Anchovies", "Tofu", "Beetroot", "Oysters", "Raw tomato", "Raw onion", "Coconut", "Bitter flavours", "Fermented foods", "Game meat", "Fennel / anise", "Okra / slimy textures", "Very sour food", "Lamb / mutton"],
    allowCustom: true, optional: true,
  },

  // ──────────────────────────────────────────────────── Section 2: Your palate
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
  {
    id: "spice-types", section: "Your palate", eyebrow: "HEAT",
    title: "What kind of heat?", type: "multi", key: "spiceTypes",
    text: "Different heats hit differently. Pick the ones you enjoy.",
    options: ["Fresh chillies", "Dried chilli / flakes", "Black pepper heat", "Ginger heat", "Horseradish / wasabi", "Szechuan numbing spice", "Mustard heat"],
    optional: true, showIf: p => p.spiceTolerance > 0,
  },
  {
    id: "cuisines", section: "Your palate", eyebrow: "FLAVOR WORLDS",
    title: "Which cuisines sound good?", type: "grouped-multi", key: "cuisines",
    text: "Gentle boosts toward the kitchens you love. Never rigid rules.",
    groups: CUISINE_GROUPS,
  },
  {
    id: "ingredient-philosophy", section: "Your palate", eyebrow: "HOW YOU SHOP & COOK",
    title: "Your ingredient philosophy", type: "multi", key: "ingredientPhilosophy",
    text: "How you think about ingredients themselves.",
    options: ["Quality over quantity", "Pantry creativity", "Fresh above all", "Convenience accepted", "Seasonal led", "Heritage & ancient grains", "Fermented & live foods", "Charred & smoked"],
    optional: true,
  },

  // ──────────────────────────────────────────────────── Section 3: Ingredients
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
    id: "pantry", section: "Ingredients", eyebrow: "WHAT'S IN THE CUPBOARD",
    title: "What's reliably in your kitchen?", type: "grouped-multi", key: "pantryStaples",
    text: "So Moody can suggest meals from what you already have. Tap the staples you usually keep around.",
    groups: PANTRY_GROUPS, allowCustom: true, optional: true,
  },

  // ────────────────────────────────────────────── Section 4: Food psychology
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
    options: ["Stress", "Sadness", "Boredom", "Celebration", "Tiredness", "Loneliness", "Anxiety", "Rewarding myself", "Social settings", "None (I eat on a schedule)"],
    optional: true,
  },

  // ──────────────────────────────────────────────── Section 5: Comfort & mood
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
    text: "A small clue for each mood you chose. Moody uses these the moment you check in feeling that way.",
    rowsKey: "cookingMoods", placeholder: "What usually helps?",
    optional: true,
  },

  // ──────────────────────────────────────── Section 6: Kitchen, time & table
  {
    id: "skill", section: "Kitchen, time & table", eyebrow: "YOUR KITCHEN",
    title: "How confident are you cooking?", type: "skillcards", key: "skill",
    text: "This protects your energy and keeps suggestions in reach.",
  },
  {
    id: "confidence-blockers", section: "Kitchen, time & table", eyebrow: "YOUR KITCHEN",
    title: "What holds you back in the kitchen?", type: "multi", key: "confidenceBlockers",
    text: "Naming the friction lets Moody route around it.",
    options: ["Techniques I don't know", "Getting timing right", "Fear of wasting food", "Unfamiliar ingredients", "Lack of equipment", "The mess", "Cooking for others", "Food safety anxiety", "Cost of ingredients", "No real blockers"],
    optional: true,
  },
  {
    id: "equipment", section: "Kitchen, time & table", eyebrow: "YOUR KITCHEN",
    title: "What can you cook with?", type: "multi", key: "equipment",
    text: "We'll never suggest a recipe that needs gear you don't have.",
    options: ["Stovetop", "Oven", "Microwave", "Blender", "Immersion blender", "Air fryer", "Slow cooker", "Instant Pot", "Grill", "Food processor", "Stand mixer", "Cast iron pan", "Wok", "Thermometer", "Pasta machine", "Sous vide"],
  },
  {
    id: "cooking-methods", section: "Kitchen, time & table", eyebrow: "HOW YOU COOK",
    title: "Which cooking methods do you actually use?", type: "multi", key: "cookingMethods",
    text: "How you like to cook, separate from the gear you own.",
    options: ["Stovetop", "Oven baking", "Grilling / BBQ", "Air fryer", "Slow cooker", "Pressure cooker", "Steaming", "Deep frying", "No-cook / raw", "Wok / stir-fry", "Fermentation / pickling", "Bread & pastry baking", "Smoking / low-and-slow"],
    optional: true,
  },
  {
    id: "weeknight-time", section: "Kitchen, time & table", eyebrow: "YOUR TIME",
    title: "How long for a weeknight dinner?", type: "single", key: "weeknightTime",
    text: "Your realistic default, not your best-case.",
    options: ["15 min", "30 min", "45 min", "An hour+", "Depends on the day"],
  },
  {
    id: "typical-time", section: "Kitchen, time & table", eyebrow: "YOUR TIME",
    title: "What time bands do you cook in?", type: "multi", key: "typicalTime",
    text: "The full range, from a 10-minute scramble to a weekend project.",
    options: ["Under 15 min", "15–30 min", "30–60 min", "1–2 hours", "Half day cook", "All day / multi-day"],
    optional: true,
  },
  {
    id: "eating-pattern", section: "Kitchen, time & table", eyebrow: "YOUR RHYTHM",
    title: "How do you eat across a day?", type: "single", key: "eatingPattern",
    text: "So Moody fits the eating windows you actually keep.",
    options: ["Three meals a day", "Two main meals", "Intermittent fasting", "Grazing throughout the day", "One main meal", "Irregular / no pattern"],
  },
  {
    id: "meal-types", section: "Kitchen, time & table", eyebrow: "YOUR MEALS",
    title: "Which meals do you want help with?", type: "multi", key: "mealTypes",
    text: "Moody will focus its ideas where you need them.",
    options: ["Breakfast", "Brunch", "Lunch", "Snacks", "Dinner", "Late Night", "Meal Prep", "Dessert"],
  },
  {
    id: "cooking-for", section: "Kitchen, time & table", eyebrow: "YOUR TABLE",
    title: "Who are you usually cooking for?", type: "multi", key: "cookingFor",
    text: "Helps Moody scale portions and balance everyone's tastes.",
    options: ["Just me", "Partner", "Kids", "Roommates", "Friends", "Extended family"],
  },
  {
    id: "servings", section: "Kitchen, time & table", eyebrow: "YOUR TABLE",
    title: "How many plates, usually?", type: "stepper", key: "servings",
    text: "A starting point for scaling. You can change it any night.",
    min: 1, max: 12,
  },
  {
    id: "dining-style", section: "Kitchen, time & table", eyebrow: "YOUR TABLE",
    title: "How do you usually eat your meals?", type: "multi", key: "diningStyle",
    text: "Where and how you eat shapes what's worth cooking.",
    options: ["Solo & quiet", "Family table", "At my desk", "Food is a social event", "Outdoors when possible", "TV / sofa", "Restaurant mindset at home", "Standing in the kitchen"],
    optional: true,
  },
  {
    id: "occasions", section: "Kitchen, time & table", eyebrow: "WHAT YOU COOK FOR",
    title: "What do you cook for?", type: "multi", key: "occasions",
    text: "From Tuesday-night reliable to a full dinner party.",
    options: ["Everyday weeknight", "Weekend projects", "Date night", "Dinner parties", "Family gatherings", "Celebrations", "Holidays & festivals", "Sunday meal prep", "BBQ / outdoor", "Brunch hosting"],
    optional: true,
  },

  // ──────────────────────────────────────────────── Section 7: Habits & values
  {
    id: "leftovers", section: "Habits & values", eyebrow: "LEFTOVERS",
    title: "How do you feel about leftovers?", type: "multi", key: "leftoverHabits",
    text: "Whether Moody should plan for a second night or not.",
    options: ["I love leftovers", "I batch cook intentionally", "I reinvent leftovers", "I eat the same thing again", "I dislike leftovers", "I forget I have them", "I freeze everything"],
    optional: true,
  },
  {
    id: "waste", section: "Habits & values", eyebrow: "FOOD WASTE",
    title: "Your approach to food waste", type: "multi", key: "wasteApproach",
    text: "Moody can lean into using things up if that matters to you.",
    options: ["Root-to-tip", "Stock from scraps", "Nose-to-tail", "I compost", "Shop to use", "No real system"],
    optional: true,
  },
  {
    id: "planning", section: "Habits & values", eyebrow: "YOUR RHYTHM",
    title: "How do you plan and shop?", type: "multi", key: "planningStyle",
    text: "So Moody fits how you already run your week.",
    options: ["Plan the whole week", "Decide same day", "Batch cook on weekends", "Shop fresh often", "Keep a stocked pantry", "Use what's about to expire", "Online delivery", "Market / farm shop"],
  },
  {
    id: "budget", section: "Habits & values", eyebrow: "BUDGET",
    title: "Budget per meal?", type: "single", key: "budget",
    text: "Gentle guidance on ingredient cost. Never a hard limit.",
    options: ["Budget conscious", "Moderate", "Comfortable", "Premium", "It varies a lot"],
    optional: true,
  },
  {
    id: "inspiration", section: "Habits & values", eyebrow: "INSPIRATION",
    title: "Where do you get cooking inspiration?", type: "multi", key: "inspirationSources",
    text: "Helps Moody speak your language when it suggests things.",
    options: ["Social media", "Cookbooks", "Restaurants & eating out", "Family recipes", "Travel & culture", "Ingredients first", "Friends & community", "Recipe apps & sites", "Specific chefs", "Cultural heritage", "Nutritional science", "The seasons"],
    optional: true,
  },
  {
    id: "nutrition-goals", section: "Habits & values", eyebrow: "WHERE YOU'RE HEADED",
    title: "Anything you're working toward?", type: "multi", key: "nutritionGoals",
    text: "Gentle nudges, never pressure. Informational only, never medical advice.",
    options: ["More protein", "More vegetables", "More fiber", "Less processed food", "Balanced meals", "More energy", "Gut-friendly", "Heart-healthy", "Lighter meals", "More variety", "No specific goal"],
    optional: true,
  },
  {
    id: "sustainability", section: "Habits & values", eyebrow: "YOUR VALUES",
    title: "What matters in how you source food?", type: "multi", key: "sustainability",
    text: "Moody can weight suggestions toward what you care about.",
    options: ["Locally sourced", "Seasonal eating", "Organic when possible", "Reducing meat", "Minimal food waste", "Ethical sourcing", "Not a priority for me"],
    optional: true,
  },
  {
    id: "presentation", section: "Habits & values", eyebrow: "ON THE PLATE",
    title: "How should food look?", type: "single", key: "presentation",
    text: "From rustic and generous to restaurant-neat.",
    options: ["Rustic & unpretentious", "Homely & generous", "Neat & considered", "Restaurant quality", "Photogenic"],
    optional: true,
  },
  {
    id: "ranking-preference", section: "Habits & values", eyebrow: "HOW MOODY RANKS",
    title: "When Moody picks, what matters most?", type: "single", key: "rankingPreference",
    text: "Your default tie-breaker when several recipes fit. You can re-sort any search.",
    options: ["Most popular", "Healthiest", "Quickest", "Most protein", "Surprise me"],
  },
  {
    id: "novelty", section: "Habits & values", eyebrow: "ADVENTURE DIAL",
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

// Static references the deep profiler exposes for richer rendering.
export { cookingMoodLabels, skillLabels };

export type ProfileValue = Profile[keyof Profile];
