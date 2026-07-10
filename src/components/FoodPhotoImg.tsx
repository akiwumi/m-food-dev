import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import type { FoodPhoto } from "../foodAnalysis";
import { foodPhotoUrl } from "../photoStorage";

// Renders a persisted food-photo log. Uses the inline data URL when present
// (pre-upload or offline fallback); otherwise resolves a signed URL from the
// private food-photos bucket. Falls back to a placeholder when neither exists.
export function FoodPhotoImg({ photo, className, placeholder }: { photo: FoodPhoto; className?: string; placeholder?: string }) {
  const [url, setUrl] = useState<string | null>(photo.image || null);
  useEffect(() => {
    if (photo.image) { setUrl(photo.image); return; }
    if (!photo.imagePath) { setUrl(null); return; }
    let on = true;
    void foodPhotoUrl(photo.imagePath).then(u => { if (on) setUrl(u); });
    return () => { on = false; };
  }, [photo.image, photo.imagePath]);
  return url
    ? <img src={url} alt={photo.dish} className={className} />
    : <span className={placeholder ?? "photo-placeholder"}><Camera size={16} /></span>;
}
