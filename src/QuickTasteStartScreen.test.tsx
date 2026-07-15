// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "./store";
import { QuickTasteStartScreen } from "./screens/entry/QuickTasteStartScreen";

afterEach(cleanup);

describe("QuickTasteStartScreen", () => {
  it("keeps the pre-value gate to seven visible questions", () => {
    render(
      <QuickTasteStartScreen
        mood="Tired"
        setMood={vi.fn()}
        energy={25}
        setEnergy={vi.fn()}
        time={30}
        setTime={vi.fn()}
        profile={defaultProfile}
        save={vi.fn()}
        signin={vi.fn()}
      />,
    );

    expect(screen.getByText("Mood")).toBeTruthy();
    expect(screen.getByText("Time")).toBeTruthy();
    expect(screen.getByText("Diet")).toBeTruthy();
    expect(screen.getByText("Allergies")).toBeTruthy();
    expect(screen.getByText("Hard no's")).toBeTruthy();
    expect(screen.getByText("Cooking confidence")).toBeTruthy();
    expect(screen.getByText("Cuisine")).toBeTruthy();
    expect(screen.queryByText(/Energy:/)).toBeNull();
  });
});
