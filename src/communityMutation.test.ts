import { describe, expect, test } from "vitest";
import { applyPostReaction, classifyCommunityError } from "./communityMutation";
import type { FeedPost } from "./community";

describe("classifyCommunityError", () => {
  test("identifies an expired session", () => {
    expect(classifyCommunityError({ message: "JWT expired", code: "PGRST301" })).toEqual({
      ok: false,
      code: "auth",
      message: "Your session expired. Sign in again, then retry.",
    });
  });

  test("identifies a missing community migration", () => {
    expect(classifyCommunityError({ message: "column community_posts.recipe_ref does not exist", code: "42703" })).toEqual({
      ok: false,
      code: "schema",
      message: "Community needs a database update before this can be posted.",
    });
  });

  test("identifies row-level security rejection", () => {
    expect(classifyCommunityError({ message: "new row violates row-level security policy", code: "42501" })).toEqual({
      ok: false,
      code: "permission",
      message: "This account cannot publish that post. Refresh your session and retry.",
    });
  });

  test("identifies offline failures", () => {
    expect(classifyCommunityError(new TypeError("Load failed"))).toEqual({
      ok: false,
      code: "offline",
      message: "No connection. Your draft is safe; retry when you're online.",
    });
  });
});

describe("applyPostReaction", () => {
  const post: FeedPost = {
    id: "post-1", authorId: "author", authorName: "Author", authorAvatar: "", body: "", image: "",
    visibility: "public", createdAt: "2026-07-14T12:00:00Z", likeCount: 1, likedByMe: true, commentCount: 0,
    reactionCounts: { like: 1, love: 0, applaud: 0 }, myReaction: "like",
  };

  test("derives the persisted reaction and optimistic post before scheduling state", () => {
    const next = applyPostReaction(post, "love");
    expect(next.nextReaction).toBe("love");
    expect(next.post.reactionCounts).toEqual({ like: 0, love: 1, applaud: 0 });
    expect(next.post.likeCount).toBe(1);
  });

  test("tapping the active reaction removes it", () => {
    const next = applyPostReaction(post, "like");
    expect(next.nextReaction).toBeUndefined();
    expect(next.post.likeCount).toBe(0);
  });
});
