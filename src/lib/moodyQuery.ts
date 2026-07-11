// Conversational stop-words that wrap a Moody chat request ("show me a … recipe").
// They are stripped ONLY from the start and end of the query — never the middle —
// so a dish name that legitimately contains one of these words in the middle
// ("spicy me noodles", "chicken look bowl") keeps its meaningful terms. The old
// strip-everywhere regex ate those, producing broken Spoonacular searches.
const WRAPPER_WORDS = new Set([
  "show", "find", "open", "get", "search", "look", "for", "me", "a", "an", "the",
  "some", "recipe", "recipes", "please", "can", "you", "i", "want", "need", "make", "cook", "like",
]);

// Reduce a chat message to a clean food term for recipe search, e.g.
// "show me a Yaki Udon recipe" -> "Yaki Udon". Returns "" when the message is
// only conversational wrapper (the caller then falls back to a mood-only search).
export function foodQueryFromChat(query: string): string {
  const words = query.trim().split(/\s+/).filter(Boolean);
  let start = 0;
  let end = words.length;
  while (start < end && WRAPPER_WORDS.has(words[start].toLowerCase())) start++;
  while (end > start && WRAPPER_WORDS.has(words[end - 1].toLowerCase())) end--;
  return words.slice(start, end).join(" ").slice(0, 80);
}
