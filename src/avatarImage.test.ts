import { describe, expect, it } from "vitest";
import { clampAvatarScale } from "./avatarImage";

describe("profile avatar resizing", () => {
  it("keeps avatar zoom inside the supported range", () => {
    expect(clampAvatarScale(0.2)).toBe(1);
    expect(clampAvatarScale(1.8)).toBe(1.8);
    expect(clampAvatarScale(4)).toBe(2.5);
    expect(clampAvatarScale(Number.NaN)).toBe(1);
  });
});
