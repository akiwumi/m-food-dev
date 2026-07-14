import { useEffect, useRef } from "react";
import { Camera, ChefHat, Globe2, ImagePlus, Send, Users, X } from "lucide-react";
import type { Recipe } from "../../data";
import type { PostVisibility } from "../../community";
import type { Profile } from "../../store";
import { Avatar } from "../misc";

type Props = {
  open: boolean;
  profile: Profile;
  text: string;
  setText: (value: string) => void;
  image: string;
  removeImage: () => void;
  recipeId: string;
  setRecipeId: (value: string) => void;
  recipes: Recipe[];
  visibility: PostVisibility;
  setVisibility: (value: PostVisibility) => void;
  posting: boolean;
  error: string;
  upload: (file?: File) => void;
  close: () => void;
  publish: () => void;
};

export function CommunityComposer(props: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedRecipe = props.recipes.find(recipe => recipe.id === props.recipeId);
  const canPublish = !!(props.text.trim() || props.image || props.recipeId) && !props.posting;

  useEffect(() => {
    if (!props.open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [props.open]);

  if (!props.open) return null;
  return (
    <section className="community-composer-screen" aria-label="Create a community post">
      <header>
        <button type="button" className="community-icon-button" onClick={props.close} aria-label="Close post composer"><X /></button>
        <h1>New post</h1>
        <button type="button" className="community-share-button" onClick={props.publish} disabled={!canPublish}>
          <Send />{props.posting ? "Sharing" : "Share"}
        </button>
      </header>

      <div className="community-composer-body">
        <div className="community-composer-author">
          <Avatar name={props.profile.name || "You"} image={props.profile.avatar} />
          <div><b>{props.profile.name || "You"}</b><span>Share with your cooking community</span></div>
        </div>
        <textarea
          ref={textareaRef}
          inputMode="text"
          enterKeyHint="enter"
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck
          maxLength={1000}
          value={props.text}
          onChange={event => props.setText(event.target.value)}
          placeholder="What are you cooking, learning, or craving?"
          aria-label="Post message"
        />

        {props.image && (
          <div className="community-composer-photo">
            <img src={props.image} alt="Post preview" />
            <button type="button" onClick={props.removeImage} aria-label="Remove photo"><X /></button>
          </div>
        )}

        {selectedRecipe && (
          <div className="community-composer-recipe">
            <ChefHat />
            <span><small>LINKED SAVED RECIPE</small><b>{selectedRecipe.title}</b></span>
            <button type="button" onClick={() => props.setRecipeId("")} aria-label="Remove saved recipe link"><X /></button>
          </div>
        )}

        <label className="community-recipe-select">
          <span><ChefHat />Linked saved recipe <small>Optional</small></span>
          <select value={props.recipeId} onChange={event => props.setRecipeId(event.target.value)}>
            <option value="">{props.recipes.length ? "None" : "Save a recipe first"}</option>
            {props.recipes.map(recipe => <option value={recipe.id} key={recipe.id}>{recipe.title}</option>)}
          </select>
        </label>

        <div className="community-visibility" aria-label="Post visibility">
          <button type="button" aria-pressed={props.visibility === "connections"} onClick={() => props.setVisibility("connections")}><Users />Friends</button>
          <button type="button" aria-pressed={props.visibility === "public"} onClick={() => props.setVisibility("public")}><Globe2 />Public</button>
        </div>
        {props.error && <p className="community-publish-error" role="alert">{props.error}</p>}
      </div>

      <footer className="community-composer-tools">
        <label><ImagePlus /><span>Add photo</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => props.upload(event.target.files?.[0])} /></label>
        <span><Camera />Photos make cooking posts easier to discover</span>
      </footer>
    </section>
  );
}
