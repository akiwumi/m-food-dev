import { useState } from "react";
import { X, Plus } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { Avatar } from "../components/misc";
import { cleanText } from "../security";
import type { Diner } from "../store";

export function DinersScreen({ diners, save, back }: { diners: Diner[]; save: (d: Diner[]) => void; back: () => void }) {
  const [adding, setAdding] = useState(false); const [name, setName] = useState("");
  return <div className="screen"><TopBar title="Household diners" back={back} /><p className="quiet">Select these people during mood check-in. MoodFood combines every selected diner’s hard safety constraints.</p><div className="diner-list">{diners.map(d => <article key={d.id}><Avatar name={d.name} /><div><b>{d.name}</b><span>{d.relationship} · {d.diet}</span><small>{d.allergies.length ? `Avoid: ${d.allergies.join(", ")}` : "No saved allergens"}</small></div>{d.id !== "self" && <button onClick={() => save(diners.filter(x => x.id !== d.id))}><X /></button>}</article>)}</div>{adding ? <form className="add-diner" onSubmit={e => { e.preventDefault(); if(cleanText(name, 80)) save([...diners,{id:crypto.randomUUID(),name:cleanText(name, 80),relationship:"Guest",diet:"Anything",allergies:[]}]); setName(""); setAdding(false); }}><input value={name} onChange={e=>setName(e.target.value)} placeholder="Diner name" /><button className="primary">Add diner</button></form> : <button className="secondary" onClick={() => setAdding(true)}><Plus />Add household diner</button>}</div>;
}
