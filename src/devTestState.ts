export type DevTestState = "home" | "account" | "quick-start" | "first-pick" | "activation-paywall";

export function readDevTestState(search: string, isDevelopment: boolean): DevTestState | null {
  if (!isDevelopment) return null;
  const state = new URLSearchParams(search).get("testState");
  return state === "home" ||
    state === "account" ||
    state === "quick-start" ||
    state === "first-pick" ||
    state === "activation-paywall"
    ? state
    : null;
}
