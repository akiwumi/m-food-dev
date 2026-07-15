// ai-gateway — the single server-side proxy between the browser and Moody's AI.
// Provider keys live ONLY here (Supabase secrets), never in the browser, so they
// can't be scraped. Every request must carry a valid Supabase user JWT.
//
// Secrets this needs:
//   supabase secrets set ANTHROPIC_API_KEY="sk-ant-..."
//   Optional fallback: supabase secrets set OPENAI_API_KEY="sk-..."
//   supabase secrets set ALLOWED_ORIGINS="http://localhost:5173,https://your-live-url"
// SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.
//
// Deploy: supabase functions deploy ai-gateway
//
// Request body (JSON), one of:
//   { "task": "chat", "message": "...", "history": [...], "context": { profile, picks, candidates } }
//   { "task": "analyze-food", "image": "data:image/jpeg;base64,...", "hint": { recipeName, recipeCalories } }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ALLOWED_ORIGINS = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").filter(Boolean));
const MAX_BODY_BYTES = 8_000_000; // generous — base64 food photos are large
const MOODY_MODEL = Deno.env.get("MOODY_MODEL") ?? "claude-haiku-4-5";
const OPENAI_FALLBACK_MODEL = Deno.env.get("OPENAI_FALLBACK_MODEL") ?? "gpt-4o-mini";

function headers(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...(allowed ? { "access-control-allow-origin": allowed, "vary": "Origin" } : {}),
  };
}

// Hard safety rules baked into every conversation. Allergens/diet are constraints,
// and the assistant must never play doctor.
function systemPrompt(context: any): string {
  const p = context?.profile ?? {};
  const allergies = Array.isArray(p.allergies) ? p.allergies.join(", ") : "";
  const diet = typeof p.diet === "string" ? p.diet : "";
  const dislikes = Array.isArray(p.dislikedIngredients) ? p.dislikedIngredients.join(", ") : "";
  const picks = Array.isArray(context?.picks)
    ? context.picks.map((r: any) => `- ${r.title} (${r.time} min): ${r.reason ?? ""}`).join("\n")
    : "";
  const candidates = Array.isArray(context?.candidates)
    ? context.candidates.map((r: any) => `- ID ${r.id}: ${r.title} | ${r.cuisine} | ${r.time} min | ${r.ingredients?.join(", ") ?? ""}`).join("\n")
    : "";
  return [
    "You are Moody, a warm and concise dinner co-pilot built directly into the MoodFood app.",
    "You are NOT a general-purpose chatbot. You are an in-app assistant. You help users choose, find, or learn about meals that fit how they feel, their tastes, and their safety needs.",
    "HOW YOU SHOW RECIPES: The app AUTOMATICALLY displays several tappable recipe cards — the real catalog matches for the user's request — directly below your message. You do NOT need to list recipe names in your text; the cards do that. Write a short, warm intro to those matches (e.g. 'Here are a few chicken dinners that fit your mood:'). Optionally set recipeId to your single favourite of the candidates to lead with it.",
    "NEVER say you cannot open, navigate, or show recipes, and NEVER say you found none when candidates are listed below — the app is showing the user those cards right now.",
    "HARD SAFETY RULES (never break):",
    allergies ? `- NEVER suggest anything containing these allergens: ${allergies}.` : "- Respect any allergens the user mentions.",
    diet ? `- Keep suggestions compatible with their diet: ${diet}.` : "",
    dislikes ? `- Avoid disliked ingredients where possible: ${dislikes}.` : "",
    "- You are not a doctor or dietitian. Do not give medical, clinical, or weight-loss prescriptions.",
    "- If the user signals disordered eating or distress, respond gently and suggest talking to a professional.",
    "Keep replies short (2-4 sentences), specific, and encouraging.",
    picks ? `Tonight's safe picks already computed for this user:\n${picks}` : "",
    candidates ? `SEARCHABLE CATALOG CANDIDATES (the only recipes you may select):\n${candidates}` : "No searchable catalog candidates are available.",
    "Reply ONLY with JSON: {\"message\":string,\"recipeId\":string|null}.",
    "Set recipeId whenever the user asks to open, show, find, view, or get a recipe, OR when recommending one specific dish. Use null only for purely general questions or cooking help where no specific recipe applies.",
    "Never invent a recipe ID. Only use IDs from the catalog above. If no candidate matches the request, explain what you have and ask the user to refine their search.",
  ].filter(Boolean).join("\n");
}

type MoodyMessage = { role: "user" | "assistant"; content: unknown };

function parseJsonText(text: string): Record<string, unknown> {
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; }
}

