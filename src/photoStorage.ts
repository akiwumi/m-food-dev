import { supabase } from "./supabase";
import type { FoodPhoto } from "./foodAnalysis";

const BUCKET = "food-photos";

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(meta)?.[1] ?? "image/jpeg";
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

// Upload the binary; returns the FoodPhoto to persist (image blanked,
// imagePath set), or the photo unchanged when offline/signed out/on error —
// the inline data URL then remains the fallback.
export async function persistFoodPhoto(photo: FoodPhoto): Promise<FoodPhoto> {
  if (!supabase || !photo.image.startsWith("data:image/")) return photo;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return photo;
  const path = `${user.id}/${photo.id}.jpg`;
  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, dataUrlToBlob(photo.image), { contentType: "image/jpeg", upsert: true });
  return error ? photo : { ...photo, image: "", imagePath: path };
}

// Signed-URL retrieval with an in-memory cache (URLs valid 1 h, refresh at 50 min).
const urlCache = new Map<string, { url: string; expires: number }>();

export async function foodPhotoUrl(path: string): Promise<string | null> {
  const hit = urlCache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  urlCache.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}
