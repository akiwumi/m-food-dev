// ai-gateway — the single server-side proxy between the browser and OpenAI.
// The OpenAI key lives ONLY here (a Supabase secret), never in the browser, so
// it can't be scraped. Every request must carry a valid Supabase user JWT.
//
// Secrets this needs:
//   supabase secrets set OPENAI_API_KEY="sk-..."
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
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const ALLOWED_ORIGINS = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").filter(Boolean));
const MAX_BODY_BYTES = 8_000_000; // generous — base64 food photos are large
const CHAT_MODEL = "gpt-4o-mini";  // cheap, supports text + vision

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
    "HOW YOU SHOW RECIPES: When you include a recipeId in your JSON response, the MoodFood app instantly displays a tappable recipe card in the chat. This is how you 'open', 'show', 'find', or 'recommend' a recipe. You are fully capable of showing any recipe from the catalog — just set its ID.",
    "NEVER say you cannot open, navigate, or show recipes. You are integrated into the app and can always surface a recipe card by returning its ID.",
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

async function callOpenAI(body: unknown): Promise<Response> {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
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

  if (!OPENAI_API_KEY) return Response.json({ error: "AI not configured" }, { status: 503, headers: headers(origin) });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400, headers: headers(origin) }); }
  const task = typeof body?.task === "string" ? body.task : "chat";

  try {
    if (task === "analyze-food") {
      const image = typeof body.image === "string" ? body.image : "";
      if (!image.startsWith("data:image/")) return Response.json({ error: "Missing image" }, { status: 400, headers: headers(origin) });
      const hintName = body?.hint?.recipeName ? ` The user says this is their "${body.hint.recipeName}".` : "";
      const userAllergens = Array.isArray(body?.hint?.allergies)
        ? body.hint.allergies.filter((a: unknown) => typeof a === "string").slice(0, 30)
        : [];
      const allergenLine = userAllergens.length
        ? ` The user must avoid these allergens — check the dish especially carefully and list any that are present or likely: ${userAllergens.join(", ")}.`
        : "";
      const res = await callOpenAI({
        model: CHAT_MODEL,
        response_format: { type: "json_object" },
        max_tokens: 600,
        messages: [
          { role: "system", content: [
            "You are a nutrition vision estimator. Look at the food photo and estimate ONE single serving.",
            "Reply ONLY with JSON of this exact shape:",
            "{\"dish\":string,\"calories\":number,\"protein\":number,\"carbs\":number,\"fat\":number,\"fiber\":number,\"confidence\":number,\"vitamins\":[{\"name\":string,\"amount\":number,\"unit\":string,\"percentDV\":number}],\"allergens\":[string]}.",
            "Macros in grams. confidence and percentDV are 0-100. unit is like 'mg' or 'mcg'.",
            "For vitamins, list the 4-6 most notable micronutrients (vitamins AND minerals, e.g. Vitamin C, Vitamin A, Iron, Calcium, Potassium, Vitamin D, Folate, Sodium).",
            "For allergens, list major food allergens visibly present or highly likely, using common names (Dairy, Gluten, Wheat, Eggs, Peanuts, Tree nuts, Soy, Fish, Shellfish, Sesame, Mustard, Celery). Empty array if none.",
            "If unsure, give your best estimate rather than refusing.",
          ].join(" ") },
          { role: "user", content: [
            { type: "text", text: `Estimate the nutrition, key vitamins/minerals, and allergens of this meal.${hintName}${allergenLine}` },
            { type: "image_url", image_url: { url: image } },
          ] },
        ],
      });
      if (!res.ok) return Response.json({ error: "AI request failed" }, { status: 502, headers: headers(origin) });
      const data = await res.json();
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}"); } catch { /* fall through */ }
      return Response.json({ provider: "openai", analysis: parsed }, { headers: headers(origin) });
    }

    // Default: chat / explain-a-recommendation.
    const message = typeof body.message === "string" ? body.message.slice(0, 2000) : "";
    if (!message) return Response.json({ error: "Missing message" }, { status: 400, headers: headers(origin) });
    const history = Array.isArray(body.history)
      ? body.history.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string").slice(-8).map((m: any) => ({ role: m.role, content: m.content }))
      : [];
    const candidates = Array.isArray(body?.context?.candidates)
      ? body.context.candidates.filter((r: any) => typeof r?.id === "string")
      : [];
    const candidateIds = new Set(candidates.map((r: any) => r.id));
    console.log(`[ai-gateway] chat: message="${message.slice(0, 80)}" candidates=${candidates.length}`);
    const res = await callOpenAI({
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      max_tokens: 350,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt(body.context) },
        ...history,
        { role: "user", content: message },
      ],
    });
    if (!res.ok) return Response.json({ error: "AI request failed" }, { status: 502, headers: headers(origin) });
    const data = await res.json();
    let parsed: { message?: unknown; recipeId?: unknown } = {};
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}"); } catch { /* fall through */ }
    const rawRecipeId = typeof parsed.recipeId === "string" ? parsed.recipeId : null;
    const selectedRecipeId = rawRecipeId && candidateIds.has(rawRecipeId) ? rawRecipeId : undefined;
    console.log(`[ai-gateway] reply: rawRecipeId=${rawRecipeId} valid=${!!selectedRecipeId} candidates=${candidates.length}`);
    const reply = typeof parsed.message === "string" ? parsed.message : "I couldn't find a suitable catalog recipe right now.";
    return Response.json({ provider: "openai", message: reply, recipeId: selectedRecipeId }, { headers: headers(origin) });
  } catch (_err) {
    return Response.json({ error: "AI request failed" }, { status: 502, headers: headers(origin) });
  }
});
