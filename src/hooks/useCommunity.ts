import { useCallback, useEffect, useRef, useState } from "react";
import {
  communityUserId, fetchFeed, listFriends, listFriendRequests,
  createPost, setLike, setPostReaction, addComment,
  type FeedPost, type Friend, type FriendRequest, type PostReaction, type PostVisibility,
} from "../community";
import { applyPostReaction } from "../communityMutation";

// Drives the real (Supabase-backed) community: the friends-visible feed, the
// friends list, and pending requests. `ready` is null while we check whether a
// real backend + signed-in session exist; false means pilot mode (the caller
// falls back to the local localStorage feed). All actions are no-ops until ready.
export function useCommunity() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const feedRef = useRef<FeedPost[]>([]);
  const reactionVersions = useRef(new Map<string, number>());

  const refreshFeed = useCallback(async () => {
    const next = await fetchFeed();
    feedRef.current = next;
    setFeed(next);
  }, []);
  const refreshFriends = useCallback(async () => {
    const [f, r] = await Promise.all([listFriends(), listFriendRequests()]);
    setFriends(f); setRequests(r);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const id = await communityUserId();
      const ok = !!id;
      if (!alive) return;
      setUserId(id);
      setReady(ok);
      if (!ok) return;
      setLoading(true);
      await Promise.all([refreshFeed(), refreshFriends()]);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [refreshFeed, refreshFriends]);

  // Optimistic like toggle, then persist.
  const toggleLike = useCallback(async (postId: string, liked: boolean) => {
    setFeed(prev => prev.map(p => p.id === postId
      ? { ...p, likedByMe: liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) }
      : p));
    await setLike(postId, liked);
  }, []);

  const react = useCallback(async (postId: string, reaction: PostReaction) => {
    const previousPost = feedRef.current.find(post => post.id === postId);
    if (!previousPost) return { ok: false as const, code: "unknown" as const, message: "That post is no longer available." };
    const update = applyPostReaction(previousPost, reaction);
    const version = (reactionVersions.current.get(postId) ?? 0) + 1;
    reactionVersions.current.set(postId, version);
    feedRef.current = feedRef.current.map(post => post.id === postId ? update.post : post);
    setFeed(feedRef.current);
    const result = await setPostReaction(postId, update.nextReaction);
    if (!result.ok && reactionVersions.current.get(postId) === version) {
      feedRef.current = feedRef.current.map(post => post.id === postId ? previousPost : post);
      setFeed(feedRef.current);
    }
    return result;
  }, []);

  const publish = useCallback(async (input: { body: string; imageDataUrl?: string; recipeRef?: string; recipeTitle?: string; visibility?: PostVisibility }) => {
    const result = await createPost(input);
    if (result.ok) await refreshFeed();
    return result;
  }, [refreshFeed]);

  const comment = useCallback(async (postId: string, body: string) => {
    const result = await addComment(postId, body);
    if (result.ok) setFeed(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
    return result;
  }, []);

  return { ready, userId, loading, feed, friends, requests, refreshFeed, refreshFriends, toggleLike, react, publish, comment };
}
