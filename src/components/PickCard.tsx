import { Clock3, Users, Check, Heart } from "lucide-react";
import type { Recipe } from "../data";
import { RecipeImage } from "../RecipeImage";
import { stepImageSources } from "../cooking";

export function PickCard({ recipe, servings, open, reject, save, saved }: { recipe: Recipe; servings: number; open: () => void; reject: () => void; save: () => void; saved: boolean }) {
  return <article className="pick-card"><RecipeImage sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} /><div><h2>{recipe.title}</h2><span><Clock3 size={13} />{recipe.time} min</span><span><Users size={13} />Scaled for {servings}</span><span><Check size={13} />safe for everyone</span><button onClick={open}>View recipe</button><button className="reject" onClick={reject}>Not tonight</button></div><button className="save-mini" onClick={save} aria-label={saved ? "Saved" : "Save recipe"}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button></article>;
}
