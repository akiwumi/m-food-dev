import { RotateCcw } from "lucide-react";
import { PULL_THRESHOLD } from "../hooks/usePullToRefresh";

export function PullRefreshIndicator({ pullY }: { pullY: number }) {
  const progress = Math.min(pullY / PULL_THRESHOLD, 1);
  const ready = pullY >= PULL_THRESHOLD;
  if (pullY < 2) return null;
  return (
    <div
      className="ptr-indicator"
      style={{ transform: `translateY(${pullY - 44}px)`, opacity: progress }}
    >
      <div
        className={"ptr-circle" + (ready ? " ready" : "")}
        style={{ transform: `rotate(${progress * 210}deg)` }}
      >
        <RotateCcw size={18} />
      </div>
    </div>
  );
}