async function callAnthropicJson(system: string, messages: MoodyMessage[], maxTokens: number, temperature = 0): Promise<{ provider: string; parsed: Record<string, unknown>; ok: boolean }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MOODY_MODEL, system, messages, max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return { provider: "anthropic", parsed: {}, ok: false };
  const data = await res.json();
  const text = Array.isArray(data.content)
    ? data.content.filter((part: any) => part?.type === "text").map((part: any) => part.text).join("\n")
    : "";
  return { provider: "anthropic", parsed: parseJsonText(text), ok: true };
}

async function callOpenAI(body: unknown): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
}

async function callOpenAIJson(body: unknown): Promise<{ provider: string; parsed: Record<string, unknown>; ok: boolean }> {
  const res = await callOpenAI(body);
  if (!res.ok) return { provider: "openai", parsed: {}, ok: false };
  const data = await res.json();
  return { provider: "openai", parsed: parseJsonText(data.choices?.[0]?.message?.content ?? "{}"), ok: true };
}

async function callMoodyJson(args: {
  system: string;
  anthropicMessages: MoodyMessage[];
  openAiMessages: unknown[];
  maxTokens: number;
  temperature?: number;
}): Promise<{ provider: string; parsed: Record<string, unknown>; ok: boolean }> {
  if (ANTHROPIC_API_KEY) return callAnthropicJson(args.system, args.anthropicMessages, args.maxTokens, args.temperature ?? 0);
  return callOpenAIJson({
    model: OPENAI_FALLBACK_MODEL,
    response_format: { type: "json_object" },
    max_tokens: args.maxTokens,
    temperature: args.temperature ?? 0,
    messages: [{ role: "system", content: args.system }, ...args.openAiMessages],
  });
}

