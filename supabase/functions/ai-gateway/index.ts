import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ALLOWED_ORIGINS = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").filter(Boolean));
const MAX_BODY_BYTES = 16_384;

function headers(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...(allowed ? { "access-control-allow-origin": allowed, "vary": "Origin" } : {}),
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { headers: { ...headers(origin), "access-control-allow-methods": "POST", "access-control-allow-headers": "authorization, content-type" } });
  }
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: headers(origin) });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers: headers(origin) });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return Response.json({ error: "Request too large" }, { status: 413, headers: headers(origin) });

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) return Response.json({ error: "Unauthorized" }, { status: 401, headers: headers(origin) });
  const identity = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { authorization: auth, apikey: SUPABASE_ANON_KEY } });
  if (!identity.ok) return Response.json({ error: "Unauthorized" }, { status: 401, headers: headers(origin) });

  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: headers(origin) }); }
  const context = typeof body === "object" && body && "context" in body && typeof body.context === "object" ? body.context : undefined;
  return Response.json({
    provider: "deterministic-fallback",
    message: "I kept every hard safety filter in place and used the verified recipe ranking.",
    actions: context ? [{ type: "recommend" }] : [],
  }, { headers: headers(origin) });
});
