import { describe, expect, it, vi } from "vitest";
import { createTelemetry, searchTelemetryEvents, telemetrySource, type QueuedEvent } from "./telemetry";

// A controllable transport that records every batch it's asked to send and
// resolves to a configurable success flag.
function makeTransport(ok = true) {
  const batches: QueuedEvent[][] = [];
  const tokens: string[] = [];
  const transport = vi.fn(async (events: QueuedEvent[], token: string) => {
    batches.push(events);
    tokens.push(token);
    return ok;
  });
  return { transport, batches, tokens };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

let counter = 0;
const seq = () => `00000000-0000-4000-8000-${String(counter++).padStart(12, "0")}`;
const deps = (over: Partial<Parameters<typeof createTelemetry>[0]> = {}) => ({
  getToken: async () => "tok",
  transport: makeTransport().transport,
  now: () => "2026-06-15T00:00:00.000Z",
  uuid: seq,
  batchSize: 20,
  ...over,
});

describe("createTelemetry", () => {
  it("enqueues events with a generated id and timestamp", () => {
    const t = createTelemetry(deps());
    t.track({ event_type: "search_completed", value: 3 });
    expect(t.pending()).toBe(1);
  });

  it("flushes the queue through the transport with the token", async () => {
    const { transport, batches, tokens } = makeTransport(true);
    const t = createTelemetry(deps({ transport }));
    t.track({ event_type: "search_completed", value: 1 });
    await t.flush();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(batches[0]).toHaveLength(1);
    expect(batches[0][0]).toMatchObject({ event_type: "search_completed", value: 1, event_time: "2026-06-15T00:00:00.000Z" });
    expect(batches[0][0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(tokens[0]).toBe("tok");
    expect(t.pending()).toBe(0);
  });

  it("keeps events queued when there is no session token", async () => {
    const { transport } = makeTransport(true);
    const t = createTelemetry(deps({ transport, getToken: async () => null }));
    t.track({ event_type: "search_completed" });
    await t.flush();
    expect(transport).not.toHaveBeenCalled();
    expect(t.pending()).toBe(1); // retried later, not dropped
  });

  it("keeps events queued when the transport reports failure", async () => {
    const { transport } = makeTransport(false);
    const t = createTelemetry(deps({ transport }));
    t.track({ event_type: "search_completed" });
    await t.flush();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(t.pending()).toBe(1);
  });

  it("auto-flushes once the batch size is reached", async () => {
    const { transport, batches } = makeTransport(true);
    const t = createTelemetry(deps({ transport, batchSize: 3 }));
    t.track({ event_type: "search_completed" });
    t.track({ event_type: "search_completed" });
    expect(transport).not.toHaveBeenCalled();
    t.track({ event_type: "search_completed" });
    await tick();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(batches[0]).toHaveLength(3);
  });

  it("drops the oldest events past the max-queue cap", () => {
    const t = createTelemetry(deps({ batchSize: 1000, maxQueue: 2 }));
    t.track({ event_type: "search_completed", value: 1 });
    t.track({ event_type: "search_completed", value: 2 });
    t.track({ event_type: "search_completed", value: 3 });
    expect(t.pending()).toBe(2); // capped — oldest dropped
  });

  it("never throws when id generation fails", () => {
    const t = createTelemetry(deps({ uuid: () => { throw new Error("no crypto"); } }));
    expect(() => t.track({ event_type: "search_completed" })).not.toThrow();
    expect(t.pending()).toBe(0);
  });

  it("never throws when the transport rejects", async () => {
    const transport = vi.fn(async () => { throw new Error("network down"); });
    const t = createTelemetry(deps({ transport }));
    t.track({ event_type: "search_completed" });
    await expect(t.flush()).resolves.toBeUndefined();
    expect(t.pending()).toBe(1);
  });
});

describe("telemetrySource", () => {
  it("reports 'none' for an empty or null result set", () => {
    expect(telemetrySource(null)).toBe("none");
    expect(telemetrySource(undefined)).toBe("none");
    expect(telemetrySource([])).toBe("none");
  });

  it("labels a TheMealDB fallback response 'themealdb' (not 'spoonacular')", () => {
    expect(telemetrySource([{ provider: "TheMealDB" }, { provider: "TheMealDB" }])).toBe("themealdb");
  });

  it("labels a Spoonacular response 'spoonacular'", () => {
    expect(telemetrySource([{ provider: "Spoonacular" }])).toBe("spoonacular");
  });

  it("prefers the primary provider when a list somehow mixes both", () => {
    expect(telemetrySource([{ provider: "TheMealDB" }, { provider: "Spoonacular" }])).toBe("spoonacular");
  });

  it("defaults an unlabeled but non-empty live list to 'spoonacular'", () => {
    expect(telemetrySource([{}, {}])).toBe("spoonacular");
  });
});

describe("searchTelemetryEvents", () => {
  it("emits distinct north-star events alongside the search event", () => {
    const events = searchTelemetryEvents({
      mode: "home",
      durationMs: 420,
      resultCount: 3,
      source: "spoonacular",
      aiAttempted: true,
      aiSucceeded: true,
      fallbackUsed: false,
      rankingConfigVersion: "rank-v1",
      moodAlone: true,
      timeToFirstAnswerMs: 1800,
    });

    expect(events.map(e => e.event_type)).toEqual([
      "search_completed",
      "answered_from_mood_alone",
      "time_to_first_answer",
    ]);
    expect(events[1]).toMatchObject({ value: 1, source: "spoonacular", ranking_config_version: "rank-v1" });
    expect(events[2]).toMatchObject({ duration_ms: 1800, value: 3, source: "spoonacular" });
  });
});
