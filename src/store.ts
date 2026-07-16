import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export type Profile = {
  name: string; email: string; onboarded: boolean; path: "quick" | "standard";
  diet: string; allergies: string[]; skill: string; cuisines: string[];
  equipment: string[]; moodNeeds: Record<string, string>; servings: number;
  foodRelationship: string;
  comfortCues: string[];
  avoidCues: string[];
  sensoryCues: string[];
  cookingMotivation: string;
  novelty: number;
  // --- Deep food-psychology profile (FCQ + TFEQ + taste-phenotype grounded) ---
  dislikedIngredients: string[];   // never-serve, non-allergen
  flavorLikes: string[];           // taste phenotype: flavors drawn to
  flavorAvoids: string[];          // flavors that put them off
  textureLikes: string[];          // mouthfeel preferences
  textureAvoids: string[];         // texture aversions (picky-eating signal)
  spiceTolerance: number;          // 0-100 heat tolerance
  proteins: string[];              // preferred proteins
  vegetables: string[];            // vegetables reached for
  carbs: string[];                 // preferred carb bases
  foodValues: string[];            // FCQ motives driving food choice
  cookingMotivations: string[];    // why they cook (multi)
  eatingHabits: string[];          // TFEQ-style behavioral patterns
  emotionalTriggers: string[];     // emotional-eating triggers
  comfortFoods: string[];          // go-to comfort categories
  cookingFor: string[];            // who shares the table
  weeknightTime: string;           // typical time budget
  planningStyle: string[];         // how they plan/shop
  nutritionGoals: string[];        // what they're working toward
  // --- Deep profiler: mood, palate depth, kitchen, habits & values ---
  cookingMoods: string[];          // the cooking headspaces that resonate
  moodContext: Record<string, string>;  // answers to mood-psychology questions
  dietReligious: string[];         // religious / ethical food practice (hard rules)
  spiceTypes: string[];            // which kinds of heat are enjoyed
  ingredientPhilosophy: string[];  // quality-vs-pantry, fresh, fermentation...
  pantryStaples: string[];         // what's reliably in the cupboard
  confidenceBlockers: string[];    // what makes cooking feel hard
  cookingMethods: string[];        // how they like to cook (vs equipment owned)
  typicalTime: string[];           // habitual time bands (multi)
  eatingPattern: string;           // three-meals, IF, grazing...
  eatingSpeed: string;             // fast / mindful eater
  mealTypes: string[];             // which meals they want help with
  occasions: string[];             // everyday, dinner-party, BBQ, holiday...
  diningStyle: string[];           // solo, family-table, desk, sofa...
  leftoverHabits: string[];        // love-leftovers, reinvent, freeze...
  wasteApproach: string[];         // root-to-tip, stock-scraps, compost...
  budget: string;                  // per-meal budget band
  inspirationSources: string[];    // where cooking inspiration comes from
  sustainability: string[];        // local, seasonal, reducing-meat...
  presentation: string;            // rustic, restaurant-quality...
  rankingPreference: string;       // what to optimise picks for -> Spoonacular sort
  plan: string;                    // chosen subscription: annual | quarterly | monthly
  photoLogs: import("./foodAnalysis").FoodPhoto[];  // meal photo + nutrition logs
  // --- Quick aha activation lifecycle ---
  quickStartCompleted: boolean;
  firstPickViewed: boolean;
  activationPaywallSeen: boolean;
  quickStartSafetyConfirmed: boolean;
  // --- Account + subscription lifecycle ---
  accountCreated: boolean;
  emailVerified: boolean;
  trialStartedAt: string;          // ISO date, "" when no trial
  trialEndsAt: string;             // ISO date
  subscriptionStatus: "none" | "trialing" | "active" | "canceled";
  inviteCode: string;              // code that was redeemed, "" if none
  inviteSubEnd: string;            // ISO date the invite subscription ends, "" if none
  avatar: string;
  bio: string;
  location: string;
  profileVisibility: "connections" | "public" | "private";
  shareCookedMeals: boolean;
  communityPostNotifications: boolean;
};

