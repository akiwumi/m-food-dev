# MoodFood — Fix & Optimize Roadmap

**Date:** 2026-07-09 · **Audited by:** Claude Code (full debug pass)

This is the single, self-contained roadmap: every Phase 1 fix and the Phase 3 refactor carry
their complete instructions inline — exact code, commands, verification queries, and acceptance
checks. All line numbers reference `main` as of the audit date. Key claims (supabase-js builder
laziness, the Stripe `past_due` status, the seed/live mood-vocabulary mismatch, dead code) were
verified directly against the repo and `node_modules` source before filing.

## Health check summary (what was verified today)

| Check | Result |
|---|---|
| Test suite (`vitest run`) | ✅ 135/135 passing, 20 files |
| TypeScript strict build (`tsc -b && vite build`) | ✅ clean, builds in ~0.6 s |
| `npm audit` | ✅ 0 vulnerabilities |
| Runtime smoke test (landing → home → check-in → results) | ✅ works, zero console errors |
| Offline fallback (signed out → bundled recipes + honest banner) | ✅ works as designed |
| Bundle output | 333 KB main JS (104 KB gz), vendors already split |

The app is fundamentally healthy. The issues below are ranked by real impact, not
by count — Phase 1 items are genuine bugs, later phases are debt and optimization.

---

## Phase 1 — Bug fixes (do first, ~1 day)

### 1.1 Photo logs will blow the localStorage quota and bloat Supabase rows — **highest risk**

`FoodPhoto.image` is a raw base64 data URL of the uploaded file
([foodAnalysis.ts:15](../src/foodAnalysis.ts), [security.ts:56-64](../src/security.ts)).
The 4 MB file limit means a single photo becomes a **~5.3 MB base64 string**, and it is stored in
`profile.photoLogs`, which is:

1. Persisted to localStorage via `useStoredState` ([store.ts:173](../src/store.ts)) — browsers cap
   localStorage at ~5 MB, so **one large photo can exceed the entire quota**. `writeStored`
   catches the exception and only logs a warning → the whole profile silently stops persisting.
2. Upserted into `profiles.preferences_json` on every profile change via the 1.5 s debounced
   effect ([App.tsx:622-635](../src/App.tsx)) — megabytes of base64 re-sent on every keystroke
   in any profile editor, and unbounded row growth in Postgres.

The fix has four parts, fully specified below: (1) compress at intake — canvas downscale in
`readSafeImage`, all four callers benefit for free; (2) strip `photoLogs` from every
`preferences_json` payload **including the restore path**, which would otherwise clobber
device-local photos on every sign-in; (3) a one-time repair for existing users already over
quota; (4) a follow-up that moves binaries into a private Storage bucket.

Verified against the working tree at `/Users/eugene/WebDev Archive/MoodFood (dev)` (branch `main`, `tsconfig.json` has `"strict": true`, no `noUnusedLocals`).

**Confirmed problem sites**

- `src/security.ts:56-64` — `readSafeImage` returns the raw FileReader data URL (a 4 MB file → ~5.3 MB of base64 text).
- `src/App.tsx:192` — profile lives in `useStoredState<Profile>("moodfood-profile", …)`; `src/store.ts:163-166` (`writeStored`) swallows `QuotaExceededError` with only a `console.warn`, so photo saves can silently stop persisting.
- `src/App.tsx:589-595` — sign-in push upserts `preferences_json: storedProfile` (includes `photoLogs`).
- `src/App.tsx:622-636` — 1.5 s-debounced effect upserts `preferences_json: profile` (includes `photoLogs`) on every profile change.
- `src/App.tsx:578-583` — sign-in restore spreads remote prefs over `defaultProfile` and calls `setProfile(restored)`, which would clobber device-local `photoLogs` once they stop syncing.
- Photo intake: `FoodCamera` (`src/App.tsx:2977-2988`) → `readSafeImage` → `analyzeFood`; six inline `addPhoto` wirings at `src/App.tsx:785, 790, 792, 793, 794, 815`, each doing `photoLogs: [p, ...prev.photoLogs]`.
- AI path: `aiAnalyzeFood` (`src/ai.ts:65-68`) posts the data URL to ai-gateway; the gateway only requires `image.startsWith("data:image/")` (`supabase/functions/ai-gateway/index.ts:104-105`) and forwards it as an OpenAI `image_url` (line 129). A compressed `data:image/jpeg;base64,…` URL passes unchanged — compression actually helps the 15 s timeout in `src/ai.ts:27`.
- `supabase/functions/export-data/index.ts:25-30` and `supabase/functions/delete-account/index.ts:77-89` handle only DB tables; neither touches Storage today (relevant to step 2 below).
- `buildFoodHistory` (`src/recipes.ts:157-166`) reads only `photoLogs[].dish` — unaffected by any change here.

---

#### 1. Image compression in `src/security.ts` (drop-in)

Replace lines 51–64 of `src/security.ts` (`validateImage` stays byte-identical so `src/security.test.ts:37-38` keeps passing; `cleanText`/`validateEmail` untouched). `readSafeImage`'s signature stays `(file: File) => Promise<string>`, so all four callers (`src/App.tsx:1008, 2570, 2612, 2980`) work unchanged — avatars and community-post images get compressed for free.

```ts
// ── Image intake ─────────────────────────────────────────────────────────────
// Photos are persisted as data URLs inside the profile (localStorage, ~5 MB
// quota shared with everything else). Downscaling to ≤1024 px JPEG q0.72 turns
// a ~4 MB upload (~5.3 MB of base64) into roughly 100–250 KB of text while
// staying sharp enough for the AI vision estimate and thumbnail rendering.
const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.72;

export function validateImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Use a JPEG, PNG, or WebP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be smaller than 4 MB.");
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
// URL. Falls back to the raw (already validated ≤4 MB) file only if canvas
// processing is unavailable on this platform.
export async function readSafeImage(file: File): Promise<string> {
  validateImage(file);
  try {
    return toJpegDataUrl(await decodeImage(file));
  } catch {
    return readRawDataUrl(file);
  }
}

function readRawDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
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
```

Notes: EXIF orientation is respected (`createImageBitmap` with `imageOrientation: "from-image"`, and modern `<img>` decode defaults to `image-orientation: from-image`); transparent PNGs flatten to white instead of black; validation errors still surface with the same messages (as promise rejections — every caller already `await`s inside `try/catch`). Optionally update the now-stale comment at `src/foodAnalysis.ts:15` to `// compressed JPEG data-URL (≤1024 px), sized for localStorage`.

#### 2. Exclude `photoLogs` from every `preferences_json` upsert

There are exactly two upsert sites (verified: `grep 'from("profiles")'` matches only `src/App.tsx:572, 589, 627`).

**2a. Add a strip helper at module scope** — insert after the `MOODFOOD_KEYS` block (`src/App.tsx:89-94`):

```ts
// photoLogs carry base64 image data (megabytes). They must never travel in
// preferences_json: they bloat the profiles row, the debounced upsert, and the
// sign-in restore payload. Photos stay on-device (step 2 moves them to Storage).
function prefsForUpsert(p: Profile): Omit<Profile, "photoLogs"> {
  const { photoLogs: _photoLogs, ...prefs } = p;
  return prefs;
}
```

(The `_photoLogs` destructure-with-rest pattern is not flagged under this tsconfig.)

**2b. `src/App.tsx:593`** (sign-in local-profile push, upsert block at 589–595): change

```ts
          preferences_json: storedProfile,
```
to
```ts
          preferences_json: prefsForUpsert(storedProfile),
```

**2c. `src/App.tsx:631`** (debounced upsert, effect at 622–636): change

```ts
        preferences_json: profile,
```
to
```ts
        preferences_json: prefsForUpsert(profile),
```

**2d. Restore path must preserve local photos — `src/App.tsx:578-584`.** Once `photoLogs` stops syncing, `{ ...defaultProfile, ...prefs }` yields `photoLogs: []` and `setProfile(restored)` wipes the device's photos on every `SIGNED_IN`/`TOKEN_REFRESHED` event. Also, legacy rows in Supabase may still carry huge `photoLogs`, which must not be re-imported into localStorage. Replace:

```ts
      if (prefs && prefs.onboarded === true) {
        // Supabase has a completed profile, restore it (handles new-device login).
        const restored = { ...defaultProfile, ...prefs, email: session.user.email ?? "" } as Profile;
        setProfile(restored);
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
        return;
      }
```
with
```ts
      if (prefs && prefs.onboarded === true) {
        // Supabase has a completed profile, restore it (handles new-device login).
        // photoLogs never sync through preferences_json: drop any legacy remote
        // copy and keep whatever photos are already on this device.
        const { photoLogs: _remotePhotoLogs, ...remotePrefs } = prefs;
        const restored = { ...defaultProfile, ...remotePrefs, email: session.user.email ?? "" } as Profile;
        setProfile(prev => ({ ...restored, photoLogs: Array.isArray(prev.photoLogs) ? prev.photoLogs : [] }));
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
        return;
      }
```

Self-healing of legacy rows: that `setProfile` changes `profile`, which re-arms the debounced upsert (`src/App.tsx:622-636`), so 1.5 s after any sign-in the remote `preferences_json` is rewritten without `photoLogs`. No SQL backfill needed.

Not changed deliberately: `src/App.tsx:605` (`setProfile({ ...defaultProfile, … })` for accounts < 10 min old) resets `photoLogs` to `[]` — correct for genuinely new signups. Known remainder: `profile.avatar` (a data URL, `src/App.tsx:1008/2570`) still rides in `preferences_json`; after fix 1 it is ≤ ~250 KB. Moving avatars to the existing `avatars` bucket is a candidate follow-up, out of scope here.

#### 3. Step 2 (follow-up): move photo binaries into private Storage

Migration 005 (`supabase/migrations/005_private_image_storage.sql`) creates only the private buckets `avatars` and `community-images` (4 MB limit, jpeg/png/webp), with all four RLS policies hard-coded to `bucket_id in ('avatars', 'community-images')` and first path folder = `auth.uid()::text`. Food photos therefore need a new bucket + policies.

**3a. New migration `supabase/migrations/017_food_photo_storage.sql`** (016 is taken):

```sql
-- Food photo binaries move out of profiles.preferences_json / localStorage
-- into private Storage. Client re-encodes to <=1024px JPEG, so 1 MB is ample.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-photos', 'food-photos', false, 1048576, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users insert own food photos" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users read own food photos" on storage.objects for select
  to authenticated
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own food photos" on storage.objects for delete
  to authenticated
  using (bucket_id = 'food-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

**3b. Path convention:** `<auth.uid()>/<photo.id>.jpg` (photo IDs are `crypto.randomUUID()`, `src/foodAnalysis.ts:107/138`; the uid-first folder is what the RLS policies key on).

**3c. Type change — `src/foodAnalysis.ts:13-28`:** on `FoodPhoto`, keep `image: string` but document it as `// compressed JPEG data URL; "" once uploaded to Storage`, and add `imagePath?: string; // Storage object path "<uid>/<id>.jpg" in bucket food-photos`. What remains in `photoLogs` (and localStorage): all metadata — dish, macros, vitamins, allergens, confidence, `when`, `recipeId`, `note`, plus `imagePath` — i.e. a few hundred bytes per log.

**3d. Upload code sketch — new `src/photoStorage.ts`:**

```ts
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
```

