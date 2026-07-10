import { useState } from "react";
import { ArrowLeft, Timer, Clock3, Check, Star } from "lucide-react";
import { RecipeImage } from "../RecipeImage";
import { stepImageSources, displayStepDetail, formatTimer } from "../cooking";
import { FoodCamera } from "../components/FoodCamera";
import type { Recipe } from "../data";
import type { FoodPhoto } from "../foodAnalysis";

export function CookScreen({ recipe, exit, finish, allergies }: { recipe: Recipe; exit: () => void; finish: (rating: number, photo?: FoodPhoto) => void; allergies: string[] }) {
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(5);
  const [mealPhoto, setMealPhoto] = useState<FoodPhoto | null>(null);
  if (!recipe.steps.length) return <div className="cook cook-unavailable"><section className="cook-instruction-card"><h1>Instructions unavailable.</h1><p>This recipe did not include cooking steps.</p><button className="cook-next" onClick={exit}>Back to recipe</button></section></div>;
  return <div className="cook">
    <header className="cook-header">
      <button className="cook-circle" onClick={exit} aria-label="Close cook mode"><ArrowLeft /></button>
      <b>{recipe.title}</b>
      <span />
    </header>
    <RecipeImage className="cook-image" sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} />
    <div className="cook-method-head"><span>FULL METHOD</span><h1>Cook from top to bottom.</h1><p>Every instruction stays visible. Scroll naturally as you work.</p></div>
    <div className="cook-method">{recipe.steps.map((current, index) => <section className="cook-instruction-card" key={`${index}-${current.text}`}>
      <small>STEP {index + 1} OF {recipe.steps.length}</small>
      <p className="cook-step-text">{displayStepDetail(current)}</p>
      {current.cue && <div className="cook-cue"><b>Look for:</b> {current.cue}</div>}
      {(current.active?.length || current.equipment?.length) && <div className="cook-chips">{current.active?.map(item => <span key={`ingredient-${item}`}>{item}</span>)}{current.equipment?.map(item => <span className="equipment" key={`equipment-${item}`}>{item}</span>)}</div>}
      {current.timer && <div className="cook-timer"><span><Timer size={17} /></span><div><b>{formatTimer(current.timer)}</b><small>Verified cooking time</small></div><i><Clock3 size={16} /></i></div>}
    </section>)}</div>
    <button className="cook-finish" onClick={() => setDone(true)}><Check size={18} />I’m finished cooking</button>
    {done && <div className="finish-overlay"><section><div className="done-mark"><Check /></div><h2>Dinner is ready.</h2><p>How did it land tonight?</p><div className="stars">{[1,2,3,4,5].map(n => <button onClick={() => setRating(n)} key={n}><Star fill={n <= rating ? "currentColor" : "none"} /></button>)}</div>{mealPhoto ? <div className="photo-preview-mini"><img src={mealPhoto.image} alt="Your meal" /><span><b>{mealPhoto.calories} kcal</b> estimated · {mealPhoto.dish}</span></div> : <FoodCamera label="📸 Add a photo of your cook" onSave={p => setMealPhoto({ ...p, recipeId: recipe.id })} allergies={allergies} compact />}<button className="primary" onClick={() => finish(rating, mealPhoto ?? undefined)}>Log meal &amp; finish</button><button className="text" onClick={() => setDone(false)}>Back to cooking</button></section></div>}
  </div>;
}
