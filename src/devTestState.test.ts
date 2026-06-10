import { describe, expect, it } from "vitest";
import { readDevTestState } from "./devTestState";

describe("readDevTestState", () => {
  it("allows supported test states in development", () => {
    expect(readDevTestState("?testState=home", true)).toBe("home");
    expect(readDevTestState("?testState=account", true)).toBe("account");
  });

  it("ignores test states outside development", () => {
    expect(readDevTestState("?testState=home", false)).toBeNull();
  });

  it("ignores unknown test states", () => {
    expect(readDevTestState("?testState=admin", true)).toBeNull();
  });
});
