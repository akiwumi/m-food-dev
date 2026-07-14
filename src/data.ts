export type RecipeStep = {
  text: string;
  title?: string;
  detail?: string;
  cue?: string;
  image?: string;
  timer?: number;
  active?: string[];
  equipment?: string[];
};

export type RecipeTags = {
  mood?: string[];
  effort?: string[];
  sensory?: string[];
  nutrition?: string[];
  occasion?: string[];
  cookingStyle?: string[];
};

export type Recipe = {
  id: string;
  title: string;
  image: string;
  time: number;
  difficulty: "Easy" | "Medium";
  calories: number;
  moods: string[];
  reason: string;
  ingredients: string[];
  steps: RecipeStep[];
  cuisine: string;
  mealTypes?: string[];
  diets: string[];
  allergens: string[];
  equipment: string[];
  status: "published" | "review" | "draft";
  tags?: RecipeTags;
  video?: string;        // YouTube embed URL when a cooking video is available
  sourceUrl?: string;    // original recipe URL (for attribution / full method)
  provider?: "Spoonacular" | "TheMealDB";
};

export const moods = [
  "Tired", "Stressed", "Happy", "Romantic",
  "Healthy", "Focused",
];

// ─── Cooking moods (deep profiler) ─────────────────────────────────────────────
// The 14 headspaces a person cooks from. Selected during onboarding so Moody
// understands HOW someone relates to cooking. `aiSignal` is fed verbatim into the
// recipe-curation prompt, so each selected mood actively steers suggestions.
export type CookingMood = {
  id: string; emoji: string; label: string; tagline: string;
  what: string; descriptors: string[]; vibes: string[]; timeHint: string; aiSignal: string;
};

