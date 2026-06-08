import { describe, expect, it } from "vitest";
import { recipeProfilePayload } from "./recipes";
import { defaultProfile } from "./store";

describe("recipeProfilePayload", () => {
  it("sends the user's full food psychology profile to Moody", () => {
    const payload = recipeProfilePayload({
      ...defaultProfile,
      diet: "Pescatarian",
      foodRelationship: "Food helps me feel grounded",
      comfortCues: ["Warm bowls"],
      sensoryCues: ["Bright"],
      textureAvoids: ["Mushy"],
    });

    expect(payload).toMatchObject({
      diet: "Pescatarian",
      foodRelationship: "Food helps me feel grounded",
      comfortCues: ["Warm bowls"],
      sensoryCues: ["Bright"],
      textureAvoids: ["Mushy"],
    });
  });
});
