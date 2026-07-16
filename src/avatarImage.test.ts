import { describe, expect, it } from "vitest";
import { AVATAR_IMAGE_SIZE, avatarDrawRect, clampAvatarScale, clampAvatarTransform, scaleAvatarTransform } from "./avatarImage";

describe("profile avatar resizing", () => {
  it("keeps avatar zoom inside the supported range", () => {
    expect(clampAvatarScale(0.2)).toBe(1);
    expect(clampAvatarScale(1.8)).toBe(1.8);
    expect(clampAvatarScale(4)).toBe(2.5);
    expect(clampAvatarScale(Number.NaN)).toBe(1);
  });

  it("keeps dragged avatar photos covering the crop window", () => {
    expect(clampAvatarTransform({ scale: 2, x: 200, y: -200 }, { width: 512, height: 512 }, 144)).toEqual({ scale: 2, x: 72, y: -72 });
    expect(clampAvatarTransform({ scale: 1, x: 80, y: 0 }, { width: 1024, height: 512 }, 144)).toEqual({ scale: 1, x: 72, y: 0 });
    expect(clampAvatarTransform({ scale: 1, x: 80, y: 40 }, { width: 512, height: 1024 }, 144)).toEqual({ scale: 1, x: 0, y: 40 });
  });

  it("maps the preview gesture position into the saved avatar crop", () => {
    const transform = scaleAvatarTransform({ scale: 1.5, x: 18, y: -9 }, AVATAR_IMAGE_SIZE / 144);
    expect(transform).toEqual({ scale: 1.5, x: 64, y: -32 });
    expect(avatarDrawRect({ width: 400, height: 800 }, transform, AVATAR_IMAGE_SIZE)).toEqual({
      x: -64,
      y: -544,
      width: 768,
      height: 1536,
    });
  });
});
