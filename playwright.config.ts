import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests. Kept separate from the vitest unit suite: files are named
// *.e2e.ts (vitest only picks up *.test.ts / *.spec.ts) and live in e2e/.
// The suite drives the app through its dev test-state hooks (?testState=…),
// which set up a signed-in-ish profile without a backend.
const PORT = 5188;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // MoodFood is mobile-first — a narrow viewport so the bottom nav (not the
    // desktop sidebar) is the active chrome, matching the intended UX.
    { name: "mobile-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
