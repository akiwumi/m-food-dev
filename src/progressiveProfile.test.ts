import { describe, expect, it } from "vitest";
import { defaultProfile, type Profile } from "./store";
import { profileDrip } from "./progressiveProfile";
import { onboardingQuestions, type ProfileValue } from "./onboarding";

function completeProfile(): Profile {
  let profile: Profile = { ...defaultProfile };
  for (const q of onboardingQuestions) {
    let value: ProfileValue;
    if (q.type === "single" || q.type === "skillcards") value = q.options?.[0] ?? "Complete";
    else if (q.type === "multi" || q.type === "grouped-multi" || q.type === "moodcards") value = [q.options?.[0] ?? q.groups?.[0]?.items[0] ?? "Complete"];
    else if (q.type === "scale" || q.type === "stepper") value = q.min ?? 1;
    else if (q.type === "textgrid") value = { Tired: "Soup" };
    else if (q.type === "record-single") value = { ...(profile[q.key] as Record<string, string>), [q.subKey!]: q.options?.[0] ?? "Complete" };
    else value = "Complete";
    profile = { ...profile, [q.key]: value };
  }
  return profile;
}

describe("profileDrip", () => {
  it("waits until the user has cooked three meals", () => {
    expect(profileDrip(defaultProfile, 2)).toBeNull();
  });

  it("asks one or two non-quick profile questions after the habit starts", () => {
    const drip = profileDrip({
      ...defaultProfile,
      foodRelationship: "",
      foodValues: [],
      comfortFoods: [],
      comfortCues: [],
    }, 3);

    expect(drip?.headline).toContain("You've cooked three meals");
    expect(drip?.questions.length).toBeGreaterThanOrEqual(1);
    expect(drip?.questions.length).toBeLessThanOrEqual(2);
    expect(drip?.questions.every(q => !q.quick)).toBe(true);
  });

  it("does not ask when the profile is already complete", () => {
    expect(profileDrip(completeProfile(), 12)).toBeNull();
  });
});
