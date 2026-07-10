import { BarChart3, ShieldCheck } from "lucide-react";
import { TopBar } from "../../components/AppChrome";
import type { Recipe } from "../../data";

export function HealthDetail({ kind, diary, back }: { kind: "nutrition" | "variety" | "patterns"; diary: { recipe: Recipe; rating: number; when: string }[]; back: () => void }) {
  const n = diary.length;
  const avgCal   = n ? Math.round(diary.reduce((a, d) => a + d.recipe.calories, 0) / n) : 0;
  const avgTime  = n ? Math.round(diary.reduce((a, d) => a + d.recipe.time, 0) / n) : 0;
  const avgRating = n ? (diary.reduce((a, d) => a + d.rating, 0) / n).toFixed(1) : "-";
  const cuisineCount = new Set(diary.map(d => d.recipe.cuisine)).size;
  const uniqueRecipes = new Set(diary.map(d => d.recipe.id)).size;
  const repeated = n - uniqueRecipes;
  const fiberRich = diary.filter(d => ((d.recipe as any).fiber ?? 0) >= 5).length;
  const plantForward = diary.filter(d => d.recipe.diets?.some(x => ["Vegetarian","Vegan"].includes(x))).length;
  const varietyScore = n ? Math.min(100, Math.round((cuisineCount / Math.max(n, 1)) * 60 + (uniqueRecipes / Math.max(n, 1)) * 40)) : 0;

  const content = kind === "nutrition"
    ? { title: "Nutrition balance", intro: "A source-labeled view of your logged recipes.", cards: [
        ["Average energy",   n ? `${avgCal} cal` : "No data yet"],
        ["Fiber-rich meals",  n ? `${fiberRich} of ${n}` : "No data yet"],
        ["Plant-forward",     n ? `${plantForward} of ${n}` : "No data yet"],
        ["Meals logged",      `${n}`],
      ]}
    : kind === "variety"
    ? { title: "Dietary variety", intro: "How broad your recent food rhythm has been.", cards: [
        ["Variety score",   n ? `${varietyScore} / 100` : "No data yet"],
        ["Cuisines",        n ? `${cuisineCount}` : "0"],
        ["Unique recipes",  `${uniqueRecipes}`],
        ["Repeated",        `${repeated}`],
      ]}
    : { title: "Eating patterns", intro: "Patterns from completed cooks, without judgment.", cards: [
        ["Meals cooked",    `${n}`],
        ["Avg cook time",   n ? `${avgTime} min` : "No data yet"],
        ["Average rating",  n ? `${avgRating} / 5` : "No data yet"],
        ["Cuisines tried",  `${cuisineCount}`],
      ]};

  if (!n) return (
    <div className="screen"><TopBar title={content.title} back={back} />
      <div className="empty-state" style={{ margin: "40px 16px" }}>
        <BarChart3 /><h2>No meals logged yet</h2>
        <p>Cook a recipe and log it to your diary, your real patterns will appear here.</p>
      </div>
    </div>
  );
  return <div className="screen"><TopBar title={content.title} back={back} /><p className="quiet">{content.intro}</p><div className="metric-grid">{content.cards.map(([a, b]) => <article key={a}><span>{a}</span><b>{b}</b></article>)}</div><section className="health-note"><ShieldCheck /><div><b>How this is calculated</b><p>From nutrition snapshots and metadata attached to recipes you completed. It does not diagnose conditions or replace professional advice.</p></div></section></div>;
}
