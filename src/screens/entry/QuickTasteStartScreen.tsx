import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cleanText } from "../../security";
import type { Profile } from "../../store";

export function QuickTasteStartScreen({
  mood, setMood, time, setTime, profile, save, signin,
}: {
  mood: string;
  setMood: (value: string) => void;
  energy: number;
  setEnergy: (value: number) => void;
  time: number;
  setTime: (value: number) => void;
  profile: Profile;
  save: (patch: { diet: string; allergies: string[]; dislikedIngredients: string[]; skill: string; cuisines: string[]; cookingMood: string; weeknightTime: string }) => void;
  signin: () => void;
}) {
  const [diet, setDiet] = useState(profile.diet === "Everything" ? "Any" : profile.diet);
  const [allergyText, setAllergyText] = useState(profile.allergies.join(", "));
  const [dislikeText, setDislikeText] = useState(profile.dislikedIngredients.join(", "));
  const [skill, setSkill] = useState(profile.skill || "Comfortable");
  const [cuisine, setCuisine] = useState(profile.cuisines[0] || "Italian");
  const allergies = allergyText.split(",").map(item => cleanText(item, 40)).filter(Boolean);
  const dislikedIngredients = dislikeText.split(",").map(item => cleanText(item, 40)).filter(Boolean);

  return (
    <div className="quick-start">
      <header className="quick-top">
        <div className="ih-logo dark"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
        <button type="button" className="ih-signin dark" onClick={signin}>Sign in</button>
      </header>
      <main className="quick-card">
        <span>TONIGHT, FAST</span>
        <h1>Tell me how dinner feels.</h1>
        <p>Seven quick answers. Then I'll pick one safe meal and explain why it fits.</p>

        <fieldset className="quick-field">
          <legend>Mood</legend>
          <div className="mood-pills">
            {["Tired", "Stressed", "Cozy", "Happy"].map(value => (
              <button type="button" key={value} aria-pressed={mood === value} className={mood === value ? "active" : ""} onClick={() => setMood(value)}>{value}</button>
            ))}
          </div>
        </fieldset>

        <fieldset className="quick-field">
          <legend>Time</legend>
          <div className="time-pills">
            {[15, 30, 45, 60].map(value => (
              <button type="button" key={value} aria-pressed={time === value} className={time === value ? "active" : ""} onClick={() => setTime(value)}>{value}</button>
            ))}
          </div>
        </fieldset>

        <label className="quick-field">
          <b>Diet</b>
          <select className="cuisine-select" value={diet} onChange={event => setDiet(event.target.value)}>
            {["Any", "Vegetarian", "Vegan", "Pescatarian", "Gluten-free", "Dairy-free"].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="quick-field">
          <b>Allergies</b>
          <input value={allergyText} onChange={event => setAllergyText(event.target.value)} placeholder="e.g. peanuts, dairy" />
        </label>

        <label className="quick-field">
          <b>Hard no's</b>
          <input value={dislikeText} onChange={event => setDislikeText(event.target.value)} placeholder="e.g. mushrooms, olives" />
        </label>

        <label className="quick-field">
          <b>Cooking confidence</b>
          <select className="cuisine-select" value={skill} onChange={event => setSkill(event.target.value)}>
            {["Beginner", "Comfortable", "Confident", "Expert"].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="quick-field">
          <b>Cuisine</b>
          <select className="cuisine-select" value={cuisine} onChange={event => setCuisine(event.target.value)}>
            {["Italian", "Mediterranean", "Thai", "Indian", "Mexican", "Japanese", "Middle Eastern", "West African"].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <button type="button" className="primary quick-submit" onClick={() => save({
          diet: diet === "Any" ? "Everything" : diet,
          allergies,
          dislikedIngredients,
          skill,
          cuisines: [cuisine],
          cookingMood: mood,
          weeknightTime: `${time} min`,
        })}>
          Choose <ArrowRight size={18} />
        </button>
      </main>
    </div>
  );
}