function anthropicImageSource(image: string): { type: "base64"; media_type: string; data: string } | null {
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  return match ? { type: "base64", media_type: match[1], data: match[2] } : null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { headers: { ...headers(origin), "access-control-allow-methods": "POST", "access-control-allow-headers": "authorization, content-type" } });
  }
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: headers(origin) });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return Response.json({ error: "Origin not allowed" }, { status: 403, headers: headers(origin) });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return Response.json({ error: "Request too large" }, { status: 413, headers: headers(origin) });

  // Require a real authenticated Supabase user.
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) return Response.json({ error: "Unauthorized" }, { status: 401, headers: headers(origin) });
  const identity = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { authorization: auth, apikey: SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(8_000),
  });
  if (!identity.ok) return Response.json({ error: "Unauthorized" }, { status: 401, headers: headers(origin) });

  if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) return Response.json({ error: "AI not configured" }, { status: 503, headers: headers(origin) });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: headers(origin) }); }
  const task = typeof body?.task === "string" ? body.task : "chat";

  try {
    if (task === "analyze-food") {
      const image = typeof body.image === "string" ? body.image : "";
      if (!image.startsWith("data:image/")) return Response.json({ error: "Missing image" }, { status: 400, headers: headers(origin) });
      const anthropicSource = anthropicImageSource(image);
      if (!anthropicSource) return Response.json({ error: "Unsupported image" }, { status: 400, headers: headers(origin) });
      const hintName = body?.hint?.recipeName ? ` The user says this is their "${body.hint.recipeName}".` : "";
      const userAllergens = Array.isArray(body?.hint?.allergies)
        ? body.hint.allergies.filter((a: unknown) => typeof a === "string").slice(0, 30)
        : [];
      const allergenLine = userAllergens.length
        ? ` The user must avoid these allergens — check the dish especially carefully and list any that are present or likely: ${userAllergens.join(", ")}.`
        : "";
      const visionSystem = [
        "You are Moody's nutrition vision estimator. Look at the food photo and estimate ONE single serving.",
        "Reply ONLY with JSON of this exact shape:",
        "{\"dish\":string,\"calories\":number,\"protein\":number,\"carbs\":number,\"fat\":number,\"fiber\":number,\"confidence\":number,\"vitamins\":[{\"name\":string,\"amount\":number,\"unit\":string,\"percentDV\":number}],\"allergens\":[string]}.",
        "Macros in grams. confidence and percentDV are 0-100. unit is like 'mg' or 'mcg'.",
        "For vitamins, list the 4-6 most notable micronutrients (vitamins AND minerals, e.g. Vitamin C, Vitamin A, Iron, Calcium, Potassium, Vitamin D, Folate, Sodium).",
        "For allergens, list major food allergens visibly present or highly likely, using common names (Dairy, Gluten, Wheat, Eggs, Peanuts, Tree nuts, Soy, Fish, Shellfish, Sesame, Mustard, Celery). Empty array if none.",
        "If unsure, give your best estimate rather than refusing.",
      ].join(" ");
      const prompt = `Estimate the nutrition, key vitamins/minerals, and allergens of this meal.${hintName}${allergenLine}`;
      const ai = await callMoodyJson({
        system: visionSystem,
        maxTokens: 600,
        anthropicMessages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image", source: anthropicSource }] }],
        openAiMessages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: image } }] }],
      });
      if (!ai.ok) return Response.json({ error: "AI request failed" }, { status: 502, headers: headers(origin) });
      return Response.json({ provider: ai.provider, analysis: ai.parsed }, { headers: headers(origin) });
    }

    // Default: chat / explain-a-recommendation.
    const message = typeof body.message === "string" ? body.message.slice(0, 2000) : "";
    if (!message) return Response.json({ error: "Missing message" }, { status: 400, headers: headers(origin) });
    const history = Array.isArray(body.history)
      ? body.history.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string").slice(-8).map((m: any) => ({ role: m.role, content: m.content }))
      : [];
    const preFetchedCandidates = Array.isArray(body?.context?.candidates)
      ? body.context.candidates.filter((r: any) => typeof r?.id === "string")
      : [];

    // Strip conversational words to get a clean food search term.
    // "show me a Yaki Udon recipe" → "Yaki Udon"
    const foodQuery = message
      .replace(/\b(show|find|open|get|search|look|for|me|a|an|the|some|recipe|recipes|please|can|you|i|want|need|make|cook|like|what|is|are|how|to|that|this|something|any|good|best|quick|easy|healthy)\b/gi, " ")
      .replace(/[?!.,]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

    // Search the recipes function server-side so the AI always has the specific
    // recipe as a candidate, regardless of what the frontend pre-fetched.
    let searchedRecipes: any[] = [];
    if (foodQuery && SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const sr = await fetch(`${SUPABASE_URL}/functions/v1/recipes`, {
          method: "POST",
          headers: { authorization: auth, "content-type": "application/json", apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ profile: body?.context?.profile ?? {}, query: foodQuery, mood: "Cozy", time: 180, relax: true }),
          signal: AbortSignal.timeout(8_000),
        });
        if (sr.ok) { const d = await sr.json(); searchedRecipes = Array.isArray(d?.recipes) ? d.recipes.slice(0, 8) : []; }
      } catch { /* ignore — fall through to pre-fetched candidates */ }
    }

    // Merge: gateway-searched recipes first (exact match), then pre-fetched.
    const searchedCandidates = searchedRecipes.map((r: any) => ({ id: r.id, title: r.title, time: r.time, cuisine: r.cuisine, ingredients: r.ingredients ?? [] }));
    const allCandidates = [...searchedCandidates, ...preFetchedCandidates.filter((c: any) => !searchedCandidates.some((s: any) => s.id === c.id))];
    const allCandidateIds = new Set(allCandidates.map((r: any) => r.id));
    console.log(`[ai-gateway] chat: "${message.slice(0, 60)}" foodQuery="${foodQuery}" searched=${searchedRecipes.length} total_candidates=${allCandidates.length}`);

    const chatSystem = systemPrompt({ ...body.context, candidates: allCandidates });
    const ai = await callMoodyJson({
      system: chatSystem,
      maxTokens: 350,
      temperature: 0.7,
      anthropicMessages: [...history, { role: "user", content: message }],
      openAiMessages: [...history, { role: "user", content: message }],
    });
    if (!ai.ok) return Response.json({ error: "AI request failed" }, { status: 502, headers: headers(origin) });
    const parsed = ai.parsed as { message?: unknown; recipeId?: unknown };
    const rawRecipeId = typeof parsed.recipeId === "string" ? parsed.recipeId : null;
    const selectedRecipeId = rawRecipeId && allCandidateIds.has(rawRecipeId) ? rawRecipeId : undefined;
    console.log(`[ai-gateway] reply: rawRecipeId=${rawRecipeId} valid=${!!selectedRecipeId}`);
    const reply = typeof parsed.message === "string" ? parsed.message : "I couldn't find a suitable catalog recipe right now.";
    // The recipe CARDS come from the actual search, not from the model echoing an
    // ID back — that echo was unreliable (it often returned recipeId:null and the
    // chat showed no card at all). We attach the real search results as `recipes`,
    // leading with the model's pick when it named a valid one, so Moody surfaces
    // several tappable recipes whenever the search found any.
    const cards = searchedRecipes.slice(0, 6);
    const orderedCards = selectedRecipeId
      ? [...cards.filter((r: any) => r.id === selectedRecipeId), ...cards.filter((r: any) => r.id !== selectedRecipeId)]
      : cards;
    const recipePayload = selectedRecipeId ? (searchedRecipes.find((r: any) => r.id === selectedRecipeId) ?? null) : (orderedCards[0] ?? null);
    return Response.json({ provider: ai.provider, message: reply, recipeId: selectedRecipeId ?? orderedCards[0]?.id, recipe: recipePayload, recipes: orderedCards }, { headers: headers(origin) });
  } catch (_err) {
    return Response.json({ error: "AI request failed" }, { status: 502, headers: headers(origin) });
  }
});
