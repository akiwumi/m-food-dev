export type DevTestState = "home" | "account";

export function readDevTestState(search: string, isDevelopment: boolean): DevTestState | null {
  if (!isDevelopment) return null;
  const state = new URLSearchParams(search).get("testState");
  return state === "home" || state === "account" ? state : null;
}