export const defaultProfile: Profile = {
  name: "", email: "", onboarded: false, path: "standard", diet: "Everything",
  allergies: [], skill: "Comfortable", cuisines: ["Italian", "Mediterranean"],
  equipment: ["Stovetop", "Oven"], moodNeeds: {}, servings: 2,
  foodRelationship: "I want dinner to feel supportive, not like another task.",
  comfortCues: ["Warm", "Familiar", "One-pot"],
  avoidCues: ["Too many dishes", "Long prep"],
  sensoryCues: ["Creamy", "Bright"],
  cookingMotivation: "Restore my energy",
  novelty: 45,
  dislikedIngredients: [],
  flavorLikes: ["Savory/Umami", "Herby/Fresh"],
  flavorAvoids: [],
  textureLikes: ["Creamy", "Hearty/Chunky"],
  textureAvoids: [],
  spiceTolerance: 40,
  proteins: ["Chicken", "Beans/Lentils", "Eggs"],
  vegetables: ["Leafy greens", "Tomatoes"],
  carbs: ["Pasta", "Rice"],
  foodValues: ["Tastes amazing", "Quick & convenient", "Lifts my mood"],
  cookingMotivations: ["Restore my energy"],
  eatingHabits: ["I love leftovers"],
  emotionalTriggers: ["Stress", "Tiredness"],
  comfortFoods: ["Pasta", "Soup or stew"],
  cookingFor: ["Just me"],
  weeknightTime: "30 min",
  planningStyle: ["Decide same day"],
  nutritionGoals: ["Balanced meals", "More vegetables"],
  cookingMoods: ["Comfort", "Tired", "Nourish"],
  moodContext: {},
  dietReligious: [],
  spiceTypes: [],
  ingredientPhilosophy: [],
  pantryStaples: [],
  confidenceBlockers: [],
  cookingMethods: ["Stovetop", "Oven baking"],
  typicalTime: ["15–30 min"],
  eatingPattern: "Three meals a day",
  eatingSpeed: "Moderate pace",
  mealTypes: ["Dinner"],
  occasions: ["Everyday weeknight"],
  diningStyle: [],
  leftoverHabits: [],
  wasteApproach: [],
  budget: "Moderate",
  inspirationSources: [],
  sustainability: [],
  presentation: "Homely & generous",
  rankingPreference: "Most popular",
  plan: "annual",
  photoLogs: [],
  quickStartCompleted: false,
  firstPickViewed: false,
  activationPaywallSeen: false,
  quickStartSafetyConfirmed: false,
  accountCreated: false,
  emailVerified: false,
  trialStartedAt: "",
  trialEndsAt: "",
  subscriptionStatus: "none",
  inviteCode: "",
  inviteSubEnd: "",
  avatar: "",
  bio: "",
  location: "",
  profileVisibility: "connections",
  shareCookedMeals: true,
  communityPostNotifications: true,
};

export type ReactionKind = "like" | "love" | "applaud";
export type ReactionCounts = Record<ReactionKind, string[]>;

export type SocialPost = {
  id: string; author: string; avatar: string; text: string; image: string;
  images?: string[];
  recipeId?: string; createdAt: string;
  likes?: string[];
  reactions?: ReactionCounts;
  comments: { author: string; avatar?: string; text: string }[];
};

export type Diner = {
  id: string; name: string; relationship: string; diet: string; allergies: string[];
};

export const defaultDiners: Diner[] = [
  { id: "self", name: "Just me", relationship: "You", diet: "Everything", allergies: [] },
];

export function readStored<T>(key: string, initial: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "") as T; }
  catch { return initial; }
}

export function writeStored(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch {
    console.warn(`MoodFood could not persist ${key}. Browser storage may be unavailable or full.`);
    // Surface how close to the quota we are, so an exhaustion is diagnosable
    // (once per session) rather than silently swallowed.
    reportStorageEstimate("quota-exceeded");
  }
}

// One-time (per session) storage-usage probe. Logs the usage/quota ratio so a
// near-full localStorage is visible before writes start failing. `reason` marks
// whether it ran proactively at startup or after a failed write.
let storageEstimateReported = false;
export function reportStorageEstimate(reason: "startup" | "quota-exceeded" = "startup") {
  if (storageEstimateReported && reason === "startup") return;
  storageEstimateReported = true;
  try {
    void navigator.storage?.estimate?.().then(({ usage, quota }) => {
      if (usage == null || !quota) return;
      const pct = Math.round((usage / quota) * 100);
      if (reason === "quota-exceeded" || pct >= 80) {
        console.warn(`MoodFood storage at ~${pct}% (${Math.round(usage / 1024)}KB of ~${Math.round(quota / 1024)}KB, ${reason}).`);
      }
    });
  } catch { /* storage.estimate unsupported — nothing to report */ }
}

export function clearStored(key: string) {
  try { localStorage.removeItem(key); }
  catch { console.warn(`MoodFood could not clear ${key}. Browser storage may be unavailable.`); }
}

export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStored(key, initial));
  const valueRef = useRef(value);
  valueRef.current = value;
  // Debounce persistence: coalesce bursts of changes (e.g. every keystroke into a
  // token input) into a single write ~300 ms later, instead of stringifying +
  // writing on each change.
  useEffect(() => {
    const t = setTimeout(() => writeStored(key, value), 300);
    return () => clearTimeout(t);
  }, [key, value]);
  // Never lose a pending debounced write: flush the latest value synchronously on
  // unmount and on tab close / refresh.
  useEffect(() => {
    const flush = () => writeStored(key, valueRef.current);
    window.addEventListener("beforeunload", flush);
    return () => { window.removeEventListener("beforeunload", flush); flush(); };
  }, [key]);
  return [value, setValue] as readonly [T, Dispatch<SetStateAction<T>>];
}
