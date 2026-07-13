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
  body: string; image: string; recipeRef?: string; recipeTitle?: string; visibility: string; createdAt: string;
  likeCount: number; likedByMe: boolean; commentCount: number;
};
export type FeedComment = { id: string; authorId: string; authorName: string; authorAvatar: string; body: string; createdAt: string };

export type PostVisibility = "connections" | "public";
const POST_IMAGES = "post-images";

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

function publicUrl(path: string | null | undefined): string {
  if (!path || !supabase) return "";
  return supabase.storage.from(POST_IMAGES).getPublicUrl(path).data.publicUrl ?? "";
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
    body: str(r.body), image: publicUrl(str(r.image_path)),
    recipeRef: r.recipe_ref ? str(r.recipe_ref) : undefined, recipeTitle: r.recipe_title ? str(r.recipe_title) : undefined,
    visibility: str(r.visibility), createdAt: str(r.created_at),
    likeCount: num(r.like_count), likedByMe: !!r.liked_by_me, commentCount: num(r.comment_count),
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

export async function createPost(input: { body: string; imageDataUrl?: string; recipeRef?: string; recipeTitle?: string; visibility?: PostVisibility }): Promise<boolean> {
  const s = await session();
  if (!supabase || !s) return false;
  const image_path = input.imageDataUrl ? await uploadPostImage(input.imageDataUrl, s.user.id) : null;
  const { error } = await supabase.from("community_posts").insert({
    user_id: s.user.id,
    body: input.body || null,
    image_path,
    recipe_ref: input.recipeRef ?? null,
    recipe_title: input.recipeTitle ?? null,
    visibility: input.visibility ?? "connections",
  });
  return !error;
}

export async function setLike(postId: string, liked: boolean): Promise<void> {
  const s = await session();
  if (!supabase || !s) return;
  if (liked) await supabase.from("post_likes").insert({ post_id: postId, user_id: s.user.id });
  else await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", s.user.id);
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

// Loosely-typed RPC row (Supabase returns untyped JSON); coerced into the typed
// shapes above. `str`/`num` normalise null and non-string scalars.
type Row = Record<string, unknown>;
const str = (v: unknown): string => (v == null ? "" : String(v));
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
