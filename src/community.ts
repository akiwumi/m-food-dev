import { supabase } from "./supabase";

// Real, multi-user community data layer backed by Supabase (migration 018).
// Reads go through SECURITY DEFINER RPCs so the social-graph rules (friends can
// see each other's 'connections' posts) are enforced server-side; writes are
// plain RLS inserts of the caller's own rows. Every call degrades to a safe
// empty result when Supabase isn't configured or the user isn't signed in, so
// callers can fall back to the local (pilot) feed. See CommunityScreen.

export type Relationship = "self" | "none" | "pending_out" | "pending_in" | "friends";
export type UserResult = { id: string; name: string; avatar: string; relationship: Relationship };
export type Friend = { id: string; name: string; avatar: string };
export type FriendRequest = { id: string; name: string; avatar: string; direction: "incoming" | "outgoing" };
export type FeedPost = {
  id: string; authorId: string; authorName: string; authorAvatar: string;
  body: string; image: string; images?: string[]; recipeRef?: string; recipeTitle?: string; visibility: string; createdAt: string;
  likeCount: number; likedByMe: boolean; commentCount: number;
  reactionCounts: Record<PostReaction, number>; myReaction?: PostReaction;
};
export type FeedComment = { id: string; authorId: string; authorName: string; authorAvatar: string; body: string; createdAt: string };
export type PostReaction = "like" | "love" | "applaud";

export type PostVisibility = "connections" | "public";
const POST_IMAGES = "post-images";
const AVATARS = "avatars";
const MAX_POST_IMAGES = 6;

// Community is only "real" (multi-user) when a Supabase client exists AND the
// user is signed in. Otherwise callers keep the local pilot feed.
async function session() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function communityReady(): Promise<boolean> {
  return (await session()) !== null;
}

// Upload the user's profile photo to the public avatars bucket and return its
// public URL (stored in profiles.avatar_url so it shows in search + the feed).
// Returns "" when there's no backend/session or the upload fails.
export async function uploadAvatar(dataUrl: string): Promise<string> {
  const s = await session();
  if (!supabase || !s || !dataUrl.startsWith("data:")) return "";
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${s.user.id}/avatar-${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(AVATARS).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
    if (error) return "";
    return supabase.storage.from(AVATARS).getPublicUrl(path).data.publicUrl ?? "";
  } catch {
    return "";
  }
}

function publicUrl(path: string | null | undefined): string {
  if (!path || !supabase) return "";
  return supabase.storage.from(POST_IMAGES).getPublicUrl(path).data.publicUrl ?? "";
}

function publicUrls(paths: string[]): string[] {
  return paths.map(publicUrl).filter(Boolean);
}

// ── People search + friends ────────────────────────────────────────────────
export async function searchUsers(query: string): Promise<UserResult[]> {
  const q = query.trim();
  if (!supabase || !q) return [];
  const { data, error } = await supabase.rpc("search_users", { q });
  if (error || !data) return [];
  return (data as Row[]).map(r => ({ id: str(r.id), name: str(r.display_name), avatar: str(r.avatar_url), relationship: (str(r.relationship) || "none") as Relationship }));
}

export async function sendFriendRequest(target: string): Promise<void> {
  await supabase?.rpc("send_friend_request", { target });
}
export async function respondFriendRequest(requester: string, accept: boolean): Promise<void> {
  await supabase?.rpc("respond_friend_request", { requester, accept });
}
export async function removeFriend(other: string): Promise<void> {
  await supabase?.rpc("remove_friend", { other });
}

export async function listFriends(): Promise<Friend[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_friends");
  if (error || !data) return [];
  return (data as Row[]).map(r => ({ id: str(r.id), name: str(r.display_name), avatar: str(r.avatar_url) }));
}

export async function listFriendRequests(): Promise<FriendRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_friend_requests");
  if (error || !data) return [];
  return (data as Row[]).map(r => ({ id: str(r.id), name: str(r.display_name), avatar: str(r.avatar_url), direction: str(r.direction) === "outgoing" ? "outgoing" : "incoming" }));
}

