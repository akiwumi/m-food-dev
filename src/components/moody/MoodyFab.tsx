import type React from "react";
import { memo, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

// Floating "Ask Moody" button the user can drag anywhere on screen. A short drag
// repositions it (and the position persists); a tap opens Moody. Position is
// clamped to the viewport and re-clamped on resize/orientation change.
export const MoodyFab = memo(function MoodyFab({ onOpen }: { onOpen: () => void }) {
  const SIZE = 52, MARGIN = 16, NAV = 92, THRESHOLD = 6;
  const clamp = (x: number, y: number) => ({
    x: Math.max(MARGIN, Math.min(x, window.innerWidth - SIZE - MARGIN)),
    y: Math.max(MARGIN, Math.min(y, window.innerHeight - SIZE - MARGIN)),
  });
  const defaultPos = () => ({ x: window.innerWidth - SIZE - MARGIN, y: window.innerHeight - SIZE - NAV });
  const [pos, setPos] = useState(() => {
    try { const s = localStorage.getItem("moodyFabPos"); if (s) return clamp(JSON.parse(s).x, JSON.parse(s).y); } catch { /* ignore */ }
    return defaultPos();
  });
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Keep it on-screen if the viewport changes (rotation, resize, keyboard).
  useEffect(() => {
    const onResize = () => setPos(p => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    suppressClick.current = false; // start fresh so a stale flag never eats a tap
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
      setPos(p => { try { localStorage.setItem("moodyFabPos", JSON.stringify(p)); } catch { /* ignore */ } return p; });
    } else {
      onOpen(); // a tap opens Moody
    }
    suppressClick.current = true; // swallow the synthesized click the browser fires next
  };
  // Keyboard activation (Enter/Space) fires click with no preceding pointer events.
  const onClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    onOpen();
  };

  return <button
    ref={ref}
    className="moody-fab"
    style={{ left: pos.x, top: pos.y, right: "auto", bottom: "auto", touchAction: "none", cursor: "grab" }}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onClick={onClick}
    aria-label="Ask Moody (drag to move)"
  ><Sparkles /></button>;
});
