import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile chrome layout", () => {
  const styles = () => readFileSync("src/styles.css", "utf8");

  it("keeps app headers below the iOS status bar and camera notch", () => {
    const css = styles();
    expect(css).toContain("--app-chrome-top:calc(18px + env(safe-area-inset-top))");
    expect(css).toContain("--app-chrome-control:48px");
    expect(css).toContain("padding:calc(18px + env(safe-area-inset-top)) 20px 0");
    expect(css).toContain("min-height:calc(var(--app-chrome-top) + var(--app-chrome-control))");
    expect(css).toContain("top:var(--app-chrome-top)");
    expect(css).toContain("padding-top:var(--app-chrome-top)");
    expect(css).toContain(".entry,.auth-modern,.quick-start{padding-top:var(--app-chrome-top)}");
    expect(css).toContain(".onboarding-photo .op-bar{padding:var(--app-chrome-top) 18px 0}");
  });

  it("renders Moody chat as a draggable floating window, not a pinned bottom sheet", () => {
    const css = styles();
    expect(css).toContain("align-items:center;justify-content:center");
    expect(css).toContain("padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))");
    expect(css).toContain("width:min(520px,calc(100vw - 24px))");
    expect(css).toContain("border-radius:26px");
  });
});
