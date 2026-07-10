import { Camera, FlameKindling } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { FoodCamera } from "../components/FoodCamera";
import { FoodPhotoImg } from "../components/FoodPhotoImg";
import { sumNutrition, type FoodPhoto } from "../foodAnalysis";

export function FoodLogScreen({ logs, addPhoto, back, allergies }: { logs: FoodPhoto[]; addPhoto: (p: FoodPhoto) => void; back: () => void; allergies: string[] }) {
  const grouped = logs.reduce<Record<string, FoodPhoto[]>>((acc, l) => {
    const day = l.when.split(",")[0] || l.when.slice(0, 6);
    return { ...acc, [day]: [...(acc[day] || []), l] };
  }, {});

  return (
    <div className="screen">
      <TopBar title="Food photo log" back={back} />
      <FoodCamera label="📸 Log a meal with photo" onSave={addPhoto} allergies={allergies} />
      {Object.keys(grouped).length === 0 && (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <Camera size={36} style={{ color: "var(--blue-deep)" }} />
          <h2>No meals logged yet</h2>
          <p>Photograph a meal above, Moody estimates the calories and macros so you can track without counting.</p>
        </div>
      )}
      {Object.entries(grouped).map(([day, items]) => {
        const totals = sumNutrition(items);
        return (
          <div key={day} className="flog-day">
            <div className="flog-day-header">
              <b>{day}</b>
              <span><FlameKindling size={13} /> {totals.calories} kcal total</span>
            </div>
            <div className="flog-grid">
              {items.map(p => (
                <div key={p.id} className="flog-card">
                  <FoodPhotoImg photo={p} placeholder="flog-noimg" />
                  <div className="flog-info">
                    <b>{p.dish}</b>
                    <span><FlameKindling size={12} /> {p.calories} kcal</span>
                    <span className="flog-macros">P {p.protein}g · C {p.carbs}g · F {p.fat}g</span>
                    <span className="flog-conf">{p.confidence}% confidence</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <p className="quiet" style={{ padding: "0 4px" }}>Calorie estimates are calculated from visual analysis. They are informational only and not a substitute for professional nutritional advice.</p>
    </div>
  );
}
