import { useState, type MouseEvent } from "react";
import { ArrowLeft, Share2, Heart, Play, X, Clock3, Users, Star, Check, Info, ShoppingCart, ChefHat } from "lucide-react";
import { RecipeImage } from "../RecipeImage";
import { stepImageSources, displayStepDetail } from "../cooking";
import { toggle } from "../lib/toggle";
import { Moody } from "../components/Moody";
import { FoodCamera } from "../components/FoodCamera";
import { searchFoods, type NutritionFood } from "../nutrition";
import type { Recipe } from "../data";
import type { FoodPhoto } from "../foodAnalysis";

export function DetailScreen({ recipe, servings, back, cook, saved, toggleSave, addGroceries, addPhoto, shareToCommunity, allergies }: { recipe: Recipe; servings: number; back: () => void; cook: () => void; saved: boolean; toggleSave: () => void; addGroceries: () => void; addPhoto: (p: FoodPhoto) => void; shareToCommunity: () => void; allergies: string[] }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [nutriQuery, setNutriQuery] = useState<string | null>(null);
  const [nutriFoods, setNutriFoods] = useState<NutritionFood[] | null>(null);
  const [nutriLoading, setNutriLoading] = useState(false);

  const lookupIngredient = (ingredient: string, e: MouseEvent) => {
    e.stopPropagation();
    setNutriFoods(null);
    setNutriQuery(ingredient);
    setNutriLoading(true);
    searchFoods(ingredient)
      .then(foods => { setNutriFoods(foods); setNutriLoading(false); })
      .catch(() => setNutriLoading(false));
  };

  // Native share when the browser supports it (mobile), else share into the
  // in-app community feed.
  const share = async () => {
    const url = recipe.sourceUrl || (typeof location !== "undefined" ? location.href : "");
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: recipe.title, text: recipe.reason, url: url || undefined }); return; } catch { /* cancelled → fall through */ }
    }
    shareToCommunity();
  };
  return <div className="detail"><div className="detail-image">{showVideo && recipe.video ? <div className="detail-video-hero"><iframe src={`${recipe.video}?autoplay=1`} title={`${recipe.title} video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <RecipeImage sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} />}<button onClick={back}><ArrowLeft /></button><div><button onClick={share} aria-label="Share recipe"><Share2 /></button><button onClick={toggleSave} aria-label={saved ? "Saved" : "Save recipe"}><Heart fill={saved ? "currentColor" : "none"} /></button></div>{recipe.video && !showVideo && <button className="detail-video-bar" onClick={() => setShowVideo(true)}><Play size={15} fill="currentColor" />Watch video</button>}{recipe.video && showVideo && <button className="detail-video-bar" onClick={() => setShowVideo(false)}><X size={15} />Close video</button>}</div><section className="detail-sheet"><h1>{recipe.title}</h1><div className="facts"><span><Clock3 />{recipe.time} min</span><span><Users />Serves {servings}</span><span><Star />{recipe.calories} cal each</span></div><div className="moody-note"><Moody /><p>{recipe.reason}</p></div><div className="section-line"><h2>Ingredients</h2><span>{recipe.ingredients.length} items</span></div><div className="ingredients">{recipe.ingredients.map(i => <div className={`ing-row${checked.includes(i) ? " checked" : ""}`} role="button" tabIndex={0} onClick={() => setChecked(toggle(checked, i))} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setChecked(toggle(checked, i)); }} key={i}><span><Check size={14} /></span><p>{i}</p><em>{checked.includes(i) ? "Ready" : "I have it"}</em><button className="ing-info-btn" onClick={e => lookupIngredient(i, e)} aria-label={`Nutrition info for ${i}`}><Info size={14} /></button></div>)}</div><div className="section-line"><h2>Full cooking method</h2><span>{recipe.steps.length} steps</span></div><div className="recipe-method">{recipe.steps.map((step, index) => <article key={`${index}-${step.text}`}><b>{index + 1}</b><div><p>{displayStepDetail(step)}</p>{step.cue && <small><strong>Look for:</strong> {step.cue}</small>}</div></article>)}</div><div className="detail-actions"><button className="secondary" onClick={addGroceries}><ShoppingCart size={18} />Add to grocery</button><button className="secondary" onClick={share}><Share2 size={18} />Share recipe</button></div><FoodCamera label="📸 Log your version with a photo" onSave={p => addPhoto({ ...p, recipeId: recipe.id })} hint={{ recipeCalories: recipe.calories, recipeName: recipe.title }} allergies={allergies} style={{ marginTop: 10 }} /><button className="primary sticky-cta" onClick={cook}><ChefHat size={18} />Open guided cooking</button></section>{nutriQuery !== null && <div className="nutri-overlay" onClick={() => setNutriQuery(null)}><div className="nutri-sheet" onClick={e => e.stopPropagation()}><div className="nutri-handle" /><div className="nutri-header"><b>{nutriQuery}</b><button onClick={() => setNutriQuery(null)} aria-label="Close"><X size={18} /></button></div>{nutriLoading && <div className="nutri-loading"><div className="nutri-spinner" /><span>Looking up nutrition…</span></div>}{!nutriLoading && nutriFoods !== null && nutriFoods.length === 0 && <p className="nutri-empty">No nutrition data found for this ingredient.</p>}{!nutriLoading && nutriFoods && nutriFoods.slice(0, 3).map(food => { const s = food.servings[0]; if (!s) return null; return <div className="nutri-item" key={food.food_id}><div className="nutri-item-head"><b>{food.name}</b>{food.type === "Brand" && <span className="nutri-tag">Brand</span>}</div><span className="nutri-serving-desc">{s.description}</span><div className="nutri-macros"><div className="nutri-mac"><strong>{s.calories}</strong><small>kcal</small></div><div className="nutri-mac"><strong>{s.protein}g</strong><small>protein</small></div><div className="nutri-mac"><strong>{s.carbs}g</strong><small>carbs</small></div><div className="nutri-mac"><strong>{s.fat}g</strong><small>fat</small></div>{s.fiber > 0 && <div className="nutri-mac"><strong>{s.fiber}g</strong><small>fibre</small></div>}</div></div>; })}<p className="nutri-disclaimer">FatSecret data · per serving · not medical advice</p></div></div>}</div>;
}
