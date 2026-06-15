import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getConsents, setConsent, resetLearningData, exportMyData, NO_CONSENT, CONSENT_VERSION } from "./governance";

// In the test environment Supabase is not configured (no .env), so the client
// governance helpers must degrade safely — never throw, return safe defaults —
// exactly as they do in the no-backend pilot.
describe("governance client (no backend)", () => {
  it("reads as no-consent when unconfigured", async () => {
    await expect(getConsents()).resolves.toEqual(NO_CONSENT);
  });
  it("setConsent / reset / export report failure rather than throwing", async () => {
    await expect(setConsent("behavioral_learning", true)).resolves.toBe(false);
    await expect(resetLearningData()).resolves.toBe(false);
    await expect(exportMyData()).resolves.toBeNull();
  });
  it("ships a consent version so stored consents are traceable", () => {
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// Deletion-completeness contract (roadmap Slice 1.5 exit gate). The live guarantee
// is the schema invariant "every public FK to auth.users is ON DELETE CASCADE",
// verified against the database in this milestone. This test guards the second
// half: that delete-account explicitly covers — and export-data mirrors — every
// sensitive behavioural + health-adjacent table, so coverage can't silently drift.
const SENSITIVE_TABLES = [
  "consents", "events",
  "mood_entries", "recommendation_runs", "cooking_sessions", "diary_entries",
  "health_trend_snapshots", "household_diners", "family_health_snapshots",
];
const fnSource = (name: string) =>
  readFileSync(resolve(process.cwd(), `supabase/functions/${name}/index.ts`), "utf8");

describe("data-governance edge-function coverage", () => {
  it("delete-account references every sensitive table", () => {
    const src = fnSource("delete-account");
    for (const t of SENSITIVE_TABLES) expect(src, `delete-account must cover ${t}`).toContain(`"${t}"`);
  });
  it("export-data mirrors delete-account's coverage (lockstep)", () => {
    const src = fnSource("export-data");
    for (const t of SENSITIVE_TABLES) expect(src, `export-data must cover ${t}`).toContain(`"${t}"`);
  });
});
