import { ArrowLeft, ChefHat, Hand, Heart, MessageCircle, Send, ThumbsUp } from "lucide-react";
import type { Recipe } from "../../data";
import type { Profile, ReactionKind } from "../../store";
import { Avatar } from "../misc";

const REACTIONS = [
  { kind: "like" as const, label: "Like", Icon: ThumbsUp },
  { kind: "love" as const, label: "Love", Icon: Heart },
  { kind: "applaud" as const, label: "Applaud", Icon: Hand },
];

export type CommunityFeedView = {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string;
  body: string;
  image: string;
  recipe?: Recipe;
  recipeTitle?: string;
  createdAt: string;
  activeReaction?: ReactionKind;
  reactionCounts: Record<ReactionKind, number>;
  commentCount: number;
};

export type CommunityCommentView = {
  id: string;
  authorName: string;
  authorAvatar: string;
  body: string;
  createdAt?: string;
};

const displayDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
};

export function PostReactionBar({ active, counts, comments, onReact, onComments }: {
  active?: ReactionKind;
  counts: Record<ReactionKind, number>;
  comments: number;
  onReact: (reaction: ReactionKind) => void;
  onComments: () => void;
}) {
  return (
    <div className="community-reactions">
      {REACTIONS.map(({ kind, label, Icon }) => (
        <button type="button" key={kind} onClick={() => onReact(kind)} aria-pressed={active === kind} aria-label={`${label}, ${counts[kind]}`}>
          <Icon fill={kind === "love" && active === kind ? "currentColor" : "none"} />
          <span>{counts[kind]}</span>
        </button>
      ))}
      <button type="button" onClick={onComments} aria-label={`${comments} comments`}><MessageCircle /><span>{comments}</span></button>
    </div>
  );
}

export function CommunityFeedItem({ item, openPost, openAuthor, onReact }: {
  item: CommunityFeedView;
  openPost: () => void;
  openAuthor: () => void;
  onReact: (reaction: ReactionKind) => void;
}) {
  const thumbnail = item.image || item.recipe?.image;
  return (
    <article className="community-feed-item">
      <header>
        <button type="button" className="community-feed-author" onClick={openAuthor}>
          <Avatar name={item.authorName} image={item.authorAvatar} />
          <span><b>{item.authorName}</b><small>{displayDate(item.createdAt)}</small></span>
        </button>
      </header>
      <button type="button" className="community-feed-open" onClick={openPost}>
        <span className="community-feed-copy">
          <b>{item.recipeTitle || item.body.slice(0, 72) || "A new community post"}</b>
          {item.body && <span>{item.body}</span>}
          {item.recipeTitle && <small><ChefHat />Saved recipe</small>}
        </span>
        {thumbnail && <img src={thumbnail} alt="" />}
      </button>
      <PostReactionBar active={item.activeReaction} counts={item.reactionCounts} comments={item.commentCount} onReact={onReact} onComments={openPost} />
    </article>
  );
}

export function CommunityPostDetail({ item, profile, comments, draft, setDraft, submitting, error, close, openAuthor, openRecipe, onReact, submit }: {
  item: CommunityFeedView;
  profile: Profile;
  comments: CommunityCommentView[];
  draft: string;
  setDraft: (value: string) => void;
  submitting: boolean;
  error: string;
  close: () => void;
  openAuthor: () => void;
  openRecipe: (recipe: Recipe) => void;
  onReact: (reaction: ReactionKind) => void;
  submit: () => void;
}) {
  const hero = item.image || item.recipe?.image;
  return (
    <section className="community-post-detail" aria-label="Community post detail">
      <header className="community-post-detail-bar">
        <button type="button" onClick={close} aria-label="Back to community"><ArrowLeft /></button>
        <h1>Post</h1>
        <span />
      </header>
      <div className="community-post-detail-scroll">
        {hero && <img className="community-post-detail-hero" src={hero} alt="" />}
        <div className="community-post-detail-content">
          <button type="button" className="community-post-author" onClick={openAuthor}>
            <Avatar name={item.authorName} image={item.authorAvatar} />
            <span><b>{item.authorName}</b><small>{displayDate(item.createdAt)}</small></span>
          </button>
          {item.body && <p className="community-post-body">{item.body}</p>}
          {item.recipe && (
            <button type="button" className="community-detail-recipe" onClick={() => openRecipe(item.recipe!)}>
              <img src={item.recipe.image} alt="" />
              <span><small>SAVED RECIPE</small><b>{item.recipe.title}</b></span>
              <ChefHat />
            </button>
          )}
          {!item.recipe && item.recipeTitle && <div className="community-detail-recipe unavailable"><ChefHat /><span><small>SAVED RECIPE</small><b>{item.recipeTitle}</b></span></div>}
          <PostReactionBar active={item.activeReaction} counts={item.reactionCounts} comments={item.commentCount} onReact={onReact} onComments={() => undefined} />

          <section className="community-comments" aria-labelledby="community-comments-title">
            <h2 id="community-comments-title">Conversation <span>{comments.length || item.commentCount}</span></h2>
            {comments.map(comment => (
              <article key={comment.id}>
                <Avatar name={comment.authorName} image={comment.authorAvatar} />
                <div><b>{comment.authorName}</b><p>{comment.body}</p></div>
              </article>
            ))}
            {!comments.length && !item.commentCount && <p className="community-comments-empty">Start the conversation.</p>}
          </section>
        </div>
      </div>
      <form className="community-reply" onSubmit={event => { event.preventDefault(); submit(); }}>
        <Avatar name={profile.name || "You"} image={profile.avatar} />
        <label><span>Reply as {profile.name || "you"}</span><textarea inputMode="text" enterKeyHint="send" rows={1} maxLength={500} value={draft} onChange={event => setDraft(event.target.value)} /></label>
        <button type="submit" disabled={!draft.trim() || submitting} aria-label="Send reply"><Send /></button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
