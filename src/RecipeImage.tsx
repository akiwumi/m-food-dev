import { useState } from "react";

export function RecipeImage({ sources, alt, className = "" }: { sources: string[]; alt: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const source = sources[index];
  if (!source) return <div className={`${className} recipe-image-empty`} role="img" aria-label={`${alt}. Image unavailable`}>Image unavailable</div>;
  return <img className={className} src={source} alt={alt} onError={() => setIndex(value => value + 1)} />;
}
