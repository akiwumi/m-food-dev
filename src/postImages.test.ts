import { describe, expect, it } from "vitest";
import { cropDrawRect, clampCropTransform, scaleCropTransform } from "./imageCrop";
import { normalizePostImages, postDisplayImages } from "./postImages";
import type { Recipe } from "./data";

describe("community post images", () => {
  const recipe = { id: "r1", title: "Pasta", image: "/recipe.jpg" } as Recipe;

  it("uses uploaded post images before the linked recipe image", () => {
    expect(postDisplayImages({ images: ["/a.jpg", "/b.jpg"], recipeId: "r1" }, recipe)).toEqual(["/a.jpg", "/b.jpg"]);
    expect(postDisplayImages({ image: "/legacy.jpg", recipeId: "r1" }, recipe)).toEqual(["/legacy.jpg"]);
    expect(postDisplayImages({ recipeId: "r1" }, recipe)).toEqual(["/recipe.jpg"]);
  });

  it("limits post image attachments to the supported count", () => {
    expect(normalizePostImages(["1", "", "2", "3"], 2)).toEqual(["1", "2"]);
  });

  it("keeps rectangular crop gestures covering the post preview", () => {
    const viewport = { width: 320, height: 240 };
    expect(clampCropTransform({ scale: 1, x: 80, y: 50 }, { width: 640, height: 480 }, viewport)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(clampCropTransform({ scale: 2, x: 200, y: -200 }, { width: 640, height: 480 }, viewport)).toEqual({ scale: 2, x: 160, y: -120 });
  });

  it("maps edited post preview position into the saved crop", () => {
    const viewport = { width: 320, height: 240 };
    const output = { width: 1024, height: 768 };
    const transform = scaleCropTransform({ scale: 1.5, x: 20, y: -10 }, output.width / viewport.width);
    expect(transform).toEqual({ scale: 1.5, x: 64, y: -32 });
    expect(cropDrawRect({ width: 800, height: 600 }, transform, output)).toEqual({
      x: -192,
      y: -224,
      width: 1536,
      height: 1152,
    });
  });
});
