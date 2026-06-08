// Single source of truth for the app's Content-Security-Policy.
//
// Consumed by:
//   - vite.config.ts            -> injects the <meta> CSP into index.html
//   - scripts/sync-vercel-csp.mjs -> writes the production header into vercel.json
//
// Edit the directives here only. Both the meta tag and the vercel.json header
// are generated from this file, so they can no longer drift apart.

/** Directives shared by every environment. */
const base = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["https://fonts.gstatic.com"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://images.unsplash.com",
    "https://img.spoonacular.com",
    "https://spoonacular.com",
    "https://i.ytimg.com",
    "https://www.themealdb.com",
  ],
  "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
  "frame-src": ["https://www.youtube.com", "https://www.youtube-nocookie.com"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  // Ignored when delivered via <meta>, but enforced via the vercel.json header.
  "frame-ancestors": ["'none'"],
};

/**
 * Build the CSP string for a given environment.
 * @param {"dev" | "prod"} mode
 * @returns {string}
 */
export function buildCsp(mode = "prod") {
  const directives = Object.fromEntries(
    Object.entries(base).map(([key, sources]) => [key, [...sources]]),
  );

  if (mode === "dev") {
    // Vite's HMR client opens a websocket on the dev-server origin.
    directives["connect-src"].push("ws:");
  } else {
    // The production host serves over HTTPS; upgrade any stray http subresource.
    directives["upgrade-insecure-requests"] = [];
  }

  return Object.entries(directives)
    .map(([key, sources]) => (sources.length ? `${key} ${sources.join(" ")}` : key))
    .join("; ");
}
