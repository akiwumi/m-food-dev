import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile chrome layout", () => {
  const styles = () => readFileSync("src/styles.css", "utf8");

  it("keeps app headers below the iOS status bar and camera notch", () => {
    const css = styles();
    expect(css).toContain("padding:calc(18px + env(safe-area-inset-top)) 20px 0");
    expect(css).toContain("min-height:calc(62px + env(safe-area-inset-top))");
  });

  it("renders Moody chat as a draggable floating window, not a pinned bottom sheet", () => {
    const css = styles();
    expect(css).toContain("align-items:center;justify-content:center");
    expect(css).toContain("padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom))");
    expect(css).toContain("width:min(520px,calc(100vw - 24px))");
    expect(css).toContain("border-radius:26px");
  });
});