// ── Feed + posts ───────────────────────────────────────────────────────────
export async function fetchFeed(limit = 50): Promise<FeedPost[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("community_feed", { limit_n: limit });
  if (error || !data) return [];
  return (data as Row[]).map(r => ({
    id: str(r.id), authorId: str(r.author_id), authorName: str(r.author_name), authorAvatar: str(r.author_avatar),
    body: str(r.body), image: publicUrl(str(r.image_path)), images: publicUrls(arr(r, "image_paths").length ? arr(r, "image_paths") : str(r.image_path) ? [str(r.image_path)] : []),
    recipeRef: r.recipe_ref ? str(r.recipe_ref) : undefined, recipeTitle: r.recipe_title ? str(r.recipe_title) : undefined,
    visibility: str(r.visibility), createdAt: str(r.created_at),
    likeCount: num(r.like_count), likedByMe: !!r.liked_by_me, commentCount: num(r.comment_count),
    reactionCounts: {
      like: num(r.like_reaction_count ?? r.like_count),
      love: num(r.love_reaction_count),
      applaud: num(r.applaud_reaction_count),
    },
    myReaction: reaction(str(r.my_reaction)) ?? (r.liked_by_me ? "like" : undefined),
  }));
}

// Upload a post image (compressed data URL) to the public post-images bucket and
// return its storage path, or "" on failure.
async function uploadPostImage(dataUrl: string, uid: string): Promise<string> {
  if (!supabase || !dataUrl.startsWith("data:")) return "";
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${uid}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(POST_IMAGES).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: false });
    return error ? "" : path;
  } catch {
    return "";
  }
}

export async function createPost(input: { body: string; imageDataUrl?: string; imageDataUrls?: string[]; recipeRef?: string; recipeTitle?: string; visibility?: PostVisibility }): Promise<boolean> {
  const s = await session();
  if (!supabase || !s) return false;
  const sourceImages = (input.imageDataUrls?.length ? input.imageDataUrls : input.imageDataUrl ? [input.imageDataUrl] : []).slice(0, MAX_POST_IMAGES);
  const imagePaths: string[] = [];
  for (const image of sourceImages) {
    const path = await uploadPostImage(image, s.user.id);
    if (path) imagePaths.push(path);
  }
  const image_path = imagePaths[0] ?? null;
  const { data, error } = await supabase.from("community_posts").insert({
    user_id: s.user.id,
    body: input.body || null,
    image_path,
    recipe_ref: input.recipeRef ?? null,
    recipe_title: input.recipeTitle ?? null,
    visibility: input.visibility ?? "connections",
  }).select("id").single();
  if (error) return false;
  if (imagePaths.length && data?.id) {
    await supabase.from("community_post_images").insert(imagePaths.map((path, index) => ({ post_id: data.id, user_id: s.user.id, image_path: path, sort_order: index })));
  }
  return true;
}

export async function setLike(postId: string, liked: boolean): Promise<void> {
  const s = await session();
  if (!supabase || !s) return;
  if (liked) await supabase.from("post_likes").insert({ post_id: postId, user_id: s.user.id });
  else await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", s.user.id);
}

export async function setPostReaction(postId: string, next?: PostReaction): Promise<void> {
  const s = await session();
  if (!supabase || !s) return;
  if (!next) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", s.user.id);
    return;
  }
  await supabase.from("post_likes").upsert({
    post_id: postId,
    user_id: s.user.id,
    reaction: next,
  }, { onConflict: "post_id,user_id" });
}

export async function fetchComments(postId: string): Promise<FeedComment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("post_comments_list", { p_post_id: postId });
  if (error || !data) return [];
  return (data as Row[]).map(r => ({ id: str(r.id), authorId: str(r.author_id), authorName: str(r.author_name), authorAvatar: str(r.author_avatar), body: str(r.body), createdAt: str(r.created_at) }));
}

export async function addComment(postId: string, body: string): Promise<boolean> {
  const s = await session();
  if (!supabase || !s || !body.trim()) return false;
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: s.user.id, body: body.trim() });
  return !error;
}

