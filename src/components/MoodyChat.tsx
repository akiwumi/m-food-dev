import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Sparkles, X, ArrowUp, Clock3, ShieldCheck, ChevronRight, Trash2 } from "lucide-react";
import { callFn } from "../api/backend";
import { FALLBACK_FOOD } from "./photos";
import { nextMoodyDragOffset, type MoodyDragPoint, type MoodyDragRect } from "../moodyDrag";
import type { Profile } from "../store";
import type { Recipe } from "../data";

// The frontend chat surface for Moody — the co-pilot whose brain
// (supabase/functions/ai-gateway) was fully built but never called. A floating
// sparkle FAB opens this sheet; it POSTs { task:"chat", message, history,
// context:{profile,picks,candidates} } to the gateway and renders the reply plus
// a tappable recipe card when the gateway returns one (concept-recovery Phase 2).

type ChatRecipe = Recipe | null;
type ChatMessage = { role: "user" | "assistant"; content: string; recipe?: ChatRecipe };

// The gateway responds with { message, recipeId, recipe } on success or { error }
// on failure (401/503/502). Model both so we can degrade gracefully.
type GatewayReply = { message?: string; recipeId?: string; recipe?: ChatRecipe; error?: string };

// Trim the profile to just the safety-relevant fields the gateway's system prompt
// reads — no need to ship the whole object.
function safetyContext(profile: Profile) {
  return {
    allergies: profile.allergies,
    diet: profile.diet,
    dislikedIngredients: profile.dislikedIngredients,
  };
}

// A deterministic, empathetic opener so the first message is never a blank box —
// seeded from the live mood and tonight's already-computed top pick.
function proactiveOpener(mood: string, picks: Recipe[]): string {
  const feeling = mood ? mood.toLowerCase() : "like this";
  const hero = picks[0];
  if (hero) {
    return `You're feeling ${feeling} — I've a ${hero.time}-minute ${hero.title} ready that fits. Want it, or shall we find something else?`;
  }
  return `You're feeling ${feeling}. Tell me what you're in the mood for and I'll find one safe dinner that fits.`;
}

const SUGGESTED = ["Something quick tonight", "I want comfort food", "Surprise me"];

function moodyDragMargin() {
  if (typeof window === "undefined") return 12;
  return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches ? 64 : 12;
}

