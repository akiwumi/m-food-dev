import { describe, expect, test } from "vitest";
import { classifyCommunityError } from "./communityMutation";

describe("classifyCommunityError", () => {
  test("identifies an expired session", () => {
    expect(classifyCommunityError({ message: "JWT expired", code: "PGRST301" })).toEqual({
      ok: false,
      code: "auth",
      message: "Your session expired. Sign in again, then retry.",
    });
  });

  test("identifies a missing community migration", () => {
    expect(classifyCommunityError({ message: "column community_posts.recipe_ref does not exist", code: "42703" })).toEqual({
      ok: false,
      code: "schema",
      message: "Community needs a database update before this can be posted.",
    });
  });

  test("identifies row-level security rejection", () => {
    expect(classifyCommunityError({ message: "new row violates row-level security policy", code: "42501" })).toEqual({
      ok: false,
      code: "permission",
      message: "This account cannot publish that post. Refresh your session and retry.",
    });
  });

  test("identifies offline failures", () => {
    expect(classifyCommunityError(new TypeError("Load failed"))).toEqual({
      ok: false,
      code: "offline",
      message: "No connection. Your draft is safe; retry when you're online.",
    });
  });
});
