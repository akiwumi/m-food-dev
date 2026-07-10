import { useEffect, useState } from "react";
import { Plus, ChefHat, X, Camera, Send, Users, MoreVertical, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { Avatar } from "../components/misc";
import { readSafeImage, cleanText } from "../security";
import { toggle } from "../lib/toggle";
import type { Recipe } from "../data";
import type { Profile, SocialPost } from "../store";

export function CommunityScreen({ profile, posts, setPosts, connections, setConnections, openRecipe, catalog, initialRecipeId, clearInitial }: { profile: Profile; posts: SocialPost[]; setPosts: (p: SocialPost[]) => void; connections: string[]; setConnections: (p: string[]) => void; openRecipe: (r: Recipe) => void; catalog: Recipe[]; initialRecipeId?: string; clearInitial?: () => void }) {
  const [composer, setComposer] = useState(false); const [text, setText] = useState(""); const [image, setImage] = useState(""); const [recipeId, setRecipeId] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState("");
  const findRecipe = (id?: string) => catalog.find(r => r.id === id);
  // When a recipe was shared from the detail screen, open the composer prefilled.
  useEffect(() => {
    if (initialRecipeId) {
      const r = findRecipe(initialRecipeId);
      setComposer(true); setRecipeId(initialRecipeId);
      setText(t => t || (r ? `Just found ${r.title} on MoodFood, looks perfect. ` : ""));
      clearInitial?.();
    }
  }, [initialRecipeId]);
  const upload = async (file?: File) => { if (!file) return; try { setImage(await readSafeImage(file)); setUploadError(""); } catch (error) { setUploadError((error as Error).message); } };
  const publish = () => { const safeText = cleanText(text, 1000); if (!safeText && !image && !recipeId) return; setPosts([{ id: crypto.randomUUID(), author: cleanText(profile.name, 80), avatar: profile.avatar, text: safeText, image: image || findRecipe(recipeId)?.image || "", recipeId: recipeId || undefined, createdAt: "Just now", likes: [], comments: [] }, ...posts.slice(0, 99)]); setText(""); setImage(""); setRecipeId(""); setComposer(false); };
  const updatePost = (id: string, change: (p: SocialPost) => SocialPost) => setPosts(posts.map(p => p.id === id ? change(p) : p));
  return <div className="screen community"><TopBar title="Community" /><section className="community-intro"><div><b>Cook together, from wherever.</b><p>Share recipes, photos, and useful tips. Your private mood and psychological profile stay private.</p></div><button className="primary" onClick={() => setComposer(!composer)}><Plus />Post</button></section>{composer && <section className="composer"><div><Avatar name={profile.name} image={profile.avatar} /><textarea maxLength={1000} value={text} onChange={e => setText(e.target.value)} placeholder="Share a cook, recipe, or tip..." /></div>{image && <img src={image} alt="Post preview" />}{recipeId && findRecipe(recipeId) && <div className="composer-recipe"><ChefHat size={15} /><span>Linking <b>{findRecipe(recipeId)!.title}</b></span><button onClick={() => setRecipeId("")} aria-label="Remove linked recipe"><X size={14} /></button></div>}<select value={recipeId} onChange={e => setRecipeId(e.target.value)}><option value="">Link a recipe (optional)</option>{catalog.map(r => <option value={r.id} key={r.id}>{r.title}</option>)}</select>{uploadError && <p className="upload-error">{uploadError}</p>}<footer><label><Camera />Add photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label><button className="primary" onClick={publish}><Send />Share</button></footer></section>}<div className="feed">{posts.length === 0 && !composer && <div className="empty-state" style={{ margin: "24px 16px" }}><Users /><h2>Be the first to post</h2><p>Share a cook, tip, or recipe. Your psychological profile and diary stay completely private.</p></div>}{posts.map(post => <article className="social-post" key={post.id}><header><Avatar name={post.author} image={post.avatar} /><div><b>{post.author}</b><span>{post.createdAt}</span></div><MoreVertical /></header><p>{post.text}</p>{post.image && <img src={post.image} alt="Cooked meal" />}{post.recipeId && findRecipe(post.recipeId) && <button className="linked-recipe" onClick={() => { const r = findRecipe(post.recipeId); if (r) openRecipe(r); }}><ChefHat /><span><small>LINKED RECIPE</small><b>{findRecipe(post.recipeId)?.title}</b></span><ChevronRight /></button>}<div className="social-actions"><button onClick={() => updatePost(post.id, p => ({ ...p, likes: toggle(p.likes, profile.name) }))}><Heart fill={post.likes.includes(profile.name) ? "currentColor" : "none"} />{post.likes.length}</button><button><MessageCircle />{post.comments.length}</button></div>{post.comments.map((c, n) => <p className="comment" key={n}><b>{c.author}</b> {c.text}</p>)}<form className="comment-form" onSubmit={e => { e.preventDefault(); if (!comment[post.id]?.trim()) return; updatePost(post.id, p => ({ ...p, comments: [...p.comments, { author: profile.name, text: cleanText(comment[post.id], 500) }] })); setComment({ ...comment, [post.id]: "" }); }}><input maxLength={500} value={comment[post.id] || ""} onChange={e => setComment({ ...comment, [post.id]: cleanText(e.target.value, 500) })} placeholder="Add a helpful comment..." /><button><Send /></button></form></article>)}</div></div>;
}