export function MoodyChat({ profile, mood, picks, candidates, openRecipe }: {
  profile: Profile;
  mood: string;
  picks: Recipe[];
  candidates: Recipe[];
  openRecipe: (recipe: Recipe) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragOffset, setDragOffset] = useState<MoodyDragPoint>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [fabOffset, setFabOffset] = useState<MoodyDragPoint>({ x: 0, y: 0 });
  const [fabDragging, setFabDragging] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatVersionRef = useRef(0);
  const suppressFabClickRef = useRef(false);
  const dragRef = useRef<{
    startOffset: MoodyDragPoint;
    startPointer: MoodyDragPoint;
    startRect: MoodyDragRect;
  } | null>(null);
  const fabDragRef = useRef<{
    startOffset: MoodyDragPoint;
    startPointer: MoodyDragPoint;
    startRect: MoodyDragRect;
  } | null>(null);

  // Seed the proactive opener the first time the sheet is opened (recomputed then
  // so it reflects the mood/picks at that moment).
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: proactiveOpener(mood, picks) }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setDragOffset({ x: 0, y: 0 });
  }, [open]);

  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setDragOffset(nextMoodyDragOffset({
        ...drag,
        pointer: { x: event.clientX, y: event.clientY },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        margin: moodyDragMargin(),
      }));
    };
    const end = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragging]);

  useEffect(() => {
    if (!fabDragging) return;

    const move = (event: PointerEvent) => {
      const drag = fabDragRef.current;
      if (!drag) return;
      const next = nextMoodyDragOffset({
        ...drag,
        pointer: { x: event.clientX, y: event.clientY },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        margin: moodyDragMargin(),
      });
      if (Math.abs(next.x - drag.startOffset.x) > 3 || Math.abs(next.y - drag.startOffset.y) > 3) {
        suppressFabClickRef.current = true;
      }
      setFabOffset(next);
    };
    const end = () => {
      fabDragRef.current = null;
      setFabDragging(false);
      if (suppressFabClickRef.current) {
        window.setTimeout(() => { suppressFabClickRef.current = false; }, 250);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [fabDragging]);

  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = chatRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    dragRef.current = {
      startOffset: dragOffset,
      startPointer: { x: event.clientX, y: event.clientY },
      startRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    };
    setDragging(true);
  };

  const beginFabDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = fabRef.current?.getBoundingClientRect();
    if (!rect) return;
    fabDragRef.current = {
      startOffset: fabOffset,
      startPointer: { x: event.clientX, y: event.clientY },
      startRect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    };
    setFabDragging(true);
  };

  const openFromFab = () => {
    if (suppressFabClickRef.current) {
      suppressFabClickRef.current = false;
      return;
    }
    setOpen(true);
  };

  const resetChat = () => {
    chatVersionRef.current += 1;
    setInput("");
    setLoading(false);
    setMessages([{ role: "assistant", content: proactiveOpener(mood, picks) }]);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const chatVersion = chatVersionRef.current;
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await callFn<GatewayReply>("ai-gateway", {
        task: "chat",
        message: trimmed,
        history,
        context: {
          profile: safetyContext(profile),
          picks: picks.slice(0, 5).map(r => ({ title: r.title, time: r.time, reason: r.reason })),
          candidates: candidates.slice(0, 30).map(r => ({ id: r.id, title: r.title, cuisine: r.cuisine, time: r.time, ingredients: r.ingredients })),
        },
      });
      if (chatVersion !== chatVersionRef.current) return;
      if (reply.error || !reply.message) {
        setMessages(prev => [...prev, { role: "assistant", content: "I couldn't think that through just now. Give me another try in a moment." }]);
      } else {
        // Prefer the full recipe the gateway returns; otherwise resolve the id
        // against the candidates we already have on screen.
        const recipe = reply.recipe ?? (reply.recipeId ? candidates.find(c => c.id === reply.recipeId) ?? null : null);
        setMessages(prev => [...prev, { role: "assistant", content: reply.message!, recipe }]);
      }
    } catch {
      if (chatVersion !== chatVersionRef.current) return;
      // callFn throws when the backend isn't configured or the user isn't signed
      // in — Moody needs a real session to protect the API key.
      setMessages(prev => [...prev, { role: "assistant", content: "I can't reach my kitchen brain right now. Make sure you're signed in and online, then try again." }]);
    } finally {
      if (chatVersion === chatVersionRef.current) setLoading(false);
    }
  };

  return (
    <>
      <button
        className={"moody-fab" + (open ? " hidden" : "") + (fabDragging ? " dragging" : "")}
        aria-label="Chat with Moody"
        onClick={openFromFab}
        onPointerDown={beginFabDrag}
        ref={fabRef}
        style={{ transform: `translate(${fabOffset.x}px, ${fabOffset.y}px)` }}
        title="Drag to move"
      >
        <Sparkles size={22} />
      </button>

      {open && (
        <div className="moody-chat-scrim" onClick={() => setOpen(false)}>
          <div
            className={"moody-chat" + (dragging ? " dragging" : "")}
            role="dialog"
            aria-label="Moody chat"
            ref={chatRef}
            style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
            onClick={e => e.stopPropagation()}
          >
            <header className="moody-chat-head" onPointerDown={beginDrag} title="Drag to move">
              <div className="moody-chat-id">
                <span className="moody-chat-avatar"><Sparkles size={18} /></span>
                <div><b>Moody</b><small>Your dinner co-pilot</small></div>
              </div>
              <div className="moody-chat-actions">
                <button aria-label="Clear Moody chat" title="Clear chat" onClick={resetChat}><Trash2 size={18} /></button>
                <button aria-label="Close" onClick={() => setOpen(false)}><X size={20} /></button>
              </div>
            </header>

            <div className="moody-chat-body" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={"moody-msg " + m.role}>
                  <div className="moody-bubble">{m.content}</div>
                  {m.recipe && (
                    <button className="moody-recipe-card" onClick={() => { openRecipe(m.recipe!); setOpen(false); }}>
                      <img src={m.recipe.image || FALLBACK_FOOD} alt={m.recipe.title} />
                      <span className="mrc-body">
                        <b>{m.recipe.title}</b>
                        <span className="mrc-facts"><Clock3 size={12} /> {m.recipe.time} min <ShieldCheck size={12} /> safety checked</span>
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  )}
                </div>
              ))}
              {loading && <div className="moody-msg assistant"><div className="moody-bubble moody-typing"><i /><i /><i /></div></div>}
            </div>

            {messages.length <= 1 && !loading && (
              <div className="moody-suggested">
                {SUGGESTED.map(s => <button key={s} onClick={() => { void send(s); }}>{s}</button>)}
              </div>
            )}

            <form className="moody-chat-input" onSubmit={e => { e.preventDefault(); void send(input); }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask Moody for dinner…"
                aria-label="Message Moody"
              />
              <button type="submit" aria-label="Send" disabled={!input.trim() || loading}><ArrowUp size={18} /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
