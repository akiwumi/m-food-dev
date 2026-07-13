import { useCallback, useEffect, useState } from "react";
import {
  communityReady, fetchFeed, listFriends, listFriendRequests,
  createPost, setLike, addComment,
  type FeedPost, type Friend, type FriendRequest, type PostVisibility,
} from "../community";

// Drives the real (Supabase-backed) community: the friends-visible feed, the
// friends list, and pending requests. `ready` is null while we check whether a
// real backend + signed-in session exist; false means pilot mode (the caller
// falls back to the local localStorage feed). All actions are no-ops until ready.
export function useCommunity() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  const refreshFeed = useCallback(async () => { setFeed(await fetchFeed()); }, []);
  const refreshFriends = useCallback(async () => {
    const [f, r] = await Promise.all([listFriends(), listFriendRequests()]);
    setFriends(f); setRequests(r);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const ok = await communityReady();
      if (!alive) return;
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

  const publish = useCallback(async (input: { body: string; imageDataUrl?: string; recipeRef?: string; recipeTitle?: string; visibility?: PostVisibility }) => {
    const ok = await createPost(input);
    if (ok) await refreshFeed();
    return ok;
  }, [refreshFeed]);

  const comment = useCallback(async (postId: string, body: string) => {
    const ok = await addComment(postId, body);
    if (ok) setFeed(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
    return ok;
  }, []);

  return { ready, loading, feed, friends, requests, refreshFeed, refreshFriends, toggleLike, publish, comment };
}
