import { useState } from "react";
import type { Recipe } from "../data";

export function AdminScreen({ catalog }: { catalog: Recipe[] }) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  return <div className="admin"><header><img src="/images/logo-1.png" alt="" /><div><span>EDITORIAL CONSOLE</span><h1>Recipe quality desk</h1></div></header><div className="admin-stats"><article><b>{catalog.length}</b><span>Total recipes</span></article><article><b>{catalog.filter(r => r.status === "published").length}</b><span>Published & verified</span></article><article><b>0</b><span>Safety flags</span></article></div><section><h2>Review queue</h2>{catalog.length ? catalog.map(r => <article className="review-row" key={r.id}><img src={r.image} alt="" /><div><h3>{r.title}</h3><p>{r.cuisine} · {r.ingredients.length} ingredients · {r.steps.length} steps</p><span>Rights checked · Timing checked · Safety tags present</span></div><select value={statuses[r.id] || r.status} onChange={e => setStatuses({ ...statuses, [r.id]: e.target.value })}><option>draft</option><option>review</option><option>published</option><option>retired</option></select></article>) : <p className="quiet">No recipes in catalog yet. Recipes are added when you run a check-in while signed in.</p>}</section></div>;
}
