import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Plus, UserPlus, Users } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { CommunityComposer } from "../components/community/CommunityComposer";
import { CommunityFeedItem, CommunityPostDetail, type CommunityCommentView, type CommunityFeedView } from "../components/community/CommunityFeed";
import { TrendingRail } from "../components/community/TrendingRail";
import { readSafeImage, cleanText } from "../security";
import { useCommunity } from "../hooks/useCommunity";
import { fetchComments, type FeedPost, type PostVisibility } from "../community";
import { rankTrendingRecipes } from "../communityRanking";
import { addDismissedRecipe, readDismissedRecipes } from "../communityPreferences";
import type { Recipe } from "../data";
import type { Profile, ReactionCounts, ReactionKind, SocialPost } from "../store";
import { notifyCommunityMessage, notifyCommunityPost } from "../notifications";

const EMPTY_REACTIONS: ReactionCounts = { like: [], love: [], applaud: [] };
const REACTION_KINDS: ReactionKind[] = ["like", "love", "applaud"];

export function CommunityScreen({ profile, posts, setPosts, openRecipe, catalog, savedRecipes, initialRecipeId, clearInitial, goFriends, openMember, refreshNotifications }: {
  profile: Profile;
  posts: SocialPost[];
  setPosts: (posts: SocialPost[]) => void;
  openRecipe: (recipe: Recipe) => void;
  catalog: Recipe[];
  savedRecipes: Recipe[];
  initialRecipeId?: string;
  clearInitial?: () => void;
  goFriends: () => void;
  openMember: (id: string) => void;
  refreshNotifications: () => void;
}) {
  const community = useCommunity();
  const seenRealPostIds = useRef<Set<string> | null>(null);
  const feedScroll = useRef(0);
  const detailRequestId = useRef(0);
  const identity = community.userId || profile.email || profile.name || "pilot";
  const actor = profile.name || "You";
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("connections");
  const [publishError, setPublishError] = useState("");
  const [posting, setPosting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedPostId, setSelectedPostId] = useState("");
  const [detailComments, setDetailComments] = useState<CommunityCommentView[]>([]);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [dismissed, setDismissed] = useState(() => readDismissedRecipes(localStorage, identity));

  const findRecipe = (id?: string) => catalog.find(recipe => recipe.id === id);
  const preShared = recipeId && !savedRecipes.some(recipe => recipe.id === recipeId) ? findRecipe(recipeId) : undefined;
  const linkOptions = preShared ? [preShared, ...savedRecipes] : savedRecipes;

  useEffect(() => setDismissed(readDismissedRecipes(localStorage, identity)), [identity]);

  useEffect(() => {
    if (!initialRecipeId) return;
    const recipe = findRecipe(initialRecipeId);
    setRecipeId(initialRecipeId);
    setText(current => current || (recipe ? `Just found ${recipe.title} on MoodFood, looks perfect. ` : ""));
    setComposerOpen(true);
    clearInitial?.();
  }, [initialRecipeId]);

  useEffect(() => {
    if (!community.ready) return;
    const ids = new Set(community.feed.map(post => post.id));
    if (!profile.communityPostNotifications) {
      seenRealPostIds.current = ids;
      return;
    }
    if (!seenRealPostIds.current) {
      seenRealPostIds.current = ids;
      return;
    }
    const fresh = community.feed.filter(post => !seenRealPostIds.current?.has(post.id) && post.authorName !== profile.name);
    seenRealPostIds.current = ids;
    fresh.slice(0, 3).forEach(post => notifyCommunityPost(post.authorName, post.body || post.recipeTitle || "A new community post is ready."));
    if (fresh.length) refreshNotifications();
  }, [community.ready, community.feed, profile.communityPostNotifications, profile.name, refreshNotifications]);

  const localReactions = (post: SocialPost): ReactionCounts => ({
    like: post.reactions?.like ?? post.likes ?? [],
    love: post.reactions?.love ?? [],
    applaud: post.reactions?.applaud ?? [],
  });
  const localUserReaction = (post: SocialPost) => REACTION_KINDS.find(kind => localReactions(post)[kind].includes(actor));
  const localReactionCounts = (post: SocialPost) => Object.fromEntries(REACTION_KINDS.map(kind => [kind, localReactions(post)[kind].length])) as Record<ReactionKind, number>;

  const realViews = useMemo<CommunityFeedView[]>(() => community.feed.map(post => ({
    id: post.id,
    authorId: post.authorId,
    authorName: post.authorName,
    authorAvatar: post.authorAvatar,
    body: post.body,
    image: post.image,
    recipe: findRecipe(post.recipeRef),
    recipeTitle: post.recipeTitle,
    createdAt: post.createdAt,
    activeReaction: post.myReaction,
    reactionCounts: post.reactionCounts,
    commentCount: post.commentCount,
  })), [community.feed, catalog]);

  const localViews = useMemo<CommunityFeedView[]>(() => posts.map(post => ({
    id: post.id,
    authorName: post.author,
    authorAvatar: post.avatar,
    body: post.text,
    image: post.image,
    recipe: findRecipe(post.recipeId),
    recipeTitle: findRecipe(post.recipeId)?.title,
    createdAt: post.createdAt,
    activeReaction: localUserReaction(post),
    reactionCounts: localReactionCounts(post),
    commentCount: post.comments.length,
  })), [posts, catalog, actor]);

  const liveFeed = community.ready ? realViews : localViews;
  const trendingPosts = useMemo<FeedPost[]>(() => community.ready ? community.feed : posts.map(post => ({
    id: post.id,
    authorId: "pilot",
    authorName: post.author,
    authorAvatar: post.avatar,
    body: post.text,
    image: post.image,
    recipeRef: post.recipeId,
    recipeTitle: findRecipe(post.recipeId)?.title,
    visibility: "connections",
    createdAt: post.createdAt,
    likeCount: Object.values(localReactionCounts(post)).reduce((sum, value) => sum + value, 0),
    likedByMe: !!localUserReaction(post),
    commentCount: post.comments.length,
    reactionCounts: localReactionCounts(post),
    myReaction: localUserReaction(post),
  })), [community.ready, community.feed, posts, catalog, actor]);
  const trending = useMemo(() => rankTrendingRecipes(trendingPosts, catalog, profile, dismissed), [trendingPosts, catalog, profile, dismissed]);
  const selectedPost = liveFeed.find(post => post.id === selectedPostId);

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      setImage(await readSafeImage(file));
      setPublishError("");
    } catch (error) {
      setPublishError((error as Error).message);
    }
  };

  const resetComposer = () => {
    setText("");
    setImage("");
    setRecipeId("");
    setPublishError("");
    setComposerOpen(false);
  };

  const openComposer = () => {
    setStatusMessage("");
    flushSync(() => setComposerOpen(true));
    document.getElementById("community-post-message")?.focus();
  };

  const publish = async () => {
    const safeText = cleanText(text, 1000);
    if (!safeText && !image && !recipeId) return;
    const recipe = findRecipe(recipeId);
    if (community.ready) {
      setPosting(true);
      const result = await community.publish({ body: safeText, imageDataUrl: image || undefined, recipeRef: recipeId || undefined, recipeTitle: recipe?.title, visibility });
      setPosting(false);
      if (!result.ok) {
        setPublishError(result.message);
        return;
      }
    } else {
      setPosts([{ id: crypto.randomUUID(), author: actor, avatar: profile.avatar, text: safeText, image: image || "", recipeId: recipeId || undefined, createdAt: new Date().toISOString(), reactions: { ...EMPTY_REACTIONS }, comments: [] }, ...posts.slice(0, 99)]);
    }
    if (profile.communityPostNotifications) {
      notifyCommunityPost(actor, safeText || recipe?.title || "A saved recipe was shared.");
      refreshNotifications();
    }
    setStatusMessage("Post published.");
    resetComposer();
  };

  const reactLocal = (postId: string, reaction: ReactionKind) => {
    setPosts(posts.map(post => {
      if (post.id !== postId) return post;
      const previous = localUserReaction(post);
      const next: ReactionCounts = {
        like: localReactions(post).like.filter(name => name !== actor),
        love: localReactions(post).love.filter(name => name !== actor),
        applaud: localReactions(post).applaud.filter(name => name !== actor),
      };
      if (previous !== reaction) next[reaction] = [...next[reaction], actor];
      return { ...post, reactions: next, likes: next.like };
    }));
  };

  const react = (postId: string, reaction: ReactionKind) => {
    if (community.ready) void community.react(postId, reaction);
    else reactLocal(postId, reaction);
  };

  const openPost = async (postId: string) => {
    const requestId = ++detailRequestId.current;
    feedScroll.current = window.scrollY;
    setSelectedPostId(postId);
    setDetailComments([]);
    setReply("");
    setReplyError("");
    if (community.ready) {
      const comments = await fetchComments(postId);
      if (detailRequestId.current !== requestId) return;
      setDetailComments(comments.map(comment => ({ id: comment.id, authorName: comment.authorName, authorAvatar: comment.authorAvatar, body: comment.body, createdAt: comment.createdAt })));
    } else {
      const post = posts.find(candidate => candidate.id === postId);
      setDetailComments((post?.comments ?? []).map((comment, index) => ({ id: `${postId}-${index}`, authorName: comment.author, authorAvatar: comment.avatar ?? "", body: comment.text })));
    }
  };

  const closePost = () => {
    detailRequestId.current += 1;
    setSelectedPostId("");
    requestAnimationFrame(() => window.scrollTo({ top: feedScroll.current }));
  };

  const submitReply = async () => {
    if (!selectedPost) return;
    const requestId = detailRequestId.current;
    const body = cleanText(reply, 500);
    if (!body) return;
    setSubmittingReply(true);
    setReplyError("");
    if (community.ready) {
      const result = await community.comment(selectedPost.id, body);
      if (!result.ok) {
        setReplyError(result.message);
        setSubmittingReply(false);
        return;
      }
      const comments = await fetchComments(selectedPost.id);
      if (detailRequestId.current === requestId) setDetailComments(comments.map(comment => ({ id: comment.id, authorName: comment.authorName, authorAvatar: comment.authorAvatar, body: comment.body, createdAt: comment.createdAt })));
    } else {
      const nextComment = { author: actor, avatar: profile.avatar, text: body };
      setPosts(posts.map(post => post.id === selectedPost.id ? { ...post, comments: [...post.comments, nextComment] } : post));
      setDetailComments(current => [...current, { id: crypto.randomUUID(), authorName: actor, authorAvatar: profile.avatar, body }]);
    }
    if (profile.communityPostNotifications) {
      notifyCommunityMessage(actor, body);
      refreshNotifications();
    }
    setReply("");
    setSubmittingReply(false);
  };

  const dismissRecipe = (dismissedRecipeId: string) => setDismissed(addDismissedRecipe(localStorage, identity, dismissedRecipeId));

  return (
    <div className="screen community community-feed-screen">
      <TopBar title="Community" />
      <div className="community-feed-toolbar">
        <button type="button" onClick={goFriends}><UserPlus />Friends</button>
        <button type="button" className="primary" onClick={openComposer}><Plus />Post</button>
      </div>
      {statusMessage && <p className="community-status" role="status">{statusMessage}</p>}
      <TrendingRail items={trending} openRecipe={openRecipe} dismiss={dismissRecipe} />
      <section className="community-feed-list" aria-label="Community posts">
        {community.loading && !liveFeed.length && <p className="quiet">Loading your community...</p>}
        {!community.loading && !liveFeed.length && (
          <div className="community-feed-empty"><Users /><h2>Your feed is quiet</h2><p>Add friends or share the first dish.</p><button type="button" onClick={openComposer}><Plus />Create post</button></div>
        )}
        {liveFeed.map(post => (
          <CommunityFeedItem
            key={post.id}
            item={post}
            openPost={() => void openPost(post.id)}
            openAuthor={() => post.authorId && openMember(post.authorId)}
            openRecipe={openRecipe}
            onReact={reaction => react(post.id, reaction)}
          />
        ))}
      </section>

      <button type="button" className="community-floating-post" onClick={openComposer} aria-label="Create post"><Plus /></button>
      <CommunityComposer
        open={composerOpen}
        profile={profile}
        text={text}
        setText={setText}
        image={image}
        removeImage={() => setImage("")}
        recipeId={recipeId}
        setRecipeId={setRecipeId}
        recipes={linkOptions.filter((recipe): recipe is Recipe => !!recipe)}
        visibility={visibility}
        setVisibility={setVisibility}
        showVisibility={community.ready === true}
        posting={posting}
        error={publishError}
        upload={file => void upload(file)}
        close={() => setComposerOpen(false)}
        publish={() => void publish()}
      />
      {selectedPost && (
        <CommunityPostDetail
          item={selectedPost}
          profile={profile}
          comments={detailComments}
          draft={reply}
          setDraft={setReply}
          submitting={submittingReply}
          error={replyError}
          close={closePost}
          openAuthor={() => selectedPost.authorId && openMember(selectedPost.authorId)}
          openRecipe={openRecipe}
          onReact={reaction => react(selectedPost.id, reaction)}
          submit={() => void submitReply()}
        />
      )}
    </div>
  );
}
