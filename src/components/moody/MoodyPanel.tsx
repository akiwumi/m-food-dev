import type React from "react";
import { useEffect, useRef, useState, Fragment } from "react";
import { X, ChevronRight, ArrowRight } from "lucide-react";
import { Moody } from "../Moody";
import { VoiceFab } from "./VoiceFab";
import { moodyCandidates, resolveMoodyRecipe } from "../../moodyRecipes";
import { aiChat, MoodyError, type ChatTurn } from "../../ai";
import type { Recipe } from "../../data";
import type { Profile } from "../../store";

export function MoodyPanel({ profile, catalog, loadCatalog, turns, setTurns, close, openRecipe }: { profile: Profile; catalog: Recipe[]; loadCatalog: (query?: string) => Promise<Recipe[]>; turns: ChatTurn[]; setTurns: React.Dispatch<React.SetStateAction<ChatTurn[]>>; close: () => void; openRecipe: (recipe: Recipe) => void }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const latestRecipe = [...turns].reverse().map(turn => resolveMoodyRecipe(turn.recipeId, catalog, profile)).find(Boolean);

  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: { results: { [n: number]: { [n: number]: { transcript: string } } } }) => { setListening(false); void send(e.results[0][0].transcript); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const stopVoice = () => { recognitionRef.current?.abort(); setListening(false); };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = turns;
    setTurns([...turns, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    try {
      const searchableCatalog = await loadCatalog(message);
      const context = {
        profile: { allergies: profile.allergies, diet: profile.diet, dislikedIngredients: profile.dislikedIngredients },
        candidates: moodyCandidates(searchableCatalog),
      };
      const reply = await aiChat(message, context, history);
      // Gateway may return the full recipe object when it found it via server-side search.
      const gatewayRecipe = reply.recipe as Recipe | undefined;
      const selected = gatewayRecipe ?? resolveMoodyRecipe(reply.recipeId, searchableCatalog, profile);
      setTurns(prev => [...prev, { role: "assistant", content: reply.message, recipeId: selected?.id, recipe: gatewayRecipe }]);
    } catch (error) {
      const content = error instanceof MoodyError && error.code === "not-signed-in"
        ? "Please sign in to chat with Moody. Recipe search and your safety filters still work without chat."
        : error instanceof MoodyError && error.code === "not-configured"
          ? "Moody chat is not configured in this app environment yet. Recipe search remains available without AI."
          : "Moody chat is temporarily unavailable. Recipe search and your safety filters are still working.";
      setTurns(prev => [...prev, { role: "assistant", content }]);
    } finally {
      setBusy(false);
    }
  };

  return <div className="panel-bg" onClick={close}><VoiceFab listening={listening} onPress={listening ? stopVoice : startVoice} /><aside className="moody-panel" onClick={e => e.stopPropagation()}><header><Moody /><div><b>Moody</b><span>Your dinner co-pilot</span></div><button onClick={close}><X /></button></header><div className="chat"><p>I can choose dinner, explain a recommendation, or help rescue the step you’re on.</p>{turns.map((t, i) => {
    const linkedRecipe = (t.recipe as Recipe | undefined) ?? resolveMoodyRecipe(t.recipeId, catalog, profile);
    return <Fragment key={i}><p className={t.role === "user" ? "user-message" : "moody-message"}>{t.content}</p>{linkedRecipe && <button className="moody-pick" onClick={() => openRecipe(linkedRecipe)}><img src={linkedRecipe.image} alt="" /><span><small>MOODY’S RECOMMENDATION</small><b>{linkedRecipe.title}</b><em>{linkedRecipe.time} min · {linkedRecipe.reason}</em><strong>View recipe <ChevronRight size={14} /></strong></span></button>}</Fragment>;
  })}{busy && <p className="moody-message">…</p>}<div ref={bottomRef} /></div><div className="prompt-row"><button onClick={() => send("Pick the easiest safe dinner.")}>Pick the easiest</button><button onClick={() => send("I only have 15 minutes.")}>Only 15 minutes</button>{latestRecipe && <button onClick={() => send(`Why are you recommending ${latestRecipe.title}?`)}>Explain this pick</button>}</div><form onSubmit={e => { e.preventDefault(); void send(input); }}><input value={input} onChange={e => setInput(e.target.value)} placeholder="Tell Moody what you need..." /><button disabled={busy}><ArrowRight /></button></form></aside></div>;
}