**3e. Save-path wiring:** replace the six identical inline closures `addPhoto={p => setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }))}` (`src/App.tsx:785, 790, 794, 815`, and the equivalents inside 792's `DetailScreen` prop and 793's `CookScreen finish`) with one shared handler defined in `App()`:

```ts
const addPhoto = (p: FoodPhoto) => {
  setProfile(prev => ({ ...prev, photoLogs: [p, ...prev.photoLogs] }));   // optimistic, instant
  void persistFoodPhoto(p).then(stored => {
    if (stored === p) return;                                             // upload skipped/failed → keep inline copy
    setProfile(prev => ({ ...prev, photoLogs: prev.photoLogs.map(l => (l.id === stored.id ? stored : l)) }));
  });
};
```

AI analysis is unaffected: `FoodCamera` (`src/App.tsx:2980-2982`) analyzes the in-memory data URL *before* `onSave`, so ai-gateway still receives `data:image/jpeg;base64,…`.

**3f. Rendering:** add a resolver component in `src/App.tsx` and use it where persisted logs render — `DiaryScreen` thumb (`src/App.tsx:2231`) and `FoodLogScreen` card (`src/App.tsx:3122`). The `FoodCamera` result card (`src/App.tsx:3004`) and `CookScreen` preview (`src/App.tsx:2203`) show pre-save in-memory photos and stay on `photo.image`.

```tsx
function FoodPhotoImg({ photo, className }: { photo: FoodPhoto; className?: string }) {
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
    : <span className="photo-placeholder"><Camera size={16} /></span>;
}
```

**3g. Governance parity:** deleting the auth user does **not** purge `storage.objects`, and neither edge fn touches Storage today. In `supabase/functions/delete-account/index.ts`, add a best-effort step between step 2 (ends line 89) and step 3: for each bucket in `["food-photos", "avatars", "community-images"]`, `POST ${SUPABASE_URL}/storage/v1/object/list/<bucket>` with body `{ "prefix": "<userId>/", "limit": 1000 }` (service-role headers), then `DELETE ${SUPABASE_URL}/storage/v1/object/<bucket>` with `{ "prefixes": [ "<userId>/<name>", … ] }`. In `supabase/functions/export-data/index.ts`, add a `data.storage_objects` section listing the same per-bucket object names/metadata so "what we hold" stays in lockstep (binaries retrievable by the signed-in user via signed URLs).

#### 4. One-time cleanup of existing oversized `photoLogs`

Add a mount effect in `App()` (place next to the existing mount effect at `src/App.tsx:555`), importing `compactPhotoLogs` from `./security` (extend the import at `src/App.tsx:16`):

