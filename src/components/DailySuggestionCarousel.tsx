import { useEffect, useRef } from "react";
import { Clock3 } from "lucide-react";
import type { Recipe } from "../data";
import { RecipeImage } from "../RecipeImage";
import { stepImageSources } from "../cooking";

export function DailySuggestionCarousel({ suggestions, onPick, showHero = true }: { suggestions: Recipe[]; onPick: (r: Recipe) => void; showHero?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const indexRef = useRef(0);

  const [hero, ...rest] = suggestions.length ? suggestions : [null as unknown as Recipe];
  const carouselItems = showHero ? rest : suggestions;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || carouselItems.length <= 1) return;

    const pause = () => { pausedRef.current = true; };
    // Resume after a short delay so a quick swipe doesn't immediately advance
    const resume = () => { setTimeout(() => { pausedRef.current = false; }, 1200); };

    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);

    const id = setInterval(() => {
      if (pausedRef.current || !el) return;
      const cardWidth = el.scrollWidth / carouselItems.length;
      indexRef.current = (indexRef.current + 1) % carouselItems.length;
      // Snap back to start without animation so the loop feels infinite
      if (indexRef.current === 0) {
        el.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
      } else {
        el.scrollTo({ left: indexRef.current * cardWidth, behavior: "smooth" });
      }
    }, 3000);

    return () => {
      clearInterval(id);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
    };
  }, [carouselItems.length]);

  if (!suggestions.length) return null;

  return (
    <div className="suggestion-section">
      {/* Hero — largest pick (optional) */}
      {showHero && (
        <button className="suggestion-hero" onClick={() => onPick(hero)}>
          <RecipeImage sources={stepImageSources(undefined, hero.image)} alt={hero.title} />
          <div className="suggestion-hero-veil" />
          <div className="suggestion-hero-info">
            <span className="suggestion-cuisine">{hero.cuisine}</span>
            <b className="suggestion-hero-title">{hero.title}</b>
            <span className="suggestion-hero-time"><Clock3 size={12} /> {hero.time} min</span>
          </div>
        </button>
      )}

      {/* Carousel */}
      {carouselItems.length > 0 && <>
        <span className="filter-label" style={{ display: "block", marginTop: showHero ? 14 : 0 }}>
          {showHero ? "More for today" : "Today's picks for you"}
        </span>
        <div className="suggestion-carousel" ref={scrollRef}>
          {carouselItems.map(r => (
            <button key={r.id} className="suggestion-card" onClick={() => onPick(r)}>
              <RecipeImage sources={stepImageSources(undefined, r.image)} alt={r.title} />
              <div className="suggestion-card-veil" />
              <div className="suggestion-card-info">
                <b className="suggestion-title">{r.title}</b>
                <span className="suggestion-card-time"><Clock3 size={10} /> {r.time} min</span>
              </div>
            </button>
          ))}
        </div>
      </>}
    </div>
  );
}
