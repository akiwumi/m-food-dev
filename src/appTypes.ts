// Shared app-level types and constants extracted from App.tsx (Phase 3 PR 1).
import type { Recipe } from "./data";
import type { RecipeFilters } from "./searchFilters";

export type Page = "home" | "search" | "results" | "diary" | "grocery" | "planner" | "detail" | "cook" | "insights" | "settings" | "favorites" | "import" | "admin" | "billing" | "psych-profile" | "food-profile" | "account" | "community" | "friends" | "member-profile" | "health" | "health-nutrition" | "health-variety" | "health-patterns" | "family-health" | "diners" | "food-log" | "pantry" | "help" | "privacy";
export type SearchRequest = { query: string; filters: RecipeFilters };
export type Entry = "welcome" | "login" | "quick-start" | "first-pick" | "onboarding" | "account" | "verify" | "verified" | "subscription" | "app";

export type DiaryEntry = { recipe: Recipe; rating: number; when: string };

export const PLANS = [
  { id: "annual", name: "Annual", price: "$120/year", note: "Best value, about 2 months free" },
  { id: "quarterly", name: "Quarterly", price: "$36/quarter", note: "Save 20%, billed every 3 months" },
  { id: "monthly", name: "Monthly", price: "$15/month", note: "Cancel anytime" },
] as const;