// ── Friend suggestions (shared food profile) ───────────────────────────────
export type Suggestion = {
  id: string; name: string; avatar: string; sharedCuisines: number;
  sharedMoods?: number; sharedComfortCues?: number; sharedFlavors?: number; compatibilityScore?: number;
};
export async function suggestFriends(): Promise<Suggestion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("suggest_friends");
  if (error || !data) return [];
  return (data as Row[]).map(r => ({
    id: str(r.id), name: str(r.display_name), avatar: str(r.avatar_url),
    sharedCuisines: num(r.shared_cuisines),
    sharedMoods: num(r.shared_moods),
    sharedComfortCues: num(r.shared_comfort_cues),
    sharedFlavors: num(r.shared_flavors),
    compatibilityScore: num(r.compatibility_score),
  }));
}

export type FoodPersonalityCard = {
  phenotype: string;
  comfortCues: string[];
  signatureMoods: string[];
  sharedSignals: string[];
  overlap: string;
  privacyNote: string;
};

export function buildFoodPersonalityCard(foodProfile: Record<string, unknown>, viewerProfile: Record<string, unknown> = {}): FoodPersonalityCard {
  const flavors = arr(foodProfile, "flavorLikes");
  const textures = arr(foodProfile, "textureLikes");
  const cuisines = arr(foodProfile, "cuisines");
  const comfortCues = unique([...arr(foodProfile, "comfortCues"), ...arr(foodProfile, "comfortFoods")]).slice(0, 5);
  const signatureMoods = arr(foodProfile, "cookingMoods").slice(0, 4);
  const phenotypeSignals = unique([...flavors.slice(0, 2), ...textures.slice(0, 1), ...cuisines.slice(0, 1)]);
  const sharedSignals = sharedFoodSignals(foodProfile, viewerProfile).slice(0, 6);

  return {
    phenotype: phenotypeSignals.length ? phenotypeSignals.join(" + ") : "Still learning their flavour rhythm",
    comfortCues: comfortCues.length ? comfortCues : ["Comfort style still private"],
    signatureMoods: signatureMoods.length ? signatureMoods : ["Still calibrating"],
    sharedSignals,
    overlap: sharedSignals.length
      ? `You both lean toward ${naturalList(sharedSignals.slice(0, 3))}.`
      : "Your food rhythms look different enough to swap useful inspiration.",
    privacyNote: "Shared from a curated public food profile; raw mood notes and diary stay private.",
  };
}

export function suggestionCompatibility(s: Suggestion): { label: string; detail: string; signals: string[] } {
  const mood = s.sharedMoods ?? 0;
  const comfort = s.sharedComfortCues ?? 0;
  const flavor = s.sharedFlavors ?? 0;
  const cuisine = s.sharedCuisines ?? 0;
  const profileSignals = mood + comfort + flavor;
  const signals = [
    mood > 0 ? `${mood} mood` : "",
    comfort > 0 ? `${comfort} comfort` : "",
    flavor > 0 ? `${flavor} flavour` : "",
    cuisine > 0 ? `${cuisine} cuisine` : "",
  ].filter(Boolean);

  if (profileSignals > 0) {
    return {
      label: "Mood/profile match",
      detail: `${profileSignals} shared profile signal${profileSignals === 1 ? "" : "s"}`,
      signals,
    };
  }
  if (cuisine > 0) {
    return {
      label: "Cuisine profile match",
      detail: `${cuisine} shared cuisine${cuisine === 1 ? "" : "s"}`,
      signals,
    };
  }
  return { label: "Profile match", detail: "Similar food profile", signals };
}

// ── Recommend-a-friend ──────────────────────────────────────────────────────
export type Recommendation = { recommendedId: string; recommendedName: string; recommendedAvatar: string; recommenderName: string; note: string; relationship: Relationship };
export async function recommendFriend(recommended: string, target: string, note?: string): Promise<void> {
  await supabase?.rpc("recommend_friend", { recommended, target, note: note ?? null });
}
export async function listRecommendations(): Promise<Recommendation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_recommendations");
  if (error || !data) return [];
  return (data as Row[]).map(r => ({
    recommendedId: str(r.recommended_id), recommendedName: str(r.recommended_name), recommendedAvatar: str(r.recommended_avatar),
    recommenderName: str(r.recommender_name), note: str(r.note), relationship: (str(r.relationship) || "none") as Relationship,
  }));
}

