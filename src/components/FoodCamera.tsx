import type React from "react";
import { useState } from "react";
import { ShieldCheck, Check, Camera, Search } from "lucide-react";
import { IMAGE_FILE_ACCEPT, readSafeImage } from "../security";
import { makeFoodLog, flaggedAllergens, type FoodPhoto } from "../foodAnalysis";
import { searchFoods, primaryServing, type NutritionFood } from "../nutrition";
import { callFn } from "../api/backend";

type Fields = { dish: string; calories: string; protein: string; carbs: string; fat: string; fiber: string };
const EMPTY: Fields = { dish: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" };
type VisionAnalysis = Partial<{
  dish: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  allergens: string[];
}>;
type VisionReply = { analysis?: VisionAnalysis; error?: string };

function fieldsFromVision(analysis: VisionAnalysis | undefined, hint?: { recipeCalories?: number; recipeName?: string }): Fields {
  return {
    dish: typeof analysis?.dish === "string" && analysis.dish.trim() ? analysis.dish : hint?.recipeName ?? "",
    calories: Number.isFinite(analysis?.calories) ? String(Math.round(analysis!.calories!)) : hint?.recipeCalories ? String(hint.recipeCalories) : "",
    protein: Number.isFinite(analysis?.protein) ? String(Math.round(analysis!.protein!)) : "",
    carbs: Number.isFinite(analysis?.carbs) ? String(Math.round(analysis!.carbs!)) : "",
    fat: Number.isFinite(analysis?.fat) ? String(Math.round(analysis!.fat!)) : "",
    fiber: Number.isFinite(analysis?.fiber) ? String(Math.round(analysis!.fiber!)) : "",
  };
}

// Capture a meal photo. Moody tries to read the plate through ai-gateway; if that
// is unavailable, the user can still use recipe calories, FatSecret lookup, or
// manual entry. Source labels keep the provenance explicit.
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
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState("");
  const [visionAllergens, setVisionAllergens] = useState<string[]>([]);

  const dishAllergens = visionAllergens.length ? visionAllergens : hint?.allergens ?? [];
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
      setVisionError("");
      setVisionAllergens([]);
      setImage(img);
      setVisionLoading(true);
      try {
        const reply = await callFn<VisionReply>("ai-gateway", {
          task: "analyze-food",
          image: img,
          hint: { recipeName: hint?.recipeName, recipeCalories: hint?.recipeCalories, allergens: allergies },
        });
        if (reply.analysis && !reply.error) {
          setForm(fieldsFromVision(reply.analysis, hint));
          setVisionAllergens(Array.isArray(reply.analysis.allergens) ? reply.analysis.allergens : []);
          setSource("vision");
        } else {
          setVisionError("Moody could not read this photo. You can still look it up or enter the numbers.");
        }
      } catch {
        setVisionError("Moody could not read this photo. You can still look it up or enter the numbers.");
      } finally {
        setVisionLoading(false);
      }
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

  const reset = () => { setImage(null); setForm(EMPTY); setLookup({ loading: false, results: null }); setVisionError(""); setVisionAllergens([]); setVisionLoading(false); };

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
          <div className="flf-field">
            <label className="flf-label" htmlFor="food-log-dish">Dish</label>
            <div className="flf-dish-row">
              <input id="food-log-dish" value={form.dish} onChange={e => set("dish", e.target.value)} placeholder="e.g. Chicken caesar salad" />
              <button type="button" className="flf-lookup" onClick={runLookup} disabled={!form.dish.trim() || lookup.loading}>
                <Search size={15} />{lookup.loading ? "…" : "Look up"}
              </button>
            </div>
          </div>

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

          {visionLoading && <p className="flf-source">Moody is reading the plate…</p>}
          {visionError && <p className="flf-source">{visionError}</p>}

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
            {source === "vision" && "Moody estimated this from the photo. Check and edit anything that looks off."}
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
        <input type="file" accept={IMAGE_FILE_ACCEPT} onChange={e => pick(e.target.files?.[0])} />
      </label>
    );
  }

  if (compact) {
    return (
      <label className="food-camera-compact" style={style}>
        <Camera size={16} />{label}
        <input type="file" accept={IMAGE_FILE_ACCEPT} onChange={e => pick(e.target.files?.[0])} />
      </label>
    );
  }

  return (
    <label className="food-camera-btn" style={style}>
      <Camera size={20} />{label}
      <input type="file" accept={IMAGE_FILE_ACCEPT} onChange={e => pick(e.target.files?.[0])} />
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
