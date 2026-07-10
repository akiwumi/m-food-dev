import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { PLANS } from "../appTypes";
import { toggle } from "../lib/toggle";

// Small shared presentational leaves lifted out of App.tsx (Phase 3 PR 2).

export function SetupStep({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: ReactNode }) { return <section className="setup-step"><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p>{children}</section>; }

export function Choice({ values, active, pick, multi }: { values: string[]; active: string | string[]; pick: (v: string) => void; multi?: boolean }) { return <div className="choice">{values.map(v => <button className={(multi ? (active as string[]).includes(v) : active === v) ? "active" : ""} onClick={() => pick(v)} key={v}>{v}</button>)}</div>; }

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) { return <section className="settings-group"><small>{title}</small>{children}</section>; }

export function ProfileEditor({ title, text, children }: { title: string; text: string; children: ReactNode }) { return <section className="profile-editor"><h2>{title}</h2><p>{text}</p>{children}</section>; }

export function Avatar({ name, image }: { name: string; image?: string }) { return image ? <img className="avatar-img" src={image} alt={name} /> : <span className="avatar-fallback">{name.split(" ").map(v => v[0]).join("").slice(0, 2)}</span>; }

export function Trend({ label, value }: { label: string; value: number }) { return <div className="trend"><span><b>{label}</b><em>{value}%</em></span><i><b style={{ width: `${value}%` }} /></i></div>; }

export function PlanPicker({ plan, setPlan }: { plan: string; setPlan: (p: string) => void }) {
  return <>{PLANS.map(p => <button key={p.id} className={plan === p.id ? "active" : ""} onClick={() => setPlan(p.id)}><div><b>{p.name}</b><span>{p.note}</span></div><strong>{p.price}</strong></button>)}</>;
}

export function EditableCues({ values, suggestions, save }: { values: string[]; suggestions: string[]; save: (v: string[]) => void }) {
  const [custom, setCustom] = useState("");
  return <><div className="choice">{suggestions.map(v => <button className={values.includes(v) ? "active" : ""} onClick={() => save(toggle(values, v))} key={v}>{v}</button>)}</div><form className="add-cue" onSubmit={e => { e.preventDefault(); if (custom.trim()) { save([...new Set([...values, custom.trim()])]); setCustom(""); } }}><input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Add your own cue" /><button><Plus /></button></form>{values.filter(v => !suggestions.includes(v)).map(v => <button className="custom-cue" onClick={() => save(values.filter(x => x !== v))} key={v}>{v}<X size={13} /></button>)}</>;
}
