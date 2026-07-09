import { useEffect, useRef, useState } from "react";

export const PULL_THRESHOLD = 72;  // px to trigger reload
export const PULL_MAX = 110;       // px max visual travel

export function usePullToRefresh() {
  const [pullY, setPullY] = useState(0);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY === 0) startYRef.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startYRef.current === null || window.scrollY > 0) return;
      const delta = Math.max(0, e.touches[0].clientY - startYRef.current);
      if (delta > 0) {
        // Resist: travel slows as it approaches PULL_MAX
        const clamped = PULL_MAX * (1 - Math.exp(-delta / PULL_MAX));
        setPullY(clamped);
      }
    };
    const onEnd = () => {
      if (pullY >= PULL_THRESHOLD) {
        window.location.reload();
      } else {
        setPullY(0);
      }
      startYRef.current = null;
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [pullY]);

  return pullY;
}
