import type React from "react";
import { useState } from "react";
import { ShieldCheck, Check, Camera, Search } from "lucide-react";
import { readSafeImage } from "../security";
import { makeFoodLog, flaggedAllergens, type FoodPhoto } from "../foodAnalysis";
import { searchFoods, primaryServing, type NutritionFood } from "../nutrition";

type Fields = { dish: string; calories: string; protein: string; carbs: string; fat: string; fiber: string };
const EMPTY: Fields = { dish: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" };

// Capture a meal photo, then log it with HONEST numbers only. Nothing is guessed
// from the pixels: calories can be prefilled from the recipe you cooked, looked up
// in the FatSecret food database, or typed in by hand — and blank means unknown,
// not zero-guessed. See src/foodAnalysis.ts for the data model.
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
  hint?: { recipeCalories?: number; recipeName?: string; allergens?: string[] };
  allergies?: string[];
  compact?: boolean;
  tile?: boolean;
  style?: React.CSSProperties;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [form, setForm] = useState<Fields>(EMPTY);
  const [source, setSource] = useState<FoodPhoto["source"]>("manual");
  const [lookup, setLookup] = useState<{ loading: boolean; results: NutritionFood[] | null }>({ loading: false, results: null });

  const dishAllergens = hint?.allergens ?? [];
  const flagged = flaggedAllergens(dishAllergens, allergies);

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      const img = await readSafeImage(file);
      setForm({
        ...EMPTY,
        dish: hint?.recipeName ?? "",
        calories: hint?.recipeCalories ? String(hint.recipeCalories) : "",
      });
      setSource(hint?.recipeCalories ? "recipe" : "manual");
      setLookup({ loading: false, results: null });
      setImage(img);
    } catch {
      /* unreadable image, stay on the trigger */
    }
  };

  // Editing a number means the value is now the user's own — mark it manual.
  const set = (key: keyof Fields, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    if (key !== "dish") setSource("manual");
  };

  const runLookup = async () => {
    const query = form.dish.trim();
    if (!query) return;
    setLookup({ loading: true, results: null });
    const results = await searchFoods(query);
    setLookup({ loading: false, results: results ?? [] });
  };

  const applyFood = (food: NutritionFood) => {
    const s = primaryServing(food);
    if (!s) return;
    setForm(f => ({
      ...f,
      calories: String(Math.round(s.calories)),
      protein: String(Math.round(s.protein)),
      carbs: String(Math.round(s.carbs)),
      fat: String(Math.round(s.fat)),
      fiber: String(Math.round(s.fiber)),
    }));
    setSource("database");
    setLookup({ loading: false, results: null });
  };

  const reset = () => { setImage(null); setForm(EMPTY); setLookup({ loading: false, results: null }); };

  const save = () => {
    if (!image) return;
    onSave(makeFoodLog({
      image,
      dish: form.dish,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      fiber: Number(form.fiber) || 0,
      allergens: dishAllergens,
      source,
    }));
    reset();
  };

  if (image) {
    return (
      <div className="food-log-form" style={style}>
        <img src={image} alt="Your meal" className="flf-photo" />
        <div className="flf-body">
          <label className="flf-field">
            <span className="flf-label">Dish</span>
            <div className="flf-dish-row">
              <input value={form.dish} onChange={e => set("dish", e.target.value)} placeholder="e.g. Chicken caesar salad" />
              <button type="button" className="flf-lookup" onClick={runLookup} disabled={!form.dish.trim() || lookup.loading}>
                <Search size={15} />{lookup.loading ? "…" : "Look up"}
              </button>
            </div>
          </label>

          {lookup.results !== null && (
            <div className="flf-results">
              {lookup.loading && <span className="flf-hint">Searching the food database…</span>}
              {!lookup.loading && lookup.results.length === 0 && <span className="flf-hint">No match found — enter the numbers yourself below.</span>}
              {!lookup.loading && lookup.results.slice(0, 3).map(food => {
                const s = primaryServing(food);
                if (!s) return null;
                return (
                  <button type="button" className="flf-result" key={food.food_id} onClick={() => applyFood(food)}>
                    <b>{food.name}</b>
                    <span>{s.calories} kcal · P {s.protein}g · C {s.carbs}g · F {s.fat}g — {s.description}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flf-macros">
            <NumField label="Calories" unit="kcal" value={form.calories} onChange={v => set("calories", v)} />
            <NumField label="Protein" unit="g" value={form.protein} onChange={v => set("protein", v)} />
            <NumField label="Carbs" unit="g" value={form.carbs} onChange={v => set("carbs", v)} />
            <NumField label="Fat" unit="g" value={form.fat} onChange={v => set("fat", v)} />
            <NumField label="Fibre" unit="g" value={form.fiber} onChange={v => set("fiber", v)} />
          </div>

          {!!flagged.length && (
            <div className="fac-allergen-alert">
              <ShieldCheck size={15} />
              <span>This recipe contains <b>{flagged.join(", ")}</b>, which you flagged as an allergy. Always double-check.</span>
            </div>
          )}

          <p className="flf-source">
            {source === "recipe" && "Calories from this recipe. Look up or edit the rest below."}
            {source === "database" && "Nutrition from the FatSecret food database, per serving."}
            {source === "manual" && "Enter what you know — leave the rest blank. Nothing is guessed from the photo."}
          </p>

          <div className="fac-actions">
            <button className="primary" style={{ flex: 1 }} onClick={save}>Save to diary <Check size={16} /></button>
            <button className="secondary" onClick={reset}>Discard</button>
          </div>
          <small className="fac-disclaimer">Not medical or nutritional advice.</small>
        </div>
      </div>
    );
  }

  if (tile) {
    return (
      <label className="dps-add-tile" style={style}>
        <Camera size={20} />
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pick(e.target.files?.[0])} />
      </label>
    );
  }

  if (compact) {
    return (
      <label className="food-camera-compact" style={style}>
        <Camera size={16} />{label}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pick(e.target.files?.[0])} />
      </label>
    );
  }

  return (
    <label className="food-camera-btn" style={style}>
      <Camera size={20} />{label}
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pick(e.target.files?.[0])} />
    </label>
  );
}

function NumField({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flf-num">
      <span>{label}</span>
      <div className="flf-num-input">
        <input type="number" inputMode="numeric" min={0} value={value} onChange={e => onChange(e.target.value)} placeholder="—" />
        <em>{unit}</em>
      </div>
    </label>
  );
}