export const cookingMoods: CookingMood[] = [
  { id: "nourish", emoji: "🌿", label: "Nourish", tagline: "I want to feed my body well",
    what: "You're thinking about your body and what it actually needs. This isn't about restriction, it's about intention. You want to feel better after eating than before.",
    descriptors: ["I'm thinking about what my body actually needs right now", "Nutrition matters more than indulgence today", "I want to feel energised and light after eating", "Fresh, whole ingredients feel important right now"],
    vibes: ["Balanced", "Wholesome", "Energising", "Clean"], timeHint: "Happy to spend 30–60 mins",
    aiSignal: "Prioritise nutritionally dense, Mediterranean-leaning meals: plenty of vegetables and leafy greens, whole grains, legumes, oily fish or other omega-3 sources, and lean proteins, with flavour from herbs and spices rather than fat or sugar." },
  { id: "comfort", emoji: "🫂", label: "Comfort", tagline: "I need something that feels like a hug",
    what: "You're reaching for food as warmth. You want familiarity, softness, and the kind of satisfaction that settles you.",
    descriptors: ["I want warmth, richness, and something deeply familiar", "Something hearty that fills me up properly", "No risk, no experiment, just reliable deliciousness", "Sauces, stews, melted cheese, yes to all of it"],
    vibes: ["Warm", "Rich", "Familiar", "Hearty"], timeHint: "Worth spending up to an hour",
    aiSignal: "Prioritise slow-cooked dishes, rich sauces, one-pot meals, pasta, rice dishes, soups, stews. Familiar over novel." },
  { id: "tired", emoji: "😮‍💨", label: "Tired", tagline: "I have almost no energy for this",
    what: "You need to eat but cooking feels like a mountain. Energy is low. The fewer steps, decisions, and washing up, the better.",
    descriptors: ["I'm running on empty and cooking feels like a chore", "I need minimum effort but still want something real", "The fewer ingredients and steps the better", "One pan, one pot, or no cooking at all"],
    vibes: ["Effortless", "Simple", "Low-decision", "Filling"], timeHint: "15 minutes or less ideally",
    aiSignal: "Suggest 5-ingredient max recipes, one-pan meals, no-cook options, toast-based meals, eggs, leftovers transformation. Lean on steady-energy staples (eggs, oats, wholegrain toast, beans) over sugary quick-fixes that cause an energy crash. Never suggest anything complex." },
  { id: "stressed", emoji: "🌀", label: "Stressed", tagline: "My mind is full, food needs to be simple or therapeutic",
    what: "Stress changes what food means. Some cook to decompress; others just need something fast. This mood captures both.",
    descriptors: ["My head is full and I don't want food to be another decision", "I either want something dead simple, or cooking to help me switch off", "Repetitive tasks like chopping actually help me decompress", "Comfort food with a short ingredients list is the sweet spot"],
    vibes: ["Grounding", "Soothing", "Low-stakes", "Savoury"], timeHint: "Under 20 min, or a meditative 45 min",
    aiSignal: "Either very fast low-decision meals, OR simple repetitive-process cooking (bread, pasta from scratch, stir-fry) that is meditative without being technically demanding. Favour steady-energy wholegrains, oily fish, leafy greens and other magnesium-rich foods; go easy on caffeine and heavy added sugar." },
  { id: "sad", emoji: "🌧️", label: "Low / Sad", tagline: "I need food that holds me gently",
    what: "When you're feeling low, food can be a small act of self-care. Soft textures, familiar flavours, warm temperatures.",
    descriptors: ["I want to be looked after, even just by what I eat", "Soft, warm, gentle food, nothing harsh", "I might not have much appetite but I know I should eat", "Something that feels like someone made it for me"],
    vibes: ["Gentle", "Soft", "Nurturing", "Kind"], timeHint: "Easy and uncomplicated",
    aiSignal: "Soft, warm, unchallenging food. Think soup, porridge, congee, simple pasta, scrambled eggs, warm toast with good toppings. Where it still feels gentle, lean toward nourishing whole foods — oats, eggs, oily fish, vegetables — over ultra-processed or very sugary options. Never suggest difficult recipes." },
  { id: "quick", emoji: "⚡", label: "Quick Fix", tagline: "I need food. Fast.",
    what: "You're hungry and you want to eat now. You're busy, or you left it too late. Speed is the primary variable.",
    descriptors: ["I'm genuinely hungry and there's no time to faff", "Under 20 minutes or I'm ordering takeaway", "Minimal washing up is non-negotiable", "I probably have what I need already"],
    vibes: ["Urgent", "Efficient", "No-fuss", "Practical"], timeHint: "10–20 minutes maximum",
    aiSignal: "Strictly under 20 minutes. Pantry staples. One or two pans maximum. Highly repeatable meals that become second nature." },
  { id: "creative", emoji: "🎨", label: "Creative", tagline: "I want to make something interesting",
    what: "You're in the kitchen to explore. The process is as enjoyable as the result. Open to new techniques and ingredients.",
    descriptors: ["I'm in the mood to experiment and try something new", "I enjoy the act of cooking as much as the eating", "I'd love to learn a new technique or flavour combination", "An unfamiliar ingredient or unusual pairing sounds exciting"],
    vibes: ["Experimental", "Curious", "Playful", "Adventurous"], timeHint: "Happy to spend 1–2 hours",
    aiSignal: "Suggest dishes with interesting techniques, lesser-known ingredients, cross-cultural fusions, or recipes the user wouldn't normally reach for. Explain why the dish is interesting." },
  { id: "social", emoji: "🥂", label: "Social / Hosting", tagline: "I'm cooking for other people",
    what: "The food isn't just for you. You're thinking about the collective experience, dietary needs, and how food lands at a table.",
    descriptors: ["The food needs to work for more than just me", "Presentation and shareability matter today", "I'm thinking about dietary preferences in the group", "I want the meal to feel special or generous"],
    vibes: ["Generous", "Impressive", "Communal", "Welcoming"], timeHint: "As long as it takes to do it right",
    aiSignal: "Prioritise scalable recipes, make-ahead dishes, impressive plating, crowd-friendly flavours. Flag dietary adaptability." },
  { id: "indulge", emoji: "✨", label: "Indulge", tagline: "I'm treating myself today",
    what: "No counting, no substitutions, no guilt. Today is about maximum pleasure.",
    descriptors: ["I'm not counting anything, calories, cost, or time", "I want maximum pleasure, minimum compromise", "Something decadent, luscious, or deeply satisfying", "If it involves butter, cream, cheese, or pastry, even better"],
    vibes: ["Decadent", "Luxurious", "Celebratory", "Rich"], timeHint: "Time is no object today",
    aiSignal: "Suggest restaurant-quality recipes, rich sauces, desserts, pastry, anything indulgent and special. Don't suggest lighter alternatives." },
  { id: "mindful", emoji: "🧘", label: "Mindful", tagline: "I want to eat with real intention",
    what: "You're being conscious about what goes into your body and how it makes you feel. Eating slowly and choosing well.",
    descriptors: ["I'm paying close attention to how food makes me feel", "Light but satisfying, nothing that weighs me down", "I want to eat slowly and be present with it", "Simple, clean flavours that don't overwhelm"],
    vibes: ["Light", "Present", "Intentional", "Aware"], timeHint: "30–45 minutes feels right",
    aiSignal: "Suggest clean, ingredient-forward dishes. Avoid heavy sauces. Focus on produce-led cooking, light proteins, and dishes where individual ingredients shine." },
  { id: "nostalgic", emoji: "📻", label: "Nostalgic", tagline: "I want to travel back in time",
    what: "You're reaching for food that holds memory. A dish from childhood, a place you've been, a person who cooked for you.",
    descriptors: ["Something that reminds me of a specific place, person, or time", "The food I grew up with", "I want familiar flavours that feel like a memory", "Recipes passed down, not discovered online"],
    vibes: ["Sentimental", "Timeless", "Rooted", "Cultural"], timeHint: "Happy to take my time with it",
    aiSignal: "Surface traditional, generational, or culturally rooted recipes. Match to the user's cuisine preferences. Avoid trendy or fusion interpretations." },
  { id: "ill", emoji: "🤧", label: "Under the Weather", tagline: "I'm not well and I need gentle food",
    what: "You're sick, recovering, or just not right. Your body needs fuel but appetite is low and tolerance for bold flavours is reduced.",
    descriptors: ["I'm not feeling well and need something gentle", "Appetite is low, small, easy portions", "Easy to digest, nothing heavy, rich, or very spicy", "Warm liquids and soft textures feel most appealing"],
    vibes: ["Soothing", "Gentle", "Bland", "Restorative"], timeHint: "As simple and quick as possible",
    aiSignal: "Broths, congee, soft rice dishes, plain noodles, light soups, toast, steamed vegetables. Nothing that challenges digestion. Temperature-warm preferred." },
  { id: "bored", emoji: "😑", label: "Bored", tagline: "I want something different, I'm in a rut",
    what: "You're tired of eating the same things. You want to be surprised, nudged out of your usual rotation.",
    descriptors: ["I've been eating the same things and I need a change", "I want to be surprised or inspired, not just fed", "Something I wouldn't normally think to make", "I'm open to trying a new cuisine or ingredient"],
    vibes: ["Curious", "Restless", "Open", "Exploratory"], timeHint: "Medium, 30–45 minutes",
    aiSignal: "Actively avoid suggesting dishes the user commonly selects. Introduce new cuisines, unusual ingredients, or familiar dishes with an interesting twist." },
  { id: "focused", emoji: "💪", label: "Performance / Focused", tagline: "Food is fuel right now",
    what: "You're in goal-mode, training, preparing, optimising. Macros, energy, and recovery matter more than pleasure today.",
    descriptors: ["I'm thinking about food as fuel more than enjoyment", "Protein and energy levels matter more than flavour", "I want something that supports what I'm doing", "Quick to prepare, easy to eat, practical"],
    vibes: ["Purposeful", "Efficient", "Fuelling", "Protein-forward"], timeHint: "Quick and efficient, under 30 mins",
    aiSignal: "Prioritise high-protein, complex-carb meals with slow-release energy (wholegrains, legumes) and omega-3 sources for concentration. Include macro estimates. Suggest meal-prep friendly options. Nothing that causes energy crashes." },
];

