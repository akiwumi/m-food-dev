import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

// Floating draggable mic button shown while the Moody panel is open.
// A short drag repositions it; a tap toggles voice input.
export function VoiceFab({ listening, onPress }: { listening: boolean; onPress: () => void }) {
  const SIZE = 64, MARGIN = 16, THRESHOLD = 6;
  const clamp = (x: number, y: number) => ({
    x: Math.max(MARGIN, Math.min(x, window.innerWidth - SIZE - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, window.innerHeight - SIZE - MARGIN)),
  });
  const [pos, setPos] = useState(() => {
    try { const s = localStorage.getItem("voiceFabPos"); if (s) return clamp(JSON.parse(s).x, JSON.parse(s).y); } catch { /* ignore */ }
    return { x: MARGIN, y: window.innerHeight - SIZE - 260 };
  });
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const onResize = () => setPos(p => ({ x: Math.max(MARGIN, Math.min(p.x, window.innerWidth - SIZE - MARGIN)), y: Math.max(MARGIN, Math.min(p.y, window.innerHeight - SIZE - MARGIN)) }));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false;
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
    try { ref.current?.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && (Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD)) d.moved = true;
    if (d.moved) setPos(clamp(d.ox + dx, d.oy + dy));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current; drag.current = null;
    try { ref.current?.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
    if (!d) return;
    if (d.moved) {
      setPos(p => { try { localStorage.setItem("voiceFabPos", JSON.stringify(p)); } catch { /* ignore */ } return p; });
    } else {
      onPress();
    }
    suppressClick.current = true;
  };
  const onClick = () => { if (suppressClick.current) { suppressClick.current = false; return; } onPress(); };

  return <button ref={ref} className={`voice-fab${listening ? " listening" : ""}`} style={{ left: pos.x, top: pos.y, touchAction: "none", cursor: "grab" }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClick={onClick} aria-label={listening ? "Stop listening" : "Speak to Moody (drag to move)"}><Mic size={28} /></button>;
}
