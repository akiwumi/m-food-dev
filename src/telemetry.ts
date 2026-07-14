import { supabase } from "./supabase";

// Slice 0 of the AI Learning Roadmap (v3): the client half of "Make Measurement
// Exist". Buffers OPERATIONAL events (search timing + outcomes) and flushes them
// to the `analytics` edge function in batches, off the interactive path.
//
// Design rules from the roadmap:
//   • Never block the search path. track() only enqueues (cheap, synchronous);
//     flushing is deferred and fire-and-forget.
//   • Never let telemetry break the app. Every public call is wrapped so a
//     transport/serialisation error can never bubble into a render or a search.
//   • Operational only. No behavioural/preference data is collected here — that
//     waits for the Data Governance consent gate (roadmap Slice 1.5).
//
// The core is a factory with injectable dependencies (session, transport, clock,
// uuid) so it can be unit-tested without a network or a real Supabase session,
// matching the project's existing dependency-injection test style.

export type EventType = "search_completed" | "app_error";

// What a caller provides. id / event_time / category are added by the queue.
export type TelemetryEvent = {
  event_type: EventType;
  duration_ms?: number;
  value?: number;                 // generic numeric, e.g. result_count
  source?: string;                // provider source: spoonacular | themealdb | local
  ranking_config_version?: string;
  metadata?: Record<string, unknown>;
};

// The wire shape sent to the analytics function (and stored in `events`).
export type QueuedEvent = TelemetryEvent & { id: string; event_time: string };

type Transport = (events: QueuedEvent[], token: string) => Promise<boolean>;

export type TelemetryDeps = {
  getToken: () => Promise<string | null>;
  transport: Transport;
  now?: () => string;
  uuid?: () => string;
  batchSize?: number;   // flush once this many events are queued
  maxQueue?: number;    // hard cap so a long offline spell can't grow unbounded
};

export type Telemetry = {
  track: (event: TelemetryEvent) => void;
  flush: () => Promise<void>;
  pending: () => number;
};

export function createTelemetry(deps: TelemetryDeps): Telemetry {
  const now = deps.now ?? (() => new Date().toISOString());
  const uuid = deps.uuid ?? (() => crypto.randomUUID());
  const batchSize = deps.batchSize ?? 20;
  const maxQueue = deps.maxQueue ?? 200;

  const MAX_PER_REQUEST = 50; // matches the analytics function's MAX_BATCH

  let queue: QueuedEvent[] = [];
  let flushing = false;
  let scheduled = false;

  async function flush(): Promise<void> {
    if (flushing || !queue.length) return;
    flushing = true;
    // Send a bounded chunk; events arriving mid-flight (or beyond the cap) stay
    // queued and go out on the next flush.
    const batch = queue.slice(0, MAX_PER_REQUEST);
    try {
      const token = await deps.getToken();
      if (!token) return; // not signed in / backend off → keep buffered, try later
      const ok = await deps.transport(batch, token);
      if (ok) queue = queue.slice(batch.length);
    } catch {
      // Swallow — telemetry must never throw into the app. Events stay queued.
    } finally {
      flushing = false;
    }
  }

  function scheduleFlush() {
    if (scheduled) return;
    scheduled = true;
    // Defer off the current task so we never sit on the interactive path.
    queueMicrotask(() => { scheduled = false; void flush(); });
  }

  function track(event: TelemetryEvent): void {
    try {
      queue.push({ ...event, id: uuid(), event_time: now() });
      if (queue.length > maxQueue) queue = queue.slice(queue.length - maxQueue); // drop oldest
      if (queue.length >= batchSize) scheduleFlush();
    } catch {
      // Never let enqueuing break a caller.
    }
  }

  return { track, flush, pending: () => queue.length };
}

// ── Default singleton wired to the live backend ───────────────────────────────

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics`;

const liveTransport: Transport = async (events, token) => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true, // let the request finish even if the page is unloading
    signal: AbortSignal.timeout(8_000),
  });
  return res.ok;
};

const getToken = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};

export const telemetry: Telemetry = createTelemetry({ getToken, transport: liveTransport });

// Flush opportunistically when the tab is hidden / closing so we don't lose a
// partial batch. Guarded for non-browser (test) environments.
if (typeof document !== "undefined") {
  const flushNow = () => { void telemetry.flush(); };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushNow(); });
  window.addEventListener("pagehide", flushNow);
}

// Convenience wrapper for the one operational event Slice 0 records: a completed
// search. Keeps the field shape consistent across the several call sites.
export type SearchTelemetry = {
  mode: "search" | "home" | "load_more";
  durationMs: number;
  resultCount: number;
  source: "spoonacular" | "themealdb" | "local" | "none";
  aiAttempted: boolean;
  aiSucceeded: boolean;
  fallbackUsed: boolean;
  rankingConfigVersion?: string;
  safetyRejected?: number;
  hasQuery?: boolean;
  filterCount?: number;
};

// Derive the telemetry `source` from the provider stamped on the live recipes
// the edge function returned (the same per-recipe `provider` the UI shows as
// "Live from …"). A single search response is single-provider, but a mixed list
// resolves to "spoonacular" (the primary) when any Spoonacular result is present.
// An empty/null list is "none"; a non-empty list with no provider label (e.g.
// dev-injected fixtures) defaults to "spoonacular", since user searches are
// live-only. This keeps "themealdb" fallbacks from being mislabeled.
export function telemetrySource(
  recipes: ReadonlyArray<{ provider?: string }> | null | undefined,
): "spoonacular" | "themealdb" | "none" {
  if (!recipes?.length) return "none";
  const providers = new Set(recipes.map(r => r.provider));
  if (providers.has("Spoonacular")) return "spoonacular";
  if (providers.has("TheMealDB")) return "themealdb";
  return "spoonacular";
}

export function trackSearch(t: SearchTelemetry): void {
  telemetry.track({
    event_type: "search_completed",
    duration_ms: t.durationMs,
    value: t.resultCount,
    source: t.source,
    ranking_config_version: t.rankingConfigVersion,
    metadata: {
      mode: t.mode,
      ai_attempted: t.aiAttempted,
      ai_succeeded: t.aiSucceeded,
      fallback_used: t.fallbackUsed,
      empty: t.resultCount === 0,
      ...(t.safetyRejected !== undefined ? { safety_rejected: t.safetyRejected } : {}),
      ...(t.hasQuery !== undefined ? { has_query: t.hasQuery } : {}),
      ...(t.filterCount !== undefined ? { filter_count: t.filterCount } : {}),
    },
  });
}

// FNV-1a — small, dependency-free hash to group identical stacks without sending
// the (potentially PII-bearing) stack text itself.
function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}

// Report an uncaught render error (from the ErrorBoundary) as an operational
// event, so field crashes are visible instead of silently recovered. Sends the
// error name, a truncated message, and a stable hash of the stack — no raw stack.
export function trackError(error: Error, componentStack?: string): void {
  try {
    telemetry.track({
      event_type: "app_error",
      source: (error.name || "Error").slice(0, 40),
      metadata: {
        message: (error.message || "").slice(0, 200),
        stack_hash: hashString((error.stack || "") + (componentStack || "")),
      },
    });
    void telemetry.flush(); // crashes are rare + high-value; don't wait for the batch
  } catch {
    // Telemetry must never throw into the ErrorBoundary's recovery path.
  }
}
