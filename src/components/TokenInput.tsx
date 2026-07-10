import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { cleanText } from "../security";

export function TokenInput({ tokens, setTokens, placeholder }: { tokens: string[]; setTokens: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const add = (e: FormEvent) => { e.preventDefault(); const c = cleanText(text, 30); if (c) { setTokens([...new Set([...tokens, c])]); setText(""); } };
  return <>
    <form className="add-cue" onSubmit={add}><input value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} /><button><Plus /></button></form>
    {!!tokens.length && <div className="choice" style={{ marginTop: 8 }}>{tokens.map(t => <button className="custom-cue" onClick={() => setTokens(tokens.filter(x => x !== t))} key={t}>{t}<X size={13} /></button>)}</div>}
  </>;
}