```ts
// One-time repair: older builds stored full-resolution photos (up to ~5.3 MB of
// base64 each) in photoLogs, which can exhaust the ~5 MB localStorage quota
// (writeStored swallows the failure). Recompress oversized entries in place and
// blank images past a total budget — newest photos keep theirs, nutrition data
// is always kept. compactPhotoLogs returns null when there is nothing to do,
// so this is a cheap length-scan no-op on healthy profiles.
useEffect(() => {
  let cancelled = false;
  void (async () => {
    const compacted = await compactPhotoLogs(profile.photoLogs);
    if (!cancelled && compacted) setProfile(p => ({ ...p, photoLogs: compacted }));
  })();
  return () => { cancelled = true; };
  // Mount-only by design: repairs the profile as loaded from localStorage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Because blanked entries have `image: ""`, guard the two persisted-log renders (until step 2's `FoodPhotoImg` supersedes this):
- `src/App.tsx:2231` → `{p.image ? <img src={p.image} alt={p.dish} /> : <span className="dps-thumb-empty"><Camera size={16} /></span>}`
- `src/App.tsx:3122` → `{p.image ? <img src={p.image} alt={p.dish} /> : <div className="flog-noimg"><Camera size={18} /></div>}`

No SQL cleanup needed: the restore change (2d) drops legacy remote `photoLogs` on read, and the debounced upsert rewrites the row without them ~1.5 s after sign-in.

#### 5. Acceptance checks

1. **Types/tests:** `npx tsc --noEmit` clean; `npx vitest run` passes (`src/security.test.ts` `validateImage` cases unchanged; SVG and >4 MB files still rejected with the same messages).
2. **Compression:** upload a ~3–4 MB phone JPEG via Diary → FoodCamera; after saving, in DevTools run `JSON.parse(localStorage.getItem("moodfood-profile")).photoLogs[0].image.length` → expect roughly 100 000–350 000 chars (was ~5 000 000+). Portrait photo is not sideways; a transparent PNG upload renders on white, not black.
3. **Upsert payload:** with a signed-in account, log a photo and watch the Network tab `POST /rest/v1/profiles` ~1.5 s later → request body has no `photoLogs` key and is a few KB. Same for the sign-in push path (fresh browser with a completed local profile, then sign in).
4. **Restore preserves local photos:** log 2 photos → sign out → sign in → Diary photo strip still shows both; `photoLogs` in localStorage unchanged. Then confirm the legacy scrub: `select length(preferences_json::text) from profiles where id = '<uid>'` shrinks after sign-in + 2 s, and `preferences_json ? 'photoLogs'` is false.
5. **AI unaffected:** signed in with ai-gateway configured, a logged photo returns a non-simulated analysis (distinct dish name, no 1.8 s fixed delay); ai-gateway logs show 200 for `analyze-food`.
6. **Cleanup:** seed a legacy log (`p = JSON.parse(localStorage.getItem("moodfood-profile")); p.photoLogs = [{...validLog, image: "data:image/jpeg;base64," + "A".repeat(4_000_000)}]; localStorage.setItem("moodfood-profile", JSON.stringify(p))`), reload → entry's image is recompressed or blanked, nutrition fields intact, no `MoodFood could not persist` warning in console, and Diary/FoodLog render the placeholder for blanked entries.
7. **Step 2 (when built):** after logging a photo signed-in, `photoLogs[0].image === ""` and `imagePath === "<uid>/<id>.jpg"`; object exists in the `food-photos` bucket; Diary/FoodLog render via a signed URL (200, expires ~1 h); another user's uid path 403s; delete-account leaves zero objects under `<uid>/` in all three buckets; export-data lists the object paths.

### 1.2 Silent no-op: profile push on sign-in never executes

[App.tsx:589-595](../src/App.tsx) — `supabase.from("profiles").upsert({...})` is a lazy
supabase-js builder; **the request only fires when awaited or `.then()`d**. This call is neither,
so the "local profile is complete, push it to Supabase" branch does nothing, and any error is
invisible. The full audit below contains the primary-source evidence, the exact patch, the
subscription-status fix (§c, see 1.3), a repo-wide floating-promise scan, and acceptance checks.

#### a. Evidence: supabase-js v2 query builders are lazy thenables (request fires only inside `then()`)

Package: `@supabase/postgrest-js` **2.107.0** (source shipped in `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts`).

1. **The builder is a `PromiseLike`, not a `Promise`** — `PostgrestBuilder.ts:68-74`:
   ```ts
   export default abstract class PostgrestBuilder<...> implements PromiseLike<...>
   ```
2. **The constructor only stores config** — `PostgrestBuilder.ts:113-145` assigns `method`, `url`, `headers`, `body`, `fetch`, etc. No network activity.
3. **`fetch` is invoked inside `then()`** — `PostgrestBuilder.ts:254-445`. The `then()` method builds headers (271-290), defines `executeWithRetry` which calls the actual HTTP fetch:
   ```ts
   // PostgrestBuilder.ts:315 (inside executeWithRetry, inside then())
   res = await _fetch(this.url.toString(), {
     method: this.method,
     headers: requestHeaders,
     body: JSON.stringify(this.body, ...),
     signal: this.signal,
   })
   ```
   and only *starts* execution at `PostgrestBuilder.ts:367`:
   ```ts
   let res = executeWithRetry()
   ```
   `then()` is invoked solely by `await`, `.then()`, or `Promise.resolve()` coercion. A bare expression statement like the one at `src/App.tsx:589` never triggers it, so **no HTTP request ever leaves the browser** — the upsert silently does nothing. Confirmed.
4. **Relevant to the patch:** in default (non-`throwOnError`) mode, fetch failures are converted to a resolved `{ error, data: null, status: 0 }` response — `PostgrestBuilder.ts:369-436`. An awaited builder therefore **never rejects**; checking the returned `error` field is sufficient (no `try/catch` needed).

Additional context: `@supabase/auth-js` **awaits** each `onAuthStateChange` subscriber callback (`node_modules/@supabase/auth-js/src/GoTrueClient.ts:4899-4907`, `await x.callback(event, session)` inside `Promise.all`), and the wrapper in `src/auth.ts:66` forwards the async handler's promise. So an `await` added inside this handler does run to completion, but it also delays `_notifyAllSubscribers` — hence the patch navigates *before* awaiting.

#### b. Patch: sign-in profile push (`src/App.tsx:586-598`)

**Before:**
```ts
      // Supabase profile is empty/incomplete. Check local storage first.
      if (storedProfile.onboarded) {
        // Local profile is complete, push it to Supabase now we have a session.
        supabase.from("profiles").upsert({
          id: session.user.id,
          display_name: storedProfile.name,
          onboarded: true,
          preferences_json: storedProfile,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
        return;
      }
```

**After:**
```ts
      // Supabase profile is empty/incomplete. Check local storage first.
      if (storedProfile.onboarded) {
        // Local profile is complete: enter the app immediately (local data is
        // the source of truth on this branch), then push it up. The upsert must
        // be awaited — postgrest builders are lazy thenables and only issue the
        // HTTP request when then()/await is invoked.
        setEntry(prev => (prev === "welcome" || prev === "login") ? "app" : prev);
        const { error } = await supabase.from("profiles").upsert({
          id: session.user.id,
          display_name: storedProfile.name,
          onboarded: true,
          preferences_json: storedProfile,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        if (error) {
          // Non-fatal: the debounced profile-sync effect below retries on the
          // next profile change, and this handler re-runs on the next sign-in.
          console.error("[auth] failed to push local profile to Supabase:", error.message);
        }
        return;
      }
```

**Recommendation: entry navigation should proceed even if the upsert fails** (the patch deliberately navigates first). Justification:

- On this branch the *local* profile is complete and is the source of truth; the app is fully functional from localStorage (the whole product is designed localStorage-first / pilot-mode). Blocking entry would strand an onboarded user on welcome/login over a background sync failure they cannot act on.
- The failure is recoverable through two existing paths: the debounced upsert effect (`src/App.tsx:622-636`) re-pushes the full profile 1.5 s after any profile change, and this handler re-runs on every subsequent `SIGNED_IN`/`TOKEN_REFRESHED` event. The upsert is idempotent (`onConflict: "id"`).
- Navigating before awaiting also avoids adding a network round-trip to perceived sign-in latency, and avoids holding up auth-js's awaited subscriber chain (see evidence, item on `_notifyAllSubscribers`).
- Because non-throw-mode builders never reject (evidence a.4), `if (error)` covers all failure modes including network errors and timeouts; no `try/catch` required.

#### c. Fix for `sub.status as any` (`src/App.tsx:649`)

Context: `Profile["subscriptionStatus"]` is `"none" | "trialing" | "active" | "canceled"` (`src/store.ts:66`). But the `subscriptions` table is written by the Stripe webhook whose `mapStatus` also emits **`"past_due"`** (`supabase/functions/stripe-webhook/index.ts:63-75`). The `as any` cast can therefore smuggle `"past_due"` (or any future status) into profile state, where every downstream comparison against the four-value union would silently misbehave. `syncSubscriptionFromDB` (`src/App.tsx:97-107`) already filters out `"none"`, but nothing else.

**Add near `syncSubscriptionFromDB` (after `src/App.tsx:107`):**
```ts
// The subscriptions table can hold statuses the client union doesn't model —
// stripe-webhook's mapStatus() also writes "past_due" (and future Stripe
// statuses may map to new values). Validate instead of casting.
const CLIENT_SUB_STATUSES = ["none", "trialing", "active", "canceled"] as const satisfies
  readonly Profile["subscriptionStatus"][];

function parseSubscriptionStatus(raw: unknown): Profile["subscriptionStatus"] {
  if (typeof raw === "string" && (CLIENT_SUB_STATUSES as readonly string[]).includes(raw)) {
    return raw as Profile["subscriptionStatus"];
  }
  // "past_due" = Stripe is retrying payment; access continues, so treat as active.
  if (raw === "past_due") return "active";
  // Unknown/new status: this parser runs right after a successful checkout, so
  // mirror the caller's own no-row-yet fallback ("trialing") rather than "none",
  // which would lock a paying user out.
  return "trialing";
}
```

**Call-site change — before (`src/App.tsx:649`):**
```ts
setProfile(p => ({ ...p, subscriptionStatus: sub.status as any, plan: sub.plan, trialEndsAt: sub.currentPeriodEnd }));
```
**After:**
```ts
setProfile(p => ({ ...p, subscriptionStatus: parseSubscriptionStatus(sub.status), plan: sub.plan, trialEndsAt: sub.currentPeriodEnd }));
```

#### d. Repo-wide scan for other unawaited builders / floating promises

Grep patterns run over `src/` and `supabase/functions/` (test files excluded):
- `supabase(\!|\?)?\.from` — all postgrest builder starts
- `functions\.invoke|callFn\(|\.rpc\(` — edge-fn invocations
- `supabase(\!|\?)?\.auth\.` — auth calls
- `\.then\(` and `void ` — floating-promise candidates
- `\.from\(` without `await` on the same line in `supabase/functions/` (multi-line chains then verified manually)

**Findings:**

| Site | Verdict |
|---|---|
| `src/App.tsx:589` `supabase.from("profiles").upsert(...)` | **THE BUG** — only unawaited postgrest builder in the repo; request never fires (see a.) |
| `src/App.tsx:101, 572, 627`; `src/governance.ts:30, 45, 67`; `src/behavioral.ts:63`; `supabase/functions/send-trial-reminders/index.ts:60` | Awaited correctly (the send-trial-reminders one is a multi-line `await admin.from(...)` chain) |
| `src/App.tsx:499` `void recordRun(...)`, `src/App.tsx:793` `void recordRating(...)` | Intentional fire-and-forget: explicit `void`, and `behavioral.ts:22-36 post()` internally awaits `fetch` with try/catch returning `false` — cannot produce unhandled rejections |
| `src/telemetry.ts:85, 127` `void flush()` | Intentional: `flush()` (`telemetry.ts:63-79`) swallows all errors by design ("telemetry must never throw") |
| `src/App.tsx:457, 2315` `getConsents().then(...)` | Floating `.then` without `.catch`, but safe: `getConsents` (`governance.ts:26-37`) returns `NO_CONSENT` on every failure path and never rejects (non-throw builder) |
| `src/App.tsx:466` `fetchRatingHistory().then(...)` | Safe: returns `[]` on error, never rejects (`behavioral.ts:59-72`) |
| `src/App.tsx:489-516` `fetchCuratedRecipes(...).then(...).finally(...)` | No `.catch`, but `fetchCuratedRecipes` (`recipes.ts:97-151`) wraps everything in try/catch returning `null` plus a `withHardTimeout` that resolves a fallback — never rejects |
| `src/App.tsx:647` `syncSubscriptionFromDB().then(...)` | No `.catch`, but the function (`App.tsx:97-107`) only awaits non-throw builders and timers — never rejects |
| `src/App.tsx:2166` `searchFoods(...).then(...)` | Safe: `nutrition.ts:45-56` returns `null` on failure |
| Edge functions (`supabase/functions/*`) | No unawaited builders or floating fetches found; `dbUpsert`/`stripeGet` calls all awaited |

Optional hardening: enabling `@typescript-eslint/no-floating-promises` (postgrest builders are `PromiseLike`, so the rule flags them) would have caught the App.tsx:589 bug at lint time and guards against regressions.

#### e. Acceptance checks

**Repro/manual verification (network tab):**
1. Setup the buggy branch's preconditions: sign in once so a session exists, then in Supabase SQL null out the server profile — `update profiles set preferences_json = '{}'::jsonb, onboarded = false where id = '<user-id>';` — while leaving localStorage `moodfood-profile` with `"onboarded": true`.
2. Sign out and sign back in with DevTools Network open, filtered to `rest/v1/profiles`.
3. **Before fix:** only a `GET /rest/v1/profiles?select=preferences_json&...` (the `.select().maybeSingle()` at App.tsx:572) appears; no write request ever fires.
4. **After fix:** a `POST /rest/v1/profiles?on_conflict=id` with request header `Prefer: resolution=merge-duplicates` appears (postgrest upserts are POSTs with `on_conflict`), returns 2xx, and `select preferences_json->>'onboarded', display_name from profiles where id = '<user-id>'` shows the pushed data.
5. Failure path: block `rest/v1/profiles` POSTs (DevTools request blocking) and sign in again — the app still enters (`entry === "app"`), and the console shows `[auth] failed to push local profile to Supabase: ...`.

**Vitest seam:**
- There is no direct unit seam today — the upsert is inlined in the App component's effect. The lazy-thenable semantics give a precise test though: mock `./supabase` (`vi.mock`) so `supabase.from("profiles").upsert()` returns an object with a spied `then` property (`{ then: vi.fn((res) => res({ error: null })) }`). Rendering the app and firing the mocked `onAuthChange` callback, the **`then` spy is never called before the fix and is called after it** — this asserts the request actually executes, not merely that `.upsert()` was invoked.
- Recommended refactor for a durable seam: extract the push into an exported `async function pushLocalProfile(userId: string, stored: Profile): Promise<{ error: { message: string } | null }>` (e.g. next to `syncSubscriptionFromDB` or in `src/auth.ts`), unit-test it directly, and assert the auth handler awaits it. This matches the existing pattern of dependency-injected testable modules (`src/telemetry.ts` `createTelemetry` with injected `transport`, tested in `src/telemetry.test.ts`).
- `parseSubscriptionStatus` is trivially unit-testable once exported: assert passthrough for the four union values, `"past_due"` → `"active"`, and `"garbage"`/`undefined`/`42` → `"trialing"`.

**Static checks:** `npx tsc --noEmit` passes with the `as any` removed (the parser's return type is exactly `Profile["subscriptionStatus"]`); existing suite `npx vitest run` stays green (no current test exercises the auth handler).

### 1.3 Un-typed cast on subscription status

[App.tsx:649](../src/App.tsx) — `sub.status as any` defeats the `Profile["subscriptionStatus"]`
union. This is not hypothetical: the Stripe webhook's `mapStatus`
([stripe-webhook/index.ts:63-75](../supabase/functions/stripe-webhook/index.ts)) also writes
**`"past_due"`**, which the cast smuggles into profile state where every downstream comparison
against the four-value union silently misbehaves.

**Fix:** the `parseSubscriptionStatus` helper in **§c of the 1.2 audit above** — pass through the
four known values, map `"past_due"` → `"active"` (Stripe is retrying payment; access continues),
and fall back to `"trialing"` for unknown values, because this parser runs right after a
successful checkout and `"none"` would lock a paying user out.

### 1.4 Bring the recipe cache live in prod (rollout was deferred)

The Supabase MCP connection in this session had no permission to run `list_migrations` /
`get_advisors`, so remote state could not be confirmed from here. Per the repo's own
[recipe-seed-and-topup-runbook.md](recipe-seed-and-topup-runbook.md), migrations **015 + 016,
the recipe seed, and the top-up cron were deferred** — meaning the owned recipe cache is likely
not live and a Spoonacular outage still dead-ends live search (known issue since 2026-06-14).
This is the single biggest reliability win available: it removes the app's hard dependency on a
third-party API being up.

The checklist below was built by cross-checking the runbook against the actual migrations,
functions, and seed script. It found **8 gaps in the runbook** (see the FLAGS section at the end)
— the two that matter most: the runbook **never deploys the `recipes` function itself** (without
it the seeded cache is never consulted), and there is a **mood-vocabulary mismatch** (seed/top-up
use 7 moods, the live function's `MOOD_MAP` only ever produces 5, so ~2/7 of seed quota writes
unreachable rows — fix before seeding).

Sources: `docs/recipe-seed-and-topup-runbook.md` (authoritative), `supabase/migrations/015_recipe_cache.sql`, `supabase/migrations/016_recipe_analytics.sql`, `supabase/functions/recipes/index.ts`, `supabase/functions/recipes/cache.ts`, `supabase/functions/recipes/tags.ts`, `supabase/functions/recipes-top-up/index.ts`, `scripts/seed-recipes.mjs`, `supabase/config.toml`, `src/recipes.ts`.

Run all CLI commands from the repo root — the path has spaces/parens, always quote it:
`cd "/Users/eugene/WebDev Archive/MoodFood (dev)"`

---

#### Stage 0 — Preflight: check current prod state

The Supabase MCP lacked permissions in the main session, so use the CLI (needs `supabase login` or `SUPABASE_ACCESS_TOKEN`) plus the Dashboard SQL editor.

```bash
supabase link --project-ref pjfoiamcflimdreoxvpg   # once, if not already linked (config.toml:1 confirms ref)
supabase migration list --linked                    # which of 001–016 are applied remotely
supabase functions list                             # is recipes deployed? recipes-top-up yet?
supabase secrets list                               # digests only; confirm SPOONACULAR_API_KEY, ALLOWED_ORIGINS, OPENAI_API_KEY exist
```

SQL editor (Dashboard → SQL):

```sql
select version, name from supabase_migrations.schema_migrations order by version desc limit 6;
select to_regclass('public.cached_recipes') as cache_tbl, to_regclass('public.recipe_searches') as log_tbl;  -- both NULL = 015 not applied
select proname from pg_proc where proname in ('upsert_recipes','increment_search_count','prune_old_recipe_searches');
select extname from pg_extension where extname in ('pg_cron','pg_net');
select jobname, schedule from cron.job;
```

Also confirm Spoonacular quota headroom before anything else (runbook line 32; seed = 42 heavyweight `complexSearch` calls, `scripts/seed-recipes.mjs:21-22`).

**Gate:** proceed only if `cached_recipes` is absent/empty and 015/016 are unapplied. If partially applied, both migrations are idempotent (`create table if not exists`, `create or replace`, `drop policy if exists`) and safe to re-run.

---

#### Stage 1 — Apply migrations 015 + 016

Runbook lines 8–20: migrations first — the seed depends on the `upsert_recipes` RPC (015).

```bash
supabase db push --dry-run    # confirm ONLY 015 and 016 are pending
supabase db push
```

(Alternative: paste each file into the SQL editor, 015 then 016 — runbook line 20.)

**Verify:**

```sql
select to_regclass('public.cached_recipes'), to_regclass('public.recipe_searches');            -- both non-null
select proname, prosecdef from pg_proc where proname in ('upsert_recipes','increment_search_count','prune_old_recipe_searches');  -- 3 rows, secdef = t
select relname, relrowsecurity from pg_class where relname in ('cached_recipes','recipe_searches');  -- RLS = t on both (015:62,83)
select jobname, schedule from cron.job where jobname = 'prune-recipe-searches-daily';           -- '30 3 * * *' (015:175)
select viewname from pg_views where viewname like 'recipe_%';                                   -- 3 views from 016
```

**Rollback:** 015/016 are purely additive — nothing existing is touched (015 deliberately uses `cached_recipes`, not the existing `recipes` table, 015:13-16). Full reversal if ever needed:

```sql
select cron.unschedule('prune-recipe-searches-daily');
drop view if exists public.recipe_cache_hit_rate_7d, public.recipe_top_combos, public.recipe_prune_candidates;
drop function if exists public.upsert_recipes(jsonb), public.increment_search_count(uuid[]), public.prune_old_recipe_searches(int);
drop table if exists public.recipe_searches, public.cached_recipes;
```

---

#### Stage 2 — Bulk seed (~2,016 fetched; expect fewer stored rows)

Runbook lines 28–47. Script env vars (exact names, from `scripts/seed-recipes.mjs:26-33`): `SUPABASE_URL` (or `VITE_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`, `SPOONACULAR_API_KEY`. All three required or it exits 1.

```bash
SUPABASE_URL="https://pjfoiamcflimdreoxvpg.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role key: Dashboard → Project Settings → API>" \
SPOONACULAR_API_KEY="<spoonacular key>" \
node scripts/seed-recipes.mjs
```

Expect `✓ mood + diet: N recipes (running total)` per combo, then `Seed complete: N recipes upserted.` Idempotent — re-run freely on `✗` failures (upsert on `external_id`, tags union and never shrink; 015:104-144, runbook 44-45).

**Verify:**

```sql
select count(*) from cached_recipes;   -- runbook line 46 expects ~2,000; see FLAG 3 — 1,200–1,800 distinct is normal
select unnest(mood_tags) as mood, count(*) from cached_recipes group by 1 order by 2 desc;   -- all 7 moods present
select unnest(dietary_tags) as diet, count(*) from cached_recipes group by 1 order by 2 desc; -- 5 diet tags present
select count(*) from cached_recipes where raw_data is null or title is null;                  -- 0
```

**Rollback:** `truncate public.cached_recipes;` — safe at this point; the live `recipes` fn treats an empty cache as a miss and falls through to Spoonacular (`recipes/index.ts:408-427`). Only cost is spent Spoonacular quota.

---

#### Stage 3 — Deploy edge functions

```bash
cd "/Users/eugene/WebDev Archive/MoodFood (dev)"
supabase functions deploy recipes            # see FLAG 1 — runbook omits this, but it is required
supabase functions deploy recipes-top-up     # runbook line 59
```

Deploy from the repo root via CLI so `supabase/config.toml` is honored — it sets `verify_jwt = false` for both functions (`config.toml:6-11`), which the cron's header-secret-only call depends on (see FLAG 4).

**Verify:** `supabase functions list` shows both, fresh `updated_at`. Then hit `recipes` (still valid pre-secrets since prod already has `SPOONACULAR_API_KEY` for the live fn) — see Stage 5 curl.

**Rollback:** redeploy the previous code (`git checkout <prev> -- supabase/functions/recipes && supabase functions deploy recipes`). The cache-aware fn degrades gracefully even if Stage 1 were reverted: cache reads/writes are try/caught and fire-and-forget (`cache.ts:60-69,112,137`), so the fn behaves like the pre-cache version.

---

#### Stage 4 — Set secrets

Exact secret names read by the code:

| Function | Reads (must set) | Auto-injected |
|---|---|---|
| `recipes-top-up` (`index.ts:25-28`) | `SPOONACULAR_API_KEY`, `RECIPES_TOPUP_SECRET` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `recipes` (`index.ts:35-39`) | `SPOONACULAR_API_KEY` (required), `OPENAI_API_KEY` (optional curation), `ALLOWED_ORIGINS` (CORS allowlist) | `SUPABASE_URL`, `SUPABASE_ANON_KEY` |

`SPOONACULAR_API_KEY` / `OPENAI_API_KEY` / `ALLOWED_ORIGINS` should already exist in prod (the live `recipes` fn uses them — confirmed in Stage 0). The only new secret:

```bash
openssl rand -hex 32   # generate RECIPES_TOPUP_SECRET
supabase secrets set SPOONACULAR_API_KEY="<spoonacular key>" \
  RECIPES_TOPUP_SECRET="<long-random-string>"        # runbook lines 65-66
```

**Verify:** `supabase secrets list` shows `RECIPES_TOPUP_SECRET`. Keep the plaintext value at hand for Stage 6 (Vault) and Stage 5 (curl).

**Rollback:** `supabase secrets unset RECIPES_TOPUP_SECRET` — the top-up fn then 401s every caller (`recipes-top-up/index.ts:91-93`), an effective kill switch.

---

#### Stage 5 — Smoke-test both functions via curl

**Top-up fn** (runbook lines 95-103; header shape from `recipes-top-up/index.ts:19,91`) — note this SPENDS quota on first run, see FLAG 2; skip if quota-tight (runbook 114-116):

```bash
curl -s -X POST "https://pjfoiamcflimdreoxvpg.functions.supabase.co/recipes-top-up" \
  -H "x-cron-secret: <RECIPES_TOPUP_SECRET>"
# expect {"ok":true,"toppedUp":N,"added":N,"skipped":N}
# 401 → secret/header mismatch (or verify_jwt got enabled — see FLAG 4); 503 → cache disabled or SPOONACULAR_API_KEY missing (index.ts:94-96)
```

**Recipes fn** — needs a real user JWT: the fn validates the bearer against `/auth/v1/user` (`recipes/index.ts:273-279`); the anon key alone will 401. Client header shape is `authorization: Bearer <access_token>` + `content-type: application/json`, no apikey (`src/recipes.ts:112`). Omit any `Origin` header in curl (only allowlisted origins pass, but no-origin requests are permitted, `index.ts:271`).

```bash
TOKEN=$(curl -s "https://pjfoiamcflimdreoxvpg.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: <anon key>" -H "content-type: application/json" \
  -d '{"email":"<test-user email>","password":"<pw>"}' | jq -r .access_token)

curl -s -X POST "https://pjfoiamcflimdreoxvpg.supabase.co/functions/v1/recipes" \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"mood":"Tired","profile":{"allergies":[]},"relax":true}' | jq '{provider, relaxed, n: (.recipes|length)}'
```

**Verify:** expect `"provider":"cache"` (post-seed; cache hit needs ≥6 safe rows, `recipes/index.ts:415`). `"spoonacular"` means cache miss — check edge logs. Then:

```sql
select served_from, count(*) from recipe_searches group by 1;   -- rows with served_from='cache'
```

Logs: Dashboard → Edge Functions → recipes → Logs — look for `[recipes] cache hit: matched=… safe=… served=…` (`index.ts:421`) or `cache miss` (`index.ts:426`); top-up logs `[recipes-top-up] combos topped up=…` (`recipes-top-up/index.ts:111`).

**Rollback/safety:** nothing to roll back; failures here are config, not data. If `recipes` returns 502, the diag payload (`index.ts:502-505`) tells you which provider failed.

---

#### Stage 6 — pg_net + Vault (SQL editor)

Runbook lines 70-75 / 016:48-50:

```sql
create extension if not exists pg_net;
select vault.create_secret('<the same RECIPES_TOPUP_SECRET>', 'recipes_topup_secret');
```

**Verify:**

```sql
select extname from pg_extension where extname = 'pg_net';
select name from vault.secrets where name = 'recipes_topup_secret';
select decrypted_secret = '<value>' from vault.decrypted_secrets where name = 'recipes_topup_secret';  -- t
```

**Rollback/safety:** `vault.create_secret` is NOT idempotent — re-running with the same name errors (see FLAG 6). To rotate/remove: `delete from vault.secrets where name = 'recipes_topup_secret';` then re-create (and re-set the fn secret to match).

---

#### Stage 7 — Schedule the monthly cron

Exact SQL from runbook lines 79-92 (identical to the documented block in 016:53-65):

```sql
select cron.schedule(
  'recipes-top-up-monthly', '0 0 1 * *',
  $cron$
    select net.http_post(
      url     := 'https://pjfoiamcflimdreoxvpg.functions.supabase.co/recipes-top-up',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'recipes_topup_secret')
      ),
      body    := '{}'::jsonb
    );
  $cron$
);
```

**Verify** (runbook line 107, plus the 015 job):

```sql
select jobname, schedule, active from cron.job;
-- expect: recipes-top-up-monthly / 0 0 1 * *  AND  prune-recipe-searches-daily / 30 3 * * *
```

Optional immediate end-to-end test of the cron path without waiting a month (spends quota only if combos are thin): run the `select net.http_post(...)` body directly in the SQL editor, then within ~a minute:

```sql
select status_code, timed_out, left(content::text, 120) from net._http_response order by created desc limit 3;  -- expect 200
```

**Rollback:** `select cron.unschedule('recipes-top-up-monthly');` (runbook line 123). Re-run the schedule block to change cadence.

---

#### Stage 8 — Post-launch

**Advisors** (MCP `get_advisors` lacked permissions → use Dashboard → Advisors → Security and Performance, re-run both after go-live). Expected findings to triage, not panic over: the three 016 views may be flagged as SECURITY DEFINER views — they are intentionally revoked from `anon`/`authenticated` (016:38-40); the three 015 functions are SECURITY DEFINER with pinned `search_path` and revoked from client roles (015:95,102,144,163) — compliant.

**Monitor the monthly cron** (check after the 1st of each month):

```sql
-- did it run, did it succeed
select jrd.status, jrd.return_message, jrd.start_time
from cron.job_run_details jrd join cron.job j using (jobid)
where j.jobname = 'recipes-top-up-monthly'
order by jrd.start_time desc limit 5;

-- did the HTTP call reach the fn (pg_net keeps recent responses only)
select status_code, timed_out, created from net._http_response order by created desc limit 5;
```

Then Dashboard → Edge Functions → recipes-top-up → Logs for the `[recipes-top-up] combos topped up=… added~… skipped=…` line. Healthy steady state: mostly `skipped` (but see FLAG 2 for the first run).

**Cache health** (016 views, service-role/SQL-editor only):

```sql
select * from recipe_cache_hit_rate_7d;   -- cache % should climb over weeks
select * from recipe_top_combos limit 10;
select count(*) from recipe_prune_candidates;   -- only meaningful after 90 days (016:35)
```

---

#### FLAGS — gaps and contradictions found

1. **Runbook never deploys the `recipes` function.** Task 2 only deploys `recipes-top-up` (runbook line 59), but the cache-aware `recipes` code (cache read at `index.ts:408-427`, write-through at `:475`, search logging) is code-complete locally and not yet in prod (rollout was deferred). Without `supabase functions deploy recipes`, the seeded cache is never consulted. Stage 3 adds it.
2. **Seed size contradicts the top-up target.** Seed fetches `PER_COMBO = 48` per combo (`seed-recipes.mjs:39`) minus instruction-filter drops, but top-up's threshold is `TARGET = 60` (`recipes-top-up/index.ts:33`). So the runbook's claim that "right after a full seed most combos are ≥60 … mostly shows `skipped`" (lines 99-101) is wrong for the 35 diet-specific combos (~≤48 rows each); only `diet=none` combos count all mood rows and clear 60 (`countCombo`, `recipes-top-up/index.ts:49-60`). Expect the FIRST top-up run to fetch for up to ~35 combos (~35 extra Spoonacular calls, ~20 recipes each) — budget quota for it or skip the manual curl (runbook lines 114-116 already hints at this).
3. **Row-count expectation is optimistic.** The script's `Seed complete: N` double-counts recipes returned for multiple combos (it sums per-combo payloads; the DB dedupes on `external_id`, `seed-recipes.mjs:195,203`). `select count(*)` will be below both N and ~2,016 — the runbook (line 46) attributes the shortfall only to the instructions filter. A count of roughly 1,200–1,800 is not a failure.
4. **The cron's auth model silently depends on `verify_jwt = false`.** `config.toml:6-11` disables gateway JWT checks for `recipes`/`recipes-top-up`; the cron POST carries only `x-cron-secret`, no `Authorization`. The runbook never mentions this. Deploy via CLI from the repo root (config.toml honored). If either fn is ever redeployed via the Dashboard/MCP with JWT verification defaulted on, the cron will 401 at the gateway before reaching the fn.
5. **Mood-vocabulary mismatch: seeded `anxious`/`sad` rows are unreachable.** Seed + top-up use 7 moods including `anxious` and `sad` (`seed-recipes.mjs:36`, `recipes-top-up/index.ts:31`), and both claim they "MUST match … cache.ts". But `tags.ts` `CANON_MOODS` has only 5 moods and `MOOD_MAP` (`tags.ts:9,14-21`) never returns `anxious` or `sad` — those inputs fall back to `happy`. Result: ~12 of 42 seed combos (~2/7 of seed quota) write rows the live fn will never match by mood, and the monthly top-up keeps refreshing them. Not launch-blocking (reads still work for the 5 reachable moods), but it wastes quota monthly — either add `anxious`/`sad` mappings to `MOOD_MAP` or drop them from the seed/top-up `MOODS` before go-live.
6. **Vault step is not idempotent.** `vault.create_secret(...)` (runbook line 74) errors if `recipes_topup_secret` already exists; the runbook has no rotation path. Rotate with `delete from vault.secrets where name='recipes_topup_secret';` + re-create, and keep it in lockstep with the `RECIPES_TOPUP_SECRET` fn secret.
7. **Runbook verification misses the second cron job.** Applying 015 also schedules `prune-recipe-searches-daily` at 03:30 UTC (015:165-175); the runbook's `cron.job` check (line 107) only mentions the monthly job. Verify both (Stage 7).
8. **URL-form inconsistency (cosmetic).** Runbook/cron use `https://pjfoiamcflimdreoxvpg.functions.supabase.co/recipes-top-up`; the fn header comment says `POST /functions/v1/recipes-top-up` (`recipes-top-up/index.ts:19`) and the client uses `<project>.supabase.co/functions/v1/...` (`src/recipes.ts:13`). Both hostnames resolve to the same function — keep the cron SQL exactly as written in the runbook.

---

## Phase 2 — Repo & delivery hygiene (~half a day)

### 2.1 Commit or discard the floating work
`git status` shows untracked docs (`docs/*.md`, `.agents/`, `.claude/skills/`, `skills-lock.json`)
and a modified `.claude/launch.json`. Nothing in the working tree is committed — a crash or
accidental clean loses the design-system docs and runbooks. Commit docs; add tool artifacts to
`.gitignore` if they shouldn't ship.

### 2.2 Add linting (currently none)
There is no ESLint config, yet the code contains `eslint-disable` comments. Add
`eslint` + `typescript-eslint` + `eslint-plugin-react-hooks`, and enable
`@typescript-eslint/no-floating-promises` — postgrest builders are `PromiseLike`, so that rule
would have caught bug 1.2 at lint time and guards against regressions. Wire into `npm run verify`.
Caution: do **not** auto-fix `react-hooks/exhaustive-deps` in App.tsx — several dep arrays are
intentionally incomplete (see Phase 3 hazards H4).

### 2.3 CI gate
`.github/` exists but the verify pipeline (`npm run verify` = audit + test + build) should run on
every push. A 10-line GitHub Actions workflow is enough.

### 2.4 Routine dependency bumps (all low-risk)
`@capacitor/* 8.4.1`, `@supabase/supabase-js 2.110.2`, `vite 8.1.4`, `vitest 4.1.10`,
`lucide-react 1.23`, `@vitejs/plugin-react 6.0.3`. Defer TypeScript 7 (major) until after the
Phase 3 refactor.

---

## Phase 3 — Architecture: break up App.tsx (~2–4 days, incremental)

[App.tsx](../src/App.tsx) is **3,269 lines with ~50 components** and every piece of app state
lives in the single `App()` function (~40 `useState`/`useStoredState` hooks). Consequences:

- Any state change re-renders the entire component tree (all screens are defined in the same file
  and receive 20+ props each — see the `HomeScreen` call site with 30 props).
- The file is the merge-conflict magnet for every feature.
- Effects with long dependency lists (e.g. the recipe fetch effect, lines 481-518) are fragile —
  the comment at line 200 documents a past self-inflicted fetch loop from exactly this pattern.

The shape of the plan (full decomposition below, built from a complete read of the file):

| PR | What moves | App.tsx after |
|---|---|---|
| 1 | Smoke tests first; delete dead code (the never-referenced `localRanked` memo at line 312 — computed on every render for nothing); extract `src/api/backend.ts`, types, pure libs, `usePullToRefresh` | ~3,050 |
| 2 | Shared components (TopBar, AppHeader, navs, FoodCamera, Moody FABs/panel, …) | ~2,350 |
| 3 | Self-contained screens (Grocery, Pantry, Diary, Settings, Billing, Health, Help, Detail, Cook, …) | ~1,550 |
| 4 | Entry + onboarding screens | ~850 |
| 5 | Non-fetching hooks: `useProfileSync`, `useHouseholdCollections`, `useRecipeCatalog`, `useLearningSignals`, `useNotifications`, `useMoodyChat` | ~650 |
| 6 | The two dangerous ones — `useHomeFeed` + `useRecipeSearch` — plus HomeScreen/SearchScreen | ~250–300 |
| 7 | `ProfileContext` / `NavigationContext` / `CollectionsContext` + `React.memo` pass | ~300 |

**Read the Hazards section (H1–H11) below before starting** — the load-bearing ones: the
`profile` memo at line 204 guards against a real past incident (fetch loop → edge-fn 502s) and
must survive extraction intact; several effect dependency arrays are *intentionally* incomplete
and must be copied byte-for-byte (do **not** let ESLint autofix them); `runSearch`'s pagination
reads current-render closures, so a naive `useCallback([])` gives stale pagination; and the
catalog-upsert-before-open pattern in `open`/`toggleSavedRecipe` is the fix from the recent
saved-recipes commits — keep it as a unit.

Source: `/Users/eugene/WebDev Archive/MoodFood (dev)/src/App.tsx` — 3,269 lines, read in full. Only importer of `App` is `src/main.tsx:3`. All existing tests target lib modules (`recommendation.test.ts`, `resultBatches.test.ts`, etc.); **no test currently imports App.tsx**, so extraction is test-neutral but unguarded — add smoke tests first (PR 1).

Proposed target tree: `src/screens/`, `src/screens/entry/`, `src/screens/onboarding/`, `src/components/`, `src/hooks/`, `src/api/`, `src/appTypes.ts`.

---

#### 1. Component inventory (every top-level declaration, real line ranges)

##### Module-level non-component code

| Declaration | Lines | Target file |
|---|---|---|
| `SUPABASE_FN` const + `callFn<T>()` | 57–69 | `src/api/backend.ts` |
| `redeemInviteCode()` | 71–74 | `src/api/backend.ts` |
| `startCheckout()` | 76–79 | `src/api/backend.ts` |
| `deleteAccount()` | 81–86 | `src/api/backend.ts` |
| `MOODFOOD_KEYS` | 88–93 | `src/api/backend.ts` (or `src/store.ts`) |
| `syncSubscriptionFromDB()` | 95–107 | `src/api/backend.ts` |
| `MenuCtx` | 109–111 | `src/components/MenuCtx.ts` |
| `type Page`, `type SearchRequest`, `type Entry` | 113–115 | `src/appTypes.ts` |
| `PLANS` | 116–120 | `src/appTypes.ts` (used by SubscriptionScreen, BillingScreen, PlanPicker) |
| `nav` | 121–124 | with `DesktopNav` in `src/components/AppChrome.tsx` |
| `PULL_THRESHOLD`, `PULL_MAX` | 126–127 | `src/hooks/usePullToRefresh.ts` |
| `usePullToRefresh()` | 129–165 | `src/hooks/usePullToRefresh.ts` |
| `PullRefreshIndicator` | 167–184 | `src/components/PullRefreshIndicator.tsx` |
| `REJECTION_OPTIONS` | 900–907 | with `FirstPickScreen` |
| `toggle()` | 984 | `src/lib/toggle.ts` (see Hazard H1) |
| `FALLBACK_FOOD`, `LOGIN_PHOTO` | 986–987 | `src/appTypes.ts` or `src/components/photos.ts` (FALLBACK_FOOD used by both LoginScreen area and HomeScreen:1662) |
| `SECTION_PHOTOS` | 989–999 | `src/screens/onboarding/photos.ts` |
| `type DiaryEntry` | 1839 | `src/appTypes.ts` (used by HomeScreen, SearchScreen, DiaryScreen props) |
| `deriveDailySuggestions()` | 1841–1903 | `src/lib/dailySuggestions.ts` (pure — add unit tests) |
| `describeFilters()` | 2118–2125 | `src/lib/describeFilters.ts` or co-located with SearchResultsScreen |
| `optionsFor()` | 2682–2684 | `src/screens/profile/PsychProfileScreen.tsx` (shared with FoodProfileScreen → put in `src/onboarding.ts` instead) |
| `FAQ_DATA` | 3144–3201 | with `HelpScreen` |

##### Entry-flow screens → `src/screens/entry/`

| Component | Lines | Target file |
|---|---|---|
| `QuickTasteStartScreen` | 826–898 | `src/screens/entry/QuickTasteStartScreen.tsx` |
| `FirstPickScreen` (+ REJECTION_OPTIONS) | 909–982 | `src/screens/entry/FirstPickScreen.tsx` |
| `AccountSetupScreen` | 1001–1045 | `src/screens/entry/AccountSetupScreen.tsx` |
| `VerifyEmailScreen` | 1047–1078 | `src/screens/entry/VerifyEmailScreen.tsx` |
| `LoginScreen` | 1080–1194 | `src/screens/entry/LoginScreen.tsx` |
| `VerifiedScreen` | 1196–1204 | `src/screens/entry/VerifiedScreen.tsx` |
| `SubscriptionScreen` | 2398–2487 | `src/screens/entry/SubscriptionScreen.tsx` (shares `PlanPicker` + `startCheckout` with BillingScreen) |

##### Onboarding → `src/screens/onboarding/`

| Component | Lines | Target file |
|---|---|---|
| `useDesktopOnboarding()` | 1206–1217 | `src/screens/onboarding/useDesktopOnboarding.ts` |
| `Onboarding` | 1219–1328 | `src/screens/onboarding/Onboarding.tsx` |
| `DesktopOnboarding` | 1330–1400 | `src/screens/onboarding/DesktopOnboarding.tsx` |
| `DesktopOnboardingRail` | 1402–1409 | `src/screens/onboarding/DesktopOnboarding.tsx` |
| `DesktopOnboardingFooter` | 1411–1416 | `src/screens/onboarding/DesktopOnboarding.tsx` |
| `QuestionField` | 1418–1448 | `src/screens/onboarding/QuestionField.tsx` (also used by FoodProfileScreen:2743) |
| `GroupedMultiField` | 1449–1462 | `src/screens/onboarding/QuestionField.tsx` |
| `MoodCardsField` | 1463–1485 | `src/screens/onboarding/QuestionField.tsx` |
| `SkillCardsField` | 1486–1492 | `src/screens/onboarding/QuestionField.tsx` |
| `MultiField` | 1493–1502 | `src/screens/onboarding/QuestionField.tsx` |
| `SetupStep` | 1503 | `src/components/SetupStep.tsx` (used by onboarding AND FoodProfileScreen:2742) |
| `Choice` | 1504 | `src/components/Choice.tsx` (used by QuestionField AND AccountScreen:2571) |

##### App chrome → `src/components/`

| Component | Lines | Target file |
|---|---|---|
| `DesktopNav` (+ `nav` const) | 1506–1522 | `src/components/AppChrome.tsx` |
| `BottomNav` | 1523–1532 | `src/components/AppChrome.tsx` |
| `MainMenu` | 1533–1557 | `src/components/MainMenu.tsx` |
| `AppHeader` | 1558–1575 | `src/components/AppChrome.tsx` (consumes MenuCtx) |
| `TopBar` | 1822–1825 | `src/components/AppChrome.tsx` (consumes MenuCtx; used by ~20 screens) |
| `Moody` | 1821 | `src/components/Moody.tsx` (used by FirstPickScreen:946, DetailScreen, PsychProfileScreen:2688, MoodyPanel) |
| `PickCard` | 1826–1828 | `src/components/PickCard.tsx` |
| `TokenInput` | 1830–1837 | `src/components/TokenInput.tsx` |
| `DailySuggestionCarousel` | 1905–1984 | `src/components/DailySuggestionCarousel.tsx` |
| `Avatar` | 2617 | `src/components/Avatar.tsx` (used by Community, FamilyHealth, DinersScreen) |
| `Trend` | 2622 | `src/components/Trend.tsx` (used by HealthHub, FamilyHealth) |
| `SettingsGroup` | 2302 | `src/components/SettingsGroup.tsx` (used by SettingsScreen AND DataPrivacyScreen) |
| `ProfileEditor` | 2718 | `src/components/ProfileEditor.tsx` (used by AccountScreen, PsychProfileScreen) |
| `EditableCues` | 2719–2722 | `src/components/EditableCues.tsx` |
| `PlanPicker` | 2395–2397 | `src/components/PlanPicker.tsx` |
| `VoiceFab` | 2750–2797 | `src/components/moody/VoiceFab.tsx` |
| `MoodyFab` | 2799–2862 | `src/components/moody/MoodyFab.tsx` |
| `MoodyPanel` | 2864–2930 | `src/components/moody/MoodyPanel.tsx` |
| `NotificationsPanel` | 2932–2951 | `src/components/NotificationsPanel.tsx` |
| `FoodCamera` | 2953–3082 | `src/components/FoodCamera.tsx` (used by Home, Detail, Cook, Diary, FoodLog) |
| `MacroBar` | 3084–3092 | `src/components/FoodCamera.tsx` |

##### Main app screens → `src/screens/`

| Component | Lines | Target file |
|---|---|---|
| `HomeScreen` | 1577–1820 | `src/screens/HomeScreen.tsx` |
| `SearchScreen` | 1986–2116 | `src/screens/SearchScreen.tsx` |
| `SearchResultsScreen` | 2127–2143 | `src/screens/SearchResultsScreen.tsx` |
| `EmptyResultsScreen` | 2145–2151 | `src/screens/SearchResultsScreen.tsx` |
| `DetailScreen` | 2153–2180 | `src/screens/DetailScreen.tsx` |
| `CookScreen` | 2182–2205 | `src/screens/CookScreen.tsx` |
| `DiaryScreen` | 2207–2254 | `src/screens/DiaryScreen.tsx` |
| `GroceryScreen` | 2255–2260 | `src/screens/GroceryScreen.tsx` |
| `PantryScreen` | 2261–2277 | `src/screens/PantryScreen.tsx` |
| `PlannerScreen` | 2278–2280 | `src/screens/PlannerScreen.tsx` |
| `InsightsScreen` | 2282–2295 | `src/screens/InsightsScreen.tsx` |
| `LibraryScreen` | 2296–2298 | `src/screens/LibraryScreen.tsx` |
| `SettingsScreen` | 2299–2301 | `src/screens/SettingsScreen.tsx` |
| `DataPrivacyScreen` | 2303–2386 | `src/screens/DataPrivacyScreen.tsx` |
| `ImportScreen` | 2387–2390 | `src/screens/ImportScreen.tsx` |
| `AdminScreen` | 2391–2394 | `src/screens/AdminScreen.tsx` |
| `BillingScreen` | 2488–2566 | `src/screens/BillingScreen.tsx` |
| `AccountScreen` | 2567–2572 | `src/screens/AccountScreen.tsx` |
| `CancelAccount` | 2573–2597 | `src/screens/AccountScreen.tsx` |
| `CommunityScreen` | 2598–2616 | `src/screens/CommunityScreen.tsx` |
| `HealthHub` | 2618–2621 | `src/screens/health/HealthHub.tsx` |
| `HealthDetail` | 2623–2665 | `src/screens/health/HealthDetail.tsx` |
| `FamilyHealth` | 2666–2677 | `src/screens/health/FamilyHealth.tsx` |
| `DinersScreen` | 2678–2681 | `src/screens/DinersScreen.tsx` |
| `PsychProfileScreen` | 2686–2717 | `src/screens/profile/PsychProfileScreen.tsx` |
| `FoodProfileScreen` | 2723–2749 | `src/screens/profile/FoodProfileScreen.tsx` |
| `FoodLogScreen` | 3094–3138 | `src/screens/FoodLogScreen.tsx` |
| `HelpScreen` (+ FAQ_DATA) | 3140–3269 | `src/screens/HelpScreen.tsx` |
| `App` | 186–824 | stays in `src/App.tsx` (shrinks to shell + routing) |

---

#### 2. State inventory inside App() (lines 186–824) → proposed hooks

App() holds **42 useState/useStoredState, 4 useRef, 9 useMemo, 4 useCallback, 10 useEffect**, plus 10 un-memoized closures and 1 derived const.

##### Hook A — `useEntrySession()` → `src/hooks/useEntrySession.ts`
Owns the splash/entry/auth lifecycle.
- **State:** `splash` (189), `entry` (190, `useStoredState "moodfood-entry"`), `passwordRecovery` (191)
- **Effects:** scroll-on-entry (193); PASSWORD_RECOVERY listener (194–199); dev testState bootstrap (263–295); the big auth-sync `onAuthChange` effect (563–617); Stripe `?checkout=` redirect handler (639–659)
- **Inputs:** `testState`, `storedProfile`, `setProfile`, `setEntry` — depends on Hook B, so signature: `useEntrySession(testState, storedProfile, setProfile)`
- **Returns:** `{ splash, setSplash, entry, setEntry, passwordRecovery, setPasswordRecovery }`

##### Hook B — `useProfileSync()` → `src/hooks/useProfileSync.ts`
- **State:** `storedProfile`/`setProfile` (192, `useStoredState "moodfood-profile"`)
- **Memos:** `profile` (204 — the referential-stability memo, see H2)
- **Effects:** debounced Supabase upsert (622–636, deps `[profile]`)
- **Callbacks:** `cancelAccount` (708–718, currently un-memoized)
- **Returns:** `{ profile, storedProfile, setProfile, cancelAccount }`

##### Hook C — `useHouseholdCollections()` → `src/hooks/useHouseholdCollections.ts`
Pure localStorage-backed collections, no effects.
- **State:** `saved` (230), `diary` (231), `groceries` (232), `posts` (233), `connections` (234), `diners` (235), `selectedDiners` (236, plain useState), `eaterCount` (237)
- **Memos:** `sharedProfile` (259, deps `[profile, diners, selectedDiners]`) — takes `profile` as arg
- **Callbacks:** `toggleSavedRecipe` (685–688) — needs `addToCatalog` from Hook D as arg
- **Returns:** `{ saved, setSaved, diary, setDiary, groceries, setGroceries, posts, setPosts, connections, setConnections, diners, setDiners, selectedDiners, setSelectedDiners, eaterCount, setEaterCount, sharedProfile, toggleSavedRecipe }`

##### Hook D — `useRecipeCatalog()` → `src/hooks/useRecipeCatalog.ts`
- **State:** `catalog` (300, seeded with `bundledRecipes`)
- **Memos:** `safeRecipes` (311), `foodHistory` (354–357, deps `[diary, profile.photoLogs, saved, catalog]`)
- **Callbacks:** `addToCatalog(recipe)` (the `setCatalog(prev => prev.some(...))` upsert repeated at 674, 678, 686, 699)
- **Delete:** `localRanked` (312) — **dead memo, never referenced anywhere in the file**; remove instead of moving
- **Returns:** `{ catalog, setCatalog, addToCatalog, safeRecipes, foodHistory }`

##### Hook E — `useLearningSignals()` → `src/hooks/useLearningSignals.ts`
- **State:** `aiCuration` (241), `learnedSignals` (245), `behavioralConsent` (246), `cuisineSignal` (247), `moodSignal` (248), `suppressedCuisines` (258)
- **Derived:** `appliedSignals` (252–255) — plain const today; **memoize it in the hook** (see H3)
- **Effects:** consent mirror (454–459, deps `[entry, page]`); signal derivation (463–477, deps `[entry, behavioralConsent, suppressedCuisines, diary]`)
- **Inputs:** `entry`, `page`, `diary`
- **Returns:** `{ aiCuration, setAiCuration, learnedSignals, setLearnedSignals, behavioralConsent, cuisineSignal, moodSignal, suppressedCuisines, setSuppressedCuisines, appliedSignals }`

##### Hook F — `useHomeFeed()` → `src/hooks/useHomeFeed.ts`
The mood check-in → curated-fetch pipeline.
- **State:** `mood` (208), `energy` (209), `time` (210), `mealCategory` (214), `cuisine` (215), `homeDiet` (216), `results` (217), `aiRanked` (305), `liveSet` (306), `curating` (307), `hasFetched` (308), `moreOffset` (309), `recipeNonce` (310)
- **Memos:** `ACCESSORY_TYPES` (313), `localFallback` (333), `deterministicLive` (336–339), `ranked` (341–350)
- **Callbacks:** `rankForCheckin` (322–331, deps `[sharedProfile, mood, energy, time, cuisine, mealCategory, homeDiet, appliedSignals]`), `loadMore` (522–549, un-memoized), `beginResults` (currently inline at 785), `retry` (`setRecipeNonce(n => n + 1)`)
- **Effects:** the fetch effect (481–518, deps `[results, mood, energy, time, sharedProfile, entry, recipeNonce, mealCategory, cuisine, homeDiet, aiCuration]` — **copy verbatim**, see H4)
- **Inputs:** `entry`, `sharedProfile`, `foodHistory`, `appliedSignals`, `aiCuration`, `behavioralConsent`, `setCatalog`, `localFallback` inputs (`bundledRecipes`)
- **Returns:** `{ mood, setMood, energy, setEnergy, time, setTime, mealCategory, setMealCategory, cuisine, setCuisine, homeDiet, setHomeDiet, results, setResults, ranked, curating, hasFetched, loadMore, beginResults, retry, live: aiRanked !== null || deterministicLive !== null, curated: aiRanked !== null }`

##### Hook G — `useRecipeSearch()` → `src/hooks/useRecipeSearch.ts`
- **State:** `searchRequest` (218), `searchResults` (219), `searchCandidates` (220), `searchLoading` (221), `searchOffset` (222), `searchRelaxed` (223)
- **Refs:** `activeSearchId` (224), `activeSearchAbort` (225)
- **Callbacks:** `runSearch` (376–449, un-memoized — see H5), `cancelSearch` (661–666)
- **Inputs:** `sharedProfile`, `mood`, `foodHistory`, `setPage` (navigates to "results")
- **Returns:** `{ searchRequest, searchResults, searchLoading, searchRelaxed, runSearch, cancelSearch }`

##### Hook H — `useAppNavigation()` → `src/hooks/useAppNavigation.ts`
- **State:** `page` (205), `selected` (206), `detailReturnPage` (207), `detailReturnMoody` (228), `pendingShare` (229), `moodyOpen` (226), `menuOpen` (552)
- **Callbacks:** `go` (668–672), `open` (673–676), `openFromMoody` (677–684), `backFromDetail` (689–695), `shareRecipe` (698–702)
- **Inputs:** `cancelSearch` (Hook G), `addToCatalog` (Hook D)
- **Returns:** `{ page, go, selected, open, openFromMoody, backFromDetail, shareRecipe, pendingShare, clearPendingShare, moodyOpen, setMoodyOpen, menuOpen, setMenuOpen, detailReturnPage }`
- **Circularity note:** G needs `setPage`; H needs `cancelSearch`. Resolve by having `runSearch` accept navigation via an `onNavigateToResults` callback param, or hoist raw `page` state into App and pass down to both.

##### Hook I — `useNotifications()` → `src/hooks/useNotifications.ts`
- **State:** `notifOpen` (551), `notifTick` (553, write-only re-render tick)
- **Callbacks:** `refreshNotifs` (554), `openNotifs` (703)
- **Effects:** `runDue()` on mount (555) — also flips `subscriptionStatus` to active, so takes `setProfile`
- **Returns:** `{ notifOpen, setNotifOpen, openNotifs, refreshNotifs, unread: unreadCount() }`

##### Hook J — `useMoodyChat()` → `src/hooks/useMoodyChat.ts`
- **State:** `moodyTurns` (227); `quickMood`/`quickEnergy`/`quickTime` (211–213) stay in App (entry-flow only)
- **Callbacks:** `loadMoodyCatalog` (358–374, deps `[catalog, foodHistory, mood, sharedProfile]`)
- **Returns:** `{ moodyTurns, setMoodyTurns, loadMoodyCatalog }`

---

#### 3. Context design

Today every state change re-renders the whole tree anyway (all state is in one component), so contexts cannot make re-renders worse — but split them so they can make renders *better* once screens are `memo`-ized.

| Context | Value shape | Consumers | Notes |
|---|---|---|---|
| `MenuCtx` (exists, line 111) | `() => void` | `AppHeader` (1559), `TopBar` (1823) | Move as-is to `src/components/MenuCtx.ts`. Already the pattern to imitate: stable function value. |
| `ProfileContext` | `{ profile: Profile; setProfile: Dispatch<SetStateAction<Profile>>; sharedProfile: Profile }` | Home, Settings, Account, PsychProfile, FoodProfile, Billing, Subscription, Detail (allergies), Cook, Diary, FoodLog, MainMenu, AppHeader | `profile` is memoized (204); `sharedProfile` memoized (259) — value object must be `useMemo`'d over those two + setter. |
| `NavigationContext` | `{ page: Page; go(p: Page): void; open(r: Recipe): void; shareRecipe(r: Recipe): void; backFromDetail(): void }` | Every screen + BottomNav/DesktopNav/MainMenu | All functions from Hook H wrapped in `useCallback`; value memoized. This kills ~6 props per screen. |
| `CollectionsContext` | `{ saved, toggleSavedRecipe, diary, setDiary, groceries, setGroceries, diners, selectedDiners, eaterCount, ... }` (Hook C return) | Home, Detail, Cook, Diary, Grocery, Pantry, Library, Diners, FamilyHealth, Health*, Insights | Highest-churn context (grocery check taps, diary writes). Keep separate from ProfileContext so profile edits don't re-render grocery list and vice versa. |
| `SearchContext` | Hook G return | SearchScreen, SearchResultsScreen only | **Recommendation: don't create it.** Only 2 screens consume it — plain props from App are simpler and keep search-loading re-renders scoped to those screens once they're extracted. |
| Home feed | Hook F return | HomeScreen only | Same: props, not context. HomeScreen legitimately takes the big bundle; cap it by passing the hook's return as one `feed` prop object. |

**Re-render scoping strategy:** split contexts (not a single store). Rationale: the app already uses `useStoredState` (store.ts:173) per-key; a unified store is a bigger rewrite. With split contexts + `React.memo` on extracted screens, a grocery tick re-renders only `GroceryScreen`; today it re-renders all 3,269 lines. Ensure each Provider `value` is `useMemo`'d — otherwise App's own re-renders (e.g. `searchLoading` flips) invalidate every context and you regress to today's behavior.

---

#### 4. Ordered PR plan

##### PR 1 — Safety net + dead code + pure leaf extraction (no behavior change)
- Add a vitest smoke test rendering `<App />` (jsdom, Supabase unconfigured path) asserting the Landing renders, plus one for `deriveDailySuggestions`.
- Delete dead code: `localRanked` memo (312), unused `readStored`/`writeStored` imports (13).
- Extract: `src/api/backend.ts` (57–107), `src/appTypes.ts` (113–120, 1839), `src/lib/toggle.ts` (984), `src/lib/dailySuggestions.ts` (1841–1903), `src/hooks/usePullToRefresh.ts` + `PullRefreshIndicator` (126–184), `MenuCtx` (109–111), photo consts (986–999).
- **App.tsx delta:** ~−220 lines → ~3,050.
- **Risk:** low. Watch H1 (`toggle` shadowing in DataPrivacyScreen:2326) — the module-level `toggle` must keep its exact identity for the 8 call sites; the local `toggle` in DataPrivacyScreen stays local.

##### PR 2 — Shared components
- Extract: `Moody`, `TopBar`, `AppHeader`, `DesktopNav`, `BottomNav`, `MainMenu`, `PickCard`, `TokenInput`, `DailySuggestionCarousel`, `Avatar`, `Trend`, `SettingsGroup`, `ProfileEditor`, `EditableCues`, `PlanPicker`, `Choice`, `SetupStep`, `FoodCamera` + `MacroBar`, `VoiceFab`, `MoodyFab`, `NotificationsPanel` (lines 1503–1575, 1821–1837, 1905–1984, 2302, 2395–2397, 2617, 2622, 2718–2722, 2750–2862, 2932–2951, 2953–3092).
- **App.tsx delta:** ~−700 → ~2,350.
- **Risk:** `AppHeader`/`TopBar` consume `MenuCtx` via `useContext` — they work anywhere under the provider (App line 781). `NotificationsPanel` calls `readInbox()` directly (module singleton) — fine. `MoodyFab`/`VoiceFab` touch `localStorage` + `window` at initial-state time — keep lazy `useState(() => ...)` initializers intact.

##### PR 3 — Self-contained screens (no App-state closures beyond props)
- Extract: Grocery, Pantry, Planner, Insights, Library, Settings, DataPrivacy, Import, Admin, Billing, Account + CancelAccount, Community, HealthHub, HealthDetail, FamilyHealth, Diners, PsychProfile (+ `optionsFor` → move into `src/onboarding.ts`), FoodProfile, FoodLog, Help + FAQ_DATA, Diary, Cook, Detail, SearchResults + EmptyResults, MoodyPanel (2255–2749, 2864–2930, 3094–3269, 2127–2205, 2207–2254).
- **App.tsx delta:** ~−800 → ~1,550.
- **Risk:** `BillingScreen`/`SubscriptionScreen` import `startCheckout`/`redeemInviteCode` from PR 1's `src/api/backend.ts`. `CommunityScreen`'s `initialRecipeId` effect (2604–2611) has deps `[initialRecipeId]` and calls `clearInitial` — moving is safe, do not "fix" the dep list. `DetailScreen`/`CookScreen`/`DiaryScreen` need `FoodCamera` from PR 2.

##### PR 4 — Entry + onboarding screens
- Extract everything in §1's entry and onboarding tables (826–1204, 1206–1502, 2398–2487).
- **App.tsx delta:** ~−700 → ~850.
- **Risk:** `Onboarding` uses `useStoredState("moodfood-onboarding-step")` — key must not change. `LoginScreen`'s gsap effect (1098–1108) with `matchMedia` cleanup — move verbatim. `QuestionField` and its field components are used by both `Onboarding` and `FoodProfileScreen` (2743) — the PR 3/PR 4 boundary means FoodProfileScreen temporarily imports from App.tsx; sequence QuestionField into PR 3 or import across.

##### PR 5 — Extract non-fetching hooks: `useProfileSync`, `useHouseholdCollections`, `useRecipeCatalog`, `useNotifications`, `useMoodyChat`, `useLearningSignals` (Hooks B, C, D, E, I, J)
- **App.tsx delta:** ~−200 → ~650.
- **Risk:** highest-care PR so far.
  - Preserve the `profile` memo (204) exactly — see H2.
  - Memoize `appliedSignals` when moving (H3); its consumers `rankForCheckin` (331) and the deleted `localRanked` list it in deps.
  - `useLearningSignals`' consent effect (454) deps `[entry, page]` intentionally refetch consent on page change (so toggling consent in DataPrivacy propagates to Settings) — keep `page` even though the effect body doesn't read it.
  - Hook call ORDER in App must keep any hook that reads another's return below it (B → C(needs profile) → D(needs diary/saved) → E(needs diary) → F/G).

##### PR 6 — Extract fetch/search hooks: `useHomeFeed` + `useRecipeSearch` (Hooks F, G), and `HomeScreen` + `SearchScreen`
- HomeScreen (1577–1820) and SearchScreen (1986–2116) move last because they consume F/G directly.
- **App.tsx delta:** ~−550 → ~250–300 (shell: hook wiring, entry-flow switch at 723–780, page switch at 784–817, panels 818–822).
- **Risk:** the two most dangerous effect moves:
  - Home-feed effect (481–518): dep array **must be copied byte-for-byte** (H4). It deliberately omits `foodHistory`, `localFallback`, and `behavioralConsent` which the body reads. Adding them (or letting eslint --fix do it) re-fires fetches on every diary/save change and regresses the 502-loop bug the comment at 200–204 documents.
  - `runSearch` (376–449): closes over `searchOffset`, `searchCandidates`, `searchResults`, `sharedProfile`, `mood`, `foodHistory` and is recreated every render today (fresh closures, no staleness). If you wrap it in `useCallback`, include ALL of those deps or keep pagination state in refs. Also note the local `const results` (423) shadows the `results` boolean state — rename to `nextResults` during extraction to avoid TS confusion in the hook.

##### PR 7 — Contexts + memo pass (behavior-visible only in render counts)
- Add `ProfileContext`, `NavigationContext`, `CollectionsContext` providers in App; convert screens with >10 props (Detail, Diary, Settings, Community) to consume contexts; `React.memo` the screens; delete the now-duplicated props.
- **App.tsx delta:** roughly net 0 (~250–300 final, provider wiring replaces prop threading).
- **Risk:** memoize provider values; verify with React DevTools profiler that a grocery-list tick no longer renders HomeScreen.

---

#### 5. Hazards discovered while reading

- **H1 — `toggle()` shadowing and misdirection (984, 2326).** Module-level `toggle` is an alias for `nextSavedRecipeIds` and is used for generic string-array toggling in 8+ components (1456, 1470, 1497, 2083, 2179, 2259, 2615, 2721). `DataPrivacyScreen` defines a *different* local `async toggle` (2326) that shadows it. Extract the module one to `src/lib/toggle.ts`; do not rename the local one incorrectly.
- **H2 — `profile` memo is load-bearing (200–204).** The comment documents a real production incident: an unstable `profile` reference cascaded through `sharedProfile` into the fetch effect and hammered the edge function into 502s. Any hook extraction must keep `profile`, `sharedProfile` (259), and `foodHistory` (354) memoized with identical deps.
- **H3 — Documented TDZ hazard (250–255).** `appliedSignals` is deliberately declared *above* the ranking memos "so the ranking memos below can read it without a temporal-dead-zone hazard." It is a fresh object each render (not memoized) — currently harmless only because its consumers' dep arrays contain it and it's `undefined` unless learning is on. When moving to `useLearningSignals`, wrap in `useMemo([learnedSignals, cuisineSignal, moodSignal])` or `rankForCheckin`/`localFallback`/`deterministicLive`/`ranked` will recompute every render for learning-enabled users.
- **H4 — Intentionally incomplete effect deps.** Home-feed fetch (518): omits `foodHistory`, `localFallback`, `behavioralConsent` that the body reads. Consent mirror (459): includes `page` which the body doesn't read (intentional refresh trigger). Auth-sync effect (617): deps `[storedProfile.onboarded, storedProfile.accountCreated, storedProfile, testState]` — resubscribes `onAuthChange` on every profile keystroke; ugly but current behavior. HomeScreen (1594–1595) and SearchScreen (2011–2012) suggestion memos carry `eslint-disable react-hooks/exhaustive-deps` with scalar deps (`diary.length`, `profile.allergies.join()`). **Copy all dep arrays verbatim; do not let lint autofix them.**
- **H5 — `runSearch` closure semantics (376–449).** Pagination (`nextPage=true`) reads `searchOffset`/`searchCandidates`/`searchResults` from the *current render's* closure — correct today because the function is recreated each render. A naive `useCallback([])` extraction gives stale pagination. The abort discipline (`activeSearchId`/`activeSearchAbort` refs, `isActiveSearch()` guard, the `finally` that only clears loading if still the active search, 443–448) must move as a unit — this is the "stale loading state" fix from commit e263e77.
- **H6 — Cross-component helpers.** `open`/`openFromMoody`/`shareRecipe`/`toggleSavedRecipe` all perform the catalog-upsert side effect first (674, 678, 686, 699) — that pattern is the fix from commits 8e970a7/420aae6 (saves persist only if the recipe is in the catalog). Extract as a single `addToCatalog` and keep it inside each of those callbacks.
- **H7 — Entry early-returns vs hook mounting (723–780).** App runs ALL hooks (fetch effects included) even while rendering entry screens; effects self-gate with `if (entry !== "app") return`. If you split "EntryFlow" and "AppShell" into components mounted conditionally, those effects change from "gated" to "unmounted", altering timing (e.g. consent fetch at 454 currently fires the moment `entry` becomes "app" — same either way — but `quickMood/quickEnergy/quickTime` at 211–213 must stay above the split because quick-start and first-pick are *different* entry renders sharing that state).
- **H8 — `usePullToRefresh` (129–165)** re-registers document touch listeners on every `pullY` change (deps `[pullY]`) — works, but don't "optimize" during the move; the `onEnd` closure needs the current `pullY`.
- **H9 — StrictMode (main.tsx:17).** Effects double-fire in dev. The mount-only effects (`runDue` 555, checkout redirect 639) are idempotent today (`window.history.replaceState` guard at 644); keep the guards when moving.
- **H10 — `GroceryScreen`/`PantryScreen` local `entry` state (2257, 2265)** shadows App's `entry`. Zero-risk after extraction, but during any interim same-file refactor beware find-replace on `entry`/`setEntry`.
- **H11 — `HomeScreen` is rendered from two routes (785 and 790)** with different props (`results={false}` vs `results` + `hasFetched`). Both call sites must be updated in lockstep in PR 6; prefer collapsing to one call site keyed off `page === "results" && !searchRequest`.

---

#### 6. Acceptance criteria

1. **Line counts:** `src/App.tsx` ≤ 350 lines at end of PR 6 (shell: hook wiring + entry switch + page switch + panels). No extracted screen file > 300 lines (HomeScreen, at 244 lines of JSX, is the ceiling). No hook file > 200 lines.
2. **Props budget:** every extracted screen takes ≤ 10 props after PR 7 (HomeScreen's current ~34 props collapse via `feed` object + contexts). Exceptions must be a single bundled object, not 11+ scalars.
3. **Tests:** all existing 20+ vitest suites stay green after every PR (`npx vitest run`); the PR 1 App smoke test stays green; `deriveDailySuggestions` unit test added. `tsc --noEmit` clean (strict mode) after every PR.
4. **No behavior change:** every `useEffect` dependency array in extracted hooks is byte-identical to App.tsx `main` (verifiable by diff); every `useStoredState` key unchanged (`moodfood-entry`, `moodfood-profile`, `moodfood-saved`, `moodfood-diary`, `moodfood-groceries`, `moodfood-posts`, `moodfood-connections`, `moodfood-diners`, `moodfood-eater-count`, `moodfood-ai-curation`, `moodfood-learned-signals`, `moodfood-suppressed-cuisines`, `moodfood-onboarding-step`, `moodfood-onboarding-section-step`, `voiceFabPos`, `moodyFabPos`); telemetry `trackSearch` payloads unchanged for home/search/load_more modes.
5. **Manual QA gate per PR (dev test states from `readDevTestState`):** `?state=home` renders home + check-in fetch; `?state=quick-start` → first-pick → subscription flow works; search → results → detail → cook → diary loop works; saving from search results and from Moody persists in Saved tab (regression area of last 5 commits); pull-to-refresh, Moody panel open/close/drag, notifications panel, and account cancel all function.
6. **Only allowed intentional changes:** deletion of dead `localRanked` memo + unused `readStored`/`writeStored` imports (PR 1), memoization of `appliedSignals` (PR 5), rename of `runSearch`'s shadowing local `results` (PR 6), render-count improvements (PR 7). Each called out in its PR description.

---

## Phase 4 — Performance (~1–2 days)

### 4.1 Route-level code splitting
Everything ships in one 333 KB chunk. Landing, onboarding, and auth screens are only needed once
per user lifetime. After Phase 3, wrap them in `React.lazy` — the returning-user path should load
roughly half the JS. (Vendor splitting is already done well in
[vite.config.ts](../vite.config.ts).)

### 4.2 GSAP is a heavyweight dependency for two animations
`gsap` is used only in the auth screen entrance animation ([App.tsx:1099-1103](../src/App.tsx)).
Replace with CSS keyframes/`@starting-style`, or at minimum lazy-load it inside the auth chunk.
Saves ~25-30 KB gz from the critical path.

### 4.3 Re-render hygiene
After the context split, memoize screen components (`React.memo`) and check with React DevTools
Profiler that typing in the grocery input no longer re-renders HomeScreen. Currently every
keystroke anywhere re-runs the whole `App()` render including the `recommend()` ranking memos'
dependency comparisons.

### 4.4 localStorage write batching
`useStoredState` JSON-stringifies and writes on *every* value change (each keystroke for
token-input-backed state). Debounce writes ~300 ms inside the hook. Also add a one-time quota
estimate (`navigator.storage.estimate()`) so quota exhaustion surfaces in telemetry instead of
a swallowed console.warn.

### 4.5 CSS
Single 134 KB `styles.css` (22 KB gz — acceptable, not urgent). When screens are split into files,
consider co-locating per-screen CSS so dead styles become findable. Skip CSS modules — not worth
the churn.

---

## Phase 5 — Robustness & observability (~1–2 days)

1. **Error telemetry:** the ErrorBoundary ([main.tsx:6-14](../src/main.tsx)) recovers but reports
   nothing. Send a `record-event` (existing telemetry edge fn) with the error name/stack hash so
   crashes in the field are visible.
2. **Moody query stripping:** `loadMoodyCatalog` ([App.tsx:360](../src/App.tsx)) strips stop-words
   with a regex that also eats meaningful words in dish names ("Look" in *look chaam*, "Me" in
   dishes containing "me"). Low frequency, but move query cleanup server-side into the `recipes`
   fn where the search intent is parsed, or restrict stripping to leading/trailing words.
3. **Service worker cache cap:** [sw.js](../public/sw.js) caches every same-origin GET forever
   (only cleared on version bump). Add a simple max-entries trim for `/assets/` so long-lived
   installs don't accumulate stale hashed bundles.
4. **E2E smoke tests:** the dev test-states (`?testState=home|quick-start|first-pick|…`) are
   perfect hooks for a small Playwright suite: boot → check-in → results → detail → save →
   Saved tab. ~5 flows would have caught most of the recent saved-recipes regressions
   (see last 5 commits, all fixes to that area).

---

## Suggested order of execution

| Week | Work |
|---|---|
| 1 | Phase 1 (all four items) + Phase 2.1–2.3 |
| 2 | Phase 3 PRs 1–3 (mechanical extractions) |
| 3 | Phase 3 PRs 4–6 (hooks), Phase 4.1–4.3 |
| 4 | Phase 3 PR 7, Phase 4.4–4.5, Phase 5, dependency bumps |

**After every step:** `npm run verify` (audit + 135 tests + strict build) — it's fast (~5 s) and
already the project's quality gate.

## Things checked and found healthy (no action needed)

- Auth flow state machine (sign-out/sign-in/recovery routing) — well-commented, correct.
- Search race handling (`activeSearchId` + AbortController) — correct, recently fixed.
- Timeout strategy in [recipes.ts](../src/recipes.ts) (22 s fetch + 25 s hard ceiling) — sound.
- Safety filtering (allergies as hard client-side filter) — applied on every path.
- All floating promises audited — apart from bug 1.2, every unawaited call is intentional
  fire-and-forget with never-rejecting internals (see the table in the 1.2 audit §d).
- CSP pipeline (csp.config.js → meta tag + vercel.json sync script) — solid.
- `.env` files properly gitignored; no secrets tracked.
- Accessibility basics (aria-labels, keyboard handlers on custom controls) — present.
