import { describe, expect, it } from "vitest";
import { bundledRecipes } from "./bundledRecipes";

describe("bundled recipe imagery", () => {
  it("uses a black bean taco photo for Smoky Black Bean Tacos", () => {
    const recipe = bundledRecipes.find(recipe => recipe.id === "bundled-black-bean-tacos");

    expect(recipe?.title).toBe("Smoky Black Bean Tacos");
    expect(recipe?.image).toBe("https://food55.com/thumb/768/black-bean-corn-tacos.webp");
  });
});
