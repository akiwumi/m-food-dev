import { useState } from "react";
import { Clock3, ShieldCheck, Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { RecipeImage } from "../../RecipeImage";
import { stepImageSources } from "../../cooking";
import { Moody } from "../../components/Moody";
import { activationFitReason, adjustQuickStartAfterRejection, selectActivationPicks, type RejectionReason } from "../../activation";
import type { Profile } from "../../store";
import type { Recipe } from "../../data";

const REJECTION_OPTIONS: { id: RejectionReason; label: string }[] = [
  { id: "too-much-effort", label: "Too much effort" },
  { id: "not-in-the-mood", label: "Not in the mood" },
  { id: "too-expensive", label: "Too expensive" },
  { id: "missing-ingredients", label: "Missing ingredients" },
  { id: "too-heavy", label: "Too heavy" },
  { id: "repeated-recently", label: "Had this recently" },
];

export function FirstPickScreen({
  profile, recipes, mood, energy, time, setContext, openRecipe, continueToTrial,
}: {
  profile: Profile;
  recipes: Recipe[];
  mood: string;
  energy: number;
  time: number;
  setContext: (context: { mood: string; energy: number; time: number }) => void;
  openRecipe: (recipe: Recipe) => void;
  continueToTrial: () => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const available = recipes.filter(recipe => !dismissed.includes(recipe.id));
  const picks = selectActivationPicks({ recipes: available, profile, mood, energy, time });
  const fit = picks.hero ? activationFitReason({ recipe: picks.hero, profile, mood, energy, time }) : "";

  const reject = (reason: RejectionReason) => {
    if (picks.hero) setDismissed([...dismissed, picks.hero.id]);
    setContext(adjustQuickStartAfterRejection({ mood, energy, time }, reason));
  };

  return (
    <div className="first-pick">
      <header className="quick-top">
        <div className="ih-logo dark"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
      </header>
      {picks.hero ? (
        <main className="first-pick-main">
          <span>DINNER IS HANDLED</span>
          <h1>{picks.hero.title}</h1>
          <RecipeImage className="first-pick-image" sources={stepImageSources(undefined, picks.hero.image)} alt={picks.hero.title} />
          <div className="first-pick-facts">
            <span><Clock3 size={14} /> {picks.hero.time} min</span>
            <span><ShieldCheck size={14} /> Safety checked</span>
            <span><Sparkles size={14} /> {mood}</span>
          </div>
          <div className="moody-note first-pick-note"><Moody /><p>{fit}</p></div>
          <div className="first-pick-actions">
            <button className="primary" onClick={() => openRecipe(picks.hero!)}>View recipe <ArrowRight size={17} /></button>
            <button className="secondary" onClick={continueToTrial}>Save this profile</button>
          </div>
          <section className="reject-box">
            <b>Not tonight?</b>
            <div>
              {REJECTION_OPTIONS.map(option => (
                <button key={option.id} onClick={() => reject(option.id)}>{option.label}</button>
              ))}
            </div>
          </section>
          {!!picks.backups.length && (
            <section className="backup-picks">
              <h2>Backups</h2>
              {picks.backups.map(recipe => (
                <button key={recipe.id} onClick={() => openRecipe(recipe)}>
                  <RecipeImage sources={stepImageSources(undefined, recipe.image)} alt={recipe.title} />
                  <span><b>{recipe.title}</b><small>{recipe.time} min · {recipe.reason}</small></span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </section>
          )}
        </main>
      ) : (
        <main className="first-pick-main">
          <span>TRY AGAIN</span>
          <h1>I couldn't find a safe match yet.</h1>
          <p>Change your time, diet, or allergies and I'll try again.</p>
          <button className="primary" onClick={continueToTrial}>Continue</button>
        </main>
      )}
    </div>
  );
}
