import { TopBar } from "../components/AppChrome";
import type { Recipe } from "../data";

export function PlannerScreen(_: { open: (r: Recipe) => void }) {
  return <div className="screen"><TopBar title="This week" /><p className="quiet">Enough structure to help, enough room to change your mind.</p><div className="planner">{["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, n) => <article key={day}><b>{day}<span>{n + 1}</span></b><button className="empty">+ Add dinner</button></article>)}</div></div>;
}
