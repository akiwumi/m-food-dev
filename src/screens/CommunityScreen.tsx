import { useEffect, useState } from "react";
import { Plus, ChefHat, X, Camera, Send, Users, MoreVertical, ChevronRight, Heart, MessageCircle, UserPlus, Globe } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { Avatar } from "../components/misc";
import { readSafeImage, cleanText } from "../security";
import { toggle } from "../lib/toggle";
import { useCommunity } from "../hooks/useCommunity";
import { fetchComments, type FeedPost, type FeedComment, type PostVisibility } from "../community";
import type { Recipe } from "../data";
import type { Profile, SocialPost } from "../store";

export function CommunityScreen({ profile, posts, setPosts, openRecipe, catalog, initialRecipeId, clearInitial, goFriends, openMember }: {
  profile: Profile; posts: SocialPost[]; setPosts: (p: SocialPost[]) => void;
  openRecipe: (r: Recipe) => void; catalog: Recipe[];
  initialRecipeId?: string; clearInitial?: () => void; goFriends: () => void; openMember: (id: string) => void;
}) {
  const community = useCommunity();
  const [composer, setComposer] = useState(false);
  const [text, setText] = useState(""); const [image, setImage] = useState(""); const [recipeId, setRecipeId] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("connections");
  const [uploadError, setUploadError] = useState(""); const [posting, setPosting] = useState(false);
  const [comment, setComment] = useState<Record<string, string>>({}); // local-feed (pilot) comment drafts
  const findRecipe = (id?: string) => catalog.find(r => r.id === id);

  // A recipe shared from the detail/saved screen opens the composer prefilled.
  useEffect(() => {
    if (!initialRecipeId) return;
    const r = findRecipe(initialRecipeId);
    setComposer(true); setRecipeId(initialRecipeId);
    setText(t => t || (r ? `Just found ${r.title} on MoodFood, looks perfect. ` : ""));
    clearInitial?.();
  }, [initialRecipeId]);

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
      if (ok) resetComposer();
      else setUploadError("Couldn't post right now. Try again.");
      return;
    }
    // Pilot fallback: local-only feed.
    setPosts([{ id: crypto.randomUUID(), author: cleanText(profile.name, 80), avatar: profile.avatar, text: safeText, image: image || recipe?.image || "", recipeId: recipeId || undefined, createdAt: "Just now", likes: [], comments: [] }, ...posts.slice(0, 99)]);
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
      <div><Avatar name={profile.name} image={profile.avatar} /><textarea maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="Share a cook, recipe, or tip..." /></div>
      {image && <img src={image} alt="Post preview" />}
      {recipeId && findRecipe(recipeId) && <div className="composer-recipe"><ChefHat size={15} /><span>Linking <b>{findRecipe(recipeId)!.title}</b></span><button onClick={() => setRecipeId("")} aria-label="Remove linked recipe"><X size={14} /></button></div>}
      <select value={recipeId} onChange={e => setRecipeId(e.target.value)}><option value="">Link a recipe (optional)</option>{catalog.map(r => <option value={r.id} key={r.id}>{r.title}</option>)}</select>
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
              onLike={() => community.toggleLike(post.id, !post.likedByMe)}
              onComment={community.comment} />
          ))}
        </div>
      </div>
    );
  }

  // ── Pilot fallback: local-only feed (no accounts / offline) ───────────────
  const updatePost = (id: string, change: (p: SocialPost) => SocialPost) => setPosts(posts.map(p => p.id === id ? change(p) : p));
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
          {post.recipeId && findRecipe(post.recipeId) && <button className="linked-recipe" onClick={() => { const r = findRecipe(post.recipeId); if (r) openRecipe(r); }}><ChefHat /><span><small>LINKED RECIPE</small><b>{findRecipe(post.recipeId)?.title}</b></span><ChevronRight /></button>}
          <div className="social-actions">
            <button onClick={() => updatePost(post.id, p => ({ ...p, likes: toggle(p.likes, profile.name) }))}><Heart fill={post.likes.includes(profile.name) ? "currentColor" : "none"} />{post.likes.length}</button>
            <button><MessageCircle />{post.comments.length}</button>
          </div>
          {post.comments.map((c, n) => <p className="comment" key={n}><b>{c.author}</b> {c.text}</p>)}
          <form className="comment-form" onSubmit={e => { e.preventDefault(); if (!comment[post.id]?.trim()) return; updatePost(post.id, p => ({ ...p, comments: [...p.comments, { author: profile.name, text: cleanText(comment[post.id], 500) }] })); setComment({ ...comment, [post.id]: "" }); }}>
            <input maxLength={500} value={comment[post.id] || ""} onChange={e => setComment({ ...comment, [post.id]: cleanText(e.target.value, 500) })} placeholder="Add a helpful comment..." /><button><Send /></button>
          </form>
        </article>)}
      </div>
    </div>
  );
}

// A single post in the real feed: like, expand/add comments, open a linked recipe.
function RealPost({ post, me, catalog, openRecipe, openMember, onLike, onComment }: {
  post: FeedPost; me: Profile; catalog: Recipe[]; openRecipe: (r: Recipe) => void; openMember: (id: string) => void;
  onLike: () => void; onComment: (postId: string, body: string) => Promise<boolean>;
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
        ? <button className="linked-recipe" onClick={() => openRecipe(linked)}><ChefHat /><span><small>LINKED RECIPE</small><b>{linked.title}</b></span><ChevronRight /></button>
        : post.recipeTitle && <div className="linked-recipe static"><ChefHat /><span><small>LINKED RECIPE</small><b>{post.recipeTitle}</b></span></div>}
      <div className="social-actions">
        <button onClick={onLike} aria-pressed={post.likedByMe}><Heart fill={post.likedByMe ? "currentColor" : "none"} />{post.likeCount}</button>
        <button onClick={expand}><MessageCircle />{post.commentCount}</button>
      </div>
      {open && (
        <>
          {comments.map(c => <p className="comment" key={c.id}><b>{c.authorName}</b> {c.body}</p>)}
          <form className="comment-form" onSubmit={submit}>
            <input maxLength={500} value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Reply as ${me.name || "you"}...`} />
            <button><Send /></button>
          </form>
        </>
      )}
    </article>
  );
}
