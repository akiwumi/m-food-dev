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
  steps: { text: string; timer?: number; active?: string[] }[];
  cuisine: string;
  diets: string[];
  allergens: string[];
  equipment: string[];
  status: "published" | "review" | "draft";
};

export const recipes: Recipe[] = [
  {
    id: "green-pasta",
    title: "Lemony Green Pasta",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=85",
    time: 25, difficulty: "Easy", calories: 620, moods: ["Tired", "Cozy", "Happy"],
    reason: "Low-effort, comforting, and bright enough to lift the evening.",
    cuisine: "Italian", diets: ["Vegetarian"], allergens: ["Gluten", "Dairy"], equipment: ["Stovetop"], status: "published",
    ingredients: ["200g spaghetti", "2 cups baby spinach", "1 lemon", "2 cloves garlic", "80g frozen peas", "40g parmesan"],
    steps: [
      { text: "Bring a large pan of salted water to a boil." },
      { text: "Cook the spaghetti until just tender.", timer: 600, active: ["Spaghetti"] },
      { text: "Gently fry the garlic, then add peas and a splash of pasta water.", timer: 180, active: ["Garlic", "Peas"] },
      { text: "Stir in spinach until glossy, then add lemon.", timer: 240, active: ["Spinach", "Lemon", "Pasta water"] },
      { text: "Toss through the pasta and parmesan. Taste, season, and serve." },
    ],
  },
  {
    id: "chicken-bowl",
    title: "Herb Chicken Quinoa Bowl",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=85",
    time: 30, difficulty: "Easy", calories: 540, moods: ["Focused", "Happy", "Energised"],
    reason: "Fresh, protein-rich, and satisfying without feeling heavy.",
    cuisine: "Mediterranean", diets: ["High protein"], allergens: [], equipment: ["Stovetop"], status: "published",
    ingredients: ["2 chicken breasts", "150g quinoa", "Cherry tomatoes", "Baby spinach", "1 lemon", "Fresh herbs"],
    steps: [
      { text: "Cook the quinoa in salted water until fluffy.", timer: 900 },
      { text: "Season and pan-fry the chicken until golden and cooked through.", timer: 720 },
      { text: "Halve the tomatoes and dress the greens with lemon." },
      { text: "Slice the chicken and build your bowl." },
    ],
  },
  {
    id: "tomato-soup",
    title: "Creamy Tomato Basil Soup",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=85",
    time: 25, difficulty: "Easy", calories: 430, moods: ["Tired", "Stressed", "Cozy", "Sad"],
    reason: "Warming, familiar, and mostly hands-off once it starts bubbling.",
    cuisine: "Italian", diets: ["Vegetarian", "Gluten-free"], allergens: ["Dairy"], equipment: ["Stovetop", "Blender"], status: "published",
    ingredients: ["400g canned tomatoes", "1 onion", "2 cloves garlic", "500ml vegetable stock", "Fresh basil", "Greek yogurt"],
    steps: [
      { text: "Soften the onion and garlic in olive oil.", timer: 300 },
      { text: "Add tomatoes and stock, then simmer gently.", timer: 900 },
      { text: "Blend until smooth and stir through basil." },
      { text: "Finish with a spoonful of yogurt and black pepper." },
    ],
  },
  {
    id: "sweet-potato",
    title: "Smoky Sweet Potato Tacos",
    image: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=1200&q=85",
    time: 35, difficulty: "Medium", calories: 590, moods: ["Adventurous", "Celebratory", "Happy"],
    reason: "Colorful, crunchy, and hands-on when cooking sounds like a reset.",
    cuisine: "Mexican", diets: ["Vegetarian", "Gluten-free"], allergens: ["Dairy"], equipment: ["Oven"], status: "published",
    ingredients: ["2 sweet potatoes", "1 can black beans", "8 corn tortillas", "Red cabbage", "1 lime", "Greek yogurt"],
    steps: [
      { text: "Dice and season the sweet potato." },
      { text: "Roast until caramelized at the edges.", timer: 1200 },
      { text: "Warm the beans and shred the cabbage." },
      { text: "Fill warm tortillas and finish with lime yogurt." },
    ],
  },
];

export const moods = ["Tired", "Stressed", "Energised", "Cozy", "Celebratory", "Focused", "Adventurous", "Sad", "Happy"];
