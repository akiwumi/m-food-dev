import type { Recipe } from "./data";

export const MAX_POST_IMAGES = 6;

export type PostImageSource = {
  image?: string;
  images?: string[];
  recipeId?: string;
  recipeRef?: string;
};

export function normalizePostImages(images: string[], max = MAX_POST_IMAGES): string[] {
  return images.filter(Boolean).slice(0, max);
}

export function postDisplayImages(post: PostImageSource, recipe?: Recipe): string[] {
  const uploaded = normalizePostImages(post.images?.length ? post.images : post.image ? [post.image] : []);
  if (uploaded.length) return uploaded;
  return recipe?.image ? [recipe.image] : [];
}
