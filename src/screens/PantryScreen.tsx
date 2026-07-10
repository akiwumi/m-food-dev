import { useState, type FormEvent } from "react";
import { Salad, Plus, X, ShoppingCart } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { cleanText } from "../security";
import { PANTRY_GROUPS } from "../onboarding";

// Pantry, a maintainable inventory of what the user has at home. Backed by the
// profile's pantryStaples so it both seeds from onboarding and feeds Moody's
// recommendations ("suggest meals from what I already have").
export function PantryScreen({ items, setItems, addToGrocery }: { items: string[]; setItems: (v: string[]) => void; addToGrocery: (item: string) => void }) {
  const [entry, setEntry] = useState("");
  const have = new Set(items);
  const addItem = (raw: string) => { const item = cleanText(raw, 80); if (item && !have.has(item)) setItems([...items, item]); };
  const remove = (item: string) => setItems(items.filter(i => i !== item));
  const submit = (e: FormEvent) => { e.preventDefault(); addItem(entry); setEntry(""); };
  return <div className="screen pantry"><TopBar title="My pantry" />
    <div className="grocery-hero"><Salad /><div><b>{items.length} item{items.length === 1 ? "" : "s"} stocked</b><p>Keep track of what you have, so Moody can cook from your kitchen.</p></div></div>
    <form className="add-cue" onSubmit={submit}><input value={entry} onChange={e => setEntry(e.target.value)} placeholder="Add something you have" /><button aria-label="Add to pantry"><Plus /></button></form>
    {items.length ? <div className="pantry-items"><small>IN YOUR KITCHEN</small><div className="pantry-chips">{items.map(i => <span className="pantry-chip" key={i}>{i}<button aria-label={`Remove ${i}`} onClick={() => remove(i)}><X size={13} /></button><button className="to-cart" aria-label={`Add ${i} to grocery list`} title="Running low? Add to grocery" onClick={() => addToGrocery(i)}><ShoppingCart size={13} /></button></span>)}</div></div>
      : <div className="empty-state" style={{ margin: "18px 0" }}><Salad /><h2>Your pantry is empty</h2><p>Add staples and ingredients you keep at home. Tap a suggestion below to get started.</p></div>}
    <div className="pantry-suggest"><small>QUICK ADD</small>{PANTRY_GROUPS.map(g => { const opts = g.items.filter(i => !have.has(i)); if (!opts.length) return null; return <div className="pantry-group" key={g.group}><b>{g.group}</b><div className="choice">{opts.map(i => <button onClick={() => addItem(i)} key={i}>{i}</button>)}</div></div>; })}</div>
  </div>;
}
