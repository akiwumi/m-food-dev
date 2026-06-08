import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecipeImage } from "./RecipeImage";

describe("RecipeImage", () => {
  it("renders the first available source", () => {
    const html = renderToStaticMarkup(<RecipeImage sources={["step.jpg", "recipe.jpg"]} alt="Sauce" />);
    expect(html).toContain('src="step.jpg"');
  });

  it("renders a polished empty state when no source exists", () => {
    const html = renderToStaticMarkup(<RecipeImage sources={[]} alt="Sauce" />);
    expect(html).toContain("Image unavailable");
  });
});
