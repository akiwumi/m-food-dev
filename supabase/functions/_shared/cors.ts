// Shared CORS + origin allow-listing for edge functions, mirroring the policy
// in ai-gateway. ALLOWED_ORIGINS is a comma-separated list set via:
//   supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://your-live-url"

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").filter(Boolean),
);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...(allowed
      ? { "access-control-allow-origin": allowed, "vary": "Origin" }
      : {}),
  };
}

export function isAllowedOrigin(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.has(origin);
}

export function preflight(origin: string | null): Response {
  return new Response(null, {
    headers: {
      ...corsHeaders(origin),
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    },
  });
}
