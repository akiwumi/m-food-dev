type Fetcher = typeof fetch;

const numbers = (text: string) => [...text.matchAll(/\d+(?:\.\d+)?/g)].map(match => match[0]);

export function acceptEnrichedSteps(original: any[], enriched: any[]) {
  if (!Array.isArray(enriched) || enriched.length !== original.length) return null;
  const accepted = enriched.map((candidate, index) => {
    if (!candidate || typeof candidate.title !== "string" || typeof candidate.detail !== "string") return null;
    const verified = numbers(`${original[index].text} ${original[index].detail ?? ""}`);
    const proposed = numbers(`${candidate.title} ${candidate.detail} ${candidate.cue ?? ""}`);
    if (proposed.some(value => !verified.includes(value))) return null;
    return {
      ...original[index],
      title: candidate.title.trim(),
      detail: candidate.detail.trim(),
      cue: typeof candidate.cue === "string" && candidate.cue.trim() ? candidate.cue.trim() : undefined,
    };
  });
  return accepted.every(Boolean) ? accepted : null;
}

export async function enrichSteps(steps: any[], recipeTitle: string, apiKey: string, fetcher: Fetcher = fetch) {
  if (!apiKey || !steps.length) return steps;
  try {
    const res = await fetcher("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 1200,
        messages: [{
          role: "system",
          content: [
            "Rewrite cooking steps for clarity without changing facts.",
            "Return JSON only: {\"steps\":[{\"title\":\"...\",\"detail\":\"...\",\"cue\":\"optional factual visual cue\"}]}",
            "Keep the same number and order of steps.",
            "Never add ingredients, quantities, temperatures, timings, doneness temperatures, equipment, or safety claims.",
            "Do not include any number that is absent from the original step.",
          ].join(" "),
        }, {
          role: "user",
          content: JSON.stringify({ recipeTitle, steps: steps.map(step => ({ text: step.text, detail: step.detail, active: step.active, equipment: step.equipment })) }),
        }],
      }),
    });
    if (!res.ok) return steps;
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    return acceptEnrichedSteps(steps, parsed.steps) ?? steps;
  } catch {
    return steps;
  }
}
