import { useEffect, useRef, useState } from "react";
import { Plus, ChefHat, X, Camera, Send, Users, MoreVertical, ChevronRight, Heart, MessageCircle, UserPlus, Globe, ThumbsUp, Hand, type LucideIcon } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { Avatar } from "../components/misc";
import { readSafeImage, cleanText } from "../security";
import { useCommunity } from "../hooks/useCommunity";
import { fetchComments, type FeedPost, type FeedComment, type PostReaction, type PostVisibility } from "../community";
import type { Recipe } from "../data";
import type { Profile, ReactionCounts, ReactionKind, SocialPost } from "../store";
import { notifyCommunityMessage, notifyCommunityPost } from "../notifications";

const EMPTY_REACTIONS: ReactionCounts = { like: [], love: [], applaud: [] };
const REACTIONS: { kind: ReactionKind; label: string; Icon: LucideIcon }[] = [
  { kind: "like", label: "Like", Icon: ThumbsUp },
  { kind: "love", label: "Love", Icon: Heart },
  { kind: "applaud", label: "Applaud", Icon: Hand },
];

export function CommunityScreen({ profile, posts, setPosts, openRecipe, catalog, savedRecipes, initialRecipeId, clearInitial, goFriends, openMember, refreshNotifications }: {
  profile: Profile; posts: SocialPost[]; setPosts: (p: SocialPost[]) => void;
  openRecipe: (r: Recipe) => void; catalog: Recipe[]; savedRecipes: Recipe[];
  initialRecipeId?: string; clearInitial?: () => void; goFriends: () => void; openMember: (id: string) => void;
  refreshNotifications: () => void;
}) {
  const community = useCommunity();
  const seenRealPostIds = useRef<Set<string> | null>(null);
  const [composer, setComposer] = useState(false);
  const [text, setText] = useState(""); const [image, setImage] = useState(""); const [recipeId, setRecipeId] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("connections");
  const [uploadError, setUploadError] = useState(""); const [posting, setPosting] = useState(false);
  const [comment, setComment] = useState<Record<string, string>>({}); // local-feed (pilot) comment drafts
  const findRecipe = (id?: string) => catalog.find(r => r.id === id);
  // The composer links a SAVED recipe. If one was pre-shared from a recipe
  // screen and isn't saved, keep it selectable so the link isn't lost.
  const preShared = recipeId && !savedRecipes.some(r => r.id === recipeId) ? findRecipe(recipeId) : undefined;
  const linkOptions = preShared ? [preShared, ...savedRecipes] : savedRecipes;

  // A recipe shared from the detail/saved screen opens the composer prefilled.
  useEffect(() => {
    if (!initialRecipeId) return;
    const r = findRecipe(initialRecipeId);
    setComposer(true); setRecipeId(initialRecipeId);
    setText(t => t || (r ? `Just found ${r.title} on MoodFood, looks perfect. ` : ""));
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

  const upload = async (file?: File) => { if (!file) return; try { setImage(await readSafeImage(file)); setUploadError(""); } catch (e) { setUploadError((e as Error).message); } };
  const resetComposer = () => { setText(""); setImage(""); setRecipeId(""); setComposer(false); };

  const publish = async () => {
    const safeText = cleanText(text, 1000);
    if (!safeText && !image && !recipeId) return;
    const recipe = findRecipe(recipeId);
    if (community.ready) {
      setPosting(true);
      const ok = await community.publish({ body: safeText, imageDataUrl: image || undefined, recipeRef: recipeId || undefined, recipeTitle: recipe?.title, visibility });
      setPosting(false);
      if (ok) {
        if (profile.communityPostNotifications) {
          notifyCommunityPost(profile.name || "You", safeText || recipe?.title || "A saved recipe was shared.");
          refreshNotifications();
        }
        resetComposer();
      }
      else setUploadError("Couldn't post right now. Try again.");
      return;
    }
    // Pilot fallback: local-only feed.
    setPosts([{ id: crypto.randomUUID(), author: cleanText(profile.name, 80) || "You", avatar: profile.avatar, text: safeText, image: image || recipe?.image || "", recipeId: recipeId || undefined, createdAt: "Just now", reactions: { ...EMPTY_REACTIONS }, comments: [] }, ...posts.slice(0, 99)]);
    if (profile.communityPostNotifications) {
      notifyCommunityPost(profile.name || "You", safeText || recipe?.title || "A saved recipe was shared.");
      refreshNotifications();
    }
    resetComposer();
  };

  const intro = (
    <section className="community-intro">
      <div><b>Cook together, from wherever.</b><p>Share recipes, photos, and tips with friends. Your private mood and psychology profile stay private.</p></div>
      <div className="ci-actions">
        <button className="secondary" onClick={goFriends}><UserPlus size={17} />Friends</button>
        <button className="primary" onClick={() => setComposer(c => !c)}><Plus />Post</button>
      </div>
    </section>
  );

  const composerEl = composer && (
    <section className="composer">
      <div><Avatar name={profile.name} image={profile.avatar} /><textarea maxLength={1000} value={text} onTouchStart={e => e.currentTarget.focus()} onChange={e => setText(e.target.value)} placeholder="Share a cook, recipe, or tip..." /></div>
      {image && <img src={image} alt="Post preview" />}
      {recipeId && findRecipe(recipeId) && <div className="composer-recipe"><ChefHat size={15} /><span>Saved recipe <b>{findRecipe(recipeId)!.title}</b></span><button onClick={() => setRecipeId("")} aria-label="Remove saved recipe link"><X size={14} /></button></div>}
      <select value={recipeId} onChange={e => setRecipeId(e.target.value)}>
        <option value="">{savedRecipes.length ? "Add a saved recipe link (optional)" : "Save a recipe first to add it here"}</option>
        {linkOptions.map(r => <option value={r.id} key={r.id}>{r.title}</option>)}
      </select>
      {uploadError && <p className="upload-error">{uploadError}</p>}
      <footer>
        <label><Camera />Add photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label>
        {community.ready && (
          <button type="button" className="visibility-toggle" onClick={() => setVisibility(v => v === "public" ? "connections" : "public")}>
            {visibility === "public" ? <><Globe size={14} />Public</> : <><Users size={14} />Friends</>}
          </button>
        )}
        <button className="primary" onClick={publish} disabled={posting}><Send />{posting ? "Sharing…" : "Share"}</button>
      </footer>
    </section>
  );

  // ── Real (multi-user) feed ────────────────────────────────────────────────
  if (community.ready) {
    return (
      <div className="screen community">
        <TopBar title="Community" />
        {intro}
        {composerEl}
        <div className="feed">
          {community.loading && community.feed.length === 0 && <p className="quiet" style={{ margin: "24px 16px" }}>Loading your community…</p>}
          {!community.loading && community.feed.length === 0 && !composer && (
            <div className="empty-state" style={{ margin: "24px 16px" }}><Users /><h2>Your feed is quiet</h2><p>Add friends and share a cook to get the conversation going.</p><button className="secondary" onClick={goFriends} style={{ marginTop: 10 }}><UserPlus size={16} />Find friends</button></div>
          )}
          {community.feed.map(post => (
            <RealPost key={post.id} post={post} me={profile} catalog={catalog} openRecipe={openRecipe} openMember={openMember}
              onReact={(reaction) => community.react(post.id, reaction)}
              onComment={async (postId, body) => {
                const ok = await community.comment(postId, body);
                if (ok && profile.communityPostNotifications) {
                  notifyCommunityMessage(profile.name || "You", body);
                  refreshNotifications();
                }
                return ok;
              }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Pilot fallback: local-only feed (no accounts / offline) ───────────────
  const updatePost = (id: string, change: (p: SocialPost) => SocialPost) => setPosts(posts.map(p => p.id === id ? change(p) : p));
  const actor = profile.name || "You";
  const localReactions = (post: SocialPost): ReactionCounts => ({
    like: post.reactions?.like ?? post.likes ?? [],
    love: post.reactions?.love ?? [],
    applaud: post.reactions?.applaud ?? [],
  });
  const localUserReaction = (post: SocialPost) => {
    const reactions = localReactions(post);
    return REACTIONS.find(r => reactions[r.kind].includes(actor))?.kind;
  };
  const toggleLocalReaction = (post: SocialPost, reaction: ReactionKind): SocialPost => {
    const previous = localUserReaction(post);
    const next: ReactionCounts = {
      like: localReactions(post).like.filter(name => name !== actor),
      love: localReactions(post).love.filter(name => name !== actor),
      applaud: localReactions(post).applaud.filter(name => name !== actor),
    };
    if (previous !== reaction) next[reaction] = [...next[reaction], actor];
    return { ...post, reactions: next, likes: next.like };
  };
  const commentOnPost = (post: SocialPost, body: string): SocialPost => {
    const next = { ...post, comments: [...post.comments, { author: actor, avatar: profile.avatar, text: cleanText(body, 500) }] };
    if (profile.communityPostNotifications) notifyCommunityMessage(actor, body);
    return next;
  };
  return (
    <div className="screen community">
      <TopBar title="Community" />
      {intro}
      {composerEl}
      <div className="feed">
        {posts.length === 0 && !composer && <div className="empty-state" style={{ margin: "24px 16px" }}><Users /><h2>Be the first to post</h2><p>Share a cook, tip, or recipe. Your psychological profile and diary stay completely private.</p></div>}
        {posts.map(post => <article className="social-post" key={post.id}>
          <header><Avatar name={post.author} image={post.avatar} /><div><b>{post.author}</b><span>{post.createdAt}</span></div><MoreVertical /></header>
          <p>{post.text}</p>
          {post.image && <img src={post.image} alt="Cooked meal" />}
          {post.recipeId && findRecipe(post.recipeId) && <button className="linked-recipe" onClick={() => { const r = findRecipe(post.recipeId); if (r) openRecipe(r); }}><ChefHat /><span><small>SAVED RECIPE</small><b>{findRecipe(post.recipeId)?.title}</b></span><ChevronRight /></button>}
          <ReactionBar active={localUserReaction(post)} counts={Object.fromEntries(REACTIONS.map(r => [r.kind, localReactions(post)[r.kind].length])) as Record<ReactionKind, number>} comments={post.comments.length} onReact={(reaction) => updatePost(post.id, p => toggleLocalReaction(p, reaction))} />
          {post.comments.map((c, n) => <div className="comment" key={n}><Avatar name={c.author} image={c.avatar} /><p><b>{c.author}</b> {c.text}</p></div>)}
          <form className="comment-form" onSubmit={e => { e.preventDefault(); if (!comment[post.id]?.trim()) return; updatePost(post.id, p => commentOnPost(p, comment[post.id])); setComment({ ...comment, [post.id]: "" }); refreshNotifications(); }}>
            <input maxLength={500} value={comment[post.id] || ""} onChange={e => setComment({ ...comment, [post.id]: cleanText(e.target.value, 500) })} placeholder="Add a helpful comment..." /><button><Send /></button>
          </form>
        </article>)}
      </div>
    </div>
  );
}

// A single post in the real feed: like, expand/add comments, open a linked recipe.
function RealPost({ post, me, catalog, openRecipe, openMember, onReact, onComment }: {
  post: FeedPost; me: Profile; catalog: Recipe[]; openRecipe: (r: Recipe) => void; openMember: (id: string) => void;
  onReact: (reaction: PostReaction) => void; onComment: (postId: string, body: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [draft, setDraft] = useState("");
  const linked = post.recipeRef ? catalog.find(r => r.id === post.recipeRef) : undefined;

  const expand = async () => { const next = !open; setOpen(next); if (next) setComments(await fetchComments(post.id)); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = cleanText(draft, 500);
    if (!body) return;
    setDraft("");
    if (await onComment(post.id, body)) setComments(await fetchComments(post.id));
  };

  return (
    <article className="social-post">
      <header><button className="post-author" onClick={() => openMember(post.authorId)}><Avatar name={post.authorName} image={post.authorAvatar} /><div><b>{post.authorName}</b><span>{new Date(post.createdAt).toLocaleDateString()}</span></div></button><MoreVertical /></header>
      {post.body && <p>{post.body}</p>}
      {post.image && <img src={post.image} alt="Cooked meal" />}
      {linked
        ? <button className="linked-recipe" onClick={() => openRecipe(linked)}><ChefHat /><span><small>SAVED RECIPE</small><b>{linked.title}</b></span><ChevronRight /></button>
        : post.recipeTitle && <div className="linked-recipe static"><ChefHat /><span><small>SAVED RECIPE</small><b>{post.recipeTitle}</b></span></div>}
      <ReactionBar active={post.myReaction} counts={post.reactionCounts} comments={post.commentCount} onReact={onReact} onComments={expand} />
      {open && (
        <>
          {comments.map(c => <div className="comment" key={c.id}><Avatar name={c.authorName} image={c.authorAvatar} /><p><b>{c.authorName}</b> {c.body}</p></div>)}
          <form className="comment-form" onSubmit={submit}>
            <input maxLength={500} value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Reply as ${me.name || "you"}...`} />
            <button><Send /></button>
          </form>
        </>
      )}
    </article>
  );
}

function ReactionBar({ active, counts, comments, onReact, onComments }: {
  active?: ReactionKind;
  counts: Record<ReactionKind, number>;
  comments: number;
  onReact: (reaction: ReactionKind) => void;
  onComments?: () => void;
}) {
  return (
    <div className="social-actions">
      {REACTIONS.map(({ kind, label, Icon }) => (
        <button key={kind} onClick={() => onReact(kind)} aria-pressed={active === kind} title={label}>
          <Icon fill={kind === "love" && active === kind ? "currentColor" : "none"} />{counts[kind]}
        </button>
      ))}
      <button type="button" onClick={onComments}><MessageCircle />{comments}</button>
    </div>
  );
}