// ── A member's profile (food profile + activity) ────────────────────────────
export type MemberProfile = {
  id: string; name: string; avatar: string; bio: string; location: string;
  visibility: string; isFriend: boolean; foodProfile: Record<string, unknown>;
  cookedCount: number; favoriteCount: number;
};
export type MemberRecipe = { recipeRef: string; title: string; image: string; cuisine: string; rating?: number; when: string };

export async function getMemberProfile(target: string): Promise<MemberProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("member_profile", { target });
  const row = (data as Row[] | null)?.[0];
  if (error || !row) return null;
  return {
    id: str(row.id), name: str(row.display_name), avatar: str(row.avatar_url), bio: str(row.bio), location: str(row.location),
    visibility: str(row.visibility), isFriend: !!row.is_friend,
    foodProfile: (row.food_profile && typeof row.food_profile === "object" ? row.food_profile as Record<string, unknown> : {}),
    cookedCount: num(row.cooked_count), favoriteCount: num(row.favorite_count),
  };
}
export async function getMemberCooked(target: string): Promise<MemberRecipe[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("member_cooked", { target });
  if (error || !data) return [];
  return (data as Row[]).map(r => ({ recipeRef: str(r.recipe_ref), title: str(r.recipe_title), image: str(r.recipe_image), cuisine: str(r.cuisine), rating: r.rating == null ? undefined : num(r.rating), when: str(r.cooked_label) || str(r.created_at) }));
}
export async function getMemberFavorites(target: string): Promise<MemberRecipe[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("member_favorites", { target });
  if (error || !data) return [];
  return (data as Row[]).map(r => ({ recipeRef: str(r.recipe_ref), title: str(r.recipe_title), image: str(r.recipe_image), cuisine: str(r.cuisine), when: str(r.created_at) }));
}

// ── Activity sync (diary + saved → server, so friends can see them) ─────────
export type CookedRow = { recipe_ref: string | null; recipe_title: string; recipe_image: string | null; cuisine: string | null; rating: number | null; cooked_label: string | null };
export type SavedRow = { recipe_ref: string; recipe_title: string; recipe_image: string | null; cuisine: string | null };

export async function syncCookedMeals(rows: CookedRow[]): Promise<void> {
  const s = await session();
  if (!supabase || !s) return;
  await supabase.from("cooked_meals").delete().eq("user_id", s.user.id);
  if (rows.length) await supabase.from("cooked_meals").insert(rows.map(r => ({ ...r, user_id: s.user.id })));
}
export async function syncSavedRecipes(rows: SavedRow[]): Promise<void> {
  const s = await session();
  if (!supabase || !s) return;
  const seen = new Set<string>();
  const unique = rows.filter(r => (seen.has(r.recipe_ref) ? false : (seen.add(r.recipe_ref), true)));
  await supabase.from("saved_recipes").delete().eq("user_id", s.user.id);
  if (unique.length) await supabase.from("saved_recipes").insert(unique.map(r => ({ ...r, user_id: s.user.id })));
}

// Loosely-typed RPC row (Supabase returns untyped JSON); coerced into the typed
// shapes above. `str`/`num` normalise null and non-string scalars.
type Row = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? "" : String(v));
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const reaction = (v: string): PostReaction | undefined => (
  v === "like" || v === "love" || v === "applaud" ? v : undefined
);
const arr = (row: Record<string, unknown>, key: string): string[] => (
  Array.isArray(row[key]) ? (row[key] as unknown[]).map(str).map(s => s.trim()).filter(Boolean) : []
);
const unique = (items: string[]): string[] => [...new Set(items)];
function sharedFoodSignals(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const keys = ["cuisines", "flavorLikes", "textureLikes", "comfortCues", "comfortFoods", "cookingMoods"];
  const left = new Set(keys.flatMap(k => arr(a, k)));
  return unique(keys.flatMap(k => arr(b, k).filter(v => left.has(v))));
}
function naturalList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
