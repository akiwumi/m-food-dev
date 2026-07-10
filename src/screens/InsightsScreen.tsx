import { BarChart3, Sparkles, Clock3, ShieldCheck } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import type { Recipe } from "../data";

export function InsightsScreen({ diary }: { diary: { recipe: Recipe; rating: number; when: string }[] }) {
  const cuisines = new Set(diary.map(d => d.recipe.cuisine)).size;
  const varietyScore = Math.min(96, diary.length * 12 + cuisines * 8);
  const avgTime = diary.length ? Math.round(diary.reduce((a, d) => a + d.recipe.time, 0) / diary.length) : 0;
  if (!diary.length) return (
    <div className="screen"><TopBar title="Weekly reflection" />
      <div className="empty-state" style={{ margin: "40px 16px" }}>
        <BarChart3 /><h2>No cooks logged yet</h2>
        <p>Once you log your first meal, Moody will show patterns, variety scores, and personalised reflections here.</p>
      </div>
    </div>
  );
  return <div className="screen"><TopBar title="Weekly reflection" /><section className="insight-lead"><span>VARIETY SCORE</span><b>{varietyScore}</b><em>Looking balanced</em><p>You cooked {diary.length} meal{diary.length !== 1 ? "s" : ""} across {cuisines} cuisine{cuisines !== 1 ? "s" : ""}. {avgTime ? `Average cook time: ${avgTime} min.` : ""}</p></section><div className="insight-cards"><article><Sparkles /><b>Your profile</b><h2>Personalised picks</h2><p>Every recommendation is ranked against your food-psychology profile. The more you cook, the sharper it gets.</p></article><article><Clock3 /><b>Your rhythm</b><h2>{avgTime ? `~${avgTime} min average` : "Build your rhythm"}</h2><p>{avgTime < 30 ? "Quick meals are your sweet spot. Moody will protect that on low-energy nights." : avgTime < 45 ? "You strike a good balance between speed and depth." : "You invest real time in cooking, Moody will keep surfacing recipes worth it."}</p></article><article><ShieldCheck /><b>Informational only</b><h2>Nutrition, without judgment</h2><p>These reflections use recipe snapshots and are not medical advice.</p></article></div></div>;
}
