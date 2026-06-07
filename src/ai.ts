import { supabase } from "./supabase";

// Browser-side client for the ai-gateway edge function. The OpenAI key never
// touches the browser — we send the user's Supabase session token, and the
// gateway calls OpenAI. Every function throws on failure so callers can fall
// back gracefully (e.g. to the local simulation) while auth/AI isn't wired yet.

const GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-gateway`;

async function callGateway<T>(payload: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Supabase not configured — set .env.local to enable AI.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in — AI needs an authenticated session.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  return res.json() as Promise<T>;
}

export type ChatContext = {
  profile?: { allergies?: string[]; diet?: string; dislikedIngredients?: string[] };
  picks?: { title: string; time: number; reason?: string }[];
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

// Ask Moody. Pass recent turns as `history` for continuity.
export async function aiChat(message: string, context?: ChatContext, history?: ChatTurn[]): Promise<string> {
  const data = await callGateway<{ message: string }>({ task: "chat", message, context, history });
  return data.message;
}

export type VitaminEstimate = { name: string; amount?: number; unit?: string; percentDV?: number };
export type FoodMacros = {
  dish?: string; calories?: number; protein?: number; carbs?: number;
  fat?: number; fiber?: number; confidence?: number;
  vitamins?: VitaminEstimate[];
  allergens?: string[];
};

// Real vision estimate for a food photo (base64 data URL). `allergies` lets the
// model check the dish against the user's specific allergens.
export async function aiAnalyzeFood(image: string, hint?: { recipeName?: string; recipeCalories?: number; allergies?: string[] }): Promise<FoodMacros> {
  const data = await callGateway<{ analysis: FoodMacros }>({ task: "analyze-food", image, hint });
  return data.analysis ?? {};
}
