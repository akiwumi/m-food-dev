import { describe, expect, it } from "vitest";
import { nextMoodyDragOffset } from "./moodyDrag";

describe("Moody modal dragging", () => {
  it("moves by the pointer delta from the drag start", () => {
    expect(nextMoodyDragOffset({
      startOffset: { x: 12, y: -20 },
      startPointer: { x: 100, y: 120 },
      pointer: { x: 145, y: 80 },
      startRect: { left: 252, top: 80, right: 772, bottom: 760 },
      viewport: { width: 1024, height: 800 },
    })).toEqual({ x: 57, y: -60 });
  });

  it("keeps the moved modal inside the viewport margin", () => {
    expect(nextMoodyDragOffset({
      startOffset: { x: 0, y: 0 },
      startPointer: { x: 100, y: 100 },
      pointer: { x: -500, y: -500 },
      startRect: { left: 252, top: 80, right: 772, bottom: 760 },
      viewport: { width: 1024, height: 800 },
      margin: 16,
    })).toEqual({ x: -236, y: -64 });
  });
});
