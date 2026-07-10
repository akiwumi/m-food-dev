import { Sparkles, Star, ChevronRight } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { FoodPhotoImg } from "../components/FoodPhotoImg";
import { FoodCamera } from "../components/FoodCamera";
import type { Recipe } from "../data";
import type { FoodPhoto } from "../foodAnalysis";

export function DiaryScreen({ diary, open, photoLogs, addPhoto, goFoodLog, allergies }: {
  diary: { recipe: Recipe; rating: number; when: string }[];
  open: (r: Recipe) => void;
  photoLogs: FoodPhoto[];
  addPhoto: (p: FoodPhoto) => void;
  goFoodLog: () => void;
  allergies: string[];
}) {
  const recentPhotos = photoLogs.slice(0, 3);
  return (
    <div className="screen">
      <TopBar title="Your diary" />
      <div className="reflection"><Sparkles /><div><b>Your weekly reflection</b><p>You cooked across three different cuisines. That’s lovely variety.</p></div></div>

      {/* Food photo log strip */}
      <div className="diary-photo-strip">
        <div className="dps-header">
          <b>Meal photo log</b>
          <button className="dps-all" onClick={goFoodLog}>{photoLogs.length > 0 ? `See all ${photoLogs.length}` : "Start logging"} →</button>
        </div>
        {recentPhotos.length > 0 ? (
          <div className="dps-row">
            {recentPhotos.map(p => (
              <div className="dps-thumb" key={p.id}>
                <FoodPhotoImg photo={p} placeholder="dps-thumb-empty" />
                <span>{p.calories} kcal</span>
              </div>
            ))}
            <FoodCamera label="+" onSave={addPhoto} allergies={allergies} compact tile />
          </div>
        ) : (
          <FoodCamera label="📸 Photograph your next meal" onSave={addPhoto} allergies={allergies} />
        )}
      </div>

      <div className="diary-list">
        {diary.map((e, n) => (
          <button onClick={() => open(e.recipe)} key={n}>
            <span>{e.when}</span>
            <img src={e.recipe.image} alt="" />
            <div><h2>{e.recipe.title}</h2><p><Star size={13} fill="currentColor" /> {e.rating}.0 · {e.recipe.time} min</p></div>
            <ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}
