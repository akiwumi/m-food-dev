// Option lists for the search filter UI and the ranking-preference onboarding
// step. These use Spoonacular's own coarse vocabulary so the values map 1:1 onto
// complexSearch parameters in the `recipes` edge function (which also maps the
// profile's richer cuisine labels onto the same set).

// Spoonacular `cuisine` values — curated down to the cuisines that reliably
// return a full set of results. The thinly-populated ones (African, Cajun,
// Caribbean, Eastern European, German, Irish, Jewish, Latin American, Nordic,
// Southern, British, Vietnamese, bare "European") were removed because they
// routinely came back near-empty and read as "the filter is broken".
export const SPOON_CUISINES = [
  "American", "Italian", "Mexican", "Mediterranean", "French", "Greek", "Spanish",
  "Chinese", "Japanese", "Korean", "Thai", "Indian", "Middle Eastern", "Asian",
];

// Meal-time categories shown on home screen and in search filters.
export const MEAL_TYPES = [
  "breakfast", "lunch", "dinner", "snacks", "dessert",
];

// Diet override choices in search (label sent straight to the edge function,
// which maps to Spoonacular diet values).
export const SEARCH_DIETS = [
  "Any", "Vegetarian", "Vegan", "Pescatarian", "Gluten Free", "Ketogenic",
  "Paleo", "Whole30", "Low FODMAP",
];

// Sort / ranking options. `id` is the label sent to the edge function's mapSort.
export const SORT_OPTIONS: { id: string; label: string; hint: string }[] = [
  { id: "Most popular", label: "Most popular", hint: "What most people love" },
  { id: "Healthiest", label: "Healthiest", hint: "Best nutrition score" },
  { id: "Quickest", label: "Quickest", hint: "Fastest to make" },
  { id: "Fewest calories", label: "Lightest", hint: "Lowest calories first" },
  { id: "Most protein", label: "Most protein", hint: "Protein-forward" },
  { id: "Surprise me", label: "Surprise me", hint: "A random pick" },
];

// Ranking-preference choices for onboarding (a subset that reads as a personal
// default rather than a one-off search sort).
export const RANKING_PREFERENCES: { id: string; label: string; desc: string }[] = [
  { id: "Most popular", label: "Crowd favourites", desc: "Reliable, well-loved recipes first" },
  { id: "Healthiest", label: "The healthiest option", desc: "Best nutrition score first" },
  { id: "Quickest", label: "Whatever's fastest", desc: "Shortest cook time first" },
  { id: "Most protein", label: "Most protein", desc: "Protein-forward meals first" },
  { id: "Surprise me", label: "Surprise me", desc: "Keep things varied and unexpected" },
];

export type RecipeFilters = {
  query?: string;
  cuisines?: string[];
  type?: string;
  diet?: string;
  maxReadyTime?: number;
  sort?: string;
  includeIngredients?: string[];
  excludeIngredients?: string[];
  equipment?: string[];
  minServings?: number;
  maxCalories?: number;
  minProtein?: number;
};
