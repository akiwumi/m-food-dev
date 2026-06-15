// Client-side wrapper for the nutrition-lookup edge function (FatSecret).
// Returns null on any failure so callers can fall back gracefully.
import { supabase } from "./supabase";

export interface NutritionServing {
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface NutritionFood {
  food_id: string;
  name: string;
  type: "Brand" | "Generic";
  servings: NutritionServing[];
}

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-lookup`;

async function callNutrition(body: Record<string, string>): Promise<Response | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });

  return res.ok ? res : null;
}

// Search FatSecret for foods matching a query string.
// Returns up to 10 results, or null if the backend is unavailable.
export async function searchFoods(query: string): Promise<NutritionFood[] | null> {
  try {
    const res = await callNutrition({ query });
    if (!res) return null;
    const data = await res.json();
    return Array.isArray(data.foods) ? data.foods : null;
  } catch {
    return null;
  }
}

// Fetch full nutrition detail for a known FatSecret food_id.
// Returns null if the backend is unavailable.
export async function getFoodDetails(foodId: string): Promise<NutritionFood | null> {
  try {
    const res = await callNutrition({ food_id: foodId });
    if (!res) return null;
    const data = await res.json();
    return data.food ?? null;
  } catch {
    return null;
  }
}

// Convenience: get the first (default) serving for a food, or null.
export function primaryServing(food: NutritionFood): NutritionServing | null {
  return food.servings[0] ?? null;
}
