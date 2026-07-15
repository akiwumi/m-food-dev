// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "./store";
import { MoodyChat } from "./components/MoodyChat";

beforeAll(() => {
  Element.prototype.scrollTo = () => {};
});

afterEach(cleanup);

describe("MoodyChat progressive profiling", () => {
  it("asks natural profile follow-up questions after three cooked meals", () => {
    const saveProfile = vi.fn();
    render(
      <MoodyChat
        profile={{ ...defaultProfile, foodRelationship: "", foodValues: [], comfortFoods: [] }}
        mood="Tired"
        picks={[]}
        candidates={[]}
        cookedCount={3}
        saveProfile={saveProfile}
        openRecipe={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Chat with Moody"));

    expect(screen.getByText(/You've cooked three meals/i)).toBeTruthy();
    expect(screen.getByText(/sharpen your taste profile/i)).toBeTruthy();
  });
});
