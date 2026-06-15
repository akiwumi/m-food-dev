// analytics — the telemetry sink for Slice 0 ("Make Measurement Exist").
//
// Accepts a BATCH of operational events from the client and stores them in the
// `events` table (migration 012). Writes are best-effort and off the interactive
// search path — the client fires and forgets.
//
// Trust model: the client is never trusted to say *who* it is. We verify the
// bearer token, derive the user id from it, and stamp every row with that id.
// RLS double-checks ownership. Invalid events are dropped individually; a bad
// event never fails the whole batch (telemetry must never break the app).
//
// Only the operational event vocabulary is accepted here. Behavioural events
// (opens, saves, cooks, ratings) are gated behind the Data Governance consent
// work (roadmap Slice 1.5) and are rejected both here and by the table's CHECK
// constraints until that ships.
//
// Secrets required (same set as the other functions):
//   SUPABASE_URL, SUPABASE_ANON_KEY   (auto-injected)
//   ALLOWED_ORIGINS                   (comma-separated allowed browser origins)
//
// Deploy: supabase functions deploy analytics
//
// POST body: { "events": [ { id, event_type, event_time, duration_ms?, value?,
//                            source?, ranking_config_version?, metadata? }, ... ] }
// Response:  { "ok": true, "inserted": <n> }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, isAllowedOrigin, preflight } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Keep the operational vocabulary here in lockstep with the table CHECK in 012.
const ALLOWED_EVENT_TYPES = new Set(["search_completed"]);
const MAX_BATCH = 50;                 // cap a single request
const MAX_METADATA_BYTES = 2_000;     // keep events small; reject bloated metadata
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CleanEvent = {
  id: string;
  user_id: string;
  event_type: string;
  category: "operational";
  event_time: string;
  duration_ms: number | null;
  value: number | null;
  source: string | null;
  ranking_config_version: string | null;
  metadata: Record<string, unknown>;
};

// Validate one raw event into a row we're willing to store, or null to drop it.
// Defensive throughout: the user id always comes from the verified token, never
// from the body.
function sanitize(raw: unknown, userId: string): CleanEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;

  const id = typeof e.id === "string" && UUID_RE.test(e.id) ? e.id : null;
  if (!id) return null;

  const eventType = typeof e.event_type === "string" ? e.event_type : "";
  if (!ALLOWED_EVENT_TYPES.has(eventType)) return null;

  // event_time must be a parseable timestamp; fall back to now if absent/bad.
  const t = typeof e.event_time === "string" ? Date.parse(e.event_time) : NaN;
  const eventTime = Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString();

  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown, max: number): string | null =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

  const durationRaw = num(e.duration_ms);
  const durationMs = durationRaw === null ? null : Math.max(0, Math.round(durationRaw));

  let metadata: Record<string, unknown> = {};
  if (e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata)) {
    const serialized = JSON.stringify(e.metadata);
    if (serialized.length <= MAX_METADATA_BYTES) metadata = e.metadata as Record<string, unknown>;
  }

  return {
    id,
    user_id: userId,
    event_type: eventType,
    category: "operational",
    event_time: eventTime,
    duration_ms: durationMs,
    value: num(e.value),
    source: str(e.source, 40),
    ranking_config_version: str(e.ranking_config_version, 60),
    metadata,
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return new Response(null, { status: 403 });
    return preflight(origin);
  }
  if (req.method !== "POST") return Response.json({ ok: false, error: "Method not allowed" }, { status: 405, headers: corsHeaders(origin) });
  if (origin && !isAllowedOrigin(origin)) return Response.json({ ok: false, error: "Origin not allowed" }, { status: 403, headers: corsHeaders(origin) });

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  }

  // Identity: derive the user id from the verified token — never from the body.
  const identity = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(5_000),
  });
  if (!identity.ok) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });
  const { id: userId } = await identity.json();
  if (!userId) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders(origin) });

  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: corsHeaders(origin) }); }

  const rawEvents = (body as { events?: unknown })?.events;
  if (!Array.isArray(rawEvents)) return Response.json({ ok: false, error: "Missing events array" }, { status: 400, headers: corsHeaders(origin) });

  const rows = rawEvents
    .slice(0, MAX_BATCH)
    .map(e => sanitize(e, userId))
    .filter((e): e is CleanEvent => e !== null);

  if (!rows.length) return Response.json({ ok: true, inserted: 0 }, { headers: corsHeaders(origin) });

  // Insert under the caller's token so RLS applies. resolution=ignore-duplicates
  // makes re-sent events (same client-generated id) a no-op → idempotent.
  const insert = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: "POST",
    headers: {
      authorization: auth,
      apikey: SUPABASE_ANON_KEY,
      "content-type": "application/json",
      "Prefer": "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(8_000),
  });

  if (!insert.ok) {
    const errBody = await insert.text().catch(() => "");
    console.warn(`[analytics] insert failed (HTTP ${insert.status}):`, errBody.slice(0, 200));
    return Response.json({ ok: false, error: "Store failed" }, { status: 502, headers: corsHeaders(origin) });
  }

  return Response.json({ ok: true, inserted: rows.length }, { headers: corsHeaders(origin) });
});
