import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { Choice } from "../../components/misc";
import { toggle } from "../../lib/toggle";
import { cleanText } from "../../security";
import { cookingMoods, skillLevels } from "../../data";
import type { OnboardingQuestion, OnboardingKey, ProfileValue } from "../../onboarding";
import type { Profile } from "../../store";

export function QuestionField({ q, profile, update }: { q: OnboardingQuestion; profile: Profile; update: (k: OnboardingKey, v: ProfileValue) => void }) {
  const value = profile[q.key];
  if (q.type === "single")
    return <Choice values={q.options!} active={value as string} pick={v => update(q.key, v)} />;
  if (q.type === "multi")
    return <MultiField q={q} values={(value as string[]) || []} update={update} />;
  if (q.type === "scale")
    return <div className="scale-field"><input type="range" min={q.min ?? 0} max={q.max ?? 100} value={value as number} onChange={e => update(q.key, +e.target.value)} /><div className="range-label"><span>{q.lowLabel}</span><b>{value as number}%</b><span>{q.highLabel}</span></div></div>;
  if (q.type === "stepper") {
    const n = value as number;
    return <div className="stepper"><button type="button" aria-label={`${q.title}: decrease from ${n}`} onClick={() => update(q.key, Math.max(q.min ?? 1, n - 1))}>−</button><b aria-live="polite">{n}</b><button type="button" aria-label={`${q.title}: increase from ${n}`} onClick={() => update(q.key, Math.min(q.max ?? 99, n + 1))}>+</button></div>;
  }
  if (q.type === "textgrid") {
    const rec = (value as Record<string, string>) || {};
    const rows = q.rowsKey ? ((profile[q.rowsKey] as string[]) || []) : (q.rows || []);
    if (!rows.length) return <p className="multi-hint">Pick some moods earlier and they'll show up here.</p>;
    return <div className="mood-defs">{rows.map(row => <label key={row}><b>{row}</b><input value={rec[row] || ""} onChange={e => update(q.key, { ...rec, [row]: e.target.value })} placeholder={q.placeholder} /></label>)}</div>;
  }
  if (q.type === "record-single") {
    const rec = (value as Record<string, string>) || {};
    const active = rec[q.subKey!] || "";
    return <Choice values={q.options!} active={active} pick={v => update(q.key, { ...rec, [q.subKey!]: active === v ? "" : v })} />;
  }
  if (q.type === "grouped-multi")
    return <GroupedMultiField q={q} values={(value as string[]) || []} update={update} />;
  if (q.type === "moodcards")
    return <MoodCardsField values={(value as string[]) || []} update={v => update(q.key, v)} />;
  if (q.type === "skillcards")
    return <SkillCardsField active={value as string} pick={v => update(q.key, v)} />;
  return null;
}

function GroupedMultiField({ q, values, update }: { q: OnboardingQuestion; values: string[]; update: (k: OnboardingKey, v: ProfileValue) => void }) {
  const [custom, setCustom] = useState("");
  const grouped = q.groups!.flatMap(g => g.items);
  const extras = values.filter(v => !grouped.includes(v));
  return <>
    {q.groups!.map(g => <div className="ob-group" key={g.group}>
      <div className="ob-group-label">{g.group}{g.note && <em>{g.note}</em>}</div>
      <div className="choice">{g.items.map(v => <button type="button" aria-pressed={values.includes(v)} className={values.includes(v) ? "active" : ""} onClick={() => update(q.key, toggle(values, v))} key={v}>{v}</button>)}</div>
    </div>)}
    {q.allowCustom && <form className="add-cue" onSubmit={e => { e.preventDefault(); const c = cleanText(custom, 40); if (c) { update(q.key, [...new Set([...values, c])]); setCustom(""); } }}><input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Add your own" /><button type="submit" aria-label="Add option"><Plus /></button></form>}
    {!!extras.length && <div className="choice" style={{ marginTop: 8 }}>{extras.map(v => <button type="button" className="custom-cue" onClick={() => update(q.key, values.filter(x => x !== v))} key={v}>{v}<X size={13} /></button>)}</div>}
    <p className="multi-hint">{values.length ? `${values.length} selected, pick as many as you like` : "Select all that apply"}</p>
  </>;
}

function MoodCardsField({ values, update }: { values: string[]; update: (v: string[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return <>
    <div className="mood-cards">{cookingMoods.map(m => {
      const sel = values.includes(m.label);
      const expanded = open === m.id;
      return <div className={"mood-pick-card" + (sel ? " selected" : "")} key={m.id}>
        <button type="button" aria-pressed={sel} className="mpc-top" onClick={() => update(toggle(values, m.label))}>
          <span className="mpc-emoji">{m.emoji}</span>
          <span className="mpc-head"><b>{m.label}</b><em>{m.tagline}</em></span>
          {sel && <Check size={17} className="mpc-check" />}
        </button>
        <button type="button" className="mpc-more" onClick={() => setOpen(expanded ? null : m.id)}>{expanded ? "Less" : "What this means"}</button>
        {expanded && <div className="mpc-body">
          <p>{m.what}</p>
          <ul>{m.descriptors.map(d => <li key={d}>{d}</li>)}</ul>
          <div className="mpc-vibes">{m.vibes.map(v => <span key={v}>{v}</span>)}<small>{m.timeHint}</small></div>
        </div>}
      </div>;
    })}</div>
    <p className="multi-hint">{values.length ? `${values.length} selected, pick as many as you like` : "Pick at least one"}</p>
  </>;
}

function SkillCardsField({ active, pick }: { active: string; pick: (v: string) => void }) {
  return <div className="skill-cards">{skillLevels.map(s => <button type="button" aria-pressed={active === s.label} className={"skill-pick-card" + (active === s.label ? " selected" : "")} onClick={() => pick(s.label)} key={s.id}>
    <span className="spc-emoji">{s.emoji}</span>
    <span className="spc-text"><b>{s.label}</b><em>{s.desc}</em><small>{s.detail}</small></span>
    {active === s.label && <Check size={17} className="spc-check" />}
  </button>)}</div>;
}

function MultiField({ q, values, update }: { q: OnboardingQuestion; values: string[]; update: (k: OnboardingKey, v: ProfileValue) => void }) {
  const [custom, setCustom] = useState("");
  const extras = values.filter(v => !q.options!.includes(v));
  return <>
    <div className="choice">{q.options!.map(v => <button type="button" aria-pressed={values.includes(v)} className={values.includes(v) ? "active" : ""} onClick={() => update(q.key, toggle(values, v))} key={v}>{v}</button>)}</div>
    {q.allowCustom && <form className="add-cue" onSubmit={e => { e.preventDefault(); const c = cleanText(custom, 40); if (c) { update(q.key, [...new Set([...values, c])]); setCustom(""); } }}><input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Add your own" /><button type="submit" aria-label="Add option"><Plus /></button></form>}
    {extras.map(v => <button type="button" className="custom-cue" onClick={() => update(q.key, values.filter(x => x !== v))} key={v}>{v}<X size={13} /></button>)}
    <p className="multi-hint">{values.length ? `${values.length} selected, pick as many as you like` : "Select all that apply"}</p>
  </>;
}
