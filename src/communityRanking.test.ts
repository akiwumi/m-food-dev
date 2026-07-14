import { describe, expect, it } from "vitest";
import type { Recipe } from "./data";
import type { FeedPost } from "./community";
import { defaultProfile } from "./store";
import { rankTrendingRecipes } from "./communityRanking";

const recipe = (id: string, title: string, overrides: Partial<Recipe> = {}): Recipe => ({
  id,
  title,
  image: `/${id}.jpg`,
  time: 25,
  difficulty: "Easy",
  calories: 450,
  moods: ["Cozy"],
  reason: "A reliable dinner.",
  ingredients: ["tomato", "rice"],
  steps: [{ text: "Cook it." }],
  cuisine: "Italian",
  mealTypes: ["dinner"],
  diets: ["Vegetarian"],
  allergens: [],
  equipment: ["Stovetop"],
  status: "published",
  ...overrides,
});

const post = (id: string, recipeRef: string, overrides: Partial<FeedPost> = {}): FeedPost => ({
  id,
  authorId: "friend",
  authorName: "Friend",
  authorAvatar: "",
  body: "Made this tonight",
  image: "",
  recipeRef,
  recipeTitle: recipeRef,
  visibility: "public",
  createdAt: "2026-07-14T12:00:00.000Z",
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
  reactionCounts: { like: 0, love: 0, applaud: 0 },
  ...overrides,
});

describe("rankTrendingRecipes", () => {
  it("excludes unsafe and permanently dismissed recipes", () => {
    const catalog = [
      recipe("safe", "Tomato rice"),
      recipe("allergen", "Peanut bowl", { allergens: ["Peanut"], ingredients: ["peanut", "rice"] }),
      recipe("dismissed", "Mushroom pasta"),
    ];
    const profile = { ...defaultProfile, diet: "Vegetarian", allergies: ["Peanut"], equipment: ["Stovetop"] };

    const ranked = rankTrendingRecipes([post("p1", "allergen"), post("p2", "dismissed")], catalog, profile, new Set(["dismissed"]));

    expect(ranked.map(item => item.recipe.id)).toEqual(["safe"]);
  });

  it("uses reactions, comments, and recency to rank community dishes", () => {
    const catalog = [recipe("quiet", "Quiet pasta"), recipe("popular", "Popular pasta")];
    const posts = [
      post("old", "quiet", { createdAt: "2026-06-01T12:00:00.000Z", reactionCounts: { like: 2, love: 0, applaud: 0 } }),
      post("new", "popular", { reactionCounts: { like: 5, love: 4, applaud: 3 }, commentCount: 6 }),
    ];

    const ranked = rankTrendingRecipes(
      posts,
      catalog,
      { ...defaultProfile, cuisines: ["Thai"], proteins: [], vegetables: [], carbs: [], comfortFoods: [], mealTypes: [], weeknightTime: "", equipment: ["Stovetop"] },
      new Set(),
      5,
      new Date("2026-07-14T18:00:00.000Z"),
    );

    expect(ranked[0].recipe.id).toBe("popular");
    expect(ranked[0].communityPosts).toBe(1);
    expect(ranked[0].reason).toBe("Popular in your community");
  });

  it("uses onboarding cuisine and ingredient choices as a relevance signal", () => {
    const catalog = [
      recipe("generic", "Generic pasta", { cuisine: "Italian", ingredients: ["pasta", "tomato"] }),
      recipe("thai", "Thai tofu bowl", { cuisine: "Thai", ingredients: ["tofu", "broccoli", "rice"] }),
    ];
    const profile = {
      ...defaultProfile,
      cuisines: ["Thai"],
      proteins: ["Tofu"],
      vegetables: ["Broccoli"],
      comfortFoods: ["Rice or noodle bowls"],
      equipment: ["Stovetop"],
    };

    const ranked = rankTrendingRecipes([post("p1", "generic"), post("p2", "thai")], catalog, profile, new Set());

    expect(ranked[0].recipe.id).toBe("thai");
    expect(ranked[0].reason).toBe("Popular and picked for you");
  });

  it("fills a quiet community rail from the safe catalog", () => {
    const catalog = [recipe("a", "A"), recipe("b", "B"), recipe("c", "C")];

    const ranked = rankTrendingRecipes([], catalog, { ...defaultProfile, equipment: ["Stovetop"] }, new Set(), 2);

    expect(ranked).toHaveLength(2);
    expect(ranked.every(item => item.communityPosts === 0)).toBe(true);
  });

  it("keeps community candidates ahead of catalog fallback", () => {
    const catalog = [
      recipe("community", "Community dish", { cuisine: "Italian" }),
      recipe("fallback", "Thai tofu breakfast", { cuisine: "Thai", mealTypes: ["breakfast"], ingredients: ["tofu", "rice"] }),
    ];
    const profile = { ...defaultProfile, cuisines: ["Thai"], proteins: ["Tofu"], mealTypes: ["Breakfast"], equipment: ["Stovetop"] };
    const ranked = rankTrendingRecipes([post("p1", "community")], catalog, profile, new Set(), 2);
    expect(ranked.map(item => item.recipe.id)).toEqual(["community", "fallback"]);
  });

  it("uses preferred meal types to order catalog fallback", () => {
    const catalog = [
      recipe("dinner", "Dinner rice", { mealTypes: ["dinner"] }),
      recipe("breakfast", "Breakfast rice", { mealTypes: ["breakfast"] }),
    ];
    const profile = { ...defaultProfile, cuisines: [], proteins: [], vegetables: [], carbs: [], comfortFoods: [], mealTypes: ["Breakfast"], equipment: ["Stovetop"] };
    expect(rankTrendingRecipes([], catalog, profile, new Set(), 2)[0].recipe.id).toBe("breakfast");
  });

  it("keeps legacy relative timestamps from producing NaN scores", () => {
    const ranked = rankTrendingRecipes([post("p1", "legacy", { createdAt: "Just now" })], [recipe("legacy", "Legacy post")], { ...defaultProfile, equipment: ["Stovetop"] }, new Set());
    expect(Number.isFinite(ranked[0].score)).toBe(true);
  });
});
