import { useState } from "react";
import { Flame, X } from "lucide-react";
import type { Recipe } from "../../data";
import type { TrendingRecipe } from "../../communityRanking";
import { RecipeImage } from "../../RecipeImage";
import { stepImageSources } from "../../cooking";

export function TrendingRail({ items, openRecipe, dismiss }: {
  items: TrendingRecipe[];
  openRecipe: (recipe: Recipe) => void;
  dismiss: (recipeId: string) => void;
}) {
  const [confirmId, setConfirmId] = useState("");
  if (!items.length) return null;
  return (
    <section className="community-trending" aria-labelledby="community-trending-title">
      <header>
        <div><Flame /><h2 id="community-trending-title">Popular with your people</h2></div>
        <span>For your food profile</span>
      </header>
      <div className="community-trending-track">
        {items.map(item => (
          <article key={item.recipe.id} className="community-trending-card">
            <button type="button" className="community-trending-open" onClick={() => openRecipe(item.recipe)}>
              <RecipeImage sources={stepImageSources(undefined, item.recipe.image)} alt="" />
              <span><b>{item.recipe.title}</b><small>{item.reason}</small></span>
            </button>
            <button
              type="button"
              className="community-trending-dismiss"
              onClick={() => setConfirmId(item.recipe.id)}
              aria-label={`Not interested in ${item.recipe.title}`}
              title="Not interested"
            ><X /></button>
            {confirmId === item.recipe.id && (
              <div className="community-trending-confirm">
                <span>See fewer dishes like this?</span>
                <button type="button" onClick={() => { dismiss(item.recipe.id); setConfirmId(""); }}>Not interested</button>
                <button type="button" onClick={() => setConfirmId("")}>Keep</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
