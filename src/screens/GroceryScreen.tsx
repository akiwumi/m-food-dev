import { useState, type FormEvent } from "react";
import { ShoppingCart, Check, Plus } from "lucide-react";
import { TopBar } from "../components/AppChrome";
import { toggle } from "../lib/toggle";
import { cleanText } from "../security";

export function GroceryScreen({ items, setItems }: { items: string[]; setItems: (v: string[]) => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [entry, setEntry] = useState("");
  const add = (e: FormEvent) => { e.preventDefault(); const item = cleanText(entry, 80); if (item && !items.includes(item)) setItems([...items, item]); setEntry(""); };
  return <div className="screen"><TopBar title="Grocery" /><div className="grocery-hero"><ShoppingCart /><div><b>{items.length - checked.length} items left</b><p>One calm lap around the store.</p></div></div>{items.length ? <div className="grocery-list"><small>YOUR LIST</small>{items.map(i => <button className={checked.includes(i) ? "checked" : ""} onClick={() => setChecked(toggle(checked, i))} key={i}><span><Check /></span><p>{i}</p></button>)}</div> : <div className="empty-state" style={{ margin: "18px 0" }}><ShoppingCart /><h2>Your list is empty</h2><p>Add ingredients here, or send them straight from any recipe.</p></div>}<form className="add-cue" onSubmit={add}><input value={entry} onChange={e => setEntry(e.target.value)} placeholder="Add an item" /><button aria-label="Add item"><Plus /></button></form></div>;
}
