import type { FeedPost } from "./community";
import type { Recipe } from "./data";
import { safeRecipes } from "./recommendation";
import type { Profile } from "./store";

export type TrendingRecipe = {
  recipe: Recipe;
  score: number;
  communityPosts: number;
  reason: "Popular and picked for you" | "Popular in your community" | "Picked from your food profile" | "Trending now";
};

const normalize = (value: string) => value.trim().toLowerCase();
const recipeText = (recipe: Recipe) => normalize(`${recipe.title} ${recipe.ingredients.join(" ")} ${recipe.reason}`);
const includesTerm = (text: string, value: string) => {
  const term = normalize(value).replace(/\s*\([^)]*\)/g, "").split("/")[0].trim();
  return term.length > 1 && text.includes(term);
};

function respectsFoodRules(recipe: Recipe, profile: Profile): boolean {
  const text = recipeText(recipe);
  if (profile.dislikedIngredients.some(item => includesTerm(text, item))) return false;

  const practices = profile.dietReligious.map(normalize).join(" ");
  if ((practices.includes("no pork") || practices.includes("halal") || practices.includes("kosher")) && /\b(pork|bacon|ham|prosciutto|lard)\b/.test(text)) return false;
  if ((practices.includes("no beef") || practices.includes("hindu")) && /\b(beef|steak|veal)\b/.test(text)) return false;
  if (practices.includes("no alcohol") || practices.includes("halal")) {
    if (/\b(wine|beer|ale|lager|brandy|rum|vodka|whisky|whiskey|mirin)\b/.test(text)) return false;
  }
  if (practices.includes("kosher") && /\b(shellfish|prawn|shrimp|crab|lobster|mussel|clam|oyster|scallop)\b/.test(text)) return false;
  if (practices.includes("jain") && /\b(onion|garlic|potato|carrot|beetroot|radish|ginger)\b/.test(text)) return false;
  return true;
}

const COMFORT_TERMS: Record<string, string[]> = {
  "pasta": ["pasta", "spaghetti", "noodle"],
  "soup or stew": ["soup", "stew", "broth"],
  "rice or noodle bowls": ["rice", "noodle", "bowl"],
  "curry": ["curry", "masala"],
  "fresh & light": ["salad", "fresh", "light"],
  "cheesy dishes": ["cheese", "parmesan", "mozzarella"],
};

function profileAffinity(recipe: Recipe, profile: Profile): number {
  const text = recipeText(recipe);
  let score = profile.cuisines.some(cuisine => normalize(cuisine) === normalize(recipe.cuisine)) ? 10 : 0;
  score += Math.min(6, profile.proteins.filter(item => includesTerm(text, item)).length * 3);
  score += Math.min(4, profile.vegetables.filter(item => includesTerm(text, item)).length * 2);
  score += Math.min(4, profile.carbs.filter(item => includesTerm(text, item)).length * 2);

  for (const comfort of profile.comfortFoods) {
    const terms = COMFORT_TERMS[normalize(comfort)] ?? [normalize(comfort)];
    if (terms.some(term => text.includes(term))) score += 3;
  }

  const profileMoods = profile.cookingMoods.map(normalize);
  if (recipe.moods.some(mood => profileMoods.includes(normalize(mood)))) score += 2;
  const timeBudget = Number(profile.weeknightTime.match(/\d+/)?.[0] ?? 0);
  if (timeBudget > 0 && recipe.time <= timeBudget) score += 2;
  if (recipe.difficulty === "Easy" && /beginner|learning|simple/i.test(profile.skill)) score += 2;
  return score;
}

function postPopularity(post: FeedPost, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - new Date(post.createdAt).getTime()) / 86_400_000);
  const recency = Math.max(0, 8 - ageDays / 3);
  const reactions = post.reactionCounts.like + post.reactionCounts.love * 2 + post.reactionCounts.applaud * 1.5;
  return 8 + reactions + post.commentCount * 2 + recency;
}

export function rankTrendingRecipes(
  posts: FeedPost[],
  catalog: Recipe[],
  profile: Profile,
  dismissedIds: ReadonlySet<string>,
  count = 8,
  now = new Date(),
): TrendingRecipe[] {
  const eligible = safeRecipes(catalog, profile)
    .filter(recipe => !dismissedIds.has(recipe.id) && respectsFoodRules(recipe, profile));
  const eligibleById = new Map(eligible.map(recipe => [recipe.id, recipe]));
  const popularity = new Map<string, { score: number; posts: number }>();

  for (const post of posts) {
    if (!post.recipeRef || !eligibleById.has(post.recipeRef)) continue;
    const current = popularity.get(post.recipeRef) ?? { score: 0, posts: 0 };
    current.score += postPopularity(post, now);
    current.posts += 1;
    popularity.set(post.recipeRef, current);
  }

  return eligible
    .map(recipe => {
      const community = popularity.get(recipe.id) ?? { score: 0, posts: 0 };
      const affinity = profileAffinity(recipe, profile);
      const reason = community.posts > 0
        ? affinity >= 6 ? "Popular and picked for you" : "Popular in your community"
        : affinity >= 6 ? "Picked from your food profile" : "Trending now";
      return { recipe, score: community.score + affinity, communityPosts: community.posts, reason } as TrendingRecipe;
    })
    .sort((a, b) => b.score - a.score || b.communityPosts - a.communityPosts || a.recipe.title.localeCompare(b.recipe.title))
    .slice(0, Math.max(0, count));
}
