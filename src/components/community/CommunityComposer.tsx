import { useEffect, useRef } from "react";
import { Camera, ChefHat, Globe2, ImagePlus, Pencil, Send, Users, X } from "lucide-react";
import type { Recipe } from "../../data";
import type { PostVisibility } from "../../community";
import type { Profile } from "../../store";
import { PostImageEditor } from "../PostImageEditor";
import { Avatar } from "../misc";

type Props = {
  open: boolean;
  profile: Profile;
  text: string;
  setText: (value: string) => void;
  images: string[];
  editingImageIndex: number | null;
  setEditingImageIndex: (value: number | null) => void;
  updateImage: (index: number, image: string) => void;
  removeImage: (index: number) => void;
  recipeId: string;
  setRecipeId: (value: string) => void;
  recipes: Recipe[];
  visibility: PostVisibility;
  setVisibility: (value: PostVisibility) => void;
  showVisibility: boolean;
  posting: boolean;
  error: string;
  upload: (files?: FileList | null) => void;
  close: () => void;
  publish: () => void;
};

export function CommunityComposer(props: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedRecipe = props.recipes.find(recipe => recipe.id === props.recipeId);
  const canPublish = !!(props.text.trim() || props.images.length || props.recipeId) && !props.posting;

  useEffect(() => {
    if (!props.open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") props.close(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [props.open]);

  if (!props.open) return null;
  return (
    <section className="community-composer-screen" role="dialog" aria-modal="true" aria-label="Create a community post">
      <header>
        <button type="button" className="community-cancel-button" onClick={props.close}>Cancel</button>
        <h1>New post</h1>
        <button type="button" className="community-share-button" onClick={props.publish} disabled={!canPublish}>
          <Send />{props.posting ? "Publishing" : "Publish"}
        </button>
      </header>

      <div className="community-composer-body">
        <div className="community-composer-author">
          <Avatar name={props.profile.name || "You"} image={props.profile.avatar} />
          <div><b>{props.profile.name || "You"}</b><span>Share with your cooking community</span></div>
        </div>
        <textarea
          id="community-post-message"
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

        {props.editingImageIndex !== null && props.images[props.editingImageIndex] && (
          <PostImageEditor
            image={props.images[props.editingImageIndex]}
            index={props.editingImageIndex}
            onCancel={() => props.setEditingImageIndex(null)}
            onSave={image => {
              props.updateImage(props.editingImageIndex!, image);
              props.setEditingImageIndex(null);
            }}
          />
        )}

        {props.images.length > 0 && (
          <div className="community-composer-images">
            {props.images.map((src, index) => (
              <figure key={`${src.slice(0, 32)}-${index}`}>
                <img src={src} alt={`Post preview ${index + 1}`} />
                <figcaption>
                  <button type="button" onClick={() => props.setEditingImageIndex(index)} aria-label={`Edit image ${index + 1}`}><Pencil /></button>
                  <button type="button" onClick={() => props.removeImage(index)} aria-label={`Remove image ${index + 1}`}><X /></button>
                </figcaption>
              </figure>
            ))}
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

        {props.showVisibility && <div className="community-visibility" aria-label="Post visibility">
          <button type="button" aria-pressed={props.visibility === "connections"} onClick={() => props.setVisibility("connections")}><Users />Friends</button>
          <button type="button" aria-pressed={props.visibility === "public"} onClick={() => props.setVisibility("public")}><Globe2 />Public</button>
        </div>}
        {props.error && <p className="community-publish-error" role="alert">{props.error}</p>}
      </div>

      <footer className="community-composer-tools">
        <label><ImagePlus /><span>Add photos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => props.upload(event.target.files)} /></label>
        <span><Camera />Photos make cooking posts easier to discover</span>
      </footer>
    </section>
  );
}
