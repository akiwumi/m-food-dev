import { BarChart3, Sparkles, Clock3, ShieldCheck, Compass } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import type { Recipe } from "../data";

// A gentle, deterministic variety / deficit nudge from the logged diary (vision
// §4.4). Honest and non-medical: it only names what the log shows. Returns null
// when there's nothing worth flagging. Variety (cuisine concentration) is checked
// before the plant-forward deficit.
function varietyNudge(diary: { recipe: Recipe }[]): { title: string; text: string } | null {
  const total = diary.length;
  if (total < 3) return null;
  const counts = new Map<string, number>();
  for (const { recipe } of diary) if (recipe.cuisine) counts.set(recipe.cuisine, (counts.get(recipe.cuisine) ?? 0) + 1);
  const [topCuisine, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  if (topCuisine && topCount / total >= 0.6) {
    return {
      title: "Room to roam",
      text: `${topCount} of your ${total} recent meals were ${topCuisine}. A different cuisine this week would lift your variety — want Moody to pull one?`,
    };
  }
  const vegForward = diary.filter(({ recipe }) => recipe.diets.some(d => ["Vegetarian", "Vegan"].includes(d))).length;
  if (vegForward / total < 0.34) {
    return {
      title: "Add a few plants",
      text: `Only ${vegForward} of your ${total} logged meals were plant-forward. A couple more veg-led dinners would round things out nicely.`,
    };
  }
  return null;
}

export function InsightsScreen({ diary }: { diary: { recipe: Recipe; rating: number; when: string }[] }) {
  const cuisines = new Set(diary.map(d => d.recipe.cuisine)).size;
  const varietyScore = Math.min(96, diary.length * 12 + cuisines * 8);
  const avgTime = diary.length ? Math.round(diary.reduce((a, d) => a + d.recipe.time, 0) / diary.length) : 0;
  const nudge = varietyNudge(diary);
  if (!diary.length) return (
    <div className="screen"><TopBar title="Weekly reflection" />
      <div className="empty-state" style={{ margin: "40px 16px" }}>
        <BarChart3 /><h2>No cooks logged yet</h2>
        <p>Once you log your first meal, Moody will show patterns, variety scores, and personalised reflections here.</p>
      </div>
    </div>
  );
  return <div className="screen"><TopBar title="Weekly reflection" /><section className="insight-lead"><span>VARIETY SCORE</span><b>{varietyScore}</b><em>Looking balanced</em><p>You cooked {diary.length} meal{diary.length !== 1 ? "s" : ""} across {cuisines} cuisine{cuisines !== 1 ? "s" : ""}. {avgTime ? `Average cook time: ${avgTime} min.` : ""}</p></section>{nudge && <section className="insight-nudge"><Compass size={18} /><div><b>{nudge.title}</b><p>{nudge.text}</p></div></section>}<div className="insight-cards"><article><Sparkles /><b>Your profile</b><h2>Personalised picks</h2><p>Every recommendation is ranked against your food-psychology profile. The more you cook, the sharper it gets.</p></article><article><Clock3 /><b>Your rhythm</b><h2>{avgTime ? `~${avgTime} min average` : "Build your rhythm"}</h2><p>{avgTime < 30 ? "Quick meals are your sweet spot. Moody will protect that on low-energy nights." : avgTime < 45 ? "You strike a good balance between speed and depth." : "You invest real time in cooking, Moody will keep surfacing recipes worth it."}</p></article><article><ShieldCheck /><b>Informational only</b><h2>Nutrition, without judgment</h2><p>These reflections use recipe snapshots and are not medical advice.</p></article></div></div>;
}
