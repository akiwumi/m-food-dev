import { describe, expect, it } from "vitest";
import { applyCuratedRanking, dedupeRecipes, fetchTheMealDbRecipes, filterRecipesByCategory, filterRecipesByMaxTime, filterRecipesForProfile, filterRecipesWithCompleteInstructions, normalizeSpoonacularRecipe } from "../supabase/functions/recipes/provider";

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

  it("combines every Spoonacular instruction section into the full method", () => {
    const recipe = normalizeSpoonacularRecipe({
      id: 9,
      title: "Dinner",
      analyzedInstructions: [
        { name: "Main", steps: [{ number: 1, step: "Prepare the sauce." }] },
        { name: "To serve", steps: [{ number: 1, step: "Toast the bread." }, { number: 2, step: "Serve together." }] },
      ],
    }, "Cozy");

    expect(recipe.steps.map((step: { text: string }) => step.text)).toEqual([
      "Prepare the sauce.",
      "Toast the bread.",
      "Serve together.",
    ]);
  });

  it("enforces the selected maximum cook time after provider results return", () => {
    const recipes = [
      { title: "Fast", time: 15 },
      { title: "Too slow", time: 45 },
      { title: "Unknown" },
    ];

    expect(filterRecipesByMaxTime(recipes, 15).map(recipe => recipe.title)).toEqual(["Fast"]);
  });

  it("preserves a full Spoonacular step image URL", () => {
    const recipe = normalizeSpoonacularRecipe({
      id: 8,
      title: "Soup",
      analyzedInstructions: [{ steps: [{ step: "Simmer.", image: "https://img.spoonacular.com/recipes/simmer.jpg" }] }],
    }, "Cozy");

    expect(recipe.steps[0].image).toBe("https://img.spoonacular.com/recipes/simmer.jpg");
  });

  it("builds a Spoonacular recipe image when the provider omits the full URL", () => {
    const recipe = normalizeSpoonacularRecipe({
      id: 716429,
      title: "Pasta",
      imageType: "jpg",
      analyzedInstructions: [{ steps: [{ step: "Cook." }] }],
    }, "Cozy");

    expect(recipe.image).toBe("https://img.spoonacular.com/recipes/716429-636x393.jpg");
  });

  it("never returns land meat to a pescatarian from an unlabeled fallback provider", () => {
    const safe = filterRecipesForProfile([
      { title: "Chicken casserole", ingredients: ["500g chicken"], diets: [], allergens: [] },
      { title: "Salmon bowl", ingredients: ["salmon", "rice"], diets: [], allergens: [] },
      { title: "Tomato pasta", ingredients: ["tomato", "pasta"], diets: [], allergens: [] },
    ], { diet: "Pescatarian", allergies: [], dietReligious: [] });

    expect(safe.map(recipe => recipe.title)).toEqual(["Salmon bowl", "Tomato pasta"]);
  });

  it("never returns meat to a vegetarian even when the provider labels it vegetarian", () => {
    const safe = filterRecipesForProfile([
      { title: "Chicken salad", ingredients: ["chicken"], diets: ["Vegetarian"], allergens: [] },
      { title: "Tomato pasta", ingredients: ["tomato", "pasta"], diets: ["Vegetarian"], allergens: [] },
    ], { diet: "Vegetarian", allergies: [], dietReligious: [] });

    expect(safe.map(recipe => recipe.title)).toEqual(["Tomato pasta"]);
  });

  it("keeps requested meal categories separate", () => {
    const recipes = [
      { title: "Pasta", mealTypes: ["main course"] },
      { title: "Bruschetta", mealTypes: ["appetizer"] },
      { title: "Cake", mealTypes: ["dessert"] },
      { title: "Popcorn", mealTypes: ["snack"] },
    ];

    expect(filterRecipesByCategory(recipes, "starter").map(recipe => recipe.title)).toEqual(["Bruschetta"]);
    expect(filterRecipesByCategory(recipes, "dessert").map(recipe => recipe.title)).toEqual(["Cake"]);
  });

  it("deduplicates recipes by id and normalized title", () => {
    const recipes = [
      { id: "1", title: "Tomato Pasta" },
      { id: "1", title: "Tomato Pasta" },
      { id: "2", title: " tomato   pasta " },
      { id: "3", title: "Bean Stew" },
    ];

    expect(dedupeRecipes(recipes).map(recipe => recipe.title)).toEqual(["Tomato Pasta", "Bean Stew"]);
  });

  it("tags fallback seafood recipes as pescatarian", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({
      meals: [{
        idMeal: "2",
        strMeal: "Salmon Rice Bowl",
        strCategory: "Seafood",
        strInstructions: "Cook the salmon.",
        strIngredient1: "Salmon",
        strMeasure1: "2 fillets",
      }],
    }), { status: 200 });

    const [recipe] = await fetchTheMealDbRecipes("salmon", "Cozy", 1, fetcher);

    expect(recipe.diets).toContain("Pescatarian");
  });

  it("applies AI ranking without duplicating curated recipes", () => {
    const recipes = [{ id: "1", title: "First" }, { id: "2", title: "Second" }];

    expect(applyCuratedRanking(recipes, [
      { i: 1, reason: "Best fit" },
      { i: 0, reason: "Also fits" },
    ])).toEqual([
      { id: "2", title: "Second", reason: "Best fit" },
      { id: "1", title: "First", reason: "Also fits" },
    ]);
  });

  it("rejects recipes with missing or placeholder-only instructions", () => {
    const recipes = [
      { title: "Complete", steps: [{ text: "Chop onions." }, { text: "Cook until soft." }] },
      { title: "Missing", steps: [] },
      { title: "Placeholder", steps: [{ text: "See full instructions on the recipe source." }] },
    ];

    expect(filterRecipesWithCompleteInstructions(recipes).map(recipe => recipe.title)).toEqual(["Complete"]);
  });

  it("enforces every restrictive household diet server-side", () => {
    const recipes = [
      { title: "Vegan keto", ingredients: ["tofu"], diets: ["Vegan", "Ketogenic"] },
      { title: "Vegan only", ingredients: ["beans"], diets: ["Vegan"] },
      { title: "Keto meat", ingredients: ["chicken"], diets: ["Ketogenic"] },
    ];

    expect(filterRecipesForProfile(recipes, { diet: "Vegan + Keto", allergies: [], dietReligious: [] }).map(recipe => recipe.title)).toEqual(["Vegan keto"]);
  });
});
