import { describe, expect, it } from "vitest";
import { displayStepDetail, displayStepTitle, formatTimer, stepImageSources } from "./cooking";

describe("cooking step display helpers", () => {
  it("prefers structured step content and preserves legacy text", () => {
    expect(displayStepTitle({ text: "Add peas.", title: "Build the sauce" })).toBe("Build the sauce");
    expect(displayStepTitle({ text: "Add peas and simmer until glossy." })).toBe("Add peas and simmer until glossy.");
    expect(displayStepDetail({ text: "Add peas.", detail: "Add peas and simmer gently." })).toBe("Add peas and simmer gently.");
    expect(displayStepDetail({ text: "Add peas." })).toBe("Add peas.");
  });

  it("orders verified step image before the main recipe image", () => {
    expect(stepImageSources("step.jpg", "recipe.jpg")).toEqual(["step.jpg", "recipe.jpg"]);
    expect(stepImageSources("", "recipe.jpg")).toEqual(["recipe.jpg"]);
    expect(stepImageSources("same.jpg", "same.jpg")).toEqual(["same.jpg"]);
  });

  it("formats verified timers", () => {
    expect(formatTimer(185)).toBe("3:05");
    expect(formatTimer(0)).toBe("0:00");
  });
});
