export type CommunityErrorCode = "auth" | "schema" | "permission" | "upload" | "offline" | "unknown";

export type CommunityMutationResult =
  | { ok: true }
  | { ok: false; code: CommunityErrorCode; message: string };

export type CommunityMutationFailure = Extract<CommunityMutationResult, { ok: false }>;

type ErrorLike = { message?: unknown; code?: unknown };

export function classifyCommunityError(error: unknown): CommunityMutationResult {
  const value = (error && typeof error === "object" ? error : {}) as ErrorLike;
  const message = String(value.message ?? error ?? "").toLowerCase();
  const code = String(value.code ?? "");

  if (code === "PGRST301" || message.includes("jwt") || message.includes("session")) {
    return { ok: false, code: "auth", message: "Your session expired. Sign in again, then retry." };
  }
  if (code === "42703" || code === "42P01" || message.includes("does not exist")) {
    return { ok: false, code: "schema", message: "Community needs a database update before this can be posted." };
  }
  if (code === "42501" || message.includes("row-level security") || message.includes("permission")) {
    return { ok: false, code: "permission", message: "This account cannot publish that post. Refresh your session and retry." };
  }
  if (error instanceof TypeError || message.includes("load failed") || message.includes("network")) {
    return { ok: false, code: "offline", message: "No connection. Your draft is safe; retry when you're online." };
  }
  return { ok: false, code: "unknown", message: "The post was not shared. Your draft is safe; try again." };
}

export const COMMUNITY_UPLOAD_ERROR: CommunityMutationFailure = {
  ok: false,
  code: "upload",
  message: "The photo could not be uploaded. Your draft is safe; retry or remove the photo.",
};

export function applyPostReaction(post: FeedPost, requested: PostReaction): { post: FeedPost; nextReaction?: PostReaction } {
  const previous = post.myReaction;
  const nextReaction = previous === requested ? undefined : requested;
  const reactionCounts = { ...post.reactionCounts };
  if (previous) reactionCounts[previous] = Math.max(0, reactionCounts[previous] - 1);
  if (nextReaction) reactionCounts[nextReaction] += 1;
  return {
    nextReaction,
    post: {
      ...post,
      myReaction: nextReaction,
      likedByMe: !!nextReaction,
      likeCount: reactionCounts.like + reactionCounts.love + reactionCounts.applaud,
      reactionCounts,
    },
  };
}
import type { FeedPost, PostReaction } from "./community";
