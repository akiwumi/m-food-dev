import { describe, expect, it } from "vitest";
import { acceptEnrichedSteps } from "../supabase/functions/recipes/enrich";

const original = [{ text: "Cook for 5 minutes.", title: "Cook for 5 minutes.", detail: "Cook for 5 minutes.", active: ["peas"] }];

describe("acceptEnrichedSteps", () => {
  it("accepts clearer wording that preserves verified facts", () => {
    expect(acceptEnrichedSteps(original, [{ title: "Cook the peas", detail: "Cook the peas for 5 minutes.", cue: "They should look glossy." }])?.[0].detail)
      .toBe("Cook the peas for 5 minutes.");
  });

  it("rejects invented numeric facts and falls back to originals", () => {
    expect(acceptEnrichedSteps(original, [{ title: "Cook the peas", detail: "Cook at 200°C for 10 minutes." }])).toBeNull();
  });
});
