const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
const BLOCKED_IMAGE_TYPES = new Set(["image/svg+xml"]);
const FALLBACK_IMAGE_EXTENSIONS = new Set([
  "avif", "bmp", "gif", "heic", "heics", "heif", "heifs", "jfif", "jpeg", "jpg",
  "pjpeg", "png", "tif", "tiff", "webp",
]);

export const IMAGE_FILE_ACCEPT = "image/*,.avif,.bmp,.gif,.heic,.heics,.heif,.heifs,.jfif,.jpeg,.jpg,.pjpeg,.png,.tif,.tiff,.webp";

export function cleanText(value: string, maxLength = 500) {
  // Intentionally strips control characters from user-supplied text (XSS/log-
  // injection hygiene) — the control-char class in this regex is the point.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

// Reasonable single-address email shape: something@something.tld (no spaces).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// RFC-reserved / placeholder domains that can never receive mail — accepting
// them guarantees a bounce, which hurts the project's email deliverability.
const UNDELIVERABLE_DOMAINS = new Set(["example.com", "example.org", "example.net", "test.com", "email.com", "domain.com"]);
const UNDELIVERABLE_TLDS = /\.(test|example|invalid|local|localhost)$/;

// Common typos in popular mail domains → the address the user almost certainly meant.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmail.con": "gmail.com", "gmail.co": "gmail.com", "gmail.cm": "gmail.com", "gmail.comm": "gmail.com",
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.om": "gmail.com",
  "hotmail.con": "hotmail.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmal.com": "hotmail.com",
  "yahoo.con": "yahoo.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com", "yhaoo.com": "yahoo.com",
  "outlook.con": "outlook.com", "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlook.co": "outlook.com",
  "icloud.con": "icloud.com", "iclould.com": "icloud.com",
  "live.con": "live.com", "aol.con": "aol.com", "protonmail.con": "protonmail.com",
};

export type EmailCheck = { ok: boolean; reason?: string; suggestion?: string };

// Validate an email before we ask the backend to send a confirmation to it.
// Catches malformed addresses, undeliverable placeholder domains, and obvious
// typos (offering a correction) so users don't bounce their own signup.
export function validateEmail(raw: string): EmailCheck {
  const email = (raw ?? "").trim();
  if (!email) return { ok: false, reason: "Enter your email address." };
  if (/\s/.test(email)) return { ok: false, reason: "Email addresses can't contain spaces." };
  if (!EMAIL_RE.test(email)) return { ok: false, reason: "That doesn't look like a valid email address." };

  const at = email.lastIndexOf("@");
  const local = email.slice(0, at + 1);
  const domain = email.slice(at + 1).toLowerCase();

  if (UNDELIVERABLE_DOMAINS.has(domain) || UNDELIVERABLE_TLDS.test(domain)) {
    return { ok: false, reason: "Use a real email address you can receive mail at." };
  }
  const fix = DOMAIN_TYPOS[domain];
  if (fix) return { ok: false, reason: `Did you mean ${local}${fix}?`, suggestion: `${local}${fix}` };

  return { ok: true };
}

// ── Image intake ─────────────────────────────────────────────────────────────
// Photos are persisted as data URLs inside the profile (localStorage, ~5 MB
// quota shared with everything else). Downscaling to ≤1024 px JPEG q0.72 turns
// a ~4 MB upload (~5.3 MB of base64) into roughly 100–250 KB of text while
// staying sharp enough for the AI vision estimate and thumbnail rendering.
const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.72;

export function validateImage(file: File) {
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error("Images must be smaller than 25 MB before compression.");
  const type = file.type.toLowerCase();
  if (BLOCKED_IMAGE_TYPES.has(type)) throw new Error("Use a photo image format, not SVG.");
  if (type.startsWith("image/")) return;
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if ((!type || type === "application/octet-stream") && FALLBACK_IMAGE_EXTENSIONS.has(ext)) return;
  throw new Error("Use an image file.");
}

// Decode a file or data URL, honouring EXIF orientation where supported.
async function decodeImage(source: File | string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof source !== "string" && typeof createImageBitmap === "function") {
    try { return await createImageBitmap(source, { imageOrientation: "from-image" }); }
    catch { /* fall through to <img> decoding */ }
  }
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The image could not be read."));
      img.src = url;
    });
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

// Downscale to MAX_IMAGE_DIMENSION and re-encode as JPEG. Throws if the
// platform cannot decode or a 2D canvas is unavailable.
function toJpegDataUrl(source: ImageBitmap | HTMLImageElement): string {
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("The image could not be read.");
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The image could not be processed.");
  // JPEG has no alpha channel — flatten transparent PNG/WebP onto white.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("The image could not be processed.");
  return dataUrl;
}

// Validate, downscale, and re-encode an uploaded image as a compact JPEG data
// URL so iPhone HEIC/HEIF and other source formats become usable in the app.
export async function readSafeImage(file: File): Promise<string> {
  validateImage(file);
  try { return toJpegDataUrl(await decodeImage(file)); }
  catch { throw new Error("The image could not be converted. Try a different photo."); }
}

// Re-compress an already-stored data URL (one-time repair of legacy oversized
// photo logs). Returns the original string when it cannot be shrunk.
export async function compressDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  try {
    const compressed = toJpegDataUrl(await decodeImage(dataUrl));
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
}

// ── Legacy photo-log compaction (see App mount effect) ──────────────────────
// Total base64 characters photoLogs may hold in localStorage (~1.9 MB binary,
// leaving headroom under the ~5 MB quota shared with the rest of the profile).
const INLINE_PHOTO_BUDGET_CHARS = 2_500_000;
const OVERSIZED_PHOTO_CHARS = 400_000; // ~300 KB binary — recompress above this

// Recompress oversized entries in place, then blank the image (never the
// nutrition data) on entries past the total budget. Logs are newest-first, so
// the newest photos keep their images. Returns null when nothing changed.
export async function compactPhotoLogs<T extends { image: string }>(logs: T[]): Promise<T[] | null> {
  if (!logs.length) return null;
  let changed = false;
  const shrunk: T[] = [];
  for (const log of logs) {
    if (log.image.length > OVERSIZED_PHOTO_CHARS) {
      const image = await compressDataUrl(log.image);
      if (image !== log.image) { shrunk.push({ ...log, image }); changed = true; continue; }
    }
    shrunk.push(log);
  }
  let used = 0;
  const result = shrunk.map(log => {
    used += log.image.length;
    if (used <= INLINE_PHOTO_BUDGET_CHARS || !log.image) return log;
    changed = true;
    return { ...log, image: "" };
  });
  return changed ? result : null;
}
