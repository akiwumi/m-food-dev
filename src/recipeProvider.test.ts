import { describe, expect, it } from "vitest";
import { fetchTheMealDbRecipes, normalizeSpoonacularRecipe } from "../supabase/functions/recipes/provider";

describe("fetchTheMealDbRecipes", () => {
  it("returns normalized real recipes when the primary provider is unavailable", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({
      meals: [{
        idMeal: "52772",
        strMeal: "Teriyaki Chicken Casserole",
        strMealThumb: "https://example.com/meal.jpg",
        strArea: "Japanese",
        strCategory: "Chicken",
        strInstructions: "Heat the oven. Add chicken.\r\nBake until cooked.",
        strIngredient1: "Chicken",
        strMeasure1: "500g",
        strIngredient2: "Soy sauce",
        strMeasure2: "2 tbsp",
        strSource: "https://example.com/recipe",
        strYoutube: "https://www.youtube.com/watch?v=test123",
      }],
    }), { status: 200 });

    const recipes = await fetchTheMealDbRecipes("chicken", "Cozy", 10, fetcher);

    expect(recipes).toHaveLength(1);
    expect(recipes[0]).toMatchObject({
      id: "mealdb-52772",
      title: "Teriyaki Chicken Casserole",
      cuisine: "Japanese",
      moods: ["Cozy"],
      ingredients: ["500g Chicken", "2 tbsp Soy sauce"],
      sourceUrl: "https://example.com/recipe",
      status: "published",
    });
    expect(recipes[0].steps[0]).toEqual({
      text: "Heat the oven.",
      title: "Heat the oven.",
      detail: "Heat the oven.",
      image: "https://example.com/meal.jpg",
    });
    expect(recipes[0].video).toBe("https://www.youtube.com/embed/test123");
  });

  it("uses random real recipes when a natural-language search has no direct match", async () => {
    const calls: string[] = [];
    const fetcher: typeof fetch = async input => {
      const url = String(input);
      calls.push(url);
      return new Response(JSON.stringify(url.includes("search.php")
        ? { meals: null }
        : { meals: [{ idMeal: "1", strMeal: "Fallback Meal", strInstructions: "Cook it." }] }
      ), { status: 200 });
    };

    const recipes = await fetchTheMealDbRecipes("something cozy and restorative", "Cozy", 2, fetcher);

    expect(recipes).toHaveLength(1);
    expect(recipes[0].title).toBe("Fallback Meal");
    expect(calls.some(url => url.includes("random.php"))).toBe(true);
  });

  it("maps Spoonacular step images, active ingredients, and equipment", () => {
    const recipe = normalizeSpoonacularRecipe({
      id: 7,
      title: "Garlic Peas",
      image: "https://example.com/recipe.jpg",
      analyzedInstructions: [{ steps: [{
        step: "Fry the garlic.",
        image: "step.jpg",
        ingredients: [{ name: "garlic" }],
        equipment: [{ name: "frying pan" }],
      }] }],
      extendedIngredients: [{ original: "2 cloves garlic" }],
      nutrition: { nutrients: [] },
    }, "Cozy");

    expect(recipe.steps[0]).toMatchObject({
      text: "Fry the garlic.",
      title: "Fry the garlic.",
      detail: "Fry the garlic.",
      image: "https://img.spoonacular.com/recipes/step.jpg",
      active: ["garlic"],
      equipment: ["frying pan"],
    });
  });
});
