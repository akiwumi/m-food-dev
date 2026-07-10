import type React from "react";
import { useState } from "react";
import { FlameKindling, ShieldCheck, Check, Camera } from "lucide-react";
import { readSafeImage } from "../security";
import { analyzeFood, flaggedAllergens, type FoodPhoto } from "../foodAnalysis";

export function FoodCamera({
  label = "Log a meal with photo",
  onSave,
  hint,
  allergies = [],
  compact = false,
  tile = false,
  style,
}: {
  label?: string;
  onSave: (p: FoodPhoto) => void;
  hint?: { recipeCalories?: number; recipeName?: string };
  allergies?: string[];
  compact?: boolean;
  tile?: boolean;
  style?: React.CSSProperties;
}) {
  const [state, setState] = useState<"idle" | "analyzing" | "done">("idle");
  const [result, setResult] = useState<FoodPhoto | null>(null);

  const handle = async (file?: File) => {
    if (!file) return;
    try {
      const image = await readSafeImage(file);
      setState("analyzing");
      const analysis = await analyzeFood(image, { ...hint, allergies });
      setResult(analysis);
      setState("done");
    } catch {
      setState("idle");
    }
  };

  const flagged = result ? flaggedAllergens(result.allergens, allergies) : [];

  if (state === "analyzing") {
    return (
      <div className="food-camera-analyzing" style={style}>
        <div className="fca-spinner" />
        <span>Moody is reading your plate…</span>
      </div>
    );
  }

  if (state === "done" && result) {
    return (
      <div className="food-analysis-card" style={style}>
        <img src={result.image} alt="Your meal" className="fac-photo" />
        <div className="fac-body">
          <div className="fac-dish">
            <b>{result.dish}</b>
            <span className="fac-conf">{result.confidence}% confidence</span>
          </div>
          <div className="fac-calories">
            <FlameKindling size={18} /><span className="fac-kcal">{result.calories}</span><span className="fac-unit">kcal</span>
          </div>
          <div className="fac-macros">
            <MacroBar label="Protein" value={result.protein} color="#57aecb" max={60} />
            <MacroBar label="Carbs"   value={result.carbs}   color="#f0c050" max={100} />
            <MacroBar label="Fat"     value={result.fat}     color="#ef9a6a" max={50} />
            <MacroBar label="Fibre"   value={result.fiber}   color="#6acd8c" max={20} />
          </div>
          {/* Allergen warning, flag anything matching the user's profile first. */}
          {!!flagged.length && (
            <div className="fac-allergen-alert">
              <ShieldCheck size={15} />
              <span>Heads up, may contain <b>{flagged.join(", ")}</b>, which you flagged as an allergy. Always double-check.</span>
            </div>
          )}
          {!!result.allergens.length && (
            <div className="fac-allergens">
              <span className="fac-section-label">Allergens detected</span>
              <div className="fac-allergen-chips">
                {result.allergens.map(a => <span key={a} className={flagged.includes(a) ? "allergen-chip danger" : "allergen-chip"}>{a}</span>)}
              </div>
            </div>
          )}
          {!!result.vitamins.length && (
            <div className="fac-vitamins">
              <span className="fac-section-label">Key vitamins &amp; minerals</span>
              {result.vitamins.map(v => (
                <div className="vitamin-row" key={v.name}>
                  <span className="vitamin-name">{v.name}</span>
                  <div className="vitamin-track"><div className="vitamin-fill" style={{ width: `${Math.min(100, v.percentDV)}%` }} /></div>
                  <span className="vitamin-val">{v.amount}{v.unit}{v.percentDV ? ` · ${v.percentDV}% DV` : ""}</span>
                </div>
              ))}
            </div>
          )}
          <div className="fac-actions">
            <button className="primary" style={{ flex: 1 }} onClick={() => { onSave(result); setState("idle"); setResult(null); }}>
              Save to diary <Check size={16} />
            </button>
            <button className="secondary" onClick={() => { setState("idle"); setResult(null); }}>Discard</button>
          </div>
          <small className="fac-disclaimer">Estimates only, not medical or nutritional advice.</small>
        </div>
      </div>
    );
  }

  if (tile) {
    return (
      <label className="dps-add-tile" style={style}>
        <Camera size={20} />
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handle(e.target.files?.[0])} />
      </label>
    );
  }

  if (compact) {
    return (
      <label className="food-camera-compact" style={style}>
        <Camera size={16} />{label}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handle(e.target.files?.[0])} />
      </label>
    );
  }

  return (
    <label className="food-camera-btn" style={style}>
      <Camera size={20} />{label}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handle(e.target.files?.[0])} />
    </label>
  );
}

function MacroBar({ label, value, color, max }: { label: string; value: number; color: string; max: number }) {
  return (
    <div className="macro-row">
      <span className="macro-label">{label}</span>
      <div className="macro-track"><div className="macro-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} /></div>
      <span className="macro-val">{value}g</span>
    </div>
  );
}
