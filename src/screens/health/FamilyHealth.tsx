import { Users } from "lucide-react";
import { TopBar } from "../../components/AppChrome";
import { Trend, Avatar } from "../../components/misc";
import type { Recipe } from "../../data";
import type { Diner } from "../../store";

export function FamilyHealth({ diary, diners, back }: { diary: { recipe: Recipe; rating: number; when: string }[]; diners: Diner[]; back: () => void }) {
  const familySize = Math.max(1, diners.length);
  const safeCoverage = Math.round((diners.filter(d => d.allergies.length || d.diet !== "Anything").length / familySize) * 100);
  // All metrics below are derived from real logged meals, no placeholder data.
  const n = diary.length;
  const uniqueRecipes = new Set(diary.map(d => d.recipe.id)).size;
  const plantForward = n ? Math.round(diary.filter(d => d.recipe.diets?.some(x => ["Vegetarian", "Vegan"].includes(x))).length / n * 100) : 0;
  const avgTime = n ? Math.round(diary.reduce((a, d) => a + d.recipe.time, 0) / n) : 0;
  const avgRating = n ? diary.reduce((a, d) => a + d.rating, 0) / n : 0;
  const varietyLabel = !n ? "-" : uniqueRecipes >= 8 ? "Excellent" : uniqueRecipes >= 4 ? "Good" : "Building";
  return <div className="screen family-health"><TopBar title="Family health" back={back} /><section className="family-hero"><Users /><span>HOUSEHOLD PROFILE</span><h1>How family meals are trending.</h1><p>Aggregate analytics only. Individual moods, psychological profiles, and private diaries are not shown here.</p><div><b>{familySize}</b><small>registered diners</small><b>{diary.length}</b><small>family meals logged</small></div></section>{n ? <><div className="metric-grid"><article><span>Shared meal variety</span><b>{varietyLabel}</b></article><article><span>Plant-forward meals</span><b>{plantForward}%</b></article><article><span>Average family cook</span><b>{avgTime} min</b></article><article><span>Safety profiles complete</span><b>{safeCoverage}%</b></article></div><section className="trend-preview"><h2>Family meal balance</h2><Trend label="Plant-forward meals" value={plantForward} /><Trend label="Recipe variety" value={Math.min(100, uniqueRecipes * 12)} /><Trend label="Home-cooked rhythm" value={Math.min(100, n * 18)} /><Trend label="Shared appeal" value={Math.round(avgRating * 20)} /></section></> : <div className="empty-state" style={{ margin: "18px 0" }}><Users /><h2>No family meals logged yet</h2><p>Cook and log meals with household diners selected, and their trends will appear here.</p></div>}<section className="family-members"><h2>Household coverage</h2>{diners.map(d => <div key={d.id}><Avatar name={d.name} /><span><b>{d.name}</b><small>{d.relationship} · {d.diet}</small></span><em>{d.allergies.length ? `${d.allergies.length} safety rule${d.allergies.length > 1 ? "s" : ""}` : "Basic profile"}</em></div>)}</section></div>;
}
