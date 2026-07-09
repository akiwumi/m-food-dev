// @vitest-environment jsdom
//
// Safety-net render test for the App.tsx decomposition (roadmap Phase 3 PR 1).
// It boots the real <App/> through the actual entry routing on the
// Supabase-unconfigured (pilot) path and asserts the Landing welcome screen
// renders. This guards the mechanical component/hook extractions in later PRs:
// a mis-wired render that tsc can't catch fails here.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

beforeAll(() => {
  // jsdom omits a few browser APIs that Landing/App touch on mount.
  if (!window.matchMedia) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {},
      addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    })) as any;
  }
  window.scrollTo = () => {};
  if (!window.IntersectionObserver) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } as any;
  }
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App smoke test", () => {
  it("mounts and renders the Landing welcome screen (Supabase unconfigured)", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Let's eat/i)).toBeTruthy());
    expect(screen.getByText(/I already have an account/i)).toBeTruthy();
  });
});
