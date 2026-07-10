import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cleanText } from "../../security";
import type { Profile } from "../../store";

export function QuickTasteStartScreen({
  mood, setMood, energy, setEnergy, time, setTime, profile, save, signin,
}: {
  mood: string;
  setMood: (value: string) => void;
  energy: number;
  setEnergy: (value: number) => void;
  time: number;
  setTime: (value: number) => void;
  profile: Profile;
  save: (patch: { diet: string; allergies: string[] }) => void;
  signin: () => void;
}) {
  const [diet, setDiet] = useState(profile.diet === "Everything" ? "Any" : profile.diet);
  const [allergyText, setAllergyText] = useState(profile.allergies.join(", "));
  const allergies = allergyText.split(",").map(item => cleanText(item, 40)).filter(Boolean);

  return (
    <div className="quick-start">
      <header className="quick-top">
        <div className="ih-logo dark"><img src="/images/logo-1.png" alt="" /><span>MoodFood</span></div>
        <button className="ih-signin dark" onClick={signin}>Sign in</button>
      </header>
      <main className="quick-card">
        <span>TONIGHT, FAST</span>
        <h1>Tell me how dinner feels.</h1>
        <p>Four quick answers. Then I'll pick one safe meal and explain why it fits.</p>

        <label className="quick-field">
          <b>Mood</b>
          <div className="mood-pills">
            {["Tired", "Stressed", "Cozy", "Happy"].map(value => (
              <button key={value} className={mood === value ? "active" : ""} onClick={() => setMood(value)}>{value}</button>
            ))}
          </div>
        </label>

        <label className="quick-field">
          <b>Energy: {energy}%</b>
          <input type="range" min={0} max={100} value={energy} onChange={event => setEnergy(+event.target.value)} />
          <div className="range-label"><span>Keep it easy</span><span>I'm up for more</span></div>
        </label>

        <label className="quick-field">
          <b>Time</b>
          <div className="time-pills">
            {[15, 30, 45, 60].map(value => (
              <button key={value} className={time === value ? "active" : ""} onClick={() => setTime(value)}>{value}</button>
            ))}
          </div>
        </label>

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

        <button className="primary quick-submit" onClick={() => save({ diet: diet === "Any" ? "Everything" : diet, allergies })}>
          Choose <ArrowRight size={18} />
        </button>
      </main>
    </div>
  );
}