export const cookingMoodLabels = cookingMoods.map(m => m.label);

// ─── Skill levels (deep profiler) ──────────────────────────────────────────────
export type SkillLevel = { id: string; label: string; emoji: string; desc: string; detail: string };

export const skillLevels: SkillLevel[] = [
  { id: "beginner", label: "Just Starting Out", emoji: "🌱", desc: "I follow recipes closely and avoid complicated techniques. Simple is best.", detail: "Recipes should be clearly written with no assumed knowledge. Techniques explained. Minimal specialist equipment." },
  { id: "competent", label: "Competent Home Cook", emoji: "🍳", desc: "I can cook most things if the recipe is clear. I'm building confidence.", detail: "Standard techniques are fine. Can handle pastry, stocks, some baking. Occasional new technique is welcome." },
  { id: "adventurous", label: "Adventurous Cook", emoji: "🔥", desc: "I improvise, substitute, and enjoy a challenge. I read recipes for inspiration.", detail: "Suggest dishes with interesting techniques, less common ingredients, or complex flavours." },
  { id: "experienced", label: "Experienced / Skilled", emoji: "⭐", desc: "This is a genuine passion. I cook from memory and develop my own recipes.", detail: "Can handle any technique. Interested in precision, depth of flavour, and the science behind cooking." },
  { id: "professional", label: "Professional / Trained", emoji: "👨‍🍳", desc: "I have formal training or work / have worked in food.", detail: "Shorthand language fine. Can handle any complexity. More interested in nuance, sourcing, and technique refinement." },
];

export const skillLabels = skillLevels.map(s => s.label);
