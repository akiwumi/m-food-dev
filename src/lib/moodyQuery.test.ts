import { describe, expect, it } from "vitest";
import { foodQueryFromChat } from "./moodyQuery";

describe("foodQueryFromChat", () => {
  it("strips conversational wrapper from the ends", () => {
    expect(foodQueryFromChat("show me a Yaki Udon recipe")).toBe("Yaki Udon");
    expect(foodQueryFromChat("find pad see ew please")).toBe("pad see ew");
    expect(foodQueryFromChat("can you get me some chicken tikka masala")).toBe("chicken tikka masala");
  });

  it("preserves stop-words that appear in the MIDDLE of a dish name", () => {
    // The old strip-everywhere regex ate "me" / "look" here; leading/trailing does not.
    expect(foodQueryFromChat("spicy me noodles")).toBe("spicy me noodles");
    expect(foodQueryFromChat("chicken look bowl")).toBe("chicken look bowl");
  });

  it("returns the term unchanged when there is no wrapper", () => {
    expect(foodQueryFromChat("Yaki Udon")).toBe("Yaki Udon");
  });

  it("returns empty when the message is only conversational filler", () => {
    expect(foodQueryFromChat("show me a recipe")).toBe("");
    expect(foodQueryFromChat("")).toBe("");
  });

  it("keeps original casing and caps at 80 chars", () => {
    expect(foodQueryFromChat("find Beef Rendang")).toBe("Beef Rendang");
    expect(foodQueryFromChat("a".repeat(120)).length).toBe(80);
  });
});
